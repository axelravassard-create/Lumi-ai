// Demande un lien de connexion : génère un token court, le stocke en KV (15 min)
// et l'envoie par email. On ne révèle pas si l'email existe (création au 1er login).

import { kvConfigured, kvSetEx } from '../_lib/kv'
import { emailConfigured, sendMagicLink } from '../_lib/email'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  if (!kvConfigured() || !emailConfigured()) return json({ configured: false }, 503)

  const { email } = (await req.json().catch(() => ({}))) as { email?: string }
  const e = String(email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json({ error: 'Email invalide.' }, 400)

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  await kvSetEx(`magic:${token}`, e, 900)

  const origin = req.headers.get('origin') || new URL(req.url).origin
  const appUrl = process.env.APP_URL || origin
  await sendMagicLink(e, `${appUrl}/?auth=${token}`)

  return json({ ok: true })
}
