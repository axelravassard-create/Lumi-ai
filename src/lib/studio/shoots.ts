// « Tournages viraux » prêts à l'emploi : des reels de PRÉSENTATION entièrement
// montés (poses expressives, accessoires, fonds ATYPIQUES dessinés, transitions,
// voix karaoké, bruitages, effets d'écran, évolution du palier Blumi→Blumiman→
// Bluminator, tempo), installés dans la liste des projets du studio.
//
// Angle éditorial : sujets liés à la mission (métiers face à l'IA, automatisation,
// upskilling) traités comme du CONTENU DE VALEUR / CURIOSITÉ pour déclencher le clic,
// SANS pitcher le site (pas de « teste sur Blumi ») → CTA d'engagement (commente,
// enregistre, abonne-toi).
//
// ⚠️ Les fonds sont peints en PNG data-URI côté client (`paintScene`) → ils
// PERSISTENT (via `projects.serializable` qui conserve les URL `data:`) et ne
// « taintent » pas le canvas à l'export (contrairement aux images object-URL).
import type {
  AvatarMood, AvatarTier, PoseName, PresBackground, PresEntrance, PresFxCue, PresFxKind,
  PresSegment, PresSfxCue, Project, PropName,
} from './types'
import type { SfxKind } from './audio'
import { deleteProject, listProjects, newProject, normalizeDuration, saveProject } from './projects'
import { fitPresentationToVoice } from './presentation'

const SEED_KEY = 'blumi.studio.seeded'
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'

let uidn = 0
const uid = (p: string) => p + Date.now().toString(36) + (uidn++).toString(36)

type SceneStyle = 'gradient' | 'tvstudio' | 'quote' | 'grid' | 'spotlight' | 'news'
type Cols = [string, string, string]
interface BgSpec { style: SceneStyle; colors: Cols; icon?: string }

