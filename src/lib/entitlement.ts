import { useEffect, useState } from 'react'

// Offre / palier d'abonnement.
//
//  - free       → Blumi (gratuit)
//  - blumiman   → Blumiman (4,99 €) : le copilote
//  - bluminator → Bluminator (14,99 €) : usage IA étendu pour les gros utilisateurs
//
// Prototype : stocké en localStorage. Quand l'utilisateur a un palier payant, le
// personnage met des lunettes et le copilote se débloque. Les écrans utilisent
// `useBrand()` / `brandName()` pour afficher le bon nom partout.

export type Tier = 'free' | 'blumiman' | 'bluminator'

export const APP_NAME = 'Blumi'

const KEY = 'lumi.tier'
const LEGACY_KEY = 'lumi.luminator' // ancien drapeau booléen (migration)

function read(): Tier {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'free' || v === 'blumiman' || v === 'bluminator') return v
    if (localStorage.getItem(LEGACY_KEY) === '1') return 'bluminator' // anciens abonnés
  } catch {
    /* ignore */
  }
  return 'free'
}

let tier: Tier = read()
const listeners = new Set<() => void>()

export function getTier(): Tier {
  return tier
}

export function ownsPaid(): boolean {
  return tier !== 'free'
}

export function setTier(value: Tier) {
  tier = value
  try {
    localStorage.setItem(KEY, value)
    localStorage.setItem(LEGACY_KEY, value === 'free' ? '0' : '1') // compat
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function tierName(t: Tier): string {
  return t === 'bluminator' ? 'Bluminator' : t === 'blumiman' ? 'Blumiman' : APP_NAME
}

// ─── Compatibilité avec l'ancienne API booléenne (Luminator) ─────────────────
export function ownsLuminator(): boolean {
  return ownsPaid()
}

export function setLuminator(value: boolean) {
  setTier(value ? 'blumiman' : 'free')
}

export function brandName(): string {
  return ownsPaid() ? tierName(tier) : APP_NAME
}

// ─── Hooks réactifs ──────────────────────────────────────────────────────────
export function useTier(): Tier {
  const [v, setV] = useState(tier)
  useEffect(() => {
    const l = () => setV(tier)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return v
}

export function useLuminator(): boolean {
  const [v, setV] = useState(ownsPaid())
  useEffect(() => {
    const l = () => setV(ownsPaid())
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return v
}

export function useBrand(): { owns: boolean; name: string } {
  const t = useTier()
  return { owns: t !== 'free', name: t !== 'free' ? tierName(t) : APP_NAME }
}
