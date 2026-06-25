// Score d'automatisation personnel : une mesure de progression qui monte quand
// l'utilisateur avance (profil complété, outils adoptés, actions du plan cochées).
//
// But : transformer le « one-shot » (mon métier est exposé) en suivi dans le
// temps. Aucun appel IA — c'est purement local et gratuit.

import { CareerProfile, completeness } from './profile'
import { PlanItem } from './plan'
import { ToolItem } from './toolbox'

export interface AutomationProgress {
  score: number // 0–100
  done: number
  total: number
  tools: number
  profilePct: number
}

export function automationProgress(plan: PlanItem[], profile: CareerProfile, tools: ToolItem[]): AutomationProgress {
  const total = plan.length
  const done = plan.filter((i) => i.status === 'done').length
  const planProgress = total ? (done / total) * 100 : 0
  const profilePct = completeness(profile)
  const toolsScore = Math.min(tools.length * 10, 100)
  // L'avancement du plan domine (c'est l'action concrète), complété par la
  // connaissance de soi (profil) et l'outillage adopté.
  const score = Math.round(planProgress * 0.6 + profilePct * 0.25 + toolsScore * 0.15)
  return { score, done, total, tools: tools.length, profilePct }
}

// Petit message d'encouragement selon le niveau.
// Renvoie une CLÉ i18n (le composant appelle t() dessus) → libellé multilingue.
export function progressLabel(score: number): string {
  if (score >= 80) return 'score.band3'
  if (score >= 50) return 'score.band2'
  if (score >= 20) return 'score.band1'
  return 'score.band0'
}