// Fond ATYPIQUE dessiné (dégradé + éléments de scène + emoji représentatif) → PNG.
function paintScene(spec: BgSpec): string {
  if (typeof document === 'undefined') return ''
  const W = 360, H = 640
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return ''

  // Base : dégradé + vignette.
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, spec.colors[0])
  g.addColorStop(0.5, spec.colors[1])
  g.addColorStop(1, spec.colors[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  if (spec.style === 'tvstudio') {
    // Deux faisceaux de projecteurs depuis le haut + sol de scène réfléchissant.
    for (const sx of [95, 265]) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(sx, -30)
      ctx.lineTo(sx - 80, 380)
      ctx.lineTo(sx + 80, 380)
      ctx.closePath()
      const lg = ctx.createLinearGradient(sx, 0, sx, 380)
      lg.addColorStop(0, 'rgba(255,255,255,0.28)')
      lg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = lg
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, 480, W, H - 480)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, 480); ctx.lineTo(W, 480); ctx.stroke()
    // Petits écrans en fond.
    for (const [x, y] of [[40, 120], [250, 100], [150, 60]]) {
      ctx.fillStyle = 'rgba(120,200,255,0.12)'
      ctx.fillRect(x, y, 70, 44)
    }
  } else if (spec.style === 'grid') {
    // Grille en perspective vers l'horizon (look futuriste).
    ctx.strokeStyle = 'rgba(130,205,255,0.30)'
    ctx.lineWidth = 1
    const hy = 300
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2, hy); ctx.lineTo(W / 2 + i * 95, H); ctx.stroke()
    }
    for (let j = 1; j <= 9; j++) {
      const y = hy + (H - hy) * Math.pow(j / 9, 1.8)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    const hg = ctx.createRadialGradient(W / 2, hy, 10, W / 2, hy, 200)
    hg.addColorStop(0, 'rgba(180,235,255,0.35)')
    hg.addColorStop(1, 'rgba(180,235,255,0)')
    ctx.fillStyle = hg
    ctx.fillRect(0, 100, W, 400)
  } else if (spec.style === 'quote') {
    // Gros guillemets décoratifs (mur de citation).
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 300px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('“', 10, 20)
    ctx.restore()
  } else if (spec.style === 'spotlight') {
    // Un seul faisceau dramatique au centre.
    const sg = ctx.createRadialGradient(W / 2, 240, 20, W / 2, 320, 380)
    sg.addColorStop(0, 'rgba(255,255,255,0.28)')
    sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, W, H)
  } else if (spec.style === 'news') {
    // Points « carte du monde » + bandeau bas + pastille LIVE.
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W, y = 120 + Math.random() * 300
      ctx.fillRect(x, y, 2, 2)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 520, W, 40)
    ctx.fillStyle = '#ff3b3b'
    ctx.beginPath(); ctx.arc(24, 540, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('LIVE', 38, 541)
  }

  // Emoji représentatif (grand, très estompé) — imagerie du sujet.
  if (spec.icon) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.font = `210px ${EMOJI_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spec.icon, W / 2, 210)
    ctx.restore()
  }

  // Vignette finale (fait ressortir le perso).
  const rg = ctx.createRadialGradient(W / 2, 260, 60, W / 2, 340, 520)
  rg.addColorStop(0, 'rgba(0,0,0,0)')
  rg.addColorStop(1, 'rgba(0,0,0,0.36)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)

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
  bg?: number
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
  backgrounds: BgSpec[]
  segments: SegSpec[]
}

// Palettes.
const NIGHT: Cols = ['#0a0e1a', '#1e2b4d', '#5566ff']
const TECH: Cols = ['#07142e', '#12386e', '#27e2ff']
const GOLD: Cols = ['#3a2a05', '#a9791a', '#ffd24d']
const GREEN: Cols = ['#062a1a', '#0e7a4a', '#2fd98e']
const PURPLE: Cols = ['#1a0a2e', '#4a1e8a', '#a855f7']
const SUNSET: Cols = ['#2a0e2e', '#8a2e5a', '#ff9e4d']
const DOOM: Cols = ['#2a0a12', '#7a1230', '#ff3b6b']

const SHOOT_SPECS: ShootSpec[] = [
  {
    name: '🎬 Les métiers qui vont EXPLOSER',
    metier: 'Métiers de demain',
    score: 20,
    level: 'Faible',
    title: 'Les métiers qui vont exploser grâce à l’IA',
    bpm: 126,
    backgrounds: [{ style: 'tvstudio', colors: TECH, icon: '🤖' }, { style: 'tvstudio', colors: GOLD, icon: '🚀' }],
    segments: [
      { pose: 'greet', text: 'Ces métiers vont EXPLOSER grâce à l’IA 👇', tier: 'blumi', bg: 0, props: ['mic'], sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'point-right', text: 'Prompt engineer : déjà 100 000 € par an 🤯', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'point-left', text: 'Auditeur d’IA : le métier de demain 🔎', tier: 'blumi', bg: 0, props: ['magnifier'], entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'idea', text: 'Ceux qui DIRIGENT l’IA raflent tout 🧠', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', z: 0.2, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'La vague fait des gagnants. Sois-en un 🚀', tier: 'bluminator', bg: 1, props: ['rocket'], sfx: [{ at: 0, kind: 'sting' }] },
      { pose: 'happy', text: 'Lequel te tente ? Dis-le en commentaire 👇', tier: 'blumiman', bg: 1, entrance: 'glide', sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] },
    ],
  },
  {
    name: '💬 La phrase qui va te faire flipper',
    metier: 'Ton métier',
    score: 64,
    level: 'Élevé',
    title: 'La phrase sur l’IA qui va te faire réfléchir',
    bpm: 112,
    backgrounds: [{ style: 'quote', colors: PURPLE, icon: '💬' }, { style: 'quote', colors: DOOM, icon: '⚠️' }],
    segments: [
      { pose: 'thinking', text: '« L’IA ne prendra pas ton job… »', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'riser' }] },
      { pose: 'surprised', text: '« …mais quelqu’un qui l’utilise, oui. » 😳', tier: 'blumi', bg: 1, entrance: 'zoom', z: 0.2, sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'concerned', text: '90% des tâches vont changer d’ici 5 ans.', tier: 'blumi', bg: 1, entrance: 'glide', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'idea', text: 'La seule règle : apprends à la piloter.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'S’y mettre maintenant = 3 ans d’avance.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'love', text: 'Enregistre ça, relis-le dans 1 an ❤️', tier: 'bluminator', bg: 1, props: ['heart'], entrance: 'zoom', sfx: [{ at: 0, kind: 'applause' }] },
    ],
  },
  {
    name: '🔮 En 2030, ton métier ressemblera à ça',
    metier: 'Ton métier',
    score: 58,
    level: 'Moyen',
    title: 'En 2030, ton métier ressemblera à ça',
    bpm: 120,
    backgrounds: [{ style: 'grid', colors: TECH, icon: '🔮' }, { style: 'grid', colors: NIGHT, icon: '🤖' }],
    segments: [
      { pose: 'greet', text: 'En 2030, ton métier ressemblera à ÇA 🔮', tier: 'blumi', bg: 0, props: ['mic'], sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'surprised', text: 'Tu bosseras AVEC une IA, pas contre elle.', tier: 'blumi', bg: 0, entrance: 'slide-up', sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'point-right', text: 'L’IA fait 80% du répétitif…', tier: 'blumi', bg: 1, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'proud', text: '…toi : créer, décider, ressentir 🧠', tier: 'blumiman', bg: 1, entrance: 'pop', z: 0.15, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'idea', text: 'Le futur est aux hybrides humain + IA.', tier: 'blumiman', bg: 1, props: ['lightbulb'], sfx: [{ at: 0, kind: 'sting' }] },
      { pose: 'happy', text: 'Prêt pour 2030 ? Abonne-toi 🔥', tier: 'bluminator', bg: 1, props: ['fire'], entrance: 'glide', sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] },
    ],
  },
  {
    name: '🎯 Le vrai danger, c’est pas l’IA',
    metier: 'Ton métier',
    score: 61,
    level: 'Moyen',
    title: 'Le vrai danger, c’est pas l’IA',
    bpm: 118,
    backgrounds: [{ style: 'spotlight', colors: DOOM, icon: '🎯' }, { style: 'spotlight', colors: GOLD, icon: '💡' }],
    segments: [
      { pose: 'concerned', text: 'Le vrai danger, c’est PAS l’IA.', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'riser' }], fx: [{ at: 0, dur: 0.4, kind: 'shake' }] },
      { pose: 'surprised', text: 'C’est de faire comme si elle existait pas 😳', tier: 'blumi', bg: 0, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'skeptical', text: '« Moi ça me concerne pas »… si, justement.', tier: 'blumi', bg: 0, entrance: 'glide', x: 0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'idea', text: '1h par jour à la comprendre = intouchable.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'Prends 30 min ce soir. Commence.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'love', text: 'Tu commences quand ? Commente 👇', tier: 'bluminator', bg: 1, props: ['heart'], entrance: 'zoom', sfx: [{ at: 0, kind: 'applause' }] },
    ],
  },
  {
    name: '⚡ 5 tâches à déléguer à l’IA',
    metier: 'Ton métier',
    score: 52,
    level: 'Moyen',
    title: '5 tâches à déléguer à l’IA aujourd’hui',
    bpm: 128,
    backgrounds: [{ style: 'news', colors: TECH, icon: '⚡' }, { style: 'news', colors: GREEN, icon: '✅' }],
    segments: [
      { pose: 'greet', text: '5 tâches à déléguer à l’IA DÈS aujourd’hui ⚡', tier: 'blumi', bg: 0, props: ['mic'], sfx: [{ at: 0, kind: 'pop' }] },
      { pose: 'point-right', text: '1. Tes mails qui traînent 📩', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'point-left', text: '2. Tes comptes rendus de réunion 📝', tier: 'blumi', bg: 0, entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'point-right', text: '3. Ton tri de données 📊', tier: 'blumi', bg: 1, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'idea', text: '4. Tes 1res idées… 5. Ta veille 🧠', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'happy', text: '+2h par jour. Enregistre pour tester 🔖', tier: 'blumiman', bg: 1, entrance: 'glide', sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] },
    ],
  },
  {
    name: '😂 Le maçon vs l’IA',
    metier: 'Maçon·ne',
    score: 55,
    level: 'Moyen',
    title: 'Le maçon vs l’IA',
    bpm: 130,
    backgrounds: [{ style: 'gradient', colors: SUNSET, icon: '🧱' }, { style: 'spotlight', colors: DOOM, icon: '🤖' }],
    segments: [
      { pose: 'laugh', text: 'Canicule, canicule… hahaha ! ☀️', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'boing' }] },
      { pose: 'proud', text: 'L’IA fera JAMAIS maçon à ma place !', tier: 'blumi', bg: 0, props: ['coin'], entrance: 'glide', x: -0.2, sfx: [{ at: 0, kind: 'coin' }] },
      { pose: 'love', text: 'Je vais faire un MAX de tunes 🤑', tier: 'blumi', bg: 0, props: ['coin', 'star'], entrance: 'pop', z: 0.15, sfx: [{ at: 0, kind: 'drumroll' }] },
      { pose: 'surprised', text: 'C’est quoi ça… un robot maçon ?! 🤖', tier: 'blumi', bg: 1, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0, dur: 0.5, kind: 'shake' }] },
      { pose: 'sad', text: 'Il part en Lambo… et moi rien 😭', tier: 'blumi', bg: 1, entrance: 'slide-up', sfx: [{ at: 0, kind: 'heartbeat' }], fx: [{ at: 0, dur: 1.2, kind: 'grayscale' }] },
      { pose: 'angry', text: 'Abonne-toi, y’a pire demain 😤', tier: 'blumi', bg: 1, props: ['fire'], entrance: 'pop', sfx: [{ at: 0, kind: 'applause' }] },
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

  const backgrounds: PresBackground[] = spec.backgrounds.map((bs, i) => ({
    id: 'bg' + i,
    name: 'Fond ' + (i + 1),
    url: paintScene(bs),
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
  return normalizeDuration(fitPresentationToVoice(p))
}

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
// projets en mémoire (fonds intacts) pour en ouvrir un tout de suite. Idempotent :
// remplace les tournages du même nom (pas de doublons si on régénère).
export function seedViralShoots(): Project[] {
  const names = new Set(SHOOT_SPECS.map((s) => s.name))
  for (const p of listProjects()) if (names.has(p.name)) deleteProject(p.id)
  const shoots = buildViralShoots()
  for (const p of shoots) saveProject(p)
  try {
    localStorage.setItem(SEED_KEY, '1')
  } catch {
    /* ignore */
  }
  return shoots
}
