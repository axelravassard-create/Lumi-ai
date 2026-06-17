// Modèle du profil carrière de l'utilisateur (couches 1 à 3 de la fiche profil).
//
// Prototype : persisté dans le navigateur (localStorage). À terme, ces données
// vivront dans une base côté serveur (cf. architecture). Le profil sert à deux
// choses : enrichir le contexte envoyé à Claude, et mesurer sa complétude pour
// inciter l'utilisateur à le remplir progressivement.

export interface CareerProfile {
  // Couche 1 — base
  role: string
  sector: string
  experience: string
  level: string
  location: string
  status: string
  // Couche 2 — carburant de l'IA
  tasks: string[]
  hardSkills: string[]
  softSkills: string[]
  education: string
  pastRoles: string[]
  // Couche 3 — aspirations & contraintes
  goal: string
  aiAppetite: string
  constraints: string
}

export function emptyProfile(): CareerProfile {
  return {
    role: '',
    sector: '',
    experience: '',
    level: '',
    location: '',
    status: '',
    tasks: [],
    hardSkills: [],
    softSkills: [],
    education: '',
    pastRoles: [],
    goal: '',
    aiAppetite: '',
    constraints: '',
  }
}

const STORAGE_KEY = 'yourcareer.profile'

export function loadProfile(): CareerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyProfile(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return emptyProfile()
}

export function saveProfile(p: CareerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// Pondération de chaque champ pour la jauge de complétude.
// Les tâches et compétences (le « carburant » de l'IA) pèsent plus lourd.
const WEIGHTS: Record<keyof CareerProfile, number> = {
  role: 2,
  sector: 1,
  experience: 1,
  level: 1,
  location: 1,
  status: 1,
  tasks: 2,
  hardSkills: 2,
  softSkills: 1,
  education: 1,
  pastRoles: 1,
  goal: 1,
  aiAppetite: 1,
  constraints: 1,
}

function isFilled(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0
}

export function completeness(p: CareerProfile): number {
  let filled = 0
  let total = 0
  for (const key in WEIGHTS) {
    const k = key as keyof CareerProfile
    total += WEIGHTS[k]
    if (isFilled(p[k])) filled += WEIGHTS[k]
  }
  return Math.round((filled / total) * 100)
}

// Transforme le profil en contexte lisible pour Claude.
export function profileToContext(p: CareerProfile): string {
  const lines: string[] = []
  const add = (label: string, value: string | string[]) => {
    if (isFilled(value)) lines.push(`- ${label}: ${Array.isArray(value) ? value.join(', ') : value}`)
  }
  add('Métier', p.role)
  add('Secteur', p.sector)
  add('Expérience', p.experience)
  add('Niveau', p.level)
  add('Localisation', p.location)
  add('Statut', p.status)
  add('Tâches du quotidien', p.tasks)
  add('Compétences techniques', p.hardSkills)
  add('Compétences humaines', p.softSkills)
  add('Formation / diplômes', p.education)
  add('Postes précédents', p.pastRoles)
  add('Objectif de carrière', p.goal)
  add('Rapport à l\'IA / au changement', p.aiAppetite)
  add('Contraintes', p.constraints)
  return lines.length ? `Profil détaillé de l'utilisateur :\n${lines.join('\n')}` : ''
}

export function hasProfile(p: CareerProfile): boolean {
  return completeness(p) > 0
}
