// Moteur du mode « présentation » (« 1 jour une info sur ton métier »).
// Déterministe comme la cinématique : evalPresentation(project, t) → PresFrame.
// Blumi enchaîne des poses en parlant (voix + karaoké) devant des fonds qui
// défilent comme un diaporama. Les segments sont packés bout à bout (ordre du
// tableau) : « déplacer dans le temps » = réordonner + régler la durée.
import type { AvatarMood, AvatarTier, PoseName, PresEntrance, PresFrame, PresSegment, PresSfxCue, Project, PropName } from './types'
import type { SfxKind, SfxMarker } from './audio'
import { interpolate } from './script'
import { splitWords } from './timeline'
import { estimateSpeechSec } from './tts'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3)
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const lerp = (a: number, b: number, g: number) => a + (b - a) * g
// Rebond élastique pour l'entrée « pop » (petit → grand avec dépassement).
function elastic(p: number): number {
  p = clamp(p)
  if (p === 0 || p === 1) return p
  const c = (2 * Math.PI) / 3
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c) + 1
}
const uid = () => 's_' + Math.random().toString(36).slice(2, 9)

// Catalogue des apparitions (libellé pour l'UI).
export const ENTRANCE_LIST: { value: PresEntrance; label: string }[] = [
  { value: 'glide', label: 'Glisser (fluide)' },
  { value: 'none', label: 'Direct (coupe)' },
  { value: 'fade', label: 'Fondu' },
  { value: 'pop', label: 'Pop' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'slide-up', label: 'Par le bas' },
  { value: 'slide-left', label: 'Depuis la gauche' },
  { value: 'slide-right', label: 'Depuis la droite' },
]

export const TIER_LIST: { value: AvatarTier; label: string; emoji: string }[] = [
  { value: 'blumi', label: 'Blumi', emoji: '🤖' },
  { value: 'blumiman', label: 'Blumiman', emoji: '🤓' },
  { value: 'bluminator', label: 'Bluminator', emoji: '👨‍💻' },
]

// Bruitages disponibles (mêmes SFX synthétisés que la cinématique) + libellés.
export const SFX_LIST: { kind: SfxKind; label: string; emoji: string; hint: string }[] = [
  { kind: 'pop', label: 'Pop', emoji: '💥', hint: 'apparition / punch' },
  { kind: 'whoosh', label: 'Woosh', emoji: '🌬️', hint: 'transition / swipe' },
  { kind: 'riser', label: 'Montée', emoji: '📈', hint: 'tension / anticipation' },
  { kind: 'sting', label: 'Impact', emoji: '💢', hint: 'choc / révélation' },
  { kind: 'shimmer', label: 'Éclat', emoji: '✨', hint: 'magique / positif' },
  { kind: 'applause', label: 'Applaudissements', emoji: '👏', hint: 'public / bravo' },
]

export function sfxLabel(kind: SfxKind): string {
  return SFX_LIST.find((s) => s.kind === kind)?.label ?? kind
}

// Le « casier » de Blumi : objets amusants à attacher au personnage (par diapo).
export const PROP_LIST: { value: PropName; label: string; emoji: string }[] = [
  { value: 'none', label: 'Aucun', emoji: '🚫' },
  { value: 'pointer', label: 'Pointeur', emoji: '🪄' },
  { value: 'magnifier', label: 'Loupe', emoji: '🔍' },
  { value: 'lightbulb', label: 'Ampoule', emoji: '💡' },
  { value: 'mic', label: 'Micro', emoji: '🎤' },
  { value: 'party-hat', label: 'Chapeau', emoji: '🎉' },
  { value: 'grad-cap', label: 'Diplôme', emoji: '🎓' },
  { value: 'crown', label: 'Couronne', emoji: '👑' },
]

// Émotion de la voix par pose (deltas de hauteur/débit) → la voix « colle » à la
// pose visible : chaleureuse pour saluer, grave pour inquiéter, vive pour surprise.
const POSE_PROSODY: Partial<Record<PoseName, { pitch: number; rate: number }>> = {
  greet: { pitch: 0.18, rate: 0.03 },
  happy: { pitch: 0.22, rate: 0.06 },
  idea: { pitch: 0.16, rate: 0.04 },
  surprised: { pitch: 0.32, rate: 0.08 },
  proud: { pitch: 0.06, rate: -0.03 },
  wink: { pitch: 0.14, rate: 0.02 },
  'point-left': { pitch: 0.1, rate: 0.04 },
  'point-right': { pitch: 0.1, rate: 0.04 },
  concerned: { pitch: -0.16, rate: -0.08 },
  skeptical: { pitch: -0.08, rate: -0.05 },
  thinking: { pitch: -0.06, rate: -0.06 },
  shy: { pitch: 0.06, rate: -0.06 },
  'look-up': { pitch: 0.1, rate: 0.02 },
}

