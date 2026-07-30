// « Tournages viraux » prêts à l'emploi : des reels de PRÉSENTATION entièrement
// montés (poses expressives, accessoires, fonds animés, transitions, voix karaoké,
// bruitages, effets d'écran, évolution du palier Blumi→Blumiman→Bluminator, tempo),
// installés dans la liste des projets du studio. L'utilisateur les retrouve dans
// « Projets », les prévisualise, les ajuste et les exporte.
//
// ⚠️ Les fonds sont générés en PNG data-URI (dégradés) côté client → ils PERSISTENT
// (contrairement aux images importées en object-URL) et ne « taintent » pas le canvas
// (export OK). Voir `projects.serializable` qui conserve les URL `data:`.
import type {
  AvatarMood, AvatarTier, PoseName, PresBackground, PresEntrance, PresFxCue, PresFxKind,
  PresSegment, PresSfxCue, Project, PropName,
} from './types'
import type { SfxKind } from './audio'
import { newProject, normalizeDuration, saveProject } from './projects'
import { fitPresentationToVoice } from './presentation'

const SEED_KEY = 'blumi.studio.seeded'

let uidn = 0
const uid = (p: string) => p + Date.now().toString(36) + (uidn++).toString(36)

// Dégradé vertical 9:16 en PNG data-URI (persistable, sûr pour l'export).
function gradientPng(colors: [string, string, string]): string {
  if (typeof document === 'undefined') return ''
  const c = document.createElement('canvas')
  c.width = 360
  c.height = 640
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const g = ctx.createLinearGradient(0, 0, 360, 640)
  g.addColorStop(0, colors[0])
  g.addColorStop(0.5, colors[1])
  g.addColorStop(1, colors[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 360, 640)
  // Léger halo central + vignette pour du relief (le perso ressort mieux).
  const rg = ctx.createRadialGradient(180, 250, 40, 180, 340, 520)
  rg.addColorStop(0, 'rgba(255,255,255,0.10)')
  rg.addColorStop(1, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, 360, 640)
  try {
    return c.toDataURL('image/png')
  } catch {
    return ''
  }
}

interface SegSpec {
  pose: PoseName
  text: string
  tier?: AvatarTier
  bg?: number // index dans spec.backgrounds
  props?: PropName[]
  entrance?: PresEntrance
  x?: number
  y?: number
  z?: number
  mood?: AvatarMood | 'auto'
  sfx?: { at: number; kind: SfxKind }[]
  fx?: { at: number; dur: number; kind: PresFxKind }[]
}

interface ShootSpec {
  name: string
  metier: string
  score: number
  level: string
  title: string
  bpm?: number
  backgrounds: [string, string, string][]
  segments: SegSpec[]
}

// Palettes de fond (vibes).
const NIGHT: [string, string, string] = ['#0a0e1a', '#1e2b4d', '#5566ff']
const TECH: [string, string, string] = ['#07142e', '#12386e', '#27e2ff']
const GOLD: [string, string, string] = ['#3a2a05', '#a9791a', '#ffd24d']
const GREEN: [string, string, string] = ['#062a1a', '#0e7a4a', '#2fd98e']
const PURPLE: [string, string, string] = ['#1a0a2e', '#4a1e8a', '#a855f7']
const SUNSET: [string, string, string] = ['#2a0e2e', '#8a2e5a', '#ff9e4d']
const DOOM: [string, string, string] = ['#2a0a12', '#7a1230', '#ff3b6b']

const SHOOT_SPECS: ShootSpec[] = [
  {
    name: '🚀 POV : l’IA veut ton job',
    metier: 'Développeur·se',
    score: 78,
    level: 'Élevé',
    title: 'POV : l’IA veut ton job',
    bpm: 120,
    backgrounds: [NIGHT, TECH, GOLD],
    segments: [
      { pose: 'greet', text: 'Ton métier de {METIER} face à l’IA…', tier: 'blumi', bg: 0, entrance: 'pop', sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'surprised', text: 'Attends… {SCORE}% de tes tâches sont automatisables 😱', tier: 'blumi', bg: 0, props: ['magnifier'], entrance: 'glide', x: -0.3, z: 0.1, sfx: [{ at: 0.1, kind: 'riser' }], fx: [{ at: 0.2, dur: 0.3, kind: 'flash' }] },
      { pose: 'afraid', text: 'L’IA débarque, et elle va vite !', tier: 'blumi', bg: 1, entrance: 'slide-up', x: 0.3, sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0, dur: 0.5, kind: 'shake' }] },
      { pose: 'idea', text: 'Mais si tu la maîtrises… tout change.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'zoom', z: 0.2, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'Tu délègues le répétitif, tu gardes l’humain 💪', tier: 'blumiman', bg: 2, entrance: 'glide', x: -0.2, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'happy', text: 'Teste ton métier gratuit sur Blumi 🚀', tier: 'bluminator', bg: 2, props: ['rocket'], entrance: 'pop', z: 0.1, sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] },
    ],
  },
  {
    name: '🔥 3 métiers que l’IA ne remplacera jamais',
    metier: 'Métiers humains',
    score: 22,
    level: 'Faible',
    title: '3 métiers que l’IA ne remplacera JAMAIS',
    bpm: 128,
    backgrounds: [GREEN, GOLD],
    segments: [
      { pose: 'greet', text: '3 métiers que l’IA ne remplacera JAMAIS 👇', tier: 'blumi', bg: 0, props: ['mic'], sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'point-right', text: 'N°3 : les métiers du soin ❤️', tier: 'blumi', bg: 0, props: ['heart'], entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'point-left', text: 'N°2 : les artisans d’exception 🔨', tier: 'blumi', bg: 1, entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'idea', text: 'N°1 : ceux qui PILOTENT l’IA 🧠', tier: 'blumiman', bg: 1, props: ['crown'], entrance: 'pop', z: 0.2, sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'proud', text: 'L’humain + l’IA = imbattable.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'love', text: 'Abonne-toi pour la suite 🔥', tier: 'bluminator', bg: 1, props: ['fire'], entrance: 'zoom', sfx: [{ at: 0, kind: 'applause' }] },
    ],
  },
  {
    name: '😂 Le maçon vs l’IA',
    metier: 'Maçon·ne',
    score: 55,
    level: 'Moyen',
    title: 'Le maçon vs l’IA',
    bpm: 130,
    backgrounds: [SUNSET, DOOM],
    segments: [
      { pose: 'laugh', text: 'Canicule, canicule… hahaha ! ☀️', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'boing' }] },
      { pose: 'proud', text: 'L’IA fera JAMAIS maçon à ma place !', tier: 'blumi', bg: 0, props: ['coin'], entrance: 'glide', x: -0.2, sfx: [{ at: 0, kind: 'coin' }] },
      { pose: 'love', text: 'Je vais faire un MAX de tunes 🤑', tier: 'blumi', bg: 0, props: ['coin', 'star'], entrance: 'pop', z: 0.15, sfx: [{ at: 0, kind: 'drumroll' }] },
      { pose: 'surprised', text: 'C’est quoi ça… un robot maçon ?! 🤖', tier: 'blumi', bg: 1, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0, dur: 0.5, kind: 'shake' }] },
      { pose: 'sad', text: 'Il part en Lambo… et moi rien 😭', tier: 'blumi', bg: 1, entrance: 'slide-up', sfx: [{ at: 0, kind: 'heartbeat' }], fx: [{ at: 0, dur: 1.2, kind: 'grayscale' }] },
      { pose: 'angry', text: 'Abonnez-vous les gros bg ! 😤', tier: 'blumi', bg: 1, props: ['fire'], entrance: 'pop', sfx: [{ at: 0, kind: 'applause' }] },
    ],
  },
  {
    name: '🤔 Ton métier survit-il à l’IA ?',
    metier: 'Comptable',
    score: 68,
    level: 'Élevé',
    title: 'Ton métier survit-il à l’IA ?',
    bpm: 122,
    backgrounds: [PURPLE, TECH],
    segments: [
      { pose: 'thinking', text: 'Ton métier de {METIER}… il survit à l’IA ? 🤔', tier: 'blumi', bg: 0, props: ['magnifier'], sfx: [{ at: 0, kind: 'riser' }] },
      { pose: 'surprised', text: 'Score d’exposition : {SCORE}% 😳', tier: 'blumi', bg: 0, entrance: 'zoom', z: 0.2, sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'concerned', text: 'Les tâches répétitives ? En danger.', tier: 'blumi', bg: 1, entrance: 'glide', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'idea', text: 'La solution : automatise-les toi-même 💡', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: '+2h gagnées par jour. Facile. 🚀', tier: 'blumiman', bg: 1, props: ['rocket'], sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'happy', text: 'Fais le test gratuit sur Blumi 👇', tier: 'bluminator', bg: 1, entrance: 'glide', sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] },
    ],
  },
  {
    name: '🎨 1 jour, 1 info IA',
    metier: 'Graphiste',
    score: 74,
    level: 'Élevé',
    title: '1 jour, 1 info IA',
    bpm: 124,
    backgrounds: [NIGHT, SUNSET],
    segments: [
      { pose: 'greet', text: '1 jour, 1 info IA pour les {METIER} 🎨', tier: 'blumi', bg: 0, props: ['mic'], sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'surprised', text: 'Une IA génère des visuels pro en 3 secondes 😮', tier: 'blumi', bg: 0, entrance: 'slide-up', sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'skeptical', text: 'Ça remplace le graphiste ? Non.', tier: 'blumi', bg: 1, entrance: 'glide', x: 0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'proud', text: 'Ça remplace celui qui la snobe. 🔥', tier: 'blumiman', bg: 1, props: ['fire'], entrance: 'pop', sfx: [{ at: 0, kind: 'sting' }] },
      { pose: 'idea', text: 'Apprends à la diriger → tu vaux 3× plus.', tier: 'blumiman', bg: 1, props: ['lightbulb'], sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'love', text: 'Abonne-toi, 1 info par jour ❤️', tier: 'bluminator', bg: 1, props: ['heart'], entrance: 'zoom', sfx: [{ at: 0, kind: 'applause' }] },
    ],
  },
]

