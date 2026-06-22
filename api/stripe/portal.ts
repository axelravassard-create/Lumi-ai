// Portail client Stripe : la page hébergée où l'utilisateur gère/résilie son
// abonnement, change sa carte, voit ses factures. C'est la façon propre et
// sécurisée de résilier (Stripe s'en charge).
//
// Nécessite : STRIPE_SECRET_KEY + KV (mapping email→customer posé par le webhook)
// + un utilisateur connecté. Inerte sinon.

import { kvConfigured, kvGet } from '../_lib/kv'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function readCookie(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || ''
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return m ? m[1] : null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !kvConfigured()) return json({ error: "Gestion d'abonnement non configurée." }, 503)

  const sess = readCookie(req, 'lumi_session')
  const email = sess ? await kvGet(`sess:${sess}`) : null
  if (!email) return json({ error: 'Connecte-toi pour gérer ton abonnement.' }, 401)

  const customer = await kvGet(`stripecust:${email}`)
  if (!customer) return json({ error: 'Aucun abonnement trouvé pour ce compte.' }, 404)

  const origin = req.headers.get('origin') || new URL(req.url).origin
  const params = new URLSearchParams()
  params.set('customer', customer)
  params.set('return_url', origin)

  const r = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = (await r.json()) as { url?: string; error?: { message?: string } }
  if (!r.ok || !data.url) return json({ error: data.error?.message || 'Erreur Stripe.' }, r.status || 500)
  return json({ url: data.url })
}
