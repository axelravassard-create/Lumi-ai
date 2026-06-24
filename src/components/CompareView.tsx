import { useMemo } from 'react'
import { Analysis, BASE_YEAR, HORIZON_YEAR } from '../lib/engine'
import { ComparisonResult } from '../lib/llm'
import { useCountUp } from '../lib/ui'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { useBrand } from '../lib/entitlement'

interface Props {
  a: Analysis
  b: Analysis
  comparison: ComparisonResult | null
  onReset: () => void
}

const COLOR_A = '#4f46e5' // indigo
const COLOR_B = '#f59e0b' // amber

export function CompareView({ a, b, comparison, onReset }: Props) {
  const { name } = useBrand()
  // Comparaison de repli (heuristique) si l'IA n'est pas connectée.
  const fallback = useMemo<ComparisonResult>(() => {
    const safer = a.score <= b.score ? a : b
    const riskier = a.score <= b.score ? b : a
    return {
      summary: `Le métier de ${safer.profession.label.toLowerCase()} (${safer.score}%) est plus résilient face à l'IA que celui de ${riskier.profession.label.toLowerCase()} (${riskier.score}%), avec ${riskier.score - safer.score} points d'écart de risque.`,
      winnerLabel: safer.profession.label,
      insights: [
        `${safer.profession.label} conserve une plus grande part de tâches difficiles à automatiser (résilience ${safer.resilience}%).`,
        `L'écart se creuse d'ici ${HORIZON_YEAR} : ${a.riskIn2040}% contre ${b.riskIn2040}%.`,
        `Dans les deux cas, l'enjeu est d'utiliser l'IA comme un levier plutôt que de la subir.`,
      ],
    }
  }, [a, b])

  const result = comparison ?? fallback
  const winnerIsA = result.winnerLabel.toLowerCase().includes(a.profession.label.toLowerCase().slice(0, 8))

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo onClick={onReset} />
          <button onClick={onReset} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Nouvelle comparaison
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="animate-fade-up pt-10 text-center">
          <span className="pill mx-auto bg-brand-50 text-brand-700">⚔️ Comparaison de métiers</span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900 md:text-3xl">
            {a.profession.label} <span className="text-ink-300">vs</span> {b.profession.label}
          </h1>
        </section>

        {/* Deux jauges face à face */}
        <section className="animate-fade-up mt-8 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]" style={{ animationDelay: '80ms' }}>
          <CompareCard analysis={a} color={COLOR_A} winner={winnerIsA} />
          <div className="grid place-items-center">
            <span className="font-display text-2xl font-extrabold text-ink-300">VS</span>
          </div>
          <CompareCard analysis={b} color={COLOR_B} winner={!winnerIsA} />
        </section>

        {/* Verdict comparatif — présenté par le personnage */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '160ms' }}>
          <div className="card flex flex-col items-center gap-5 border-l-4 border-brand-500 bg-brand-50/40 p-5 sm:flex-row sm:gap-6 sm:p-6">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative h-32 w-32 sm:h-40 sm:w-40">
                <Avatar state="idle" className="h-full w-full" />
              </div>
              <span className="pill bg-brand-50 font-bold text-brand-700">{name}</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-500">
                {comparison ? `La comparaison de ${name}` : 'Analyse comparative'}
              </h2>
              <p className="mt-1 text-lg font-medium leading-snug text-ink-900">{result.summary}</p>
              <div className="mt-3 pill bg-emerald-100 text-emerald-700">
                🏆 Plus résilient : {result.winnerLabel}
              </div>
            </div>
          </div>
        </section>

        {/* Projection superposée */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '220ms' }}>
          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">Trajectoires comparées</h2>
            <p className="text-sm text-ink-500">Évolution du risque d'automatisation, {BASE_YEAR}–{HORIZON_YEAR}.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Legend color={COLOR_A} label={a.profession.label} />
              <Legend color={COLOR_B} label={b.profession.label} />
            </div>
            <div className="mt-2">
              <DualChart a={a} b={b} />
            </div>
          </div>
        </section>

        {/* Enseignements */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '280ms' }}>
          <h2 className="font-display text-xl font-bold text-ink-900">Ce qu'il faut en retenir</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {result.insights.slice(0, 3).map((insight, i) => (
              <div key={i} className="card p-5">
                <div className="font-display text-2xl text-brand-500">{['①', '②', '③'][i]}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{insight}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-fade-up mt-10 text-center" style={{ animationDelay: '340ms' }}>
          <button onClick={onReset} className="btn-primary mx-auto">
            Comparer d'autres métiers
          </button>
        </section>
      </main>
    </div>
  )
}

