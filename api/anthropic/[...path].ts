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

import { kvConfigured, kvGet, kvIncr, kvExpire } from '../_lib/kv'
import { sessionEmail } from '../_lib/session'

export const config = { runtime: 'edge' }

const ANTHROPIC = 'https://api.anthropic.com'
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5'])
const MAX_OUTPUT_TOKENS = 4096

// Quota quotidien d'appels IA, par palier. ⚠️ Garder en phase avec
// `DAILY_LIMITS` dans src/lib/llm.ts (affiché sur la page Tarifs). C'est ICI
// que se fait la VRAIE limite (serveur, infalsifiable) ; le localStorage côté
// client n'est qu'un pré-contrôle d'UX. Bluminator = 4× Blumiman.
const DAILY_LIMITS: Record<string, number> = { free: 10, blumiman: 25, bluminator: 100 }
const QUOTA_TEXT =
  'Tu as atteint ta limite d\'utilisation du jour (quota_exceeded). Réessaie demain, passe à un palier supérieur pour un usage étendu, ou ajoute ta propre clé API.'

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Palier de l'utilisateur connecté (sinon 'free'). Source de vérité : le KV
// (`luminator:<email>`, posé par le webhook Stripe). Legacy '1' → bluminator.
async function tierFor(email: string | null): Promise<keyof typeof DAILY_LIMITS> {
  if (!email) return 'free'
  const raw = await kvGet(`luminator:${email}`)
  if (raw === 'bluminator' || raw === '1') return 'bluminator'
  if (raw === 'blumiman') return 'blumiman'
  return 'free'
}

// Identifiant pour le compteur : email si connecté, sinon IP (anonyme).
function clientId(req: Request, email: string | null): string {
  if (email) return `u:${email}`
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon'
  return `ip:${ip}`
}

// Vraie limite serveur : incrémente un compteur jour/utilisateur en KV et
// renvoie une 429 si le plafond du palier est dépassé. Inerte si KV absent
// (l'app retombe alors sur le pré-contrôle localStorage, non bloquant).
async function quotaExceeded(req: Request): Promise<boolean> {
  if (!kvConfigured()) return false
  const email = await sessionEmail(req)
  const tier = await tierFor(email)
  const day = new Date().toISOString().slice(0, 10)
  const qkey = `quota:${clientId(req, email)}:${day}`
  const count = await kvIncr(qkey)
  if (count === 1) await kvExpire(qkey, 172800) // ~2 jours, nettoyage auto
  return count > DAILY_LIMITS[tier]
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

    // Vraie limite serveur (KV) — uniquement sur la création de message (pas le
    // comptage de tokens, dont le path est /v1/messages/count_tokens).
    if (await quotaExceeded(req)) {
      return new Response(
        JSON.stringify({ type: 'error', error: { type: 'quota_exceeded', message: QUOTA_TEXT } }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      )
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
