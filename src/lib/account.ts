// Comptes légers (lien magique par email), côté front.
//
// « Prêt à brancher » : tant que le serveur n'est pas configuré (Vercel KV +
// Resend), `configured` reste false et l'UI compte reste masquée — l'app
// fonctionne comme avant (accès Luminator via localStorage / Stripe simulé).
// Une fois branché, le compte devient la source de vérité de l'accès Luminator
// (entitlement renvoyé par le serveur), et il suit l'utilisateur entre appareils.

import { useEffect, useState } from 'react'
import { setTier, type Tier } from './entitlement'

interface AccountState {
  email: string | null
  luminator: boolean
  configured: boolean
}

let state: AccountState = { email: null, luminator: false, configured: false }
const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}

export function accountState(): AccountState {
  return state
}

function apply(data: { email?: string | null; tier?: string; luminator?: boolean; configured?: boolean }) {
  state = {
    email: data.email ?? null,
    luminator: !!data.luminator,
    configured: data.configured !== false,
  }
  // Quand un compte est connecté, le serveur fait foi (dans les deux sens) :
  // on applique son palier exact ; à la déconnexion / serveur=free on retire.
  // Hors compte connecté (email null), on ne touche pas au localStorage (le
  // parcours simulé / retour Stripe le gère).
  if (state.email) {
    const tier = (data.tier as Tier) || (data.luminator ? 'blumiman' : 'free')
    setTier(tier)
  }
  emit()
}

// Récupère la session courante (et le palier serveur).
export async function checkAccount(): Promise<void> {
  try {
    const r = await fetch('/api/auth/me')
    if (!r.ok) return
    const j = (await r.json()) as { email?: string | null; tier?: string; luminator?: boolean; configured?: boolean }
    apply(j)
  } catch {
    /* ignore */
  }
}

// Demande l'envoi d'un lien de connexion par email.
export async function requestLoginLink(email: string): Promise<void> {
  const r = await fetch('/api/auth/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const j = (await r.json().catch(() => ({}))) as { error?: string; configured?: boolean }
  if (r.status === 503 || j.configured === false) throw new Error('Les comptes ne sont pas encore activés.')
  if (!r.ok) throw new Error(j.error || 'Envoi impossible pour le moment.')
}

// Au chargement : si l'URL contient ?auth=<token>, finalise la connexion.
export async function completeLoginFromUrl(): Promise<boolean> {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('auth')
  if (!token) return false
  let ok = false
  try {
    const r = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const j = (await r.json().catch(() => ({}))) as { email?: string; tier?: string; luminator?: boolean }
    if (r.ok && j.email) {
      apply({ email: j.email, tier: j.tier, luminator: j.luminator, configured: true })
      ok = true
    }
  } catch {
    /* ignore */
  }
  url.searchParams.delete('auth')
  const qs = url.searchParams.toString()
  window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash)
  return ok
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* ignore */
  }
  state = { ...state, email: null, luminator: false }
  setTier('free') // déconnexion = on retire l'accès sur cet appareil
  emit()
}

export function useAccount(): AccountState {
  const [v, setV] = useState(state)
  useEffect(() => {
    const l = () => setV({ ...state })
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return v
}
