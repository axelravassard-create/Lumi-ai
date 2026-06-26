// Indique au front si le paiement Stripe est configuré (clé + prix), sans rien révéler.
export const config = { runtime: 'edge' }

export default function handler(): Response {
  // Stripe est « prêt » si la clé secrète + au moins un prix de palier sont posés
  // (les vrais noms sont STRIPE_PRICE_BLUMIMAN / STRIPE_PRICE_BLUMINATOR).
  const enabled =
    !!process.env.STRIPE_SECRET_KEY &&
    !!(process.env.STRIPE_PRICE_BLUMIMAN || process.env.STRIPE_PRICE_BLUMINATOR)
  return new Response(JSON.stringify({ enabled }), {
    headers: { 'content-type': 'application/json' },
  })
}
