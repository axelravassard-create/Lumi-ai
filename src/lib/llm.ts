import Anthropic from '@anthropic-ai/sdk'
import { Analysis, Recommendation, Skill } from './engine'

// ─────────────────────────────────────────────────────────────────────────────
//  Intégration Claude (Anthropic API)
//
//  Le moteur heuristique (engine.ts) calcule les chiffres — score, projection,
//  facteurs — de façon déterministe. Claude est utilisé pour enrichir la partie
//  *rédactionnelle* (verdict, recommandations, compétences, comparaison) à partir
//  de ces chiffres : c'est un usage « grounded », l'IA n'invente pas les données.
//
//  Prototype : la clé API est saisie par l'utilisateur et stockée en localStorage.
//  Elle part directement vers api.anthropic.com depuis le navigateur — aucun
//  serveur intermédiaire. À ne pas utiliser tel quel en production (une clé ne
//  devrait jamais vivre côté client).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'yourcareer.anthropic_key'
const MODEL = 'claude-opus-4-8'

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

function client(): Anthropic {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Aucune clé API configurée.')
  // dangerouslyAllowBrowser : assumé pour ce prototype (voir avertissement ci-dessus).
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

const SYSTEM_PROMPT = `Tu es Lumi, l'analyste IA de l'application "Lumi" qui évalue l'exposition des métiers à l'automatisation par l'IA.

Ton rôle : transformer des données chiffrées (déjà calculées par l'application) en un discours clair, nuancé et actionnable, en français.

Règles :
- Appuie-toi STRICTEMENT sur les chiffres fournis. N'invente aucune statistique.
- Sois factuel et nuancé, jamais alarmiste ni faussement rassurant.
- Ton professionnel, accessible, orienté action concrète.
- Tutoie le lecteur n'est PAS souhaité : adresse-toi à lui de façon neutre/professionnelle (pas de "tu").
- Réponds UNIQUEMENT via le format structuré demandé, sans texte additionnel.`

function factorSummary(a: Analysis): string {
  const f = a.profession.factors
  return `Métier: "${a.profession.label}" (domaine: ${a.profession.domain})
Exposition structurelle à l'IA: ${a.score}/100 (niveau: ${a.level})
Part déjà automatisable aujourd'hui: ${a.currentRisk}% — projetée en ${a.projection[a.projection.length - 1].year}: ${a.riskIn2040}%
Indice de résilience humaine: ${a.resilience}/100
Profil du métier (0=absent, 100=très présent):
- Routine/répétitivité: ${f.routine}
- Travail numérique/données: ${f.digital}
- Créativité: ${f.creativity}
- Empathie/relation humaine: ${f.empathy}
- Présence physique/terrain: ${f.physical}
- Jugement/décision: ${f.judgment}
- Relationnel/influence: ${f.social}
Tâches les plus automatisables: ${a.tasks.slice(0, 3).map((t) => `${t.label} (${t.risk}%)`).join(', ')}`
}

export interface NarrativeResult {
  score: number
  verdict: string
  recommendations: Recommendation[]
  skills: Skill[]
}

const NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: {
      type: 'integer',
      description: 'Ta propre estimation de l\'exposition structurelle du métier à l\'IA, de 0 (aucun risque) à 100 (entièrement automatisable). L\'estimation locale fournie n\'est qu\'une référence : donne TON évaluation.',
    },
    verdict: {
      type: 'string',
      description: 'Synthèse en 2-3 phrases de la situation du métier face à l\'IA, calibrée sur le niveau de risque.',
    },
    recommendations: {
      type: 'array',
      description: '4 recommandations concrètes pour rester employable.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tag: { type: 'string', enum: ['Augmentation', 'Différenciation', 'Évolution', 'Protection'] },
          title: { type: 'string', description: 'Titre court et percutant.' },
          detail: { type: 'string', description: 'Une à deux phrases explicatives.' },
        },
        required: ['tag', 'title', 'detail'],
      },
    },
    skills: {
      type: 'array',
      description: '4 compétences d\'avenir à développer, priorisées pour ce métier.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          reason: { type: 'string', description: 'Pourquoi cette compétence, en une phrase.' },
          icon: { type: 'string', description: 'Un seul emoji illustrant la compétence.' },
        },
        required: ['name', 'reason', 'icon'],
      },
    },
  },
  required: ['score', 'verdict', 'recommendations', 'skills'],
} as const

