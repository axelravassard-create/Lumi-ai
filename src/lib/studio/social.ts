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

// Données de référence mises à jour selon les benchmarks 2026 (voir SOURCES_2026).
export const PLATFORMS: PlatformInfo[] = [
  {
    key: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    ratio: '9:16',
    length: '15–45 s (viser ~70 % de complétion, le seuil 2026 pour percer)',
    cadence: '2 à 5 posts / semaine (régularité > volume)',
    best: 'mar–ven 14–18 h + 18–20 h ; dimanche soir. Mercredi = meilleur jour.',
    tips: [
      'Hook + texte à l\'écran dès 0–1 s : vise ~70 % de complétion (nouveau seuil 2026, vs 50 % en 2024).',
      'Les 60 premières minutes font ~80 % de la portée → poste à une heure active et réponds tout de suite aux commentaires.',
      'Audio ORIGINAL reboosté en 2026 (voix off / son maison) ; un son tendance ajoute un bonus.',
      'Mots-clés parlés + écrits > hashtags : TikTok indexe ce que tu DIS et MONTRES (Social SEO).',
      'Boucle parfaite : la dernière frame renvoie à la première → rewatch.',
      'Reste sur ta niche (métiers × IA) : l\'algo 2026 privilégie la cohérence à la viralité au hasard.',
    ],
    tags: ['ia', 'intelligenceartificielle', 'futurdutravail', 'careertok', 'emploi'],
    tone: 'casual',
  },
  {
    key: 'reels',
    name: 'Instagram Reels',
    emoji: '📸',
    ratio: '9:16',
    length: '7–30 s',
    cadence: '3 à 5 / semaine + partage en story',
    best: 'mar 13–19 h, mer 12–21 h',
    tips: [
      'Légende riche en mots-clés : Instagram indexe la LÉGENDE et le texte à l\'écran (Social SEO), plus les hashtags.',
      'Hook lisible même en muet (80 % regardent sans son) — le texte karaoké du studio joue ce rôle.',
      'CTA « enregistre » et « partage en DM » : saves et partages pèsent le plus.',
      'Audio original + un son tendance ; republie le Reel en story.',
      '3–5 hashtags précis DANS la légende (le suivi de hashtags a disparu).',
    ],
    tags: ['reels', 'ia', 'emploi', 'futureofwork', 'carriere'],
    tone: 'casual',
  },
  {
    key: 'shorts',
    name: 'YouTube Shorts',
    emoji: '▶️',
    ratio: '9:16',
    length: '15–40 s (max 3 min)',
    cadence: '3 à 5 / semaine',
    best: '14–16 h et 20–22 h',
    tips: [
      'Le TITRE est du SEO : mets le métier + « IA » dedans, plus des mots-clés en description.',
      'Hook fort + fin qui renvoie au début (rewatch), #shorts.',
      'Longue traîne : un Short peut percer des jours/semaines après → ré-exploite tes meilleurs métiers.',
      'Vise une haute complétion : 15–40 s est le sweet spot pour la garder.',
    ],
    tags: ['shorts', 'ia', 'jobs', 'futureofwork', 'emploi'],
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
      'Mots-clés en langage naturel dans le texte (LinkedIn indexe les phrases, plus les tags).',
      'Termine par une question ouverte → commentaires = portée. Lien en 1er commentaire, pas dans le post.',
      '3–5 hashtags ciblés maximum.',
    ],
    tags: ['IA', 'FuturDuTravail', 'Compétences', 'Emploi', 'Reconversion'],
    tone: 'pro',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    emoji: '𝕏',
    ratio: '9:16 ou 16:9',
    length: '15–30 s (max ~2 min)',
    cadence: 'plusieurs posts / jour',
    best: '8–10 h et 18–20 h',
    tips: [
      'Le HOOK est dans le texte du post, pas seulement la vidéo.',
      'Phrase choc + question → cite/retweet.',
      'Décline en thread (1 métier = 1 post) pour tenir l\'attention.',
      '1–2 hashtags max, le reste dilue la portée.',
    ],
    tags: ['IA', 'AI', 'FutureOfWork'],
    tone: 'short',
  },
]

// Vérités transverses 2026 (Social SEO, complétion, 1re heure) affichées dans l'UI.
export const SOCIAL_2026: string[] = [
  'Complétion reine : ~70 % de la vidéo vue = le nouveau seuil pour percer (vs 50 % en 2024). Fais court et bouclé.',
  'Social SEO > hashtags : la découverte passe par la LÉGENDE, le TITRE et le TEXTE À L\'ÉCRAN riches en mots-clés. Garde 3–5 hashtags précis.',
  'Cohérence de niche + régularité (2–5 posts/sem.) comptent plus que la viralité au hasard ou l\'heure exacte.',
  '1re heure décisive sur TikTok (~80 % de la portée) : poste à une heure active et engage tout de suite.',
]

// Sources consultées (benchmarks 2026) — pour traçabilité.
export const SOURCES_2026: { label: string; url: string }[] = [
  { label: 'Hootsuite — TikTok algorithm 2026', url: 'https://blog.hootsuite.com/tiktok-algorithm/' },
  { label: 'Buffer — Best time to post 2026', url: 'https://buffer.com/resources/best-time-to-post-social-media/' },
  { label: 'Buffer — Posting frequency 2026', url: 'https://buffer.com/resources/social-media-frequency-guide/' },
  { label: 'Dive Media — Social SEO vs hashtags 2026', url: 'https://www.divemedia.com.au/marketing-tips-and-insights/social-seo-keywords-vs-hashtags' },
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
  // 2026 : 3–5 hashtags précis suffisent (ils sont devenus des métadonnées, pas
  // le moteur de découverte — c'est le Social SEO de la légende qui prime).
  const hashtags = Array.from(new Set([tag, ...p.tags])).slice(0, key === 'x' ? 3 : 5)

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
