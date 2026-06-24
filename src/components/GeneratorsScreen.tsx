import { Logo } from './Logo'
import { brandName } from '../lib/entitlement'

interface Props {
  onBack: () => void
  onOpenChat: (message?: string) => void
}

// Générateurs express : des livrables concrets en un clic. Chaque carte ouvre le
// chat avec un prompt cadré ; Luminator s'appuie sur le profil pour personnaliser
// (et peut ranger les résultats dans le plan / la boîte à outils).
const GENERATORS: { emoji: string; title: string; desc: string; prompt: string }[] = [
  {
    emoji: '📄',
    title: 'Optimiser mon CV',
    desc: 'Structure, mots-clés et points forts face à l\'IA.',
    prompt: 'Aide-moi à optimiser mon CV pour mon métier : propose une structure, les mots-clés à inclure et les points à mettre en avant pour rester recherché face à l\'IA.',
  },
  {
    emoji: '🎤',
    title: 'Mon pitch en 30 s',
    desc: 'Une présentation claire et mémorable.',
    prompt: 'Aide-moi à écrire mon pitch de présentation professionnel de 30 secondes, clair, percutant et adapté à mon profil.',
  },
  {
    emoji: '⏱️',
    title: 'Audit d\'automatisation',
    desc: 'Repère les tâches de ta semaine à automatiser.',
    prompt: 'Fais l\'audit de ma semaine type : repère 3 tâches chronophages que je peux automatiser, explique comment, et ajoute-les à mon plan d\'action.',
  },
  {
    emoji: '✉️',
    title: 'Modèle d\'email',
    desc: 'Un email de relance réutilisable.',
    prompt: 'Crée-moi un modèle d\'email de relance réutilisable, professionnel et personnalisable, adapté à mon métier.',
  },
  {
    emoji: '🎓',
    title: 'Plan de formation',
    desc: 'Monter en compétence sur 3 mois.',
    prompt: 'Propose-moi un plan de formation sur 3 mois pour monter en compétence et rester employable dans mon métier, puis ajoute les étapes clés à mon plan d\'action.',
  },
  {
    emoji: '💼',
    title: 'Préparer un entretien',
    desc: 'Questions probables + réponses.',
    prompt: 'Aide-moi à préparer un entretien pour mon métier : liste les questions probables et aide-moi à structurer mes réponses à partir de mon parcours.',
  },
]

export function GeneratorsScreen({ onBack, onOpenChat }: Props) {
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">Générateurs express</h1>
          <p className="mt-1 text-sm text-ink-500">
            Des livrables concrets en un clic. {brandName()} s'appuie sur ton profil pour tout personnaliser.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GENERATORS.map((g) => (
              <button
                key={g.title}
                onClick={() => onOpenChat(g.prompt)}
                className="card flex items-start gap-3 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">{g.emoji}</span>
                <div>
                  <h3 className="font-display font-bold text-ink-900">{g.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
