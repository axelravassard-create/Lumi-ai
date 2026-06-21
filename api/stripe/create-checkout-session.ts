// Crée une session de paiement Stripe Checkout (abonnement) et renvoie son URL.
//
// Le front appelle cet endpoint, puis redirige l'utilisateur vers `url`. Stripe
// héberge la page de paiement (aucune donnée de carte ne passe par nous).
//
// Variables d'environnement Vercel attendues :
//  - STRIPE_SECRET_KEY     : clé secrète Stripe (sk_live_… / sk_test_…)
//  - STRIPE_PRICE_ID       : id du prix mensuel (price_…)
//  - STRIPE_PRICE_ID_YEARLY: (optionnel) id du prix annuel
//
// Tant que STRIPE_SECRET_KEY / STRIPE_PRICE_ID ne sont pas définis, l'endpoint
// renvoie 503 et le front retombe sur l'achat simulé du prototype.

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const key = process.env.STRIPE_SECRET_KEY
  const monthly = process.env.STRIPE_PRICE_ID
  const yearly = process.env.STRIPE_PRICE_ID_YEARLY
  if (!key || !monthly) return json({ error: 'Paiement non configuré (STRIPE_SECRET_KEY / STRIPE_PRICE_ID).' }, 503)

  const url = new URL(req.url)
  const plan = url.searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly'
  const price = plan === 'yearly' && yearly ? yearly : monthly
  const origin = req.headers.get('origin') || url.origin

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.append('line_items[0][price]', price)
  params.append('line_items[0][quantity]', '1')
  params.set('allow_promotion_codes', 'true')
  params.set('success_url', `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${origin}/?checkout=cancel`)

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = (await r.json()) as { url?: string; error?: { message?: string } }
  if (!r.ok || !data.url) return json({ error: data.error?.message || 'Erreur Stripe.' }, r.status || 500)
  return json({ url: data.url })
}
