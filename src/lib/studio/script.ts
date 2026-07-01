// Construction du script de la cinématique à partir d'un métier + score.
import type { ScriptModel } from './types'
import { DEFAULT_ACTIONS, HOOKS, CTAS, PIVOTS } from './library'

// Remplace {METIER} / {SCORE} dans un texte.
export function interpolate(text: string, metier: string, score: number): string {
  return text
    .replace(/\{METIER\}/g, metier || 'ton métier')
    .replace(/\{SCORE\}/g, String(score))
}

// Couleur du verdict selon le score (vert / ambre / rouge).
export function riskColor(score: number): string {
  if (score >= 66) return '#ff4d4d'
  if (score >= 40) return '#ffb020'
  return '#2fd98e'
}

export function riskEmoji(score: number): string {
  if (score >= 66) return '🔴'
  if (score >= 40) return '🟠'
  return '🟢'
}

// Script par défaut pour un métier + score donnés.
export function defaultScript(metier: string, score: number, level: string): ScriptModel {
  return {
    metier,
    score,
    level,
    hook: HOOKS[2], // « Si tu es {METIER}, regarde jusqu'au bout 😳 »
    hookB: HOOKS[0],
    abTest: false,
    scanLabel: 'Analyse de {METIER}…',
    verdictLabel: `{SCORE}% exposé ${riskEmoji(score)}`,
    pivot: PIVOTS[0],
    actions: DEFAULT_ACTIONS.map((a) => ({ ...a })),
    cta: CTAS[0],
  }
}

// Ligne de narration (voix off + caption karaoké) pour chaque beat.
export function narrationFor(phase: string, s: ScriptModel): string {
  const m = s.metier || 'ton métier'
  switch (phase) {
    case 'hook':
      return interpolate(s.hook, m, s.score)
    case 'scan':
      return interpolate(s.scanLabel, m, s.score)
    case 'verdict':
      return `${s.score}% exposé à l'IA.`
    case 'pivot':
      return s.pivot
    case 'glowup':
      return 'Voici comment garder une longueur d\'avance.'
    case 'solution':
      return s.actions.map((a) => a.text).join('. ') + '.'
    case 'cta':
      return interpolate(s.cta, m, s.score)
    default:
      return ''
  }
}
