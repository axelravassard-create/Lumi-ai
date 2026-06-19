import { useMemo } from 'react'
import { PROFESSIONS } from '../lib/professions'
import { analyze } from '../lib/engine'
import { useSeo } from '../lib/seo'
import { Logo } from './Logo'

interface Props {
  onBack: () => void
  onOpenMetier: (id: string) => void
}

function riskColor(r: number): string {
  if (r < 30) return '#10b981'
  if (r < 55) return '#f59e0b'
  if (r < 75) return '#f97316'
  return '#ef4444'
}

// Annuaire des métiers — page d'atterrissage SEO listant toutes les fiches.
export function MetiersDirectory({ onBack, onOpenMetier }: Props) {
  useSeo(
    'Tous les métiers face à l\'IA — risque d\'automatisation | Lumi',
    'Découvrez le risque de remplacement par l\'intelligence artificielle pour des dizaines de métiers, et comment garder une longueur d\'avance.',
  )

  // Regroupe les métiers par domaine, avec leur score estimé.
  const byDomain = useMemo(() => {
    const map = new Map<string, { id: string; label: string; emoji: string; score: number }[]>()
    for (const p of PROFESSIONS) {
      const score = analyze(p.label).score
      if (!map.has(p.domain)) map.set(p.domain, [])
      map.get(p.domain)!.push({ id: p.id, label: p.label, emoji: p.emoji, score })
    }
    for (const list of map.values()) list.sort((a, b) => b.score - a.score)
    return [...map.entries()]
  }, [])

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Accueil
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="animate-fade-up pt-12 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 md:text-5xl">
            Tous les métiers face à l'IA
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500">
            Explorez le risque d'automatisation par l'intelligence artificielle, métier par métier.
            Choisissez le vôtre pour une analyse complète et personnalisée.
          </p>
        </section>

        {byDomain.map(([domain, list], i) => (
          <section key={domain} className="animate-fade-up mt-10" style={{ animationDelay: `${i * 40}ms` }}>
            <h2 className="font-display text-lg font-bold text-ink-900">{domain}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpenMetier(p.id)}
                  className="card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink-50 text-xl">{p.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{p.label}</span>
                  <span className="shrink-0 font-display text-sm font-extrabold tabular-nums" style={{ color: riskColor(p.score) }}>
                    {p.score}%
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
