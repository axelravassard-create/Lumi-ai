// « Mon plan d'action » — les conseils de Luminator transformés en tâches
// concrètes que l'utilisateur suit et coche. C'est le module qui crée la
// rétention : on revient pour faire avancer son plan.
//
// Prototype : persisté en localStorage, avec un petit système d'abonnés pour
// re-rendre les composants à chaque changement (même principe qu'entitlement).

import { useEffect, useState } from 'react'

export type PlanStatus = 'todo' | 'doing' | 'done'

export interface PlanItem {
  id: string
  title: string
  detail?: string
  status: PlanStatus
  createdAt: number
}

const KEY = 'lumi.luminator.plan'

function read(): PlanItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as PlanItem[]
  } catch {
    /* ignore */
  }
  return []
}

let items = read()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

export function loadPlan(): PlanItem[] {
  return items
}

// Ajoute une action. Ignore les doublons évidents (même titre). Renvoie l'item
// créé, ou null si rien n'a été ajouté.
export function addPlanItem(title: string, detail?: string): PlanItem | null {
  const t = title.trim()
  if (!t) return null
  if (items.some((i) => i.title.toLowerCase() === t.toLowerCase())) return null
  const item: PlanItem = { id: uid(), title: t, detail: detail?.trim() || undefined, status: 'todo', createdAt: Date.now() }
  items = [item, ...items]
  persist()
  return item
}

export function setPlanStatus(id: string, status: PlanStatus) {
  items = items.map((i) => (i.id === id ? { ...i, status } : i))
  persist()
}

export function removePlanItem(id: string) {
  items = items.filter((i) => i.id !== id)
  persist()
}

// Hook réactif.
export function usePlan(): PlanItem[] {
  const [v, setV] = useState(items)
  useEffect(() => {
    const l = () => setV(items.slice())
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return v
}