// Prosodie finale d'une réplique : hauteur + débit, d'après la pose ET la
// ponctuation (! plus vif, ? plus haut, … plus posé). Rend la voix moins robotique.
export function presProsody(seg: PresSegment, project: Project): { pitch: number; rate: number } {
  const base = POSE_PROSODY[seg.pose] ?? { pitch: 0, rate: 0 }
  const text = segmentLine(seg, project).trim()
  let pitchP = 0
  let rateP = 0
  if (/!\s*$/.test(text)) { pitchP += 0.08; rateP += 0.05 }
  if (/\?\s*$/.test(text)) { pitchP += 0.12 }
  if (/(\.\.\.|…)\s*$/.test(text)) { rateP -= 0.06 }
  const pitch = clamp(1.05 + base.pitch + pitchP, 0.6, 1.8)
  const rate = Math.max(0.6, (project.audio.voiceRate || 1) * (1 + base.rate + rateP))
  return { pitch, rate }
}

// Personnage d'une diapo → attributs visuels (lunettes / ordi).
export function tierOf(seg: PresSegment): AvatarTier {
  return seg.tier ?? 'blumi'
}
function tierLook(tier: AvatarTier): { glasses: boolean; laptop: boolean } {
  return { glasses: tier !== 'blumi', laptop: tier === 'bluminator' }
}

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
  return { id: uid(), pose, bgId: null, text, start: 0, dur: 3, mood: 'auto', tier: 'blumi', x: 0, y: 0, z: 0, entrance: 'glide' }
}

export function addSegment(project: Project, seg?: PresSegment): Project {
  const segments = [...project.presentation.segments, seg ?? newSegment()]
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}

export function removeSegment(project: Project, id: string): Project {
  const segments = project.presentation.segments.filter((s) => s.id !== id)
  return reflowPresentation({ ...project, presentation: { ...project.presentation, segments } })
}

