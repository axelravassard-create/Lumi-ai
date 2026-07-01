// Modèle de données du Studio de clips viraux Blumi.
// Tout est sérialisable (localStorage / export projet) : aucune fonction, aucun
// objet non-JSON. Les URLs de médias sont des object-URLs recréées à l'import.
import type { AvatarMood } from '../../components/avatar/RobotAvatar'

export type Fmt = '9:16' | '1:1' | '16:9'
export type CaptionStyle = 'tiktok' | 'hormozi' | 'neon'
export type AvatarTier = 'blumi' | 'blumiman' | 'bluminator'

// Les 7 « beats » de la cinématique. Ordre = déroulé du clip.
export type BeatKind = 'hook' | 'scan' | 'verdict' | 'pivot' | 'glowup' | 'solution' | 'cta'
export const BEAT_ORDER: BeatKind[] = ['hook', 'scan', 'verdict', 'pivot', 'glowup', 'solution', 'cta']

// Cadrage 9:16 de la vidéo de fond : zoom + décalage (fraction -1..1 du débord).
export interface Crop {
  zoom: number
  x: number
  y: number
}

export interface Background {
  name: string
  url: string
  trimIn: number
  trimOut: number
  duration: number
  crop: Crop
  volume: number
}

export interface ActionCard {
  icon: string
  text: string
}

// Contenu éditable de la cinématique (le métier s'injecte via {METIER}/{SCORE}).
export interface ScriptModel {
  metier: string
  score: number
  level: string
  hook: string
  hookB: string
  abTest: boolean
  scanLabel: string
  verdictLabel: string
  pivot: string
  actions: ActionCard[]
  cta: string
}

// Un beat placé sur la timeline : déplaçable / redimensionnable.
export interface BeatDef {
  id: BeatKind
  start: number
  dur: number
}

export interface CaptionCfg {
  enabled: boolean
  style: CaptionStyle
  posY: number // 0..1 (part de la hauteur, dans la safe-zone basse)
  scale: number
  timing: 'auto' | 'manual'
  offset: number // décalage manuel (s) : - = plus tôt, + = plus tard
  pace: number // vitesse de défilement des mots (1 = cale sur le beat)
}

export interface AudioCfg {
  voice: boolean
  voiceVolume: number
  voiceRate: number
  musicUrl: string
  musicName: string
  musicVolume: number
  sfx: boolean
  sfxVolume: number
  duck: boolean
}

export interface CharacterCfg {
  tier: AvatarTier
  scale: number
  x: number // -1..1
  y: number // -1..1
  entrance: 'pop' | 'slide' | 'zoom'
  mood: AvatarMood | 'auto' // 'auto' = humeur pilotée par les beats
}

export interface TempoCfg {
  bpm: number
  enabled: boolean // affiche la grille + aimante les beats sur le tempo
}

export interface Project {
  id: string
  name: string
  fmt: Fmt
  duration: number
  showSafeZones: boolean
  platform: 'tiktok' | 'reels' | 'shorts'
  background: Background | null
  script: ScriptModel
  beats: BeatDef[]
  caption: CaptionCfg
  audio: AudioCfg
  character: CharacterCfg
  tempo: TempoCfg
  preset: string
  updatedAt: number
}

// ── Sortie du moteur de timeline : état visuel complet à l'instant t ──────────
export interface CaptionWord {
  text: string
  active: boolean
  done: boolean
}

export interface FrameCard {
  icon: string
  text: string
  in: number // 0..1 progression du pop
}

export interface Frame {
  t: number
  phase: BeatKind
  // Personnage
  glasses: boolean
  laptop: boolean
  mood: AvatarMood
  speaking: boolean
  avatarIn: number // 0..1 progression d'entrée
  avatarScale: number // multiplicateur d'échelle (entrée pop/zoom)
  avatarDX: number // décalage horizontal (fraction de largeur, entrée slide)
  avatarDY: number // décalage vertical (fraction de hauteur, entrée slide)
  shake: number // amplitude du screen-shake (px @1080)
  flash: number // 0..1 flash du glow-up
  zoomPulse: number // 1 = neutre, >1 = zoom (verdict)
  // Hook (gros titre karaoké en haut)
  hookWords: CaptionWord[]
  hookOut: number // 0..1 sortie
  // Scan
  scanActive: boolean
  scanProgress: number // 0..1 balayage
  scanLabel: string
  // Verdict
  gaugeIn: number // 0..1 apparition + remplissage
  score: number // valeur affichée du compteur
  scoreFrozen: boolean
  verdictLabel: string
  riskColor: string
  // Pivot
  pivotIn: number
  pivotText: string
  // Solution
  cards: FrameCard[]
  // CTA + boucle
  ctaIn: number
  ctaText: string
  swipe: number // 0..1 anim du « swipe up »
  loop: number // 0..1 fondu de bouclage vers le cadrage du hook
  // Captions karaoké (bas)
  caption: { words: CaptionWord[]; style: CaptionStyle } | null
}

export const PLATFORM_SAFE: Record<Project['platform'], { top: number; bottom: number; right: number }> = {
  // Fractions de la hauteur/largeur couvertes par l'UI de la plateforme.
  tiktok: { top: 0.08, bottom: 0.2, right: 0.12 },
  reels: { top: 0.1, bottom: 0.22, right: 0.13 },
  shorts: { top: 0.1, bottom: 0.16, right: 0.11 },
}

export function fmtSize(fmt: Fmt): { w: number; h: number } {
  if (fmt === '1:1') return { w: 1080, h: 1080 }
  if (fmt === '16:9') return { w: 1920, h: 1080 }
  return { w: 1080, h: 1920 }
}

export type { AvatarMood }
