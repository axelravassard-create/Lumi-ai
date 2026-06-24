// Internationalisation (i18n) — léger, sans dépendance.
//
// Langues : français, anglais, allemand, espagnol, mandarin.
// Détection automatique depuis le navigateur ; repli sur l'anglais si la langue
// de l'utilisateur n'est pas couverte. Choix mémorisé en localStorage.
//
// Usage : appeler `useLang()` une fois dans un composant (pour qu'il se re-rende
// au changement de langue), puis `t('clé')` pour chaque texte.

import { useEffect, useState } from 'react'

export type Lang = 'fr' | 'en' | 'de' | 'es' | 'zh'
export const SUPPORTED: Lang[] = ['fr', 'en', 'de', 'es', 'zh']
export const LANG_LABELS: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  zh: '中文',
}

const STORAGE_KEY = 'lumi.lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && SUPPORTED.includes(saved)) return saved
    const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    for (const l of candidates) {
      const code = (l || '').slice(0, 2).toLowerCase() as Lang
      if (SUPPORTED.includes(code)) return code
    }
  } catch {
    /* ignore */
  }
  return 'en' // langue non couverte → anglais par défaut
}

let lang: Lang = detect()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return lang
}

export function setLang(l: Lang) {
  lang = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  } catch {
    /* ignore */
  }
  listeners.forEach((f) => f())
}

export function t(key: string): string {
  const dict = MESSAGES[lang] || MESSAGES.en
  return dict[key] ?? MESSAGES.en[key] ?? key
}

export function useLang(): Lang {
  const [v, setV] = useState(lang)
  useEffect(() => {
    const f = () => setV(lang)
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  }, [])
  return v
}

// Applique <html lang> au chargement.
try {
  document.documentElement.lang = lang
} catch {
  /* ignore */
}

type Dict = Record<string, string>

