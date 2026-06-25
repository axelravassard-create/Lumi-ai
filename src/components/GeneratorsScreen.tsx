import { Logo } from './Logo'
import { brandName } from '../lib/entitlement'
import { t, useLang } from '../lib/i18n'

interface Props {
  onBack: () => void
  onOpenChat: (message?: string) => void
}

// Générateurs express : des livrables concrets en un clic. Chaque carte ouvre le
// chat avec un prompt cadré ; les textes (titre/desc/prompt) viennent de l'i18n.
const GENERATORS: { emoji: string; key: string }[] = [
  { emoji: '📄', key: 'gen.g0' },
  { emoji: '🎤', key: 'gen.g1' },
  { emoji: '⏱️', key: 'gen.g2' },
  { emoji: '✉️', key: 'gen.g3' },
  { emoji: '🎓', key: 'gen.g4' },
  { emoji: '💼', key: 'gen.g5' },
]

export function GeneratorsScreen({ onBack, onOpenChat }: Props) {
  useLang()
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('common.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{t('gen.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t('gen.intro').replace('{name}', brandName())}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GENERATORS.map((g) => (
              <button
                key={g.key}
                onClick={() => onOpenChat(t(`${g.key}.prompt`))}
                className="card flex items-start gap-3 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">{g.emoji}</span>
                <div>
                  <h3 className="font-display font-bold text-ink-900">{t(`${g.key}.title`)}</h3>
                  <p className="mt-1 text-sm text-ink-500">{t(`${g.key}.desc`)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
