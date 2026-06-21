// Indique au front si le paiement Stripe est configuré (clé + prix), sans rien révéler.
export const config = { runtime: 'edge' }

export default function handler(): Response {
  const enabled = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID
  return new Response(JSON.stringify({ enabled }), {
    headers: { 'content-type': 'application/json' },
  })
}