// ─── Traductions (page d'accueil publique) ───────────────────────────────────
const fr: Dict = {
  'nav.metiers': 'Métiers',
  'nav.profile': 'Mon profil',
  'nav.login': 'Se connecter',
  'nav.subscription': 'Mon abonnement',
  'nav.luminator': '✨ Blumiman',
  'hero.bubble': '👋 Salut, moi c’est {name} — ton guide face à l’IA.',
  'hero.tapHintOwns': '(tapote-moi sur la tête 👆)',
  'hero.tapHint': '(tapote-moi 👆 — et clique sur l’ombre à droite 👀)',
  'hero.whoIsThere': 'Qui est là ? 👀',
  'reveal.title': '✨ Moi, c’est Blumiman.',
  'reveal.desc': 'J’automatise les tâches répétitives de ton métier — outils IA, no-code, modèles prêts à l’emploi, adaptés à tes compétences.',
  'reveal.unlock': 'Débloquer Blumiman',
  'reveal.later': 'Plus tard',
  'ai.poweredClaude': 'Analyse propulsée par Claude',
  'ai.poweredAI': 'Analyse propulsée par l’IA',
  'hero.h1a': 'Votre métier survivra-t-il',
  'hero.h1b': 'à l’intelligence artificielle ?',
  'hero.subtitle': 'Entrez votre profession. Blumi estime votre risque de remplacement par l’IA, sa progression jusqu’en 2040, et vous donne un plan concret pour garder une longueur d’avance.',
  'mode.single': '🎯 Analyser un métier',
  'mode.compare': '⚔️ Comparer deux métiers',
  'search.single': 'Ex : développeur, comptable, infirmière…',
  'search.a': 'Premier métier (ex : graphiste)',
  'search.b': 'Second métier (ex : développeur)',
  'cta.analyze': 'Analyser mon métier',
  'cta.compare': 'Comparer les deux métiers',
  'suggest.try': 'Essayez :',
  'stats.jobs': 'métiers analysés',
  'stats.factors': 'facteurs d’exposition',
  'stats.horizon': 'horizon de projection',
  'reassure.free': '🔒 Gratuit en mode démo',
  'reassure.local': '📍 Vos données restent sur l’appareil (envoyées à Anthropic seulement si l’IA est activée)',
  'reassure.noresale': '🚫 Aucune revente de données',
  'promo.pill': '✨ L’offre Blumiman',
  'promo.h2a': 'L’analyse te montre le risque.',
  'promo.h2b': 'Blumiman t’aide à agir — toute l’année.',
  'promo.desc': 'Ton copilote IA qui automatise les tâches de ton métier, te fait gagner du temps et t’accompagne dans la durée. Pas juste un score.',
  'promo.b1': '⚡ Automatise tes tâches répétitives',
  'promo.b2': '🧠 Conseils ciblés sur ton métier',
  'promo.b3': '🛠️ Outils IA / no-code prêts à l’emploi',
  'promo.b4': '📈 Un accompagnement continu, pas un one-shot',
  'promo.cta': 'Découvrir Blumiman',
  'promo.note': 'Essaie l’analyse gratuitement, passe à l’action avec Blumiman.',
  'how.title': 'En 3 étapes',
  'how.s1t': 'Décrivez votre métier',
  'how.s1d': 'Saisissez simplement votre profession, telle que vous la nommeriez.',
  'how.s2t': 'Blumi évalue l’exposition',
  'how.s2d': 'Blumi croise 7 facteurs : routine, créativité, relationnel, jugement…',
  'how.s3t': 'Recevez votre plan',
  'how.s3d': 'Score, projection 2026-2040, compétences clés et pistes de reconversion.',
  'feat.title': 'Ce que vous obtenez',
  'feat.f1t': 'Score de remplaçabilité',
  'feat.f1d': 'Un pourcentage clair, calibré sur la nature réelle de vos tâches.',
  'feat.f2t': 'Projection 2026 → 2040',
  'feat.f2d': 'La trajectoire d’automatisation année par année.',
  'feat.f3t': 'Comparateur de métiers',
  'feat.f3d': 'Mettez deux professions face à face pour orienter un choix.',
  'feat.f4t': 'Plan anti-obsolescence',
  'feat.f4d': 'Compétences d’avenir et pistes de reconversion concrètes.',
  'footer.privacy': '🔒 Confidentialité : en mode démo, vos données restent sur votre appareil ; avec l’IA activée, elles sont envoyées à Anthropic pour produire l’analyse.',
  'footer.proto': 'Prototype à visée pédagogique — les estimations sont indicatives et ne constituent pas un conseil professionnel.',
  'footer.mentions': 'Mentions légales',
  'footer.privacyLink': 'Confidentialité',
  'footer.cgu': 'Conditions d’utilisation',
}

