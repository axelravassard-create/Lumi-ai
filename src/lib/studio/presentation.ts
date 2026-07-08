// Moteur du mode « présentation » (« 1 jour une info sur ton métier »).
// Déterministe comme la cinématique : evalPresentation(project, t) → PresFrame.
// Blumi enchaîne des poses en parlant (voix + karaoké) devant des fonds qui
// défilent comme un diaporama. Les segments sont packés bout à bout (ordre du
// tableau) : « déplacer dans le temps » = réordonner + régler la durée.
import type { AvatarMood, PoseName, PresFrame, PresSegment, Project } from './types'
import { interpolate } from './script'
import { splitWords } from './timeline'
import { estimateSpeechSec } from './tts'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const uid = () => 's_' + Math.random().toString(36).slice(2, 9)

// Catalogue des poses proposées à l'édition (libellé + emoji repère). L'ordre
// ici = l'ordre du sélecteur. « Le maximum de poses » pour varier la présentation.
export const POSE_LIST: { pose: PoseName; label: string; emoji: string }[] = [
  { pose: 'presenter', label: 'Présente', emoji: '🧑‍🏫' },
  { pose: 'neutral', label: 'Neutre', emoji: '🙂' },
  { pose: 'greet', label: 'Salue', emoji: '👋' },
  { pose: 'point-left', label: 'Pointe ←', emoji: '👈' },
  { pose: 'point-right', label: 'Pointe →', emoji: '👉' },
  { pose: 'aside-left', label: 'De côté ←', emoji: '↙️' },
  { pose: 'aside-right', label: 'De côté →', emoji: '↘️' },
  { pose: 'look-up', label: 'Regarde en haut', emoji: '🔼' },
  { pose: 'idea', label: 'Idée !', emoji: '💡' },
  { pose: 'happy', label: 'Content', emoji: '😄' },
  { pose: 'surprised', label: 'Surpris', emoji: '😮' },
  { pose: 'concerned', label: 'Inquiet', emoji: '😟' },
  { pose: 'skeptical', label: 'Sceptique', emoji: '🤨' },
  { pose: 'wink', label: 'Clin d’œil', emoji: '😉' },
  { pose: 'proud', label: 'Fier', emoji: '😌' },
  { pose: 'closeup', label: 'Gros plan', emoji: '🔍' },
  { pose: 'thinking', label: 'Réfléchit', emoji: '🤔' },
  { pose: 'shy', label: 'Timide', emoji: '☺️' },
]

export function poseLabel(pose: PoseName): string {
  return POSE_LIST.find((p) => p.pose === pose)?.label ?? pose
}

// Repack les segments bout à bout dans l'ordre du tableau (start recalculé).
export function reflowPresentation(project: Project): Project {
  let t = 0
  const segments = project.presentation.segments.map((s) => {
    const dur = Math.max(0.4, Math.round(s.dur * 100) / 100)
    const seg = { ...s, dur, start: +t.toFixed(2) }
    t += dur
    return seg
  })
  return { ...project, presentation: { ...project.presentation, segments } }
}

// Durée totale de la présentation = fin du dernier segment.
export function presDuration(project: Project): number {
  const segs = project.presentation.segments
  if (!segs.length) return 4
  const last = segs[segs.length - 1]
  return Math.max(1, +(last.start + last.dur).toFixed(2))
}

export function newSegment(pose: PoseName = 'presenter', text = ''): PresSegment {
  return { id: uid(), pose, bgId: null, text, start: 0, dur: 3, mood: 'auto' }
}

export function addSegment(project: Project, seg?: PresSegment): Project {
  const segments = [...project.presentation.segments, seg ?? newSegment()]
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}

export function removeSegment(project: Project, id: string): Project {
  const segments = project.presentation.segments.filter((s) => s.id !== id)
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}

export function updateSegment(project: Project, id: string, patch: Partial<PresSegment>): Project {
  const segments = project.presentation.segments.map((s) => (s.id === id ? { ...s, ...patch } : s))
  // Un changement de durée décale les suivants → reflow.
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}

