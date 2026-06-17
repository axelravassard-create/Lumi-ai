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

const SYSTEM_PROMPT = `Tu es l'analyste IA de "YourCareer", une application qui évalue l'exposition des métiers à l'automatisation par l'IA.

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
Score de remplaçabilité par l'IA: ${a.score}/100 (niveau: ${a.level})
Risque aujourd'hui (${a.projection[0].year}): ${a.projection[0].value}% — projeté en ${a.projection[a.projection.length - 1].year}: ${a.riskIn2040}%
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
  verdict: string
  recommendations: Recommendation[]
  skills: Skill[]
}

const NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
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
  required: ['verdict', 'recommendations', 'skills'],
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
        content: `Voici l'analyse chiffrée d'un métier. Rédige le verdict, 4 recommandations et 4 compétences d'avenir, adaptés à ce profil précis.\n\n${factorSummary(a)}${profileBlock}`,
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

// Extrait et parse le bloc texte JSON renvoyé par l'API.
function parseJson<T>(response: Anthropic.Message): T {
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return JSON.parse(text) as T
}

// Traduit une erreur API en message lisible.
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Clé API invalide ou révoquée.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Cette clé n\'a pas accès au modèle Claude Opus.'
  if (err instanceof Anthropic.RateLimitError) return 'Trop de requêtes — réessayez dans un instant.'
  if (err instanceof Anthropic.APIError) return `Erreur API (${err.status}). Analyse locale utilisée à la place.`
  return 'Connexion à Claude impossible. Analyse locale utilisée à la place.'
}
