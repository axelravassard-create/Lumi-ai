import type { AvatarMood } from '../components/avatar/RobotAvatar'

// Humeur de Lumi déduite du niveau de risque (réaction au score).
export function moodFromScore(score: number): AvatarMood {
  if (score <= 40) return 'calm'
  if (score <= 70) return 'neutral'
  return 'concerned'
}

// Petite phrase « parlée » par Lumi en réaction au score.
export function lumiReaction(score: number): string {
  if (score <= 40) return 'Bonne nouvelle : ton métier résiste plutôt bien à l\'IA. 💪'
  if (score <= 70) return 'C\'est nuancé : de vraies forces à cultiver, et quelques angles à surveiller.'
  return 'Soyons lucides : l\'exposition est forte. Mais respire, j\'ai un plan pour toi. 🛡️'
}