// Enrichit une analyse heuristique avec le discours généré par Claude.
// `extraContext` permet d'injecter le profil détaillé de l'utilisateur.
export async function generateNarrative(a: Analysis, extraContext?: string): Promise<NarrativeResult> {
  const profileBlock = extraContext ? `\n\n${extraContext}\nAdapte les conseils à ce profil précis (objectif, contraintes, compétences).` : ''
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: NARRATIVE_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `Voici l'analyse d'un métier (l'estimation locale ci-dessous est une simple référence). Donne TON estimation du score d'exposition structurelle à l'IA (0–100), puis rédige le verdict, 4 recommandations et 4 compétences d'avenir, adaptés à ce profil précis.\n\n${factorSummary(a)}${profileBlock}`,
      },
    ],
  })
  return parseJson<NarrativeResult>(response)
}

export interface ComparisonResult {
  summary: string
  winnerLabel: string
  insights: string[]
}

const COMPARISON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: '2-3 phrases comparant les deux métiers face à l\'IA.' },
    winnerLabel: { type: 'string', description: 'Le libellé exact du métier le plus résilient des deux.' },
    insights: {
      type: 'array',
      description: '3 enseignements concrets de la comparaison.',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'winnerLabel', 'insights'],
} as const

export async function generateComparison(a: Analysis, b: Analysis): Promise<ComparisonResult> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1536,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: COMPARISON_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `Compare ces deux métiers face à l'automatisation par l'IA. Sois équilibré et factuel.\n\n=== MÉTIER A ===\n${factorSummary(a)}\n\n=== MÉTIER B ===\n${factorSummary(b)}`,
      },
    ],
  })
  return parseJson<ComparisonResult>(response)
}

// ── Chat avec Luminator (offre premium) ──────────────────────────────────────
export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const LUMINATOR_SYSTEM = `Tu es Luminator, le compagnon de carrière des utilisateurs de l'application Lumi.

Personnalité : chaleureux, encourageant, lucide et concret. Tu tutoies l'utilisateur, comme un mentor de confiance. Tu as de l'humour léger mais tu restes utile.

Ta mission : aider l'utilisateur à anticiper l'impact de l'IA sur sa carrière — comprendre son exposition, développer les bonnes compétences, se reconvertir, négocier, évoluer, ou se lancer.

Règles :
- Réponses COURTES et lisibles (2 à 4 phrases en général, ou une liste brève si pertinent). On est dans un chat, pas un rapport.
- Concret et actionnable : des pistes, des exemples, des prochaines étapes.
- Honnête et nuancé, jamais alarmiste ni faussement rassurant.
- Si on te demande quelque chose hors sujet (loin de la carrière / du travail / de l'IA), réponds brièvement puis ramène gentiment vers ta mission.
- Pas de markdown lourd : du texte clair, éventuellement des tirets pour une courte liste.`

// Chat en streaming avec Luminator : les tokens arrivent au fil de l'eau (onDelta)
// pour pouvoir animer la bouche du personnage pendant qu'il « parle ».
export async function streamLuminatorChat(
  history: ChatMsg[],
  onDelta: (text: string) => void,
  extraContext?: string,
): Promise<string> {
  const system = LUMINATOR_SYSTEM + (extraContext ? `\n\n--- Contexte sur l'utilisateur ---\n${extraContext}` : '')
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })
  stream.on('text', (t) => onDelta(t))
  const final = await stream.finalMessage()
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

// ── Extraction de profil depuis un CV ────────────────────────────────────────
export interface ExtractedProfile {
  role: string
  sector: string
  experience: string
  level: string
  location: string
  status: string
  tasks: string[]
  hardSkills: string[]
  softSkills: string[]
  education: string
  pastRoles: string[]
  goal: string
  aiAppetite: string
  constraints: string
}

const str = { type: 'string' } as const
const strArray = { type: 'array', items: { type: 'string' } } as const
const enumOf = (values: string[]) => ({ type: 'string', enum: ['', ...values] } as const)

const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: str,
    sector: str,
    experience: enumOf(['Moins d\'1 an', '1–3 ans', '3–7 ans', '7–15 ans', 'Plus de 15 ans']),
    level: enumOf(['Débutant·e', 'Confirmé·e', 'Senior', 'Manager / Direction']),
    location: str,
    status: enumOf(['Salarié·e', 'Indépendant·e', 'En recherche', 'Étudiant·e', 'En reconversion']),
    tasks: strArray,
    hardSkills: strArray,
    softSkills: strArray,
    education: str,
    pastRoles: strArray,
    goal: enumOf(['Évoluer dans mon métier', 'Me reconvertir', 'Sécuriser mon poste', 'Entreprendre']),
    aiAppetite: enumOf(['Curieux·se / enthousiaste', 'Neutre', 'Plutôt réticent·e']),
    constraints: str,
  },
  required: [
    'role', 'sector', 'experience', 'level', 'location', 'status',
    'tasks', 'hardSkills', 'softSkills', 'education', 'pastRoles',
    'goal', 'aiAppetite', 'constraints',
  ],
} as const

