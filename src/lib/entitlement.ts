import { useEffect, useState } from 'react'

// Possession de l'offre « Luminator ».
//
// Prototype : un simple drapeau en localStorage. Quand l'utilisateur « achète »
// Luminator, le personnage met des lunettes et prend la place de Lumi partout,
// et le chat avec Luminator se débloque.

const KEY = 'lumi.luminator'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let owned = read()
const listeners = new Set<() => void>()

export function ownsLuminator(): boolean {
  return owned
}

export function setLuminator(value: boolean) {
  owned = value
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

// Nom de marque affiché : devient « Luminator » une fois l'offre acquise.
export function brandName(): string {
  return owned ? 'Luminator' : 'Lumi'
}

// Hook réactif : re-render les composants quand la possession change.
export function useLuminator(): boolean {
  const [v, setV] = useState(owned)
  useEffect(() => {
    const l = () => setV(owned)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return v
}

// Couple { possession, nom de marque } pour l'affichage.
export function useBrand(): { owns: boolean; name: string } {
  const owns = useLuminator()
  return { owns, name: owns ? 'Luminator' : 'Lumi' }
}
