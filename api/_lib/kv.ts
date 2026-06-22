// Accès au stockage clé-valeur (Vercel KV / Upstash Redis REST), sans dépendance.
// Inerte tant que KV_REST_API_URL / KV_REST_API_TOKEN ne sont pas définis.

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

export function kvConfigured(): boolean {
  return !!KV_URL && !!KV_TOKEN
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  const r = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`KV error ${r.status}`)
  const j = (await r.json()) as { result?: unknown }
  return j.result ?? null
}

export async function kvGet(key: string): Promise<string | null> {
  const v = await cmd(['GET', key])
  return v === null || v === undefined ? null : String(v)
}

export async function kvSet(key: string, value: string): Promise<void> {
  await cmd(['SET', key, value])
}

export async function kvSetEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  await cmd(['SET', key, value, 'EX', ttlSeconds])
}

export async function kvDel(key: string): Promise<void> {
  await cmd(['DEL', key])
}