const en: Dict = {
  'nav.metiers': 'Jobs',
  'nav.profile': 'My profile',
  'nav.login': 'Sign in',
  'nav.subscription': 'My subscription',
  'nav.luminator': '✨ Blumiman',
  'hero.bubble': '👋 Hi, I’m {name} — your guide in the age of AI.',
  'hero.tapHintOwns': '(tap me on the head 👆)',
  'hero.tapHint': '(tap me 👆 — and click the shadow on the right 👀)',
  'hero.whoIsThere': 'Who’s there? 👀',
  'reveal.title': '✨ I’m Blumiman.',
  'reveal.desc': 'I automate the repetitive tasks of your job — AI tools, no-code, ready-made templates, tailored to your skills.',
  'reveal.unlock': 'Unlock Blumiman',
  'reveal.later': 'Later',
  'ai.poweredClaude': 'Analysis powered by Claude',
  'ai.poweredAI': 'Analysis powered by AI',
  'hero.h1a': 'Will your job survive',
  'hero.h1b': 'artificial intelligence?',
  'hero.subtitle': 'Enter your profession. Blumi estimates your risk of being replaced by AI, how it grows through 2040, and gives you a concrete plan to stay ahead.',
  'mode.single': '🎯 Analyze a job',
  'mode.compare': '⚔️ Compare two jobs',
  'search.single': 'e.g. developer, accountant, nurse…',
  'search.a': 'First job (e.g. designer)',
  'search.b': 'Second job (e.g. developer)',
  'cta.analyze': 'Analyze my job',
  'cta.compare': 'Compare the two jobs',
  'suggest.try': 'Try:',
  'stats.jobs': 'jobs analyzed',
  'stats.factors': 'exposure factors',
  'stats.horizon': 'projection horizon',
  'reassure.free': '🔒 Free in demo mode',
  'reassure.local': '📍 Your data stays on your device (sent to Anthropic only if AI is enabled)',
  'reassure.noresale': '🚫 No data resale',
  'promo.pill': '✨ The Blumiman plan',
  'promo.h2a': 'The analysis shows you the risk.',
  'promo.h2b': 'Blumiman helps you act — all year long.',
  'promo.desc': 'Your AI copilot that automates your job’s tasks, saves you time and supports you over time. Not just a score.',
  'promo.b1': '⚡ Automate your repetitive tasks',
  'promo.b2': '🧠 Advice tailored to your job',
  'promo.b3': '🛠️ Ready-to-use AI / no-code tools',
  'promo.b4': '📈 Ongoing support, not a one-shot',
  'promo.cta': 'Discover Blumiman',
  'promo.note': 'Try the analysis for free, take action with Blumiman.',
  'how.title': 'In 3 steps',
  'how.s1t': 'Describe your job',
  'how.s1d': 'Just type your profession, the way you’d name it.',
  'how.s2t': 'Blumi assesses exposure',
  'how.s2d': 'Blumi weighs 7 factors: routine, creativity, relationships, judgment…',
  'how.s3t': 'Get your plan',
  'how.s3d': 'Score, 2026-2040 projection, key skills and reskilling paths.',
  'feat.title': 'What you get',
  'feat.f1t': 'Replaceability score',
  'feat.f1d': 'A clear percentage, calibrated to the real nature of your tasks.',
  'feat.f2t': 'Projection 2026 → 2040',
  'feat.f2d': 'The automation trajectory, year by year.',
  'feat.f3t': 'Job comparator',
  'feat.f3d': 'Put two professions head to head to guide a choice.',
  'feat.f4t': 'Anti-obsolescence plan',
  'feat.f4d': 'Future-proof skills and concrete reskilling paths.',
  'footer.privacy': '🔒 Privacy: in demo mode, your data stays on your device; with AI enabled, it is sent to Anthropic to produce the analysis.',
  'footer.proto': 'Educational prototype — estimates are indicative and do not constitute professional advice.',
  'footer.mentions': 'Legal notice',
  'footer.privacyLink': 'Privacy',
  'footer.cgu': 'Terms of use',
}

