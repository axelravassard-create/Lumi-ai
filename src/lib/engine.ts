import { Factors, Profession, PROFESSIONS } from './professions'
import type { CareerProfile } from './profile'

// ─────────────────────────────────────────────────────────────────────────────
//  YourCareer — Moteur d'analyse de l'exposition à l'IA
//
//  Modèle heuristique inspiré des travaux sur la susceptibilité à
//  l'automatisation (type Frey & Osborne / OCDE) : un métier est d'autant plus
//  exposé qu'il est routinier et numérisable, et d'autant plus protégé qu'il
//  mobilise créativité, empathie, dextérité physique, jugement et relationnel.
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_YEAR = 2026
export const HORIZON_YEAR = 2040

// Poids de chaque facteur dans le score d'exposition (somme = 1).
const WEIGHTS = {
  routine: 0.26,
  digital: 0.24,
  creativity: 0.16, // protecteur (inversé)
  empathy: 0.12, //    protecteur
  physical: 0.09, //   protecteur
  judgment: 0.08, //   protecteur
  social: 0.05, //     protecteur
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v))

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const normalize = (s: string) =>
  stripAccents(s.toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

// ── Correspondance texte libre → métier ─────────────────────────────────────
function matchProfession(input: string): { profession: Profession; exact: boolean } {
  const q = normalize(input)
  if (!q) return { profession: PROFESSIONS[0], exact: false }

  let best: Profession | null = null
  let bestScore = 0

  for (const p of PROFESSIONS) {
    const candidates = [normalize(p.label), ...p.keywords.map(normalize)]
    for (const c of candidates) {
      if (!c) continue
      let score = 0
      if (q === c) score = 100
      else if (q.includes(c) || c.includes(q)) score = 40 + Math.min(c.length, q.length)
      else {
        // chevauchement de mots
        const qw = new Set(q.split(' '))
        const cw = c.split(' ').filter((w) => w.length > 2)
        const hits = cw.filter((w) => qw.has(w)).length
        if (hits) score = 20 + hits * 8
      }
      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }
  }

  if (best && bestScore >= 28) return { profession: best, exact: bestScore >= 100 }

  // Aucun métier connu → on infère un profil à partir de mots-clés génériques.
  return { profession: inferProfession(input, q), exact: false }
}

// Indices lexicaux pour estimer les facteurs d'un métier inconnu.
const LEXICON: { words: string[]; delta: Partial<Factors> }[] = [
  { words: ['manager', 'directeur', 'chef', 'responsable', 'lead', 'head'], delta: { judgment: 30, social: 28, routine: -10 } },
  { words: ['artiste', 'createur', 'design', 'creatif', 'musicien', 'compositeur'], delta: { creativity: 38, routine: -16 } },
  { words: ['soin', 'aide', 'accompagnement', 'patient', 'enfant', 'care'], delta: { empathy: 36, physical: 14 } },
  { words: ['data', 'analyse', 'informatique', 'numerique', 'logiciel', 'code', 'digital'], delta: { digital: 34, routine: 8 } },
  { words: ['vente', 'commercial', 'client', 'negociation'], delta: { social: 32, empathy: 14 } },
  { words: ['ouvrier', 'manuel', 'terrain', 'chantier', 'atelier', 'machine', 'conduite'], delta: { physical: 36, routine: 14 } },
  { words: ['saisie', 'administratif', 'guichet', 'dossier', 'traitement'], delta: { routine: 34, digital: 16, creativity: -14 } },
  { words: ['recherche', 'ingenieur', 'expert', 'conseil', 'strategie'], delta: { judgment: 26, creativity: 16 } },
  { words: ['enseignement', 'formation', 'pedagogie', 'professeur'], delta: { empathy: 26, social: 24, creativity: 12 } },
]

function inferProfession(label: string, q: string): Profession {
  const f: Factors = { routine: 52, digital: 50, creativity: 48, empathy: 46, physical: 40, judgment: 50, social: 48 }
  let matched = false
  for (const { words, delta } of LEXICON) {
    if (words.some((w) => q.includes(stripAccents(w)))) {
      matched = true
      for (const k in delta) {
        const key = k as keyof Factors
        f[key] = clamp(f[key] + (delta[key] as number))
      }
    }
  }
  return {
    id: 'custom-' + q.replace(/\s+/g, '-').slice(0, 24),
    label: label.trim().replace(/^./, (c) => c.toUpperCase()),
    domain: matched ? 'Profil estimé' : 'Profil générique',
    emoji: '🧭',
    keywords: [],
    factors: f,
  }
}

// ── Score d'exposition à l'IA (0–100) ───────────────────────────────────────
function exposureScore(f: Factors): number {
  const raw =
    f.routine * WEIGHTS.routine +
    f.digital * WEIGHTS.digital +
    (100 - f.creativity) * WEIGHTS.creativity +
    (100 - f.empathy) * WEIGHTS.empathy +
    (100 - f.physical) * WEIGHTS.physical +
    (100 - f.judgment) * WEIGHTS.judgment +
    (100 - f.social) * WEIGHTS.social
  return Math.round(clamp(raw, 3, 97))
}

export type RiskLevel = 'Faible' | 'Modéré' | 'Élevé' | 'Critique'

export function riskLevel(score: number): RiskLevel {
  if (score < 30) return 'Faible'
  if (score < 55) return 'Modéré'
  if (score < 75) return 'Élevé'
  return 'Critique'
}

// ── Projection temporelle (courbe logistique 2026 → 2040) ───────────────────
export interface YearPoint {
  year: number
  value: number
}

// Paramètres de la courbe logistique d'adoption pour un métier.
function curveParams(score: number, f: Factors) {
  return {
    ceiling: score, //                         plafond long terme = part automatisable
    start: clamp(score * (0.16 + (f.digital / 100) * 0.24)), // adoption déjà réalisée en 2026
    k: 0.28 + (f.digital / 100) * 0.22 + (f.routine / 100) * 0.14, // rapidité de diffusion
    midpoint: BASE_YEAR + 7 - (f.digital / 100) * 3,
  }
}

// Valeur de la courbe à une année (entière ou fractionnaire), normalisée
// pour partir de `start` en 2026 et tendre vers `ceiling`.
function riskAtYear(year: number, p: ReturnType<typeof curveParams>): number {
  const logistic = 1 / (1 + Math.exp(-p.k * (year - p.midpoint)))
  const logisticStart = 1 / (1 + Math.exp(-p.k * (BASE_YEAR - p.midpoint)))
  const t = (logistic - logisticStart) / (1 - logisticStart)
  return clamp(p.start + (p.ceiling - p.start) * t)
}

// Date courante exprimée en année fractionnaire (ex. mi-juin 2026 ≈ 2026.46).
export function fractionalNow(): number {
  const d = new Date()
  return d.getFullYear() + (d.getMonth() + d.getDate() / 31) / 12
}

function projection(score: number, f: Factors): YearPoint[] {
  const p = curveParams(score, f)
  const points: YearPoint[] = []
  for (let year = BASE_YEAR; year <= HORIZON_YEAR; year++) {
    points.push({ year, value: Math.round(riskAtYear(year, p)) })
  }
  return points
}

// ── Décomposition par type de tâche ─────────────────────────────────────────
export interface TaskRisk {
  label: string
  risk: number
}

function taskBreakdown(f: Factors): TaskRisk[] {
  const tasks: TaskRisk[] = [
    { label: 'Tâches répétitives & administratives', risk: Math.round(clamp(f.routine * 0.7 + f.digital * 0.3)) },
    { label: 'Analyse & traitement de l’information', risk: Math.round(clamp(f.digital * 0.75 + f.routine * 0.15 + (100 - f.judgment) * 0.1)) },
    { label: 'Création, conception & idéation', risk: Math.round(clamp(100 - f.creativity)) },
    { label: 'Relation & accompagnement humain', risk: Math.round(clamp(100 - (f.empathy * 0.7 + f.social * 0.3))) },
    { label: 'Décision, stratégie & responsabilité', risk: Math.round(clamp(100 - f.judgment)) },
    { label: 'Intervention physique & terrain', risk: Math.round(clamp(100 - f.physical)) },
  ]
  return tasks.sort((a, b) => b.risk - a.risk)
}

// ── Compétences d'avenir ─────────────────────────────────────────────────────
export interface Skill {
  name: string
  reason: string
  icon: string
}

const SKILL_LIBRARY: (Skill & { trigger: (f: Factors) => number })[] = [
  { name: 'Piloter l’IA (prompting & outils)', icon: '✨', reason: 'Devenir celui qui dirige l’IA plutôt que celui qu’elle remplace.', trigger: (f) => 60 + f.digital * 0.3 },
  { name: 'Esprit critique & vérification', icon: '🔎', reason: 'Juger, corriger et fiabiliser les productions de l’IA.', trigger: (f) => 50 + (100 - f.judgment) * 0.4 },
  { name: 'Créativité & résolution de problèmes', icon: '💡', reason: 'L’originalité reste difficile à automatiser.', trigger: (f) => 40 + (100 - f.creativity) * 0.5 },
  { name: 'Intelligence émotionnelle', icon: '❤️', reason: 'L’empathie et la relation humaine gardent une valeur unique.', trigger: (f) => 30 + (100 - f.empathy) * 0.4 },
  { name: 'Leadership & communication', icon: '🗣️', reason: 'Fédérer, convaincre et coordonner des humains.', trigger: (f) => 30 + (100 - f.social) * 0.45 },
  { name: 'Compétences interdisciplinaires', icon: '🧩', reason: 'Relier des domaines que l’IA traite en silos.', trigger: (f) => 45 + f.routine * 0.2 },
  { name: 'Adaptabilité & apprentissage continu', icon: '🔄', reason: 'Se réinventer plus vite que le métier ne change.', trigger: (f) => 55 + f.routine * 0.2 },
  { name: 'Éthique & gouvernance de l’IA', icon: '⚖️', reason: 'Encadrer un usage responsable, un besoin en pleine expansion.', trigger: (f) => 35 + f.judgment * 0.2 },
]

function recommendedSkills(f: Factors): Skill[] {
  return SKILL_LIBRARY.map((s) => ({ skill: s, weight: s.trigger(f) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(({ skill }) => ({ name: skill.name, reason: skill.reason, icon: skill.icon }))
}

// ── Recommandations / plan d'action ──────────────────────────────────────────
export interface Recommendation {
  title: string
  detail: string
  tag: 'Augmentation' | 'Différenciation' | 'Évolution' | 'Protection'
}

function recommendations(f: Factors, score: number): Recommendation[] {
  const recs: Recommendation[] = []

  recs.push({
    tag: 'Augmentation',
    title: 'Faites de l’IA votre copilote',
    detail:
      f.digital > 55
        ? 'Intégrez les outils d’IA générative à votre flux de travail pour automatiser les tâches à faible valeur et vous concentrer sur l’expertise.'
        : 'Même dans un métier de terrain, des outils d’IA (planification, devis, diagnostic) peuvent vous faire gagner un temps précieux.',
  })

  if (f.creativity < 55) {
    recs.push({
      tag: 'Différenciation',
      title: 'Cultivez votre singularité créative',
      detail: 'Développez un angle, un style ou une approche que l’IA ne peut pas standardiser. La rareté crée la valeur.',
    })
  }
  if (f.empathy < 55 && f.social < 60) {
    recs.push({
      tag: 'Différenciation',
      title: 'Renforcez la dimension humaine',
      detail: 'Misez sur le conseil, la relation client et l’accompagnement : ce que les gens veulent vivre avec un humain.',
    })
  }
  if (f.judgment < 60) {
    recs.push({
      tag: 'Protection',
      title: 'Montez en responsabilité et en jugement',
      detail: 'Positionnez-vous sur les décisions complexes, la stratégie et la supervision — là où l’erreur coûte cher et exige un humain garant.',
    })
  }
  if (score >= 60) {
    recs.push({
      tag: 'Évolution',
      title: 'Préparez une trajectoire d’évolution',
      detail: 'Votre métier est très exposé : capitalisez dès maintenant sur des compétences transférables vers des rôles plus résilients.',
    })
  } else {
    recs.push({
      tag: 'Évolution',
      title: 'Spécialisez-vous vers le haut',
      detail: 'Votre métier est relativement protégé : approfondissez votre expertise pour devenir une référence difficilement remplaçable.',
    })
  }

  return recs.slice(0, 4)
}

// ── Métiers de repli / pivots conseillés ─────────────────────────────────────
export interface Pivot {
  label: string
  emoji: string
  domain: string
  risk: number
}

function pivots(current: Profession): Pivot[] {
  const scored = PROFESSIONS.filter((p) => p.id !== current.id).map((p) => ({
    p,
    score: exposureScore(p.factors),
  }))
  const sameDomain = scored.filter((s) => s.p.domain === current.domain)
  const pool = [...sameDomain, ...scored]
  const seen = new Set<string>()
  return pool
    .filter((s) => s.score < 55)
    .sort((a, b) => a.score - b.score)
    .filter((s) => (seen.has(s.p.id) ? false : (seen.add(s.p.id), true)))
    .slice(0, 3)
    .map((s) => ({ label: s.p.label, emoji: s.p.emoji, domain: s.p.domain, risk: s.score }))
}

// ── Résultat complet ─────────────────────────────────────────────────────────
export interface Analysis {
  profession: Profession
  exact: boolean
  score: number
  level: RiskLevel
  resilience: number
  currentRisk: number
  currentYear: number
  projection: YearPoint[]
  riskIn2040: number
  tasks: TaskRisk[]
  skills: Skill[]
  recommendations: Recommendation[]
  pivots: Pivot[]
  verdict: string
  aiEnhanced?: boolean
  personalized?: boolean
  adjustment?: number
  personalAssets?: { label: string; value: number }[]
}

function verdictText(level: RiskLevel, label: string): string {
  switch (level) {
    case 'Faible':
      return `Bonne nouvelle : le métier de ${label.toLowerCase()} est parmi les plus résilients face à l’IA. L’automatisation servira surtout d’assistant.`
    case 'Modéré':
      return `Le métier de ${label.toLowerCase()} sera profondément transformé par l’IA, sans disparaître. Ceux qui adoptent l’IA prendront l’avantage.`
    case 'Élevé':
      return `Le métier de ${label.toLowerCase()} est fortement exposé : une part importante des tâches sera automatisable. Il faut agir tôt.`
    case 'Critique':
      return `Le métier de ${label.toLowerCase()} fait partie des plus menacés par l’automatisation. Une stratégie de repositionnement est vivement conseillée.`
  }
}

export function analyze(input: string): Analysis {
  const { profession, exact } = matchProfession(input)
  const f = profession.factors
  const score = exposureScore(f)
  const level = riskLevel(score)
  const proj = projection(score, f)
  const currentYear = Math.max(BASE_YEAR, fractionalNow())
  const currentRisk = Math.round(riskAtYear(currentYear, curveParams(score, f)))
  return {
    profession,
    exact,
    score,
    level,
    resilience: 100 - score,
    currentRisk,
    currentYear,
    projection: proj,
    riskIn2040: proj[proj.length - 1].value,
    tasks: taskBreakdown(f),
    skills: recommendedSkills(f),
    recommendations: recommendations(f, score),
    pivots: pivots(profession),
    verdict: verdictText(level, profession.label),
  }
}

// Recalcule les champs dérivés d'une analyse à partir d'un score fourni
// par Claude (exposition structurelle 0–100). Utilisé quand l'IA est connectée
// pour que le chiffre affiché soit réellement produit par Claude.
export function withScore(a: Analysis, rawScore: number): Analysis {
  const score = Math.round(clamp(rawScore, 3, 97))
  const f = a.profession.factors
  const proj = projection(score, f)
  const currentYear = Math.max(BASE_YEAR, fractionalNow())
  const currentRisk = Math.round(riskAtYear(currentYear, curveParams(score, f)))
  return {
    ...a,
    score,
    level: riskLevel(score),
    resilience: 100 - score,
    currentRisk,
    currentYear,
    projection: proj,
    riskIn2040: proj[proj.length - 1].value,
  }
}

// ── Personnalisation du score selon le profil ────────────────────────────────
// Le métier donne le risque « de base ». Le profil de la personne l'ajuste :
// un diplôme élevé, une école sélective, de l'expérience, de la séniorité et
// une bonne maîtrise de l'IA réduisent le risque personnel ; l'inverse l'augmente.
const ADJUST: Record<string, Record<string, number>> = {
  educationLevel: { 'Sans diplôme / CAP / BEP': 6, 'Bac': 2, 'Bac+2 / Bac+3': 0, 'Bac+5 (Master)': -5, 'Doctorat / Grande école': -9 },
  schoolPrestige: { 'Établissement très sélectif (top)': -6, 'Établissement reconnu': -2, 'Établissement standard': 0, 'Formation courte / autodidacte': 2 },
  level: { 'Débutant·e': 6, 'Confirmé·e': 0, 'Senior': -5, 'Manager / Direction': -9 },
  experience: { "Moins d'1 an": 4, '1–3 ans': 1, '3–7 ans': 0, '7–15 ans': -3, 'Plus de 15 ans': -5 },
  aiSkill: { 'Avancée — au quotidien': -8, 'Intermédiaire': -3, 'Débutante': 1, 'Aucune': 5 },
}

export function personalAdjustment(p: CareerProfile): number {
  let delta = 0
  for (const key of ['educationLevel', 'schoolPrestige', 'level', 'experience', 'aiSkill'] as const) {
    delta += ADJUST[key]?.[p[key]] ?? 0
  }
  return Math.max(-22, Math.min(14, delta))
}

// Valeurs (0–100) associées à chaque réponse du profil, pour afficher des
// « atouts personnels » et nourrir le discours.
const EDU_VAL: Record<string, number> = { 'Sans diplôme / CAP / BEP': 25, 'Bac': 40, 'Bac+2 / Bac+3': 60, 'Bac+5 (Master)': 80, 'Doctorat / Grande école': 95 }
const PRESTIGE_VAL: Record<string, number> = { 'Établissement très sélectif (top)': 95, 'Établissement reconnu': 70, 'Établissement standard': 45, 'Formation courte / autodidacte': 30 }
const AISKILL_VAL: Record<string, number> = { 'Avancée — au quotidien': 90, 'Intermédiaire': 60, 'Débutante': 35, 'Aucune': 10 }
const EXP_VAL: Record<string, number> = { "Moins d'1 an": 20, '1–3 ans': 40, '3–7 ans': 60, '7–15 ans': 80, 'Plus de 15 ans': 92 }
const LEVEL_VAL: Record<string, number> = { 'Débutant·e': 30, 'Confirmé·e': 55, 'Senior': 80, 'Manager / Direction': 92 }

export function personalAssets(p: CareerProfile): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = []
  if (p.educationLevel) out.push({ label: '🎓 Niveau de formation', value: EDU_VAL[p.educationLevel] ?? 50 })
  if (p.schoolPrestige) out.push({ label: '🏛️ Sélectivité de l\'école', value: PRESTIGE_VAL[p.schoolPrestige] ?? 50 })
  if (p.aiSkill) out.push({ label: '🤖 Maîtrise de l\'IA', value: AISKILL_VAL[p.aiSkill] ?? 50 })
  if (p.experience) out.push({ label: '⏳ Expérience', value: EXP_VAL[p.experience] ?? 50 })
  if (p.level) out.push({ label: '📈 Séniorité', value: LEVEL_VAL[p.level] ?? 50 })
  return out
}

// Recommandations spécifiques au profil de la personne (mode démo).
function personalRecommendations(p: CareerProfile): Recommendation[] {
  const recs: Recommendation[] = []
  if (p.aiSkill === 'Aucune' || p.aiSkill === 'Débutante') {
    recs.push({ tag: 'Augmentation', title: 'Montez vite en compétence sur l\'IA', detail: 'Maîtriser les outils d\'IA est votre levier n°1 : passez du côté de ceux qui dirigent l\'IA plutôt que de ceux qu\'elle remplace.' })
  }
  if (p.level === 'Débutant·e' || p.experience === "Moins d'1 an" || p.experience === '1–3 ans') {
    recs.push({ tag: 'Évolution', title: 'Accélérez votre montée en expertise', detail: 'Les profils juniors sont les plus exposés : visez une spécialisation et des responsabilités pour devenir difficilement remplaçable.' })
  }
  if (p.schoolPrestige === 'Formation courte / autodidacte' || p.schoolPrestige === 'Établissement standard' || p.educationLevel === 'Sans diplôme / CAP / BEP' || p.educationLevel === 'Bac') {
    recs.push({ tag: 'Différenciation', title: 'Faites reconnaître vos compétences', detail: 'Certifications, portfolio, réalisations concrètes : prouvez votre valeur indépendamment du diplôme initial.' })
  }
  if (p.goal === 'Me reconvertir') {
    recs.push({ tag: 'Évolution', title: 'Préparez votre reconversion', detail: 'Capitalisez sur vos compétences transférables vers un métier plus résilient face à l\'IA.' })
  }
  return recs
}

function profileVerdictSuffix(delta: number): string {
  if (delta <= -4) return 'Bonne nouvelle : votre profil (formation, expérience, maîtrise de l\'IA) vous rend nettement plus résilient que la moyenne de votre métier.'
  if (delta >= 4) return 'Attention : en l\'état, votre profil vous expose un peu plus que la moyenne — les recommandations ci-dessous peuvent inverser la tendance.'
  return 'Votre profil est dans la moyenne de votre métier ; les leviers ci-dessous feront la différence.'
}

// Renvoie une analyse entièrement personnalisée selon le profil (mode démo) :
// score ajusté, verdict, recommandations et atouts personnels.
export function applyProfileAdjustment(a: Analysis, p: CareerProfile): Analysis {
  const delta = personalAdjustment(p)
  const scored = withScore(a, a.score + delta)
  const recommendations = [...personalRecommendations(p), ...scored.recommendations].slice(0, 5)
  const verdict = `${scored.verdict} ${profileVerdictSuffix(delta)}`
  return {
    ...scored,
    recommendations,
    verdict,
    personalized: true,
    adjustment: delta,
    personalAssets: personalAssets(p),
  }
}

// Quelques suggestions affichées sur la page d'accueil.
export const SUGGESTIONS = [
  'Développeur·se',
  'Comptable',
  'Infirmier·ère',
  'Graphiste',
  'Chauffeur·se',
  'Avocat·e',
  'Enseignant·e',
  'Commercial·e',
]
