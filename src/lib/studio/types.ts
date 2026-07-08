// Modèle de données du Studio de clips viraux Blumi.
// Tout est sérialisable (localStorage / export projet) : aucune fonction, aucun
// objet non-JSON. Les URLs de médias sont des object-URLs recréées à l'import.
import type { AvatarMood, PoseName } from '../../components/avatar/RobotAvatar'

export type Fmt = '9:16' | '1:1' | '16:9'

// Deux formats de reel : la cinématique virale (Doom→Glow-up, 7 beats) et le
// mode « présentation » (« 1 jour une info sur ton métier ») où Blumi enchaîne
// des poses en parlant devant des fonds qui défilent comme un diaporama.
export type StudioMode = 'cinematic' | 'presentation'
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
// Réglage de la voix off pour un beat : texte dit (override) + voix (override).
export interface VoiceLine {
  text?: string // ce que la voix DIT (si absent : dérivé du script/on-screen)
  voice?: string // nom de la voix (si absent : voix globale)
}

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
  // Voix off personnalisée par moment (texte et/ou voix). Vide = auto.
  vo?: Partial<Record<BeatKind, VoiceLine>>
}

// Un beat placé sur la timeline : déplaçable / redimensionnable / activable.
export interface BeatDef {
  id: BeatKind
  start: number
  dur: number
  enabled?: boolean // undefined = actif ; false = moment retiré du clip
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
  voiceName: string // voix TTS globale (nom SpeechSynthesis) ; '' = auto FR
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

// ── Mode « présentation » (diaporama parlé) ──────────────────────────────────
// Un fond de diapo : image (défile comme une présentation) ou dégradé si vide.
export interface PresBackground {
  id: string
  name: string
  url: string // object-URL d'une image (non persisté)
  crop: Crop
}

// Un « segment » = une diapo : une pose de Blumi + un fond + un texte qu'il dit
// (voix + karaoké). Comme un moment : durée et position réglables (packés dans
// l'ordre du tableau).
export interface PresSegment {
  id: string
  pose: PoseName
  bgId: string | null // fond affiché (null = dégradé)
  text: string // ce que Blumi dit ET affiche (karaoké mot à mot)
  start: number // recalculé par reflow (packing séquentiel)
  dur: number
  voice?: string // voix TTS (override) ; sinon voix globale
  mood?: AvatarMood | 'auto' // 'auto' = humeur de la pose
}

export interface PresentationModel {
  title: string // petit bandeau (ex. « 1 jour, 1 info · {METIER} »)
  showTitle: boolean
  segments: PresSegment[]
  backgrounds: PresBackground[]
}

export interface Project {
  id: string
  name: string
  mode: StudioMode // 'cinematic' (défaut) ou 'presentation'
  fmt: Fmt
  duration: number
  autoDuration: boolean // true = la durée vidéo = fin du dernier moment (liée)
  showSafeZones: boolean
  platform: 'tiktok' | 'reels' | 'shorts'
  background: Background | null
  script: ScriptModel
  beats: BeatDef[]
  presentation: PresentationModel
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
  avatarAlpha: number // 0 = Blumi caché (trou sans moment) ; 1 = visible
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

// État visuel complet du mode présentation à l'instant t (déterministe).
export interface PresFrame {
  t: number
  segIndex: number
  pose: PoseName
  mood: AvatarMood
  speaking: boolean
  avatarAlpha: number // 0 = Blumi caché (avant le 1er segment / trou)
  bgId: string | null // fond du segment courant
  bgPrevId: string | null // fond précédent (pour le fondu de diapo)
  bgFade: number // 0..1 : fondu du fond courant par-dessus le précédent
  words: CaptionWord[] // texte dit, révélé mot à mot (karaoké)
  title: string
  showTitle: boolean
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

export type { AvatarMood, PoseName }