const de: Dict = {
  'nav.metiers': 'Berufe',
  'nav.profile': 'Mein Profil',
  'nav.login': 'Anmelden',
  'nav.subscription': 'Mein Abo',
  'nav.luminator': '✨ Blumiman',
  'hero.bubble': '👋 Hallo, ich bin {name} — dein Begleiter im Zeitalter der KI.',
  'hero.tapHintOwns': '(tipp mir auf den Kopf 👆)',
  'hero.tapHint': '(tipp mich an 👆 — und klick auf den Schatten rechts 👀)',
  'hero.whoIsThere': 'Wer ist da? 👀',
  'reveal.title': '✨ Ich bin Blumiman.',
  'reveal.desc': 'Ich automatisiere die wiederkehrenden Aufgaben deines Berufs — KI-Tools, No-Code, fertige Vorlagen, passend zu deinen Fähigkeiten.',
  'reveal.unlock': 'Blumiman freischalten',
  'reveal.later': 'Später',
  'ai.poweredClaude': 'Analyse mit Claude',
  'ai.poweredAI': 'Analyse mit KI',
  'hero.h1a': 'Übersteht dein Beruf',
  'hero.h1b': 'die künstliche Intelligenz?',
  'hero.subtitle': 'Gib deinen Beruf ein. Blumi schätzt dein Risiko, von KI ersetzt zu werden, dessen Entwicklung bis 2040 und gibt dir einen konkreten Plan, um vorne zu bleiben.',
  'mode.single': '🎯 Einen Beruf analysieren',
  'mode.compare': '⚔️ Zwei Berufe vergleichen',
  'search.single': 'z. B. Entwickler, Buchhalter, Krankenpfleger…',
  'search.a': 'Erster Beruf (z. B. Grafiker)',
  'search.b': 'Zweiter Beruf (z. B. Entwickler)',
  'cta.analyze': 'Meinen Beruf analysieren',
  'cta.compare': 'Beide Berufe vergleichen',
  'suggest.try': 'Probiere:',
  'stats.jobs': 'analysierte Berufe',
  'stats.factors': 'Risikofaktoren',
  'stats.horizon': 'Projektionshorizont',
  'reassure.free': '🔒 Kostenlos im Demo-Modus',
  'reassure.local': '📍 Deine Daten bleiben auf deinem Gerät (nur an Anthropic gesendet, wenn KI aktiviert ist)',
  'reassure.noresale': '🚫 Kein Weiterverkauf von Daten',
  'promo.pill': '✨ Das Blumiman-Angebot',
  'promo.h2a': 'Die Analyse zeigt dir das Risiko.',
  'promo.h2b': 'Blumiman hilft dir zu handeln — das ganze Jahr.',
  'promo.desc': 'Dein KI-Copilot, der die Aufgaben deines Berufs automatisiert, dir Zeit spart und dich langfristig begleitet. Nicht nur ein Score.',
  'promo.b1': '⚡ Automatisiere wiederkehrende Aufgaben',
  'promo.b2': '🧠 Auf deinen Beruf zugeschnittene Tipps',
  'promo.b3': '🛠️ Sofort nutzbare KI-/No-Code-Tools',
  'promo.b4': '📈 Dauerhafte Begleitung, kein Einmal-Effekt',
  'promo.cta': 'Blumiman entdecken',
  'promo.note': 'Teste die Analyse kostenlos, werde mit Blumiman aktiv.',
  'how.title': 'In 3 Schritten',
  'how.s1t': 'Beschreibe deinen Beruf',
  'how.s1d': 'Gib einfach deinen Beruf ein, so wie du ihn nennen würdest.',
  'how.s2t': 'Blumi bewertet das Risiko',
  'how.s2d': 'Blumi berücksichtigt 7 Faktoren: Routine, Kreativität, Beziehung, Urteilsvermögen…',
  'how.s3t': 'Erhalte deinen Plan',
  'how.s3d': 'Score, Projektion 2026-2040, Schlüsselkompetenzen und Umschulungswege.',
  'feat.title': 'Das bekommst du',
  'feat.f1t': 'Ersetzbarkeits-Score',
  'feat.f1d': 'Ein klarer Prozentwert, abgestimmt auf die tatsächliche Art deiner Aufgaben.',
  'feat.f2t': 'Projektion 2026 → 2040',
  'feat.f2d': 'Der Automatisierungsverlauf, Jahr für Jahr.',
  'feat.f3t': 'Berufsvergleich',
  'feat.f3d': 'Stelle zwei Berufe gegenüber, um eine Wahl zu treffen.',
  'feat.f4t': 'Plan gegen Veralten',
  'feat.f4d': 'Zukunftssichere Kompetenzen und konkrete Umschulungswege.',
  'footer.privacy': '🔒 Datenschutz: im Demo-Modus bleiben deine Daten auf deinem Gerät; mit aktivierter KI werden sie zur Analyse an Anthropic gesendet.',
  'footer.proto': 'Lern-Prototyp — Schätzungen sind Richtwerte und stellen keine professionelle Beratung dar.',
  'footer.mentions': 'Impressum',
  'footer.privacyLink': 'Datenschutz',
  'footer.cgu': 'Nutzungsbedingungen',
}

