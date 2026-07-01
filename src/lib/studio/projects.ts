// Sauvegarde / chargement multi-projets (localStorage). Les médias (vidéo,
// musique) NE sont PAS persistés (object-URLs éphémères) : on garde les réglages,
// l'utilisateur ré-importe son fichier au besoin.
import type { Project } from './types'
import { DEFAULT_BEATS, DEFAULT_DURATION } from './library'
import { defaultScript } from './script'

const KEY = 'blumi.studio.projects'
const CUR = 'blumi.studio.current'

export function newProject(metier = 'Développeur·se', score = 73, level = 'Élevé'): Project {
  return {
    id: 'p_' + Math.random().toString(36).slice(2, 9),
    name: metier || 'Nouveau clip',
    fmt: '9:16',
    duration: DEFAULT_DURATION,
    showSafeZones: true,
    platform: 'tiktok',
    background: null,
    script: defaultScript(metier, score, level),
    beats: DEFAULT_BEATS.map((b) => ({ ...b })),
    caption: { enabled: true, style: 'tiktok', posY: 0.2, scale: 1, timing: 'auto', offset: 0, pace: 1 },
    audio: {
      voice: true,
      voiceVolume: 1,
      voiceRate: 1.08,
      musicUrl: '',
      musicName: '',
      musicVolume: 0.5,
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
    caption: { ...d.caption, ...p.caption },
    audio: { ...d.audio, ...p.audio },
    character: { ...d.character, ...p.character },
    tempo: { ...d.tempo, ...(p.tempo ?? {}) },
  }
}

// Retire les médias non sérialisables avant sauvegarde.
function serializable(p: Project): Project {
  const bg = p.background ? { ...p.background, url: '' } : null
  return { ...p, background: bg, audio: { ...p.audio, musicUrl: '' } }
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
