// Webhook Stripe : à la fin d'un paiement, accorde l'accès Luminator au compte
// (clé `luminator:<email>` en KV). Vérifie la signature Stripe (HMAC-SHA256).
//
// Variables : STRIPE_WEBHOOK_SECRET (+ KV configuré). Inerte sinon.

import { kvConfigured, kvGet, kvSet } from '../_lib/kv'

export const config = { runtime: 'edge' }

async function signatureValid(payload: string, header: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {}
  for (const kv of header.split(',')) {
    const i = kv.indexOf('=')
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim()
  }
  const t = parts['t']
  const v1 = parts['v1']
  if (!t || !v1) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !kvConfigured()) return new Response('not configured', { status: 503 })

  const sig = req.headers.get('stripe-signature') || ''
  const body = await req.text()
  if (!(await signatureValid(body, sig, secret))) return new Response('bad signature', { status: 400 })

  let evt: any
  try {
    evt = JSON.parse(body)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  if (evt.type === 'checkout.session.completed') {
    const s = evt.data?.object || {}
    const email = String(s.customer_details?.email || s.customer_email || s.metadata?.email || '').toLowerCase()
    if (email) {
      await kvSet(`luminator:${email}`, '1')
      if (s.customer) {
        await kvSet(`cust:${s.customer}`, email) // customer → email (annulation)
        await kvSet(`stripecust:${email}`, s.customer) // email → customer (portail)
      }
    }
  } else if (evt.type === 'customer.subscription.deleted') {
    const sub = evt.data?.object || {}
    let email = String(sub.metadata?.email || '').toLowerCase()
    if (!email && sub.customer) email = (await kvGet(`cust:${sub.customer}`)) || ''
    if (email) await kvSet(`luminator:${email}`, '0')
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'content-type': 'application/json' } })
}
