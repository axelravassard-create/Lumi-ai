// Renvoie l'utilisateur connecté (depuis le cookie de session) + statut Luminator.
// `configured:false` indique au front que les comptes ne sont pas activés.

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
  if (!kvConfigured()) return json({ configured: false, email: null })

  const sess = readCookie(req, 'lumi_session')
  if (!sess) return json({ email: null })

  const email = await kvGet(`sess:${sess}`)
  if (!email) return json({ email: null })

  const luminator = (await kvGet(`luminator:${email}`)) === '1'
  return json({ email, luminator })
}
