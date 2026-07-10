// Idées de réels basées sur l'actu IA : mapping vers les presets, application au
// projet, et cache de « l'idée du jour » (1 par jour, en localStorage).
import type { ReelIdea } from '../llm'
import type { Project } from './types'
import { analyze } from '../engine'
import { PRESETS } from './library'
import { riskEmoji } from './script'

export type { ReelIdea }

// Rapproche le « format » libre renvoyé par l'IA d'un de nos presets.
export function formatToPreset(format: string): string | null {
  const f = (format || '').toLowerCase()
  if (f.includes('pov')) return 'pov-analyse'
  if (f.includes('tier')) return 'tier-list'
  if (f.includes('choc') || f.includes('express')) return 'choc-express'
  if (f.includes('story')) return 'storytime'
  if (f.includes('doom') || f.includes('glow')) return 'doom-glowup'
  return null
}

// Applique une idée au projet : métier + score recalculé, hook, et preset d'angle.
export function applyIdea(project: Project, idea: ReelIdea): Project {
  const metier = idea.metier || project.script.metier
  const a = analyze(metier)
  let np: Project = {
    ...project,
    name: metier || project.name,
    script: {
      ...project.script,
      metier,
      score: a.currentRisk,
      level: a.level,
      hook: idea.hook || project.script.hook,
      verdictLabel: `{SCORE}% exposé ${riskEmoji(a.currentRisk)}`,
    },
  }
  const pid = formatToPreset(idea.format)
  const pr = pid ? PRESETS.find((p) => p.id === pid) : null
  if (pr) np = { ...np, preset: pr.id, duration: pr.duration, beats: pr.beats.map((b) => ({ ...b })) }
  return np
}

// ── Idée du jour (cache localStorage, 1 par jour) ────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)
const dayKey = (d = today()) => `blumi.studio.idea.${d}`

export function getDailyIdea(): ReelIdea | null {
  try {
    const raw = localStorage.getItem(dayKey())
    return raw ? (JSON.parse(raw) as ReelIdea) : null
  } catch {
    return null
  }
}

export function setDailyIdea(idea: ReelIdea) {
  try {
    localStorage.setItem(dayKey(), JSON.stringify(idea))
  } catch {
    /* quota — ignore */
  }
}
