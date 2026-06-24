// Résolution de la session (cookie httpOnly) → email, partagée par les routes.
// La session est posée par api/auth/verify et stockée en KV (`sess:<id>` = email).

import { kvGet } from './kv'

export function readCookie(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || ''
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return m ? m[1] : null
}

// Email de l'utilisateur connecté, ou null si pas de session valide.
export async function sessionEmail(req: Request): Promise<string | null> {
  const sess = readCookie(req, 'lumi_session')
  if (!sess) return null
  return await kvGet(`sess:${sess}`)
}
