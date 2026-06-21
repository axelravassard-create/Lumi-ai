// Proxy serveur vers l'API Anthropic.
//
// But : la clé API ne vit JAMAIS dans le navigateur. Le front appelle
// `/api/anthropic/...` ; cette fonction (exécutée côté serveur sur Vercel)
// rejoue la requête vers api.anthropic.com en y injectant la vraie clé,
// stockée dans la variable d'environnement `ANTHROPIC_API_KEY`.
//
// Le flux de réponse (SSE pour le streaming du chat) est relayé tel quel.

export const config = { runtime: 'edge' }

const ANTHROPIC = 'https://api.anthropic.com'

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return new Response(
      JSON.stringify({
        type: 'error',
        error: { type: 'api_error', message: 'Clé API serveur non configurée (ANTHROPIC_API_KEY).' },
      }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/anthropic/, '') || '/'
  const target = ANTHROPIC + path + url.search

  // On reconstruit des en-têtes propres : on garde ce qui est utile et on
  // impose notre clé serveur (jamais celle, éventuelle, envoyée par le client).
  const headers = new Headers()
  const ct = req.headers.get('content-type')
  if (ct) headers.set('content-type', ct)
  headers.set('anthropic-version', req.headers.get('anthropic-version') || '2023-06-01')
  const beta = req.headers.get('anthropic-beta')
  if (beta) headers.set('anthropic-beta', beta)
  headers.set('x-api-key', key)

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()

  const upstream = await fetch(target, { method: req.method, headers, body })

  // Relais du flux (le corps en streaming est transmis sans être bufferisé).
  const respHeaders = new Headers()
  const rct = upstream.headers.get('content-type')
  if (rct) respHeaders.set('content-type', rct)
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}
