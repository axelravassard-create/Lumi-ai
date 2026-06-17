import { RiskLevel } from './engine'

// Historique des bilans (couche 4 du profil) : chaque analyse lancée est
// horodatée et conservée, pour suivre l'évolution du risque dans le temps.
// Prototype : persisté en localStorage. À terme : table en base par utilisateur.

export interface BilanRecord {
  id: string
  date: string // ISO
  role: string
  score: number
  level: RiskLevel
  resilience: number
  riskIn2040: number
}

const STORAGE_KEY = 'yourcareer.history'
const MAX = 50

export function loadHistory(): BilanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BilanRecord[]
  } catch {
    /* ignore */
  }
  return []
}

// Ajoute un bilan. Ignore un doublon immédiat (même métier + même score que le
// dernier enregistré) pour garder une frise lisible.
export function addBilan(entry: Omit<BilanRecord, 'id' | 'date'>): void {
  const history = loadHistory()
  const last = history[history.length - 1]
  if (last && last.role === entry.role && last.score === entry.score) return
  history.push({ ...entry, id: crypto.randomUUID(), date: new Date().toISOString() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX)))
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
