// « Ma boîte à outils » — les outils (IA, no-code, apps) que Luminator
// recommande, rangés au même endroit avec leurs liens. Luminator les ajoute
// depuis le chat ; l'utilisateur les retrouve et les ouvre quand il veut.
//
// Prototype : localStorage + petit système d'abonnés (comme plan.ts / entitlement.ts).

import { useEffect, useState } from 'react'

export interface ToolItem {
  id: string
  name: string
  url?: string
  reason?: string
  createdAt: number
}

const KEY = 'lumi.luminator.tools'

function read(): ToolItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ToolItem[]
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

function normalizeUrl(url?: string): string | undefined {
  const u = url?.trim()
  if (!u) return undefined
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

export function loadToolbox(): ToolItem[] {
  return items
}

// Ajoute un outil. Ignore les doublons évidents (même nom). Renvoie l'item créé,
// ou null si rien n'a été ajouté.
export function addTool(name: string, url?: string, reason?: string): ToolItem | null {
  const n = name.trim()
  if (!n) return null
  if (items.some((i) => i.name.toLowerCase() === n.toLowerCase())) return null
  const item: ToolItem = { id: uid(), name: n, url: normalizeUrl(url), reason: reason?.trim() || undefined, createdAt: Date.now() }
  items = [item, ...items]
  persist()
  return item
}

export function removeTool(id: string) {
  items = items.filter((i) => i.id !== id)
  persist()
}

export function useToolbox(): ToolItem[] {
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