// Importe une image de fond ET l'assigne directement à une diapo (le fond
// rejoint aussi le pool, réutilisable sur d'autres diapos).
export function addBackgroundToSegment(project: Project, segId: string, bg: { name: string; url: string }): Project {
  const id = 'bg_' + Math.random().toString(36).slice(2, 9)
  const backgrounds = [...project.presentation.backgrounds, { id, name: bg.name, url: bg.url, crop: { zoom: 1, x: 0, y: 0 } }]
  const segments = project.presentation.segments.map((s) => (s.id === segId ? { ...s, bgId: id } : s))
  return reflowPresentation({ ...project, presentation: { ...project.presentation, backgrounds, segments } })
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
const ENTRANCE_DUR = 0.5 // durée de l'animation d'apparition du personnage (s)
const MOVE_DUR = 0.6 // durée du glissement fluide de position/profondeur entre diapos (s)

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
      glasses: false, laptop: false, prop: 'none', avatarAlpha: 0, posX: 0, posY: 0, posScale: 1,
      avatarScale: 1, avatarDX: 0, avatarDY: 0,
      bgId: null, bgPrevId: null, bgFade: 1, words: [], title, showTitle: false, titleOut: 0,
    }
  }

  const segStart = seg.start
  const segEnd = seg.start + seg.dur

  // Présence de Blumi : fondu doux aux bords (comme les moments).
  let avatarAlpha = 1
  if (t < segStart) avatarAlpha = clamp(1 - (segStart - t) / EDGE_FADE)
  else if (t > segEnd) avatarAlpha = clamp(1 - (t - segEnd) / EDGE_FADE)

  // Personnage de la diapo (blumi / blumiman / bluminator).
  const { glasses, laptop } = tierLook(tierOf(seg))

  // Transition choisie sur la diapo. « Glisser » = la position (x/y) et la
  // profondeur (z) glissent en douceur depuis la diapo précédente (même si Blumi
  // change complètement d'endroit). Les autres transitions placent Blumi
  // directement à sa position (coupe ou apparition dédiée).
  const entrance = seg.entrance ?? 'none'
  const prevSeg = idx > 0 ? segs[idx - 1] : null
  const doGlide = !!prevSeg && entrance === 'glide'
  const glide = doGlide ? easeInOut(clamp((t - segStart) / MOVE_DUR)) : 1
  const tx = seg.x ?? 0
  const ty = seg.y ?? 0
  const tz = seg.z ?? 0
  const fx = doGlide ? lerp(prevSeg!.x ?? 0, tx, glide) : tx
  const fy = doGlide ? lerp(prevSeg!.y ?? 0, ty, glide) : ty
  const fz = doGlide ? lerp(prevSeg!.z ?? 0, tz, glide) : tz

  // Profondeur : loin (petit) ↔ proche (grand). z -1..1 → échelle 0,45..1,7.
  const posScale = clamp(1 + fz * 0.65, 0.45, 1.7)

  // Apparition au début de la diapo (arrivée bas/côté, pop, zoom, fondu, direct).
  const ein = clamp((t - segStart) / ENTRANCE_DUR)
  const e = easeOut(ein)
  let avatarScale = 1
  let avatarDX = 0
  let avatarDY = 0
  switch (entrance) {
    case 'fade': avatarAlpha *= e; break
    case 'pop': avatarScale = elastic(ein); break
    case 'zoom': avatarScale = 0.3 + 0.7 * e; avatarAlpha *= clamp(ein / 0.4); break
    case 'slide-up': avatarDY = (1 - e) * 0.55; break
    case 'slide-left': avatarDX = -(1 - e) * 0.7; break
    case 'slide-right': avatarDX = (1 - e) * 0.7; break
  }

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

  // Titre : uniquement sur la 1re diapo, avec un fondu de sortie à sa fin.
  const showTitle = pm.showTitle && !!title && idx === 0
  const titleOut = idx === 0 && segs[0] ? clamp((t - (segs[0].dur - 0.35)) / 0.35) : 0

  return {
    t,
    segIndex: idx,
    pose: seg.pose,
    mood,
    speaking,
    glasses,
    laptop,
    prop: seg.prop ?? 'none',
    avatarAlpha,
    posX: fx,
    posY: fy,
    posScale,
    avatarScale,
    avatarDX,
    avatarDY,
    bgId,
    bgPrevId,
    bgFade,
    words,
    title,
    showTitle,
    titleOut,
  }
}

// Réplique dite par un segment (texte brut, pour la voix off).
export function segmentLine(seg: PresSegment, project: Project): string {
  return interpolate(seg.text || '', project.script.metier, project.script.score)
}

// ── Bruitages (SFX) placés sur les diapos ─────────────────────────────────────
function sfxList(project: Project): PresSfxCue[] {
  return project.presentation.sfx ?? []
}

export function addSfxCue(project: Project, segId: string, kind: SfxKind = 'pop', at = 0): Project {
  const cue: PresSfxCue = { id: 'sfx_' + Math.random().toString(36).slice(2, 9), segId, at: Math.max(0, at), kind }
  return { ...project, presentation: { ...project.presentation, sfx: [...sfxList(project), cue] } }
}

export function removeSfxCue(project: Project, id: string): Project {
  return { ...project, presentation: { ...project.presentation, sfx: sfxList(project).filter((c) => c.id !== id) } }
}

export function updateSfxCue(project: Project, id: string, patch: Partial<PresSfxCue>): Project {
  const sfx = sfxList(project).map((c) => (c.id === id ? { ...c, ...patch, at: patch.at != null ? Math.max(0, +patch.at.toFixed(2)) : c.at } : c))
  return { ...project, presentation: { ...project.presentation, sfx } }
}

export function sfxCuesForSegment(project: Project, segId: string): PresSfxCue[] {
  return sfxList(project).filter((c) => c.segId === segId)
}

// Résout les bruitages en marqueurs à temps absolu sur la timeline (offset dans
// la diapo + début de la diapo). Un bruitage sur une diapo supprimée est ignoré.
export function presSfxMarkers(project: Project): SfxMarker[] {
  const out: SfxMarker[] = []
  for (const cue of sfxList(project)) {
    const seg = project.presentation.segments.find((s) => s.id === cue.segId)
    if (!seg) continue
    out.push({ time: seg.start + Math.min(cue.at, seg.dur), kind: cue.kind })
  }
  return out
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
