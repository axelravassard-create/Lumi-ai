// Crée une session de paiement Stripe Checkout (abonnement) et renvoie son URL.
//
// Le front appelle cet endpoint, puis redirige l'utilisateur vers `url`. Stripe
// héberge la page de paiement (aucune donnée de carte ne passe par nous).
//
// Variables d'environnement Vercel attendues :
//  - STRIPE_SECRET_KEY            : clé secrète Stripe (sk_live_… / sk_test_…)
//  - STRIPE_PRICE_BLUMIMAN        : id du prix mensuel Blumiman (price_…)
//  - STRIPE_PRICE_BLUMIMAN_YEARLY : (optionnel) prix annuel Blumiman
//  - STRIPE_PRICE_BLUMINATOR        : id du prix mensuel Bluminator
//  - STRIPE_PRICE_BLUMINATOR_YEARLY : (optionnel) prix annuel Bluminator
//  - STRIPE_TAX_ENABLED           : (optionnel) 'true' pour activer Stripe Tax
//                                   (TVA). DÉSACTIVÉ par défaut (franchise de TVA).
//
// Tant que STRIPE_SECRET_KEY / le prix du palier ne sont pas définis, l'endpoint
// renvoie 503 et le front retombe sur l'achat simulé du prototype.

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
  if (!key) return json({ error: 'Paiement non configuré (STRIPE_SECRET_KEY).' }, 503)

  const url = new URL(req.url)
  const tier = url.searchParams.get('tier') === 'bluminator' ? 'bluminator' : 'blumiman'
  const plan = url.searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly'

  // Prix par palier (variables Vercel). Repli mensuel si l'annuel n'est pas défini.
  const PRICES: Record<string, string | undefined> = {
    'blumiman:monthly': process.env.STRIPE_PRICE_BLUMIMAN,
    'blumiman:yearly': process.env.STRIPE_PRICE_BLUMIMAN_YEARLY,
    'bluminator:monthly': process.env.STRIPE_PRICE_BLUMINATOR,
    'bluminator:yearly': process.env.STRIPE_PRICE_BLUMINATOR_YEARLY,
  }
  const price = PRICES[`${tier}:${plan}`] || PRICES[`${tier}:monthly`]
  if (!price) return json({ error: `Prix non configuré pour ${tier} (STRIPE_PRICE_${tier.toUpperCase()}).` }, 503)
  const origin = req.headers.get('origin') || url.origin

  // Si l'utilisateur est connecté (compte), on relie le paiement à son email →
  // le webhook saura à quel compte accorder l'accès Luminator.
  let email: string | null = null
  if (kvConfigured()) {
    const sess = readCookie(req, 'lumi_session')
    if (sess) email = await kvGet(`sess:${sess}`)
  }

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.append('line_items[0][price]', price)
  params.append('line_items[0][quantity]', '1')
  params.set('allow_promotion_codes', 'true')
  // TVA : DÉSACTIVÉE par défaut. Une micro-entreprise en franchise de TVA
  // (art. 293 B du CGI) ne facture PAS de TVA → on ne doit pas activer Stripe Tax.
  // Le jour où tu dépasses les seuils de franchise : poser STRIPE_TAX_ENABLED=true
  // dans Vercel ET activer Stripe Tax dans le dashboard Stripe (adresse d'origine,
  // seuils). Cela rétablit le calcul automatique de TVA + la collecte d'adresse.
  if (process.env.STRIPE_TAX_ENABLED === 'true') {
    params.set('automatic_tax[enabled]', 'true')
    params.set('billing_address_collection', 'required')
    params.set('tax_id_collection[enabled]', 'true')
  }
  // On mémorise le palier acheté dans les metadata → le retour et le webhook
  // sauront quel niveau accorder.
  params.set('metadata[tier]', tier)
  params.set('subscription_data[metadata][tier]', tier)
  if (email) {
    params.set('customer_email', email)
    params.set('metadata[email]', email)
    params.set('subscription_data[metadata][email]', email)
  }
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
