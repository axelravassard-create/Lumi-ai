// Couche « communication réseaux » : ce qui fait réellement performer un post
// (au-delà de la vidéo) — format, légende, hashtags, cadence, angles.
// Tout est dérivé du projet (métier, score, hook, CTA) pour être prêt à coller.
import type { Project } from './types'
import { interpolate } from './script'

export type PlatformKey = 'tiktok' | 'reels' | 'shorts' | 'linkedin' | 'x'

export interface PlatformInfo {
  key: PlatformKey
  name: string
  emoji: string
  ratio: string
  length: string
  cadence: string
  best: string // meilleur créneau de publication
  tips: string[] // ce qui marche
  tags: string[] // hashtags de base
  tone: 'casual' | 'pro' | 'short'
}

export const PLATFORMS: PlatformInfo[] = [
  {
    key: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    ratio: '9:16',
    length: '12–16 s (idéal <20 s pour la complétion)',
    cadence: '1 à 3 posts / jour',
    best: '11–13 h et 18–22 h',
    tips: [
      'Hook visuel + texte dès la 1re frame (0–1 s), zéro intro.',
      'Un son tendance en fond booste la portée (ajoute-le dans l\'app TikTok).',
      'Boucle parfaite : la dernière frame renvoie à la première → rewatch.',
      'Comment-bait qui force la réponse (« commente ton métier »).',
      'Réponds aux commentaires EN vidéo → nouvelles vues gratuites.',
      'Teste 2 hooks (A/B) sur 2 posts, garde le meilleur angle.',
    ],
    tags: ['ia', 'intelligenceartificielle', 'travail', 'metier', 'futurdutravail', 'careertok', 'tech'],
    tone: 'casual',
  },
  {
    key: 'reels',
    name: 'Instagram Reels',
    emoji: '📸',
    ratio: '9:16',
    length: '7–15 s',
    cadence: '1 post / jour + partage en story',
    best: '12–13 h et 19–21 h',
    tips: [
      'Audio tendance quasi obligatoire pour la distribution.',
      'Hook lisible même en muet (80 % regardent sans son).',
      'CTA « enregistre » et « partage en DM » (les saves pèsent lourd).',
      'Republie le Reel en story avec un sticker « + d\'infos ».',
      'Réponds en Reel aux commentaires pour relancer la portée.',
    ],
    tags: ['reels', 'ia', 'ai', 'emploi', 'metiers', 'futureofwork', 'reelsinstagram', 'carriere'],
    tone: 'casual',
  },
  {
    key: 'shorts',
    name: 'YouTube Shorts',
    emoji: '▶️',
    ratio: '9:16',
    length: '15–30 s (max 60 s)',
    cadence: '1 post / jour',
    best: '12 h et 17–20 h',
    tips: [
      'Le TITRE compte (SEO YouTube) : mets le métier + « IA » dedans.',
      'Ajoute #shorts et des mots-clés dans la description.',
      'Hook fort + fin qui renvoie au début (rewatch).',
      'Les Shorts ont une longue traîne : ré-exploite tes meilleurs métiers.',
    ],
    tags: ['shorts', 'ia', 'ai', 'jobs', 'careers', 'futureofwork', 'emploi'],
    tone: 'casual',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    emoji: '💼',
    ratio: '9:16 ou 1:1',
    length: '30–60 s',
    cadence: '3 à 5 posts / semaine',
    best: 'mardi–jeudi, 8–10 h',
    tips: [
      '1re ligne = hook AVANT le « …voir plus » (le scroll s\'arrête là).',
      'Ton pro + accroche perso (« J\'ai testé mon métier face à l\'IA »).',
      'Termine par une question ouverte → commentaires = portée.',
      'Peu d\'emojis, 3–5 hashtags ciblés, pas de lien dans le post (mets-le en 1er commentaire).',
    ],
    tags: ['IA', 'IntelligenceArtificielle', 'FuturDuTravail', 'Compétences', 'Emploi', 'Reconversion'],
    tone: 'pro',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    emoji: '𝕏',
    ratio: '9:16 ou 16:9',
    length: '< 2 min (idéal 15–30 s)',
    cadence: 'plusieurs posts / jour',
    best: '8–10 h et 18–20 h',
    tips: [
      'Le HOOK est dans le texte du tweet, pas seulement la vidéo.',
      'Phrase choc + question → cite/retweet.',
      'Décline en thread (1 métier = 1 tweet) pour tenir l\'attention.',
      '1–2 hashtags max, le reste dilue la portée.',
    ],
    tags: ['IA', 'AI', 'FutureOfWork'],
    tone: 'short',
  },
]

