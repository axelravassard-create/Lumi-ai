// Vérifie le token du lien magique, ouvre une session (cookie httpOnly 30 j) et
// renvoie l'utilisateur + son statut Luminator (source de vérité côté serveur).

import { kvConfigured, kvGet, kvDel, kvSet, kvSetEx } from '../_lib/kv'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

const SESSION_TTL = 60 * 60 * 24 * 30 // 30 jours

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  if (!kvConfigured()) return json({ configured: false }, 503)

  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  const t = String(token || '')
  if (!t) return json({ error: 'Token manquant.' }, 400)

  const email = await kvGet(`magic:${t}`)
  if (!email) return json({ error: 'Lien invalide ou expiré.' }, 400)
  await kvDel(`magic:${t}`)

  if (!(await kvGet(`user:${email}`))) {
    await kvSet(`user:${email}`, JSON.stringify({ createdAt: Date.now() }))
  }

  const sess = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  await kvSetEx(`sess:${sess}`, email, SESSION_TTL)

  const raw = await kvGet(`luminator:${email}`)
  const tier = raw === 'bluminator' || raw === '1' ? 'bluminator' : raw === 'blumiman' ? 'blumiman' : 'free'
  const cookie = `lumi_session=${sess}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`
  return json({ email, tier, luminator: tier !== 'free' }, 200, { 'set-cookie': cookie })
}
