// Ferme la session : supprime la clé en KV et efface le cookie.

import { kvConfigured, kvDel } from '../_lib/kv'

export const config = { runtime: 'edge' }

function readCookie(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || ''
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return m ? m[1] : null
}

export default async function handler(req: Request): Promise<Response> {
  if (kvConfigured()) {
    const sess = readCookie(req, 'lumi_session')
    if (sess) await kvDel(`sess:${sess}`)
  }
  const cookie = 'lumi_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookie },
  })
}