export function platform(key: PlatformKey): PlatformInfo {
  return PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[0]
}

// Transforme un libellé de métier en hashtag propre (sans accent ni suffixe genré).
export function metierTag(label: string): string {
  const base = (label || 'metier').split(/[·/(,]/)[0].trim()
  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Metier'
}

export interface SocialPost {
  caption: string
  hashtags: string[]
}

// Génère une légende prête à publier + les hashtags, adaptées à la plateforme.
export function generatePost(project: Project, key: PlatformKey): SocialPost {
  const s = project.script
  const p = platform(key)
  const metier = s.metier || 'ton métier'
  const hook = interpolate(s.hook, metier, s.score)
  const cta = interpolate(s.cta, metier, s.score)
  const tag = metierTag(metier)
  const hashtags = Array.from(new Set([...p.tags, tag])).slice(0, key === 'linkedin' || key === 'x' ? 5 : 10)

  let caption = ''
  if (p.tone === 'pro') {
    // LinkedIn : accroche perso, valeur, question. Peu d'emojis.
    caption =
      `${hook}\n\n` +
      `J'ai passé le métier de ${metier} au crible de l'IA : ${s.score}% des tâches sont déjà exposées à l'automatisation.\n\n` +
      `La bonne nouvelle : ceux qui adoptent l'IA aujourd'hui prennent une longueur d'avance (automatiser ses tâches, monter en compétence, se rendre irremplaçable).\n\n` +
      `Et toi, à combien estimes-tu ton métier ? 👇\n\n` +
      `→ Teste le tien gratuitement sur Blumi (lien en commentaire).`
  } else if (p.tone === 'short') {
    // X : court et cinglant.
    caption =
      `${hook}\n\n` +
      `Métier de ${metier} : ${s.score}% exposé à l'IA.\n` +
      `${cta}\n` +
      `Teste le tien 👉 Blumi`
  } else {
    // TikTok / Reels / Shorts : punchy, emojis, comment-bait, boucle.
    caption =
      `${hook}\n\n` +
      `Le métier de ${metier} est exposé à ${s.score}% 😱 mais tout n'est pas perdu 👇\n` +
      `1. Automatise tes tâches ⚙️  2. Apprends l'IA 🧠  3. Monte en valeur 📈\n\n` +
      `${cta}\n` +
      `Teste ton métier gratuitement 👉 Blumi (lien en bio)`
  }

  return { caption, hashtags }
}

// Angles de contenu qui marchent (formats de post au-delà de la cinématique).
export interface Angle {
  emoji: string
  title: string
  desc: string
  presetId?: string // applique un preset si défini
  hook?: string
}

export const ANGLES: Angle[] = [
  { emoji: '😱→😎', title: 'Doom → Glow-up', desc: 'Peur (score choc) puis délivrance (3 actions). Le format qui partage le plus.', presetId: 'doom-glowup' },
  { emoji: '🫣', title: 'POV : tu es scanné', desc: 'Le spectateur EST la personne analysée. Immersion maximale.', presetId: 'pov-analyse', hook: 'POV : une IA vient d\'analyser ton métier 🫣' },
  { emoji: '🏆', title: 'Tier list des métiers', desc: 'Classe plusieurs métiers du plus au moins exposé. Débat = commentaires.', presetId: 'tier-list' },
  { emoji: '⚡', title: 'Choc express', desc: 'Moins de 12 s, verdict immédiat. Complétion et boucle maximales.', presetId: 'choc-express' },
  { emoji: '🎙️', title: 'Storytime', desc: '« J\'ai demandé à une IA… » scan long et immersif, révélation appuyée.', presetId: 'storytime' },
  { emoji: '🏷️', title: 'Tag-bait', desc: 'Vise une communauté précise : « Tag un(e) {métier} qui doit voir ça ».', hook: 'Tag un(e) {METIER} qui doit voir ça 👇' },
  { emoji: '📊', title: 'Le chiffre qui choque', desc: 'Ouvre sur une stat brute : « {SCORE}% des {métier} ignorent que… ».', hook: '{SCORE}% des {METIER} ignorent que leur job est menacé…' },
  { emoji: '🔁', title: 'Duet / Réaction', desc: 'Poste le score seul en green-screen pour inviter les duos/réactions.', hook: 'L\'IA a mis {SCORE}% à ce métier… tu vas halluciner 😱' },
]