// Déplace un segment dans l'ordre (donc dans le temps) : -1 = plus tôt.
export function moveSegment(project: Project, id: string, dir: -1 | 1): Project {
  const segs = [...project.presentation.segments]
  const i = segs.findIndex((s) => s.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= segs.length) return project
  ;[segs[i], segs[j]] = [segs[j], segs[i]]
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments: segs } })
}

export function duplicateSegment(project: Project, id: string): Project {
  const segs = project.presentation.segments
  const i = segs.findIndex((s) => s.id === id)
  if (i < 0) return project
  const copy = { ...segs[i], id: uid() }
  const next = [...segs.slice(0, i + 1), copy, ...segs.slice(i + 1)]
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments: next } })
}

const BG_FADE = 0.5 // fondu entre deux diapos (s)
const EDGE_FADE = 0.16 // fondu d'apparition/disparition de Blumi aux bords

// Découpe le texte en mots révélés au fil de la fenêtre du segment (karaoké).
function karaoke(text: string, start: number, span: number, t: number) {
  const words = splitWords(text)
  if (!words.length) return []
  const per = span / words.length
  return words.map((w, i) => {
    const ws = start + i * per
    const we = ws + per
    return { text: w, active: t >= ws && t < we, done: t >= we }
  })
}

export function evalPresentation(project: Project, t: number): PresFrame {
  const pm = project.presentation
  const segs = pm.segments
  const metier = project.script.metier || 'ton métier'
  const title = interpolate(pm.title || '', metier, project.script.score)

  // Segment actif : le dernier dont le start est passé.
  let idx = -1
  for (let i = 0; i < segs.length; i++) if (t >= segs[i].start - 0.001) idx = i
  const seg = idx >= 0 ? segs[idx] : segs[0]

  if (!seg) {
    return {
      t, segIndex: -1, pose: 'presenter', mood: 'neutral', speaking: false,
      avatarAlpha: 0, bgId: null, bgPrevId: null, bgFade: 1, words: [], title, showTitle: pm.showTitle,
    }
  }

  const segStart = seg.start
  const segEnd = seg.start + seg.dur

  // Présence de Blumi : fondu doux aux bords (comme les moments).
  let avatarAlpha = 1
  if (t < segStart) avatarAlpha = clamp(1 - (segStart - t) / EDGE_FADE)
  else if (t > segEnd) avatarAlpha = clamp(1 - (t - segEnd) / EDGE_FADE)

  // Fond courant + fondu depuis le fond précédent (diapo qui défile).
  const bgId = seg.bgId
  const prev = idx > 0 ? segs[idx - 1] : null
  const bgPrevId = prev && prev.bgId !== bgId ? prev.bgId : null
  const bgFade = bgPrevId ? clamp((t - segStart) / BG_FADE) : 1

  // Texte dit, révélé mot à mot sur ~90 % du segment.
  const text = interpolate(seg.text || '', metier, project.script.score)
  const words = karaoke(text, segStart + 0.15, Math.max(0.4, seg.dur * 0.9), t)
  const speaking = words.some((w) => w.active)

  // Humeur : celle de la pose (auto) ou forcée sur le segment.
  const forced = seg.mood && seg.mood !== 'auto' ? (seg.mood as AvatarMood) : null
  const mood: AvatarMood = forced ?? 'neutral'

  return {
    t,
    segIndex: idx,
    pose: seg.pose,
    mood,
    speaking,
    avatarAlpha,
    bgId,
    bgPrevId,
    bgFade,
    words,
    title,
    showTitle: pm.showTitle && !!title,
  }
}

// Réplique dite par un segment (texte brut, pour la voix off).
export function segmentLine(seg: PresSegment, project: Project): string {
  return interpolate(seg.text || '', project.script.metier, project.script.score)
}

// Cale la durée de chaque diapo sur le temps de parole de son texte (jamais en
// dessous d'un minimum lisible), puis repack.
export function fitPresentationToVoice(project: Project): Project {
  const rate = project.audio.voiceRate || 1
  const segments = project.presentation.segments.map((s) => {
    const need = estimateSpeechSec(segmentLine(s, project), rate)
    return { ...s, dur: Math.max(1.4, +need.toFixed(2)) }
  })
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}
