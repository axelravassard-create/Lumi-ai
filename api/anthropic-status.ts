// Indique au front si une clé serveur est configurée — sans jamais la révéler.
// Permet d'activer l'IA pour tous les visiteurs quand l'app paie les appels.

export const config = { runtime: 'edge' }

export default function handler(): Response {
  return new Response(JSON.stringify({ enabled: !!process.env.ANTHROPIC_API_KEY }), {
    headers: { 'content-type': 'application/json' },
  })
}
