// Sauvegarde / chargement multi-projets (localStorage). Les médias (vidéo,
// musique) NE sont PAS persistés (object-URLs éphémères) : on garde les réglages,
// l'utilisateur ré-importe son fichier au besoin.
import type { BeatDef, BeatKind, PresentationModel, Project } from './types'
import { BEAT_ORDER } from './types'
import { DEFAULT_BEATS, DEFAULT_DURATION } from './library'
import { defaultScript, voiceLineFor } from './script'
import { estimateSpeechSec } from './tts'
import { presDuration, reflowPresentation } from './presentation'

// Présentation de départ (« 1 jour, 1 info ») : quelques diapos parlées prêtes
// à personnaliser, pour ne pas partir d'un écran vide.
function defaultPresentation(): PresentationModel {
  const segs = [
    { pose: 'greet' as const, text: 'Salut ! Aujourd’hui, une info qui change tout pour les {METIER}.', x: 0, z: 0 },
    { pose: 'presenter' as const, text: 'L’IA transforme déjà une grande partie de tes tâches quotidiennes.', x: -0.3, z: 0 },
    { pose: 'idea' as const, text: 'Mais bien utilisée, elle te fait gagner un temps fou.', x: 0.3, z: 0.15 },
    { pose: 'point-right' as const, text: 'Voici comment en tirer parti dès maintenant.', x: -0.2, z: 0 },
    { pose: 'happy' as const, text: 'Abonne-toi pour une nouvelle info chaque jour !', x: 0, z: 0.1 },
  ]
  let t = 0
  const segments = segs.map((s, i) => {
    const dur = 3
    // 'glide' = déplacement fluide entre diapos par défaut (modifiable par diapo).
    const seg = { id: 'seg_' + i, pose: s.pose, bgId: null, text: s.text, start: +t.toFixed(2), dur, mood: 'auto' as const, x: s.x, y: 0, z: s.z, entrance: 'glide' as const }
    t += dur
    return seg
  })
  return { title: '1 jour, 1 info · {METIER}', showTitle: true, segments, backgrounds: [], sfx: [], fx: [] }
}

// Allonge chaque moment actif pour que la voix off ait le temps de finir sa
// réplique (sans jamais raccourcir en dessous de la durée visuelle voulue),
// puis resserre bout à bout et ajuste la durée totale.
export function fitToVoice(project: Project): Project {
  const rate = project.audio.voiceRate || 1
  const ordered = BEAT_ORDER.map((id) => project.beats.find((b) => b.id === id)).filter(Boolean) as BeatDef[]
  let t = 0
  const placed = ordered.map((b) => {
    if (b.enabled === false) return { ...b }
    const line = project.audio.voice ? voiceLineFor(b.id, project.script).text : ''
    const need = estimateSpeechSec(line, rate)
    const dur = Math.max(b.dur, +need.toFixed(2), 0.6)
    const nb = { ...b, start: +t.toFixed(2), dur }
    t += dur
    return nb
  })
  const total = Math.max(4, +t.toFixed(2))
  const final = placed.map((b) => (b.enabled === false ? { ...b, start: total } : b))
  return { ...project, beats: final, duration: total }
}

// Resserre les moments actifs bout à bout (dans l'ordre canonique) et ajuste la
// durée totale ; les moments masqués sont parqués à la fin (hors déroulé).
export function compactBeats(project: Project): Project {
  const ordered = BEAT_ORDER.map((id) => project.beats.find((b) => b.id === id)).filter(Boolean) as BeatDef[]
  let t = 0
  const placed = ordered.map((b) => {
    if (b.enabled === false) return { ...b }
    const nb = { ...b, start: +t.toFixed(2) }
    t += b.dur
    return nb
  })
  const total = Math.max(4, +t.toFixed(2))
  const final = placed.map((b) => (b.enabled === false ? { ...b, start: total } : b))
  return { ...project, beats: final, duration: total }
}

const KEY = 'blumi.studio.projects'
const CUR = 'blumi.studio.current'

export function newProject(metier = 'Développeur·se', score = 73, level = 'Élevé'): Project {
  return {
    id: 'p_' + Math.random().toString(36).slice(2, 9),
    name: metier || 'Nouveau clip',
    mode: 'cinematic',
    fmt: '9:16',
    duration: DEFAULT_DURATION,
    autoDuration: true,
    showSafeZones: true,
    platform: 'tiktok',
    background: null,
    script: defaultScript(metier, score, level),
    beats: DEFAULT_BEATS.map((b) => ({ ...b })),
    presentation: defaultPresentation(),
    caption: { enabled: true, style: 'tiktok', posY: 0.2, scale: 1, timing: 'auto', offset: 0, pace: 1 },
    audio: {
      voice: true,
      voiceName: '',
      voiceVolume: 1,
      voiceRate: 1.08,
      musicUrl: '',
      musicName: '',
      musicVolume: 0.5,
      musicStart: 0,
      musicFrom: 0,
      musicTo: 0,
      sfx: true,
      sfxVolume: 0.8,
      duck: true,
    },
    character: { tier: 'blumiman', scale: 1, x: 0, y: 0, entrance: 'pop', mood: 'auto' },
    tempo: { bpm: 120, enabled: false },
    preset: 'doom-glowup',
    updatedAt: Date.now(),
  }
}

