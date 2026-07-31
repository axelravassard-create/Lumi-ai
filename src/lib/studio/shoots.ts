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
    // JPEG (pas PNG) : les fonds sont opaques et lisses → JPEG ~10× plus léger,
    // essentiel pour tenir 10 tournages × 2 fonds sous le quota localStorage. Un
    // data-URI JPEG ne « tainte » pas non plus le canvas à l'export.
    return c.toDataURL('image/jpeg', 0.72)
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
  // Persona présentateur (attachement) : un rituel récurrent encadre le sujet —
  // intro « Salut, c'est Blumi 👋 {hook} » + sortie chaleureuse. `host: false` pour
  // les sketchs (ex. le maçon) qui ne sont pas « Blumi présentateur ».
  host?: boolean
  intro?: string // accroche dite juste après « Salut, c'est Blumi ! 👋 »
  outro?: string // phrase de clôture, avant « Abonne-toi, à demain ! 💙 »
  segments: SegSpec[] // le CORPS (les points de valeur) ; l'intro/outro sont ajoutés
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
    metier: 'Métiers de demain', score: 20, level: 'Faible', bpm: 126,
    title: 'Les métiers qui vont exploser grâce à l’IA',
    backgrounds: [{ style: 'tvstudio', colors: TECH, icon: '🤖' }, { style: 'tvstudio', colors: GOLD, icon: '🚀' }],
    intro: 'aujourd’hui, ces métiers vont EXPLOSER grâce à l’IA 👇',
    outro: 'Lequel te tente le plus ?',
    segments: [
      { pose: 'point-right', text: 'Prompt engineer : déjà 100 000 € par an 🤯', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'point-left', text: 'Auditeur d’IA : le métier que personne connaît 🔎', tier: 'blumi', bg: 0, props: ['magnifier'], entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'idea', text: 'Éthicien de l’IA, dresseur de robots… c’est réel.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', z: 0.15, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'Ceux qui DIRIGENT l’IA raflent tout 🚀', tier: 'bluminator', bg: 1, props: ['rocket'], sfx: [{ at: 0, kind: 'sting' }] },
    ],
  },
  {
    name: '💬 La phrase qui va te faire flipper',
    metier: 'Ton métier', score: 64, level: 'Élevé', bpm: 112,
    title: 'La phrase sur l’IA qui va te faire réfléchir',
    backgrounds: [{ style: 'quote', colors: PURPLE, icon: '💬' }, { style: 'quote', colors: DOOM, icon: '⚠️' }],
    intro: 'écoute bien cette phrase sur l’IA… 😳',
    outro: 'Enregistre-la, relis-la dans 1 an.',
    segments: [
      { pose: 'thinking', text: '« L’IA ne prendra pas ton job… »', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'riser' }] },
      { pose: 'surprised', text: '« …mais quelqu’un qui l’utilise, oui. » 😳', tier: 'blumi', bg: 1, entrance: 'zoom', z: 0.2, sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'concerned', text: '90% des tâches vont changer d’ici 5 ans.', tier: 'blumi', bg: 1, entrance: 'glide', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'idea', text: 'La seule règle : apprends à la piloter.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'S’y mettre maintenant = 3 ans d’avance.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'ding' }] },
    ],
  },
  {
    name: '🔮 En 2030, ton métier ressemblera à ça',
    metier: 'Ton métier', score: 58, level: 'Moyen', bpm: 120,
    title: 'En 2030, ton métier ressemblera à ça',
    backgrounds: [{ style: 'grid', colors: TECH, icon: '🔮' }, { style: 'grid', colors: NIGHT, icon: '🤖' }],
    intro: 'je te montre à quoi ressemblera ton métier en 2030 🔮',
    outro: 'Prêt pour 2030 ?',
    segments: [
      { pose: 'surprised', text: 'Tu bosseras AVEC une IA, pas contre elle.', tier: 'blumi', bg: 0, entrance: 'slide-up', sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.25, kind: 'flash' }] },
      { pose: 'point-right', text: 'Elle fait 80% du répétitif…', tier: 'blumi', bg: 1, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'proud', text: '…toi : créer, décider, ressentir 🧠', tier: 'blumiman', bg: 1, entrance: 'pop', z: 0.15, sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'idea', text: 'Le futur est aux hybrides humain + IA.', tier: 'blumiman', bg: 1, props: ['lightbulb'], sfx: [{ at: 0, kind: 'sting' }] },
    ],
  },
  {
    name: '🎯 Le vrai danger, c’est pas l’IA',
    metier: 'Ton métier', score: 61, level: 'Moyen', bpm: 118,
    title: 'Le vrai danger, c’est pas l’IA',
    backgrounds: [{ style: 'spotlight', colors: DOOM, icon: '🎯' }, { style: 'spotlight', colors: GOLD, icon: '💡' }],
    intro: 'le vrai danger avec l’IA, c’est PAS ce que tu crois.',
    outro: 'Tu commences quand ? Dis-le 👇',
    segments: [
      { pose: 'concerned', text: 'Le danger, c’est de faire comme si elle existait pas.', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'riser' }], fx: [{ at: 0, dur: 0.4, kind: 'shake' }] },
      { pose: 'skeptical', text: '« Moi ça me concerne pas »… si, justement. 😳', tier: 'blumi', bg: 0, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'idea', text: '1h par jour à la comprendre = intouchable.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'Prends 30 minutes ce soir. Commence.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'ding' }] },
    ],
  },
  {
    name: '⚡ 5 tâches à déléguer à l’IA',
    metier: 'Ton métier', score: 52, level: 'Moyen', bpm: 128,
    title: '5 tâches à déléguer à l’IA aujourd’hui',
    backgrounds: [{ style: 'news', colors: TECH, icon: '⚡' }, { style: 'news', colors: GREEN, icon: '✅' }],
    intro: 'voici 5 tâches à refiler à l’IA dès aujourd’hui ⚡',
    outro: '+2h par jour. Enregistre pour tester 🔖',
    segments: [
      { pose: 'point-right', text: '1. Tes mails qui traînent 📩', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'point-left', text: '2. Tes comptes rendus de réunion 📝', tier: 'blumi', bg: 0, entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'point-right', text: '3. Ton tri de données interminable 📊', tier: 'blumi', bg: 1, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'idea', text: '4. Tes premières idées… 5. Ta veille 🧠', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
    ],
  },
  {
    name: '📖 Storytime : l’IA a fait mon taf',
    metier: 'Ton métier', score: 66, level: 'Élevé', bpm: 116,
    title: 'Le jour où l’IA a fait mon boulot en 2 minutes',
    backgrounds: [{ style: 'spotlight', colors: NIGHT, icon: '📖' }, { style: 'spotlight', colors: GOLD, icon: '💡' }],
    intro: 'storytime : le jour où l’IA a fait mon taf en 2 minutes 😅',
    outro: 'Toi, ton pire « oh non » avec l’IA ? 👇',
    segments: [
      { pose: 'presenter', text: 'J’avais 3 heures de boulot devant moi.', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'riser' }] },
      { pose: 'afraid', text: 'Un pote me montre un outil. 2 minutes. C’était fait. 😳', tier: 'blumi', bg: 0, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }], fx: [{ at: 0, dur: 0.4, kind: 'shake' }] },
      { pose: 'thinking', text: 'J’ai eu peur… puis j’ai compris.', tier: 'blumi', bg: 1, entrance: 'glide', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'proud', text: 'Maintenant je fais en 1h ce qui prenait 1 journée 🚀', tier: 'blumiman', bg: 1, props: ['rocket'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
    ],
  },
  {
    name: '⚠️ 3 erreurs qui coûtent ton job',
    metier: 'Ton métier', score: 70, level: 'Élevé', bpm: 124,
    title: '3 erreurs qui vont te coûter ton job face à l’IA',
    backgrounds: [{ style: 'news', colors: DOOM, icon: '⚠️' }, { style: 'news', colors: GOLD, icon: '🧠' }],
    intro: '3 erreurs qui vont te coûter ton job face à l’IA ⚠️',
    outro: 'Tu fais laquelle ? Sois honnête 👇',
    segments: [
      { pose: 'point-right', text: '1. Croire que ça te concerne pas.', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.05, dur: 0.3, kind: 'shake' }] },
      { pose: 'point-left', text: '2. Attendre « le bon moment ».', tier: 'blumi', bg: 0, entrance: 'slide-left', x: 0.3, sfx: [{ at: 0, kind: 'ding' }] },
      { pose: 'concerned', text: '3. Refuser d’apprendre 20 min par jour.', tier: 'blumi', bg: 1, entrance: 'zoom', sfx: [{ at: 0, kind: 'sting' }] },
      { pose: 'idea', text: 'L’IA récompense les curieux. Sois-en un.', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
    ],
  },
  {
    name: '🔁 Une journée : avant / après l’IA',
    metier: 'Ton métier', score: 57, level: 'Moyen', bpm: 118,
    title: 'Ta journée de travail : avant vs après l’IA',
    backgrounds: [{ style: 'gradient', colors: DOOM, icon: '😮‍💨' }, { style: 'gradient', colors: GREEN, icon: '✨' }],
    intro: 'ta journée de travail : avant vs après l’IA 🔁',
    outro: 'Ta journée, elle est à quel stade ? 👇',
    segments: [
      { pose: 'concerned', text: 'AVANT : 8h de tâches, zéro temps pour créer.', tier: 'blumi', bg: 0, sfx: [{ at: 0, kind: 'whoosh' }], fx: [{ at: 0, dur: 1, kind: 'grayscale' }] },
      { pose: 'surprised', text: 'APRÈS : l’IA gère toute la paperasse. 😮', tier: 'blumi', bg: 1, entrance: 'zoom', sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'happy', text: 'Toi : tu te concentres sur ce qui compte 💡', tier: 'blumiman', bg: 1, props: ['lightbulb'], entrance: 'pop', sfx: [{ at: 0, kind: 'shimmer' }] },
      { pose: 'proud', text: 'Même job. 2× plus d’impact.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'sting' }] },
    ],
  },
  {
    name: '💰 L’IA et ton salaire',
    metier: 'Ton métier', score: 60, level: 'Moyen', bpm: 122,
    title: 'Personne t’a dit ça sur l’IA et ton salaire',
    backgrounds: [{ style: 'quote', colors: GOLD, icon: '💰' }, { style: 'grid', colors: TECH, icon: '📈' }],
    intro: 'personne t’a dit ça sur l’IA et ton salaire 💰',
    outro: 'Tu négocies quand ta prochaine augmentation ? 👇',
    segments: [
      { pose: 'surprised', text: 'Même poste : +30% pour ceux qui maîtrisent l’IA. 🤯', tier: 'blumi', bg: 0, entrance: 'zoom', sfx: [{ at: 0, kind: 'ding' }], fx: [{ at: 0.1, dur: 0.3, kind: 'flash' }] },
      { pose: 'point-right', text: 'Les recruteurs le demandent DÉJÀ.', tier: 'blumi', bg: 0, entrance: 'slide-right', x: -0.3, sfx: [{ at: 0, kind: 'whoosh' }] },
      { pose: 'idea', text: 'Ajoute « IA » à tes compétences → tu vaux plus.', tier: 'blumiman', bg: 1, props: ['lightbulb', 'coin'], entrance: 'pop', sfx: [{ at: 0, kind: 'coin' }] },
      { pose: 'proud', text: 'C’est pas du futur. C’est maintenant.', tier: 'blumiman', bg: 1, sfx: [{ at: 0, kind: 'sting' }] },
    ],
  },
  {
    name: '😂 Le maçon vs l’IA',
    metier: 'Maçon·ne', score: 55, level: 'Moyen', bpm: 130,
    title: 'Le maçon vs l’IA',
    host: false,
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

  // Rituel présentateur (attachement) : intro « Salut, c'est Blumi 👋 {hook} » avec
  // micro, et sortie chaleureuse « … Abonne-toi, à demain ! 💙 » avec cœur.
  const lastBg = Math.max(0, spec.backgrounds.length - 1)
  const body: SegSpec[] = []
  if (spec.host !== false) {
    body.push({ pose: 'greet', text: `Salut, c'est Blumi ! 👋 ${spec.intro ?? ''}`.trim(), tier: 'blumi', bg: 0, props: ['mic'], entrance: 'pop', sfx: [{ at: 0, kind: 'pop' }] })
  }
  body.push(...spec.segments)
  if (spec.host !== false) {
    body.push({ pose: 'love', text: `${spec.outro ?? ''} Abonne-toi, à demain ! 💙`.trim(), tier: 'blumiman', bg: lastBg, props: ['heart'], entrance: 'zoom', sfx: [{ at: 0, kind: 'applause' }], fx: [{ at: 0, dur: 1, kind: 'vignette' }] })
  }

  const sfx: PresSfxCue[] = []
  const fx: PresFxCue[] = []
  const segments: PresSegment[] = body.map((s, i) => {
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
