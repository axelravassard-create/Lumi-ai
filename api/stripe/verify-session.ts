// Vérifie côté serveur qu'une session Checkout a bien été payée, avant de
// débloquer l'accès Luminator au retour de Stripe. (On ne fait jamais confiance
// au seul paramètre d'URL : on interroge Stripe avec la clé secrète.)

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return json({ paid: false, error: 'Paiement non configuré.' }, 503)

  const id = new URL(req.url).searchParams.get('session_id')
  if (!id) return json({ paid: false }, 400)

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const data = (await r.json()) as { status?: string; payment_status?: string }
  if (!r.ok) return json({ paid: false }, r.status)

  const paid = data.status === 'complete' && (data.payment_status === 'paid' || data.payment_status === 'no_payment_required')
  return json({ paid: !!paid })
}
