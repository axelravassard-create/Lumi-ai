// Proxy serveur vers l'API Anthropic.
//
// But : la clé API ne vit JAMAIS dans le navigateur. Le front appelle
// `/api/anthropic/...` ; cette fonction (exécutée côté serveur sur Vercel)
// rejoue la requête vers api.anthropic.com en y injectant la vraie clé,
// stockée dans la variable d'environnement `ANTHROPIC_API_KEY`.
//
// Le flux de réponse (SSE pour le streaming du chat) est relayé tel quel.
//
// Garde-fou de coût : comme la clé est la nôtre, on durcit ce que le navigateur
// peut demander — uniquement l'endpoint messages, uniquement notre modèle, et un
// plafond de max_tokens — pour qu'une requête trafiquée ne fasse pas exploser la
// facture. (Un quota par utilisateur robuste nécessiterait un stockage type KV.)

export const config = { runtime: 'edge' }

const ANTHROPIC = 'https://api.anthropic.com'
const ALLOWED_MODELS = new Set(['claude-opus-4-8', 'claude-haiku-4-5'])
const MAX_OUTPUT_TOKENS = 4096

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return err('Clé API serveur non configurée (ANTHROPIC_API_KEY).', 503)

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/anthropic/, '') || '/'

  // Allowlist d'endpoints : on n'autorise que l'API messages (+ comptage).
  if (!path.startsWith('/v1/messages')) return err('Endpoint non autorisé.', 403)

  let body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()

  // Durcissement de la création de messages : modèle imposé + plafond de sortie.
  if (req.method === 'POST' && path === '/v1/messages' && body) {
    try {
      const b = JSON.parse(body) as Record<string, unknown>
      if (typeof b.model === 'string' && !ALLOWED_MODELS.has(b.model)) {
        return err('Modèle non autorisé.', 400)
      }
      if (typeof b.max_tokens === 'number' && b.max_tokens > MAX_OUTPUT_TOKENS) {
        b.max_tokens = MAX_OUTPUT_TOKENS
        body = JSON.stringify(b)
      }
    } catch {
      /* corps non-JSON : on laisse passer tel quel */
    }
  }

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

  const upstream = await fetch(target, { method: req.method, headers, body })

  // Relais du flux (le corps en streaming est transmis sans être bufferisé).
  const respHeaders = new Headers()
  const rct = upstream.headers.get('content-type')
  if (rct) respHeaders.set('content-type', rct)
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders })
}