function buildShoot(spec: ShootSpec): Project {
  const p = newProject(spec.metier, spec.score, spec.level)
  p.name = spec.name
  p.mode = 'presentation'
  p.platform = 'tiktok'
  p.tempo = { bpm: spec.bpm ?? 120, enabled: true }
  p.audio = { ...p.audio, voice: true, voiceRate: 1.14, sfx: true, sfxVolume: 0.9, duck: true }

  const backgrounds: PresBackground[] = spec.backgrounds.map((cols, i) => ({
    id: 'bg' + i,
    name: 'Fond ' + (i + 1),
    url: gradientPng(cols),
    crop: { zoom: 1, x: 0, y: 0 },
  }))

  const sfx: PresSfxCue[] = []
  const fx: PresFxCue[] = []
  const segments: PresSegment[] = spec.segments.map((s, i) => {
    const id = 'seg_' + i
    for (const cue of s.sfx ?? []) sfx.push({ id: uid('sfx_'), segId: id, at: cue.at, kind: cue.kind })
    for (const cue of s.fx ?? []) fx.push({ id: uid('fx_'), segId: id, at: cue.at, dur: cue.dur, kind: cue.kind })
    return {
      id,
      pose: s.pose,
      bgId: s.bg != null ? backgrounds[s.bg]?.id ?? null : null,
      text: s.text,
      start: 0,
      dur: 3,
      mood: s.mood ?? 'auto',
      tier: s.tier ?? 'blumi',
      x: s.x ?? 0,
      y: s.y ?? 0,
      z: s.z ?? 0,
      entrance: s.entrance ?? 'glide',
      props: s.props && s.props.length ? s.props : undefined,
    }
  })

  p.presentation = { title: spec.title, showTitle: true, segments, backgrounds, sfx, fx }
  // Cale la durée de chaque diapo sur sa voix off, puis fige la durée totale.
  return normalizeDuration(fitPresentationToVoice(p))
}

// Construit les tournages (avec fonds générés). Non sauvegardés.
export function buildViralShoots(): Project[] {
  return SHOOT_SPECS.map(buildShoot)
}

export function hasSeededShoots(): boolean {
  try {
    return localStorage.getItem(SEED_KEY) === '1'
  } catch {
    return false
  }
}

// Installe les tournages dans la liste des projets (localStorage) et renvoie les
// projets en mémoire (fonds intacts) pour en ouvrir un tout de suite.
export function seedViralShoots(): Project[] {
  const shoots = buildViralShoots()
  for (const p of shoots) saveProject(p)
  try {
    localStorage.setItem(SEED_KEY, '1')
  } catch {
    /* ignore */
  }
  return shoots
}
