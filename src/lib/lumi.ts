import type { AvatarMood } from '../components/avatar/RobotAvatar'
import { t } from './i18n'

// Humeur de Lumi déduite du niveau de risque (réaction au score).
export function moodFromScore(score: number): AvatarMood {
  if (score <= 40) return 'calm'
  if (score <= 70) return 'neutral'
  return 'concerned'
}

// Petite phrase « parlée » par Lumi en réaction au score (traduite via i18n).
export function lumiReaction(score: number): string {
  if (score <= 40) return t('lumi.react.low')
  if (score <= 70) return t('lumi.react.mid')
  return t('lumi.react.high')
}
