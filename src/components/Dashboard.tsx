import { Analysis, BASE_YEAR, HORIZON_YEAR } from '../lib/engine'
import { RISK_THEME, useCountUp } from '../lib/ui'
import { Logo } from './Logo'
import { RadialGauge } from './RadialGauge'
import { ProjectionChart } from './ProjectionChart'

interface Props {
  analysis: Analysis
  onReset: () => void
}

const TAG_STYLES: Record<string, string> = {
  Augmentation: 'bg-brand-100 text-brand-700',
  Différenciation: 'bg-violet-100 text-violet-700',
  Évolution: 'bg-sky-100 text-sky-700',
  Protection: 'bg-emerald-100 text-emerald-700',
}

function riskColor(r: number): string {
  if (r < 30) return '#10b981'
  if (r < 55) return '#f59e0b'
  if (r < 75) return '#f97316'
  return '#ef4444'
}

export function Dashboard({ analysis, onReset }: Props) {
  const theme = RISK_THEME[analysis.level]
  const resilience = useCountUp(analysis.resilience, 1300)
  const risk2040 = useCountUp(analysis.riskIn2040, 1300)

  return (
    <div className="min-h-screen pb-20">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <button onClick={onReset} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Nouvelle analyse
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* En-tête de résultat */}
        <section className="animate-fade-up pt-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-card">
              {analysis.profession.emoji}
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">
                {analysis.profession.label}
              </h1>
              <span className="text-sm text-ink-500">{analysis.profession.domain}</span>
            </div>
            {!analysis.exact && (
              <span className="pill bg-ink-100 text-ink-500" title="Métier estimé par approximation">
                profil estimé
              </span>
            )}
          </div>
        </section>

        {/* Bloc principal : jauge + verdict + métriques */}
        <section className="animate-fade-up mt-6 grid gap-6 lg:grid-cols-[320px_1fr]" style={{ animationDelay: '80ms' }}>
          <div className="card flex flex-col items-center justify-center gap-2 p-8">
            <span className="text-sm font-medium text-ink-500">Risque de remplacement par l'IA</span>
            <RadialGauge score={analysis.score} level={analysis.level} />
          </div>

          <div className="flex flex-col gap-6">
            <div className={`card border-l-4 p-6 ${theme.bg}`} style={{ borderColor: theme.hex }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-500">Verdict de l'IA</h2>
                  <p className="mt-1 text-lg font-medium leading-snug text-ink-900">{analysis.verdict}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <MetricCard label={`Résilience humaine`} value={`${Math.round(resilience)}%`} hint="part difficile à automatiser" accent="#10b981" />
              <MetricCard label={`Risque en ${HORIZON_YEAR}`} value={`${Math.round(risk2040)}%`} hint={`contre ${analysis.projection[0].value}% en ${BASE_YEAR}`} accent={theme.hex} />
              <MetricCard label="Niveau d'exposition" value={analysis.level} hint="catégorie globale" accent={theme.hex} />
            </div>
          </div>
        </section>

        {/* Projection temporelle */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '160ms' }}>
          <div className="card p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900">Progression du risque</h2>
                <p className="text-sm text-ink-500">Part estimée des tâches automatisables, de {BASE_YEAR} à {HORIZON_YEAR}.</p>
              </div>
              <span className={`pill ${theme.chip}`}>
                {analysis.riskIn2040 > analysis.projection[0].value ? '↑' : '→'} +{analysis.riskIn2040 - analysis.projection[0].value} pts d'ici {HORIZON_YEAR}
              </span>
            </div>
            <div className="mt-4">
              <ProjectionChart data={analysis.projection} level={analysis.level} />
            </div>
          </div>
        </section>

        {/* Décomposition par tâche + profil de compétences */}
        <section className="animate-fade-up mt-6 grid gap-6 lg:grid-cols-2" style={{ animationDelay: '220ms' }}>
          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">Décomposition par type de tâche</h2>
            <p className="text-sm text-ink-500">Ce que l'IA peut prendre en charge, activité par activité.</p>
            <div className="mt-6 space-y-4">
              {analysis.tasks.map((t, i) => (
                <TaskBar key={t.label} label={t.label} risk={t.risk} delay={i * 80} />
              ))}
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">Vos atouts face à l'IA</h2>
            <p className="text-sm text-ink-500">Les dimensions humaines qui vous protègent.</p>
            <div className="mt-6 space-y-4">
              <FactorRow label="🎨 Créativité & conception" value={analysis.profession.factors.creativity} />
              <FactorRow label="❤️ Relation & empathie" value={analysis.profession.factors.empathy} />
              <FactorRow label="🧠 Jugement & décision" value={analysis.profession.factors.judgment} />
              <FactorRow label="🤝 Relationnel & influence" value={analysis.profession.factors.social} />
              <FactorRow label="🔧 Présence physique & terrain" value={analysis.profession.factors.physical} />
            </div>
          </div>
        </section>

        {/* Plan d'action */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink-900">Comment garder une longueur d'avance</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {analysis.recommendations.map((r) => (
              <div key={r.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-glow">
                <span className={`pill ${TAG_STYLES[r.tag] ?? 'bg-ink-100 text-ink-600'}`}>{r.tag}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-ink-900">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{r.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compétences d'avenir */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '320ms' }}>
          <div className="card bg-gradient-to-br from-ink-900 to-brand-900 p-6 text-white md:p-8">
            <h2 className="font-display text-xl font-bold">🚀 Compétences d'avenir à développer</h2>
            <p className="text-sm text-white/60">Priorisées pour votre profil par notre moteur.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {analysis.skills.map((s) => (
                <div key={s.name} className="flex gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="mt-1 text-sm text-white/60">{s.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pistes de reconversion */}
        {analysis.pivots.length > 0 && (
          <section className="animate-fade-up mt-6" style={{ animationDelay: '360ms' }}>
            <h2 className="font-display text-xl font-bold text-ink-900">Métiers plus résilients à explorer</h2>
            <p className="text-sm text-ink-500">Des trajectoires d'évolution avec une moindre exposition à l'IA.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {analysis.pivots.map((p) => (
                <div key={p.label} className="card flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink-50 text-2xl">{p.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-ink-900">{p.label}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: riskColor(p.risk) }} />
                      <span className="text-xs text-ink-500">risque {p.risk}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA bas de page */}
        <section className="animate-fade-up mt-10 text-center" style={{ animationDelay: '400ms' }}>
          <button onClick={onReset} className="btn-primary mx-auto">
            Analyser un autre métier
          </button>
          <p className="mx-auto mt-6 max-w-xl text-xs text-ink-400">
            Estimations générées par un modèle heuristique à visée pédagogique. Elles ne constituent
            pas une prédiction certaine ni un conseil en orientation professionnelle.
          </p>
        </section>
      </main>
    </div>
  )
}

function MetricCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="card p-5">
      <div className="h-1.5 w-8 rounded-full" style={{ background: accent }} />
      <div className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-700">{label}</div>
      <div className="text-xs text-ink-400">{hint}</div>
    </div>
  )
}

function TaskBar({ label, risk, delay }: { label: string; risk: number; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: riskColor(risk) }}>{risk}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${risk}%`,
            background: riskColor(risk),
            animation: `grow 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
          }}
        />
      </div>
      <style>{`@keyframes grow { from { width: 0; } }`}</style>
    </div>
  )
}

function FactorRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-semibold tabular-nums text-brand-700">{value}/100</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          style={{ width: `${value}%`, animation: 'grow 1s cubic-bezier(0.16,1,0.3,1) both' }}
        />
      </div>
    </div>
  )
}