const es: Dict = {
  'nav.metiers': 'Profesiones',
  'nav.profile': 'Mi perfil',
  'nav.login': 'Iniciar sesión',
  'nav.subscription': 'Mi suscripción',
  'nav.luminator': '✨ Blumiman',
  'hero.bubble': '👋 Hola, soy {name}, tu guía frente a la IA.',
  'hero.tapHintOwns': '(tócame la cabeza 👆)',
  'hero.tapHint': '(tócame 👆 — y haz clic en la sombra de la derecha 👀)',
  'hero.whoIsThere': '¿Quién anda ahí? 👀',
  'reveal.title': '✨ Soy Blumiman.',
  'reveal.desc': 'Automatizo las tareas repetitivas de tu profesión: herramientas de IA, no-code, plantillas listas para usar, adaptadas a tus competencias.',
  'reveal.unlock': 'Desbloquear Blumiman',
  'reveal.later': 'Más tarde',
  'ai.poweredClaude': 'Análisis con tecnología Claude',
  'ai.poweredAI': 'Análisis con tecnología de IA',
  'hero.h1a': '¿Sobrevivirá tu profesión',
  'hero.h1b': 'a la inteligencia artificial?',
  'hero.subtitle': 'Introduce tu profesión. Blumi estima tu riesgo de ser reemplazado por la IA, su evolución hasta 2040 y te da un plan concreto para ir un paso por delante.',
  'mode.single': '🎯 Analizar una profesión',
  'mode.compare': '⚔️ Comparar dos profesiones',
  'search.single': 'Ej.: desarrollador, contable, enfermera…',
  'search.a': 'Primera profesión (ej.: diseñador)',
  'search.b': 'Segunda profesión (ej.: desarrollador)',
  'cta.analyze': 'Analizar mi profesión',
  'cta.compare': 'Comparar las dos profesiones',
  'suggest.try': 'Prueba:',
  'stats.jobs': 'profesiones analizadas',
  'stats.factors': 'factores de exposición',
  'stats.horizon': 'horizonte de proyección',
  'reassure.free': '🔒 Gratis en modo demo',
  'reassure.local': '📍 Tus datos se quedan en tu dispositivo (se envían a Anthropic solo si activas la IA)',
  'reassure.noresale': '🚫 Sin reventa de datos',
  'promo.pill': '✨ El plan Blumiman',
  'promo.h2a': 'El análisis te muestra el riesgo.',
  'promo.h2b': 'Blumiman te ayuda a actuar, todo el año.',
  'promo.desc': 'Tu copiloto de IA que automatiza las tareas de tu profesión, te ahorra tiempo y te acompaña a largo plazo. No solo un score.',
  'promo.b1': '⚡ Automatiza tus tareas repetitivas',
  'promo.b2': '🧠 Consejos adaptados a tu profesión',
  'promo.b3': '🛠️ Herramientas de IA / no-code listas para usar',
  'promo.b4': '📈 Acompañamiento continuo, no algo puntual',
  'promo.cta': 'Descubrir Blumiman',
  'promo.note': 'Prueba el análisis gratis, pasa a la acción con Blumiman.',
  'how.title': 'En 3 pasos',
  'how.s1t': 'Describe tu profesión',
  'how.s1d': 'Solo escribe tu profesión, tal como la llamarías.',
  'how.s2t': 'Blumi evalúa la exposición',
  'how.s2d': 'Blumi cruza 7 factores: rutina, creatividad, relación, criterio…',
  'how.s3t': 'Recibe tu plan',
  'how.s3d': 'Score, proyección 2026-2040, competencias clave y vías de reconversión.',
  'feat.title': 'Lo que obtienes',
  'feat.f1t': 'Score de reemplazabilidad',
  'feat.f1d': 'Un porcentaje claro, calibrado según la naturaleza real de tus tareas.',
  'feat.f2t': 'Proyección 2026 → 2040',
  'feat.f2d': 'La trayectoria de automatización, año tras año.',
  'feat.f3t': 'Comparador de profesiones',
  'feat.f3d': 'Enfrenta dos profesiones para orientar una decisión.',
  'feat.f4t': 'Plan anti-obsolescencia',
  'feat.f4d': 'Competencias de futuro y vías de reconversión concretas.',
  'footer.privacy': '🔒 Privacidad: en modo demo, tus datos se quedan en tu dispositivo; con la IA activada, se envían a Anthropic para producir el análisis.',
  'footer.proto': 'Prototipo educativo — las estimaciones son indicativas y no constituyen asesoramiento profesional.',
  'footer.mentions': 'Aviso legal',
  'footer.privacyLink': 'Privacidad',
  'footer.cgu': 'Términos de uso',
}

