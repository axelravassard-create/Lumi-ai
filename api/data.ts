// Données utilisateur attachées au compte (multi-appareils).
//
// Quand un compte est connecté, ses données (profil, historique, plan, boîte à
// outils, conversation) vivent ici, côté serveur, et suivent l'utilisateur d'un
// appareil à l'autre. Stockées en KV sous `data:<email>` (un seul blob JSON).
//
// GET  /api/data  → { data: { <clé localStorage>: <valeur>, … } }
// POST /api/data  → { data: {…} } enregistré pour l'utilisateur connecté
//
// Inerte si KV n'est pas configuré ; 401 si pas de session.

import { kvConfigured, kvGet, kvSet, kvDel } from './_lib/kv'
import { sessionEmail } from './_lib/session'

export const config = { runtime: 'edge' }

const MAX_BYTES = 512 * 1024 // garde-fou : un blob de données raisonnable

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async function handler(req: Request): Promise<Response> {
  if (!kvConfigured()) return json({ error: 'not_configured' }, 503)

  const email = await sessionEmail(req)
  if (!email) return json({ error: 'unauthorized' }, 401)

  const key = `data:${email}`

  if (req.method === 'GET') {
    const raw = await kvGet(key)
    let data: unknown = {}
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = {}
      }
    }
    return json({ data })
  }

  if (req.method === 'POST') {
    const body = await req.text()
    if (body.length > MAX_BYTES) return json({ error: 'too_large' }, 413)
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return json({ error: 'bad_json' }, 400)
    }
    // On accepte { data: {…} } ou directement {…}.
    const obj = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    const data = 'data' in obj && obj.data && typeof obj.data === 'object' ? obj.data : obj
    await kvSet(key, JSON.stringify(data))
    return json({ ok: true })
  }

  if (req.method === 'DELETE') {
    // Droit à l'effacement (RGPD) : on supprime aussi la copie serveur.
    await kvDel(key)
    return json({ ok: true })
  }

  return json({ error: 'method_not_allowed' }, 405)
}