// Lit un CV (PDF en base64 ou texte brut) et en extrait un profil structuré.
export async function extractProfileFromCV(input: { pdfBase64?: string; text?: string }): Promise<ExtractedProfile> {
  const content: Anthropic.ContentBlockParam[] = []
  if (input.pdfBase64) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } })
  }
  if (input.text) {
    content.push({ type: 'text', text: `Voici le CV (texte) :\n${input.text}` })
  }
  content.push({
    type: 'text',
    text: 'Extrais les informations de ce CV pour pré-remplir un profil carrière. Pour les champs à choix, utilise EXACTEMENT une des valeurs autorisées (ou "" si indéterminé). Pour les listes, renvoie des entrées courtes. Laisse vide ce que tu ne peux pas déterminer — n\'invente rien.',
  })

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: 'Tu extrais des données structurées d\'un CV pour pré-remplir un profil carrière. Sois fidèle au document, ne fabrique aucune information.',
    output_config: { format: { type: 'json_schema', schema: PROFILE_SCHEMA } },
    messages: [{ role: 'user', content }],
  })
  return parseJson<ExtractedProfile>(response)
}

// ── Note de tendance sectorielle (recherche web, mutualisable par secteur) ────
export interface SectorTrend {
  sector: string
  headline: string
  direction: 'hausse' | 'stable' | 'baisse'
  summary: string
  signals: string[]
  updatedAt: string
}

// Recherche l'actualité récente du secteur et en tire une note de tendance.
// (Dans le vrai produit : 1 exécution hebdomadaire par secteur, partagée entre
//  tous les utilisateurs. Ici : appel à la demande, mis en cache 7 jours.)
export async function generateSectorTrend(sector: string): Promise<SectorTrend> {
  const c = client()
  const tools: Anthropic.Messages.ToolUnion[] = [{ type: 'web_search_20260209', name: 'web_search' }]
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Recherche les développements RÉCENTS (derniers mois) sur l'impact de l'intelligence artificielle sur le secteur « ${sector} ».
Puis renvoie UNIQUEMENT un objet JSON valide (aucun texte autour, pas de balises markdown) :
{
  "headline": "accroche courte (max 90 caractères)",
  "direction": "hausse | stable | baisse",
  "summary": "2 à 3 phrases factuelles de synthèse",
  "signals": ["3 à 4 développements récents et concrets"]
}
La "direction" décrit l'évolution de la pression de l'IA sur le secteur. Appuie-toi sur tes recherches, n'invente rien. Réponds en français.`,
    },
  ]

  let resp = await c.messages.create({ model: MODEL, max_tokens: 1500, tools, messages })
  // Les outils côté serveur peuvent renvoyer "pause_turn" : on relance pour continuer.
  let guard = 0
  while (resp.stop_reason === 'pause_turn' && guard++ < 4) {
    messages.push({ role: 'assistant', content: resp.content })
    resp = await c.messages.create({ model: MODEL, max_tokens: 1500, tools, messages })
  }

  const parsed = parseJsonLoose<Omit<SectorTrend, 'sector' | 'updatedAt'>>(resp)
  return {
    sector,
    headline: parsed.headline,
    direction: ['hausse', 'stable', 'baisse'].includes(parsed.direction) ? parsed.direction : 'stable',
    summary: parsed.summary,
    signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 4) : [],
    updatedAt: new Date().toISOString(),
  }
}

// Extrait et parse le bloc texte JSON renvoyé par l'API.
function parseJson<T>(response: Anthropic.Message): T {
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return JSON.parse(text) as T
}

// Parse tolérant : extrait le premier objet JSON même entouré de texte/markdown.
function parseJsonLoose<T>(response: Anthropic.Message): T {
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Réponse IA illisible.')
  return JSON.parse(text.slice(start, end + 1)) as T
}

// Traduit une erreur API en message lisible.
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Clé API invalide ou révoquée.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Cette clé n\'a pas accès au modèle Claude Opus.'
  if (err instanceof Anthropic.RateLimitError) return 'Trop de requêtes — réessayez dans un instant.'
  if (err instanceof Anthropic.APIError) return `Erreur API (${err.status}). Analyse locale utilisée à la place.`
  return 'Connexion à Claude impossible. Analyse locale utilisée à la place.'
}