const zh: Dict = {
  'nav.metiers': '职业',
  'nav.profile': '我的资料',
  'nav.login': '登录',
  'nav.subscription': '我的订阅',
  'nav.luminator': '✨ Blumiman',
  'hero.bubble': '👋 你好，我是 {name}，你面对 AI 的向导。',
  'hero.tapHintOwns': '（点点我的头 👆）',
  'hero.tapHint': '（点点我 👆 —— 再点右边的影子 👀）',
  'hero.whoIsThere': '谁在那儿？👀',
  'reveal.title': '✨ 我是 Blumiman。',
  'reveal.desc': '我帮你自动化职业中重复的任务——AI 工具、无代码、即用模板，贴合你的技能。',
  'reveal.unlock': '解锁 Blumiman',
  'reveal.later': '以后再说',
  'ai.poweredClaude': '由 Claude 提供分析',
  'ai.poweredAI': '由 AI 提供分析',
  'hero.h1a': '你的职业能否挺过',
  'hero.h1b': '人工智能的冲击？',
  'hero.subtitle': '输入你的职业。Blumi 估算你被 AI 取代的风险、到 2040 年的变化趋势，并给你一份保持领先的具体计划。',
  'mode.single': '🎯 分析一个职业',
  'mode.compare': '⚔️ 比较两个职业',
  'search.single': '例如：开发者、会计、护士……',
  'search.a': '第一个职业（例如：设计师）',
  'search.b': '第二个职业（例如：开发者）',
  'cta.analyze': '分析我的职业',
  'cta.compare': '比较两个职业',
  'suggest.try': '试试：',
  'stats.jobs': '已分析职业',
  'stats.factors': '风险因素',
  'stats.horizon': '预测年限',
  'reassure.free': '🔒 演示模式免费',
  'reassure.local': '📍 你的数据保留在本设备（仅在启用 AI 时发送给 Anthropic）',
  'reassure.noresale': '🚫 绝不转售数据',
  'promo.pill': '✨ Blumiman 套餐',
  'promo.h2a': '分析让你看清风险。',
  'promo.h2b': 'Blumiman 全年帮你行动。',
  'promo.desc': '你的 AI 副驾驶，自动化你职业中的任务，为你节省时间并长期陪伴。不只是一个分数。',
  'promo.b1': '⚡ 自动化重复任务',
  'promo.b2': '🧠 针对你职业的建议',
  'promo.b3': '🛠️ 即用的 AI / 无代码工具',
  'promo.b4': '📈 持续陪伴，而非一次性',
  'promo.cta': '了解 Blumiman',
  'promo.note': '免费试用分析，用 Blumiman 付诸行动。',
  'how.title': '三个步骤',
  'how.s1t': '描述你的职业',
  'how.s1d': '直接输入你的职业名称即可。',
  'how.s2t': 'Blumi 评估风险',
  'how.s2d': 'Blumi 综合 7 个因素：重复性、创造力、人际、判断力……',
  'how.s3t': '获取你的计划',
  'how.s3d': '分数、2026-2040 预测、关键技能与转型路径。',
  'feat.title': '你将获得',
  'feat.f1t': '可替代性分数',
  'feat.f1d': '一个清晰的百分比，依据你任务的真实性质校准。',
  'feat.f2t': '2026 → 2040 预测',
  'feat.f2d': '逐年的自动化走势。',
  'feat.f3t': '职业对比',
  'feat.f3d': '将两个职业并排比较，帮助你做选择。',
  'feat.f4t': '抗淘汰计划',
  'feat.f4d': '面向未来的技能与具体的转型路径。',
  'footer.privacy': '🔒 隐私：演示模式下，你的数据保留在本设备；启用 AI 后，数据会发送给 Anthropic 以生成分析。',
  'footer.proto': '教育用途原型——估算仅供参考，不构成专业建议。',
  'footer.mentions': '法律声明',
  'footer.privacyLink': '隐私',
  'footer.cgu': '使用条款',
}

const MESSAGES: Record<Lang, Dict> = { fr, en, de, es, zh }