// Complète les projets enregistrés avant l'ajout de certains champs.
function migrate(p: Project): Project {
  const d = newProject()
  return {
    ...p,
    mode: p.mode ?? 'cinematic',
    autoDuration: p.autoDuration ?? true,
    presentation: p.presentation
      ? { ...d.presentation, ...p.presentation, backgrounds: p.presentation.backgrounds ?? [], sfx: p.presentation.sfx ?? [], fx: p.presentation.fx ?? [] }
      : d.presentation,
    caption: { ...d.caption, ...p.caption },
    audio: { ...d.audio, ...p.audio },
    character: { ...d.character, ...p.character },
    tempo: { ...d.tempo, ...(p.tempo ?? {}) },
  }
}

// Déplace un moment dans le temps (fixe son début, libre). Min 0 s.
export function setBeatStart(project: Project, id: BeatKind, startRaw: number): Project {
  const start = Math.max(0, Math.round(startRaw * 100) / 100)
  return { ...project, beats: project.beats.map((b) => (b.id === id ? { ...b, start } : b)) }
}

// Change la durée d'un moment et décale les moments suivants pour rester calé
// (préserve l'ordre et les éventuels espaces). Min 0,3 s.
export function setBeatDur(project: Project, id: BeatKind, durRaw: number): Project {
  const dur = Math.max(0.3, Math.round(durRaw * 100) / 100)
  const target = project.beats.find((b) => b.id === id)
  if (!target || dur === target.dur) return project
  const delta = dur - target.dur
  const end = target.start + target.dur
  const beats = project.beats.map((b) => {
    if (b.id === id) return { ...b, dur }
    if (b.enabled !== false && b.start >= end - 0.001) return { ...b, start: Math.max(0, +(b.start + delta).toFixed(2)) }
    return b
  })
  return { ...project, beats }
}

// Lie la durée de la vidéo à la fin du dernier moment/segment actif (si autoDuration).
export function normalizeDuration(p: Project): Project {
  if (p.mode === 'presentation') {
    const rp = reflowPresentation(p) // garde les segments packés bout à bout
    if (!rp.autoDuration) return rp
    const end = presDuration(rp)
    return end === rp.duration ? rp : { ...rp, duration: end }
  }
  if (!p.autoDuration) return p
  const ends = p.beats.filter((b) => b.enabled !== false).map((b) => +(b.start + b.dur).toFixed(2))
  const end = Math.max(4, ...ends, 4)
  return end === p.duration ? p : { ...p, duration: end }
}

// Retire les médias non sérialisables avant sauvegarde. On CONSERVE les URL
// `data:` (ex. fonds dégradés générés par les « tournages viraux ») car ce sont
// des chaînes persistables ; on ne retire que les object-URLs (`blob:`) éphémères.
function keepUrl(u: string | undefined | null): string {
  return u && u.startsWith('data:') ? u : ''
}
function serializable(p: Project): Project {
  const bg = p.background ? { ...p.background, url: keepUrl(p.background.url) } : null
  const presentation = { ...p.presentation, backgrounds: p.presentation.backgrounds.map((b) => ({ ...b, url: keepUrl(b.url) })) }
  return { ...p, background: bg, presentation, audio: { ...p.audio, musicUrl: keepUrl(p.audio.musicUrl) } }
}

export function listProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as Project[]
    return Array.isArray(arr) ? arr.map(migrate).sort((a, b) => b.updatedAt - a.updatedAt) : []
  } catch {
    return []
  }
}

export function saveProject(p: Project) {
  const all = listProjects().filter((x) => x.id !== p.id)
  const next = { ...serializable(p), updatedAt: Date.now() }
  all.unshift(next)
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 40)))
    localStorage.setItem(CUR, p.id)
  } catch {
    /* quota — ignore */
  }
}

export function deleteProject(id: string) {
  const all = listProjects().filter((x) => x.id !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function duplicateProject(p: Project): Project {
  return { ...structuredClone(serializable(p)), id: 'p_' + Math.random().toString(36).slice(2, 9), name: p.name + ' (copie)', updatedAt: Date.now() }
}

export function loadCurrent(): Project | null {
  const id = localStorage.getItem(CUR)
  if (!id) return null
  return listProjects().find((x) => x.id === id) ?? null
}
