import { useMemo } from 'react'
import { PROFESSIONS } from '../lib/professions'
import { analyze } from '../lib/engine'
import { useSeo } from '../lib/seo'
import { Logo } from './Logo'

interface Props {
  professionId: string
  onBack: () => void
  onOpenDirectory: () => void
  onAnalyze: (role: string) => void
}

function riskColor(r: number): string {
  if (r < 30) return '#10b981'
  if (r < 55) return '#f59e0b'
  if (r < 75) return '#f97316'
  return '#ef4444'
}

// Fiche métier — page d'atterrissage SEO répondant à « L'IA va-t-elle
// remplacer le métier de X ? ». Contenu statique (sans appel IA) → rapide et
// indexable. Le CTA lance l'analyse complète et personnalisée.
export function MetierLanding({ professionId, onBack, onOpenDirectory, onAnalyze }: Props) {
  const profession = PROFESSIONS.find((p) => p.id === professionId) ?? PROFESSIONS[0]
  const a = useMemo(() => analyze(profession.label), [profession.label])

  useSeo(
    `L'IA va-t-elle remplacer le métier de ${profession.label} ? | YourCareer`,
    `Risque d'automatisation du métier de ${profession.label} estimé à ${a.score}%. Tâches exposées, projection jusqu'en 2040 et conseils pour rester employable face à l'IA.`,
  )

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onOpenDirectory} className="btn-ghost py-2.5 text-sm">
            Tous les métiers
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        {/* Fil d'ariane */}
        <nav className="animate-fade-up pt-8 text-sm text-ink-400">
          <button onClick={onBack} className="hover:text-brand-700">Accueil</button>
          <span className="mx-1.5">/</span>
          <button onClick={onOpenDirectory} className="hover:text-brand-700">Métiers</button>
          <span className="mx-1.5">/</span>
          <span className="text-ink-600">{profession.label}</span>
        </nav>

        <section className="animate-fade-up mt-4" style={{ animationDelay: '60ms' }}>
          <span className="text-4xl">{profession.emoji}</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-4xl">
            L'IA va-t-elle remplacer le métier de {profession.label.toLowerCase()} ?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            Le métier de {profession.label.toLowerCase()} relève du domaine « {profession.domain} ». Face à l'essor de
            l'intelligence artificielle, son exposition à l'automatisation est estimée à <strong>{a.score}%</strong> —
            un niveau {a.level.toLowerCase()}. Voici ce que cela signifie, et comment garder une longueur d'avance.
          </p>
        </section>

        {/* Réponse courte */}
        <section className="animate-fade-up mt-6 grid gap-4 sm:grid-cols-3" style={{ animationDelay: '120ms' }}>
          {[
            { v: `${a.score}%`, l: 'risque global', c: riskColor(a.score) },
            { v: `${a.riskIn2040}%`, l: 'projeté en 2040', c: riskColor(a.riskIn2040) },
            { v: `${a.resilience}%`, l: 'résilience humaine', c: '#10b981' },
          ].map((m) => (
            <div key={m.l} className="card p-5 text-center">
              <div className="font-display text-3xl font-extrabold" style={{ color: m.c }}>{m.v}</div>
              <div className="mt-1 text-sm text-ink-500">{m.l}</div>
            </div>
          ))}
        </section>

        {/* Tâches exposées */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '180ms' }}>
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold text-ink-900">Quelles tâches sont les plus exposées ?</h2>
            <div className="mt-4 space-y-3">
              {a.tasks.slice(0, 4).map((t) => (
                <div key={t.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{t.label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: riskColor(t.risk) }}>{t.risk}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full" style={{ width: `${t.risk}%`, background: riskColor(t.risk) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comment rester employable */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '240ms' }}>
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold text-ink-900">Comment rester employable face à l'IA ?</h2>
            <div className="mt-4 space-y-4">
              {a.recommendations.slice(0, 3).map((r) => (
                <div key={r.title}>
                  <h3 className="font-semibold text-ink-900">{r.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{r.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="animate-fade-up mt-8 rounded-3xl bg-gradient-to-br from-ink-900 to-brand-900 p-8 text-center text-white" style={{ animationDelay: '300ms' }}>
          <h2 className="font-display text-2xl font-bold">Votre situation est unique</h2>
          <p className="mx-auto mt-2 max-w-md text-white/70">
            Obtenez une analyse complète et personnalisée de votre métier : projection détaillée, plan d'action et suivi dans le temps.
          </p>
          <button onClick={() => onAnalyze(profession.label)} className="btn-primary mx-auto mt-5 bg-white text-brand-700 hover:bg-white/90">
            Lancer mon analyse personnalisée
          </button>
        </section>

        <p className="animate-fade-up mt-8 text-center text-xs text-ink-400" style={{ animationDelay: '340ms' }}>
          Estimation indicative — voir la méthodologie et les sources dans l'analyse complète.
        </p>
      </main>
    </div>
  )
}
