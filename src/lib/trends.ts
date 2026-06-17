import { SectorTrend } from './llm'

// Cache local des notes de tendance sectorielle, avec une durée de vie de 7 jours.
// Cela reproduit le rafraîchissement hebdomadaire mutualisé du vrai produit
// (1 génération par secteur, réutilisée par tous) et évite de rappeler l'IA à
// chaque visite. En production, ce cache vivrait en base, partagé entre users.

const PREFIX = 'yourcareer.trend.'
const TTL = 7 * 24 * 60 * 60 * 1000 // 7 jours

const key = (sector: string) =>
  PREFIX + sector.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')

export interface CachedTrend {
  trend: SectorTrend
  fresh: boolean // true si générée il y a moins de 7 jours
}

export function loadCachedTrend(sector: string): CachedTrend | null {
  try {
    const raw = localStorage.getItem(key(sector))
    if (!raw) return null
    const trend = JSON.parse(raw) as SectorTrend
    const age = Date.now() - new Date(trend.updatedAt).getTime()
    return { trend, fresh: age < TTL }
  } catch {
    return null
  }
}

export function saveTrend(trend: SectorTrend) {
  try {
    localStorage.setItem(key(trend.sector), JSON.stringify(trend))
  } catch {
    /* quota dépassé — ignoré */
  }
}
