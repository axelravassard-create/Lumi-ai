// Bibliothèque virale : accroches (hooks), CTA/comment-bait et presets de
// cinématique. {METIER}/{SCORE} sont remplacés à l'affichage (voir script.ts).
import type { BeatDef, ScriptModel } from './types'
import { BEAT_ORDER } from './types'

export const HOOKS: string[] = [
  'L\'IA va-t-elle voler ce job ? 👀',
  'Ce métier existera-t-il encore en 2030 ? 🤖',
  'Si tu es {METIER}, regarde jusqu\'au bout 😳',
  'POV : une IA vient d\'analyser ton métier 🫣',
  'J\'ai demandé à une IA si {METIER} allait disparaître 💀',
  'Le score que ton patron ne veut pas que tu voies 📉',
  'Ton job en 2030 : remplacé ou augmenté ? 🤔',
  'Tag un(e) {METIER} qui doit voir ça 👇',
  '{SCORE}% des {METIER} ignorent que leur job est menacé…',
  'Découvre en 15 s si l\'IA va te piquer ton job ⏱️',
  'Personne ne veut te dire ça sur le métier de {METIER} 🤐',
  'Arrête de scroller si tu es {METIER} 🛑',
  'En 2027, {METIER} ça ressemblera à ça 👇',
  'L\'IA a mis {SCORE}% à ce métier… tu vas halluciner 😱',
]

export const CTAS: string[] = [
  'Commente ton métier, je te fais ton score 👇',
  'Toi c\'est quoi ton job ? Dis-le 👇',
  'Envoie ça à un(e) {METIER} 📲',
  'Enregistre avant que ton métier change 🔖',
  'D\'accord ou pas ? Dis-le en commentaire 💬',
  'Score trop haut ou trop bas ? Donne le tien 👇',
]

// Trois actions « solution » par défaut (le payoff qui déclenche le save).
export const DEFAULT_ACTIONS = [
  { icon: '⚙️', text: 'Automatise tes tâches' },
  { icon: '🧠', text: 'Apprends l\'IA' },
  { icon: '📈', text: 'Monte en valeur' },
]

export const PIVOTS = [
  'Mais tout n\'est pas perdu…',
  'Sauf que… il y a une solution 👇',
  'Attends. Respire. Voilà le plan 👇',
]

// ── Presets de cinématique ───────────────────────────────────────────────────
// Chaque preset ré-agence les durées des beats + ambiance. total ≈ 15 s.
export interface Preset {
  id: string
  name: string
  emoji: string
  desc: string
  duration: number
  beats: BeatDef[]
  patch?: Partial<ScriptModel>
}

// Fabrique une liste de beats à partir de durées (ordre fixe).
function seq(durs: number[]): BeatDef[] {
  let t = 0
  return BEAT_ORDER.map((id, i) => {
    const b: BeatDef = { id, start: +t.toFixed(2), dur: durs[i] }
    t += durs[i]
    return b
  })
}

export const PRESETS: Preset[] = [
  {
    id: 'doom-glowup',
    name: 'Doom → Glow-up',
    emoji: '😱→😎',
    desc: 'Peur maximale puis délivrance. Le classique qui convertit.',
    duration: 15,
    beats: seq([1.0, 3.0, 3.0, 1.5, 1.5, 3.5, 1.5]),
  },
  {
    id: 'pov-analyse',
    name: 'POV analyse',
    emoji: '🫣',
    desc: 'Le spectateur EST scanné. Immersion, scan plus long, verdict choc.',
    duration: 15,
    beats: seq([0.8, 4.0, 3.2, 1.0, 1.2, 3.3, 1.5]),
    patch: { hook: 'POV : une IA vient d\'analyser ton métier 🫣' },
  },
  {
    id: 'tier-list',
    name: 'Tier list des métiers',
    emoji: '🏆',
    desc: 'Verdict express, punch rapide, gros focus sur les 3 actions.',
    duration: 13,
    beats: seq([0.8, 2.2, 2.5, 1.0, 1.0, 4.0, 1.5]),
    patch: { hook: 'Ton job en 2030 : remplacé ou augmenté ? 🤔' },
  },
  {
    id: 'choc-express',
    name: 'Choc express',
    emoji: '⚡',
    desc: 'Ultra court (12 s), hook + verdict immédiats. Complétion maximale.',
    duration: 12,
    beats: seq([0.7, 1.6, 3.2, 0.8, 1.2, 3.0, 1.5]),
    patch: { hook: 'L\'IA a mis {SCORE}% à ce métier… tu vas halluciner 😱' },
  },
  {
    id: 'storytime',
    name: 'Storytime',
    emoji: '🎙️',
    desc: 'Scan long et immersif, montée de tension, révélation appuyée.',
    duration: 16,
    beats: seq([1.0, 4.5, 3.0, 1.5, 1.5, 3.0, 1.5]),
    patch: { hook: 'J\'ai demandé à une IA si {METIER} allait disparaître 💀' },
  },
]

// Beats par défaut = preset « Doom → Glow-up » (beat sheet de référence).
export const DEFAULT_BEATS = PRESETS[0].beats
export const DEFAULT_DURATION = PRESETS[0].duration