function CompareCard({ analysis, color, winner }: { analysis: Analysis; color: string; winner: boolean }) {
  const score = useCountUp(analysis.score, 1200)
  return (
    <div className={`card relative p-6 text-center ${winner ? 'ring-2 ring-emerald-300' : ''}`}>
      {winner && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 pill bg-emerald-500 text-white shadow">
          🏆 Plus résilient
        </span>
      )}
      <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-ink-50 text-2xl">
        {analysis.profession.emoji}
      </span>
      <h3 className="mt-3 truncate font-display text-lg font-bold text-ink-900">{analysis.profession.label}</h3>
      <span className="text-xs text-ink-500">{analysis.profession.domain}</span>
      <div className="mt-4 font-display text-5xl font-extrabold tabular-nums" style={{ color }}>
        {Math.round(score)}<span className="text-2xl text-ink-300">%</span>
      </div>
      <p className="mt-1 text-sm text-ink-500">risque de remplacement</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-ink-50 px-3 py-2">
          <div className="font-bold text-ink-900">{analysis.resilience}%</div>
          <div className="text-xs text-ink-500">résilience</div>
        </div>
        <div className="rounded-xl bg-ink-50 px-3 py-2">
          <div className="font-bold text-ink-900">{analysis.riskIn2040}%</div>
          <div className="text-xs text-ink-500">en {HORIZON_YEAR}</div>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <span className="text-ink-700">{label}</span>
    </div>
  )
}

// Graphique à deux courbes superposées.
function DualChart({ a, b }: { a: Analysis; b: Analysis }) {
  const W = 680
  const H = 280
  const pad = { top: 24, right: 24, bottom: 38, left: 40 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const minYear = a.projection[0].year
  const maxYear = a.projection[a.projection.length - 1].year
  const x = (year: number) => pad.left + ((year - minYear) / (maxYear - minYear)) * innerW
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH
  const path = (data: typeof a.projection) => `M ${data.map((d) => `${x(d.year)},${y(d.value)}`).join(' L ')}`

  const gridLines = [0, 25, 50, 75, 100]
  const yearTicks = a.projection.filter((d) => d.year % 2 === 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {gridLines.map((g) => (
        <g key={g}>
          <line x1={pad.left} y1={y(g)} x2={W - pad.right} y2={y(g)} stroke="#eef0f7" strokeWidth="1" />
          <text x={pad.left - 10} y={y(g) + 4} textAnchor="end" className="fill-ink-400" fontSize="11">{g}</text>
        </g>
      ))}
      {[{ d: a.projection, c: COLOR_A }, { d: b.projection, c: COLOR_B }].map(({ d, c }, i) => (
        <g key={i}>
          <path
            d={path(d)}
            fill="none"
            stroke={c}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: `dash 1.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.2}s forwards` }}
          />
          <circle cx={x(maxYear)} cy={y(d[d.length - 1].value)} r="5" fill="white" stroke={c} strokeWidth="3" />
        </g>
      ))}
      {yearTicks.map((d) => (
        <text key={d.year} x={x(d.year)} y={H - 12} textAnchor="middle" className="fill-ink-400" fontSize="11">{d.year}</text>
      ))}
      <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  )
}
