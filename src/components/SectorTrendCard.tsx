import { useEffect, useState } from 'react'
import { SectorTrend, generateSectorTrend, describeError } from '../lib/llm'
import { loadCachedTrend, saveTrend } from '../lib/trends'

interface Props {
  sector: string
  aiEnabled: boolean
  onOpenSettings: () => void
}

const DIRECTION: Record<SectorTrend['direction'], { label: string; icon: string; cls: string }> = {
  hausse: { label: 'Pression IA en hausse', icon: '↑', cls: 'bg-rose-100 text-rose-700' },
  stable: { label: 'Pression IA stable', icon: '→', cls: 'bg-amber-100 text-amber-700' },
  baisse: { label: 'Pression IA en baisse', icon: '↓', cls: 'bg-emerald-100 text-emerald-700' },
}

// Carte « Tendance de votre secteur » : note hebdomadaire fondée sur l'actualité.
export function SectorTrendCard({ sector, aiEnabled, onOpenSettings }: Props) {
  const [trend, setTrend] = useState<SectorTrend | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const fetchTrend = async (force = false) => {
    if (!aiEnabled) return
    const cached = loadCachedTrend(sector)
    if (cached && cached.fresh && !force) {
      setTrend(cached.trend)
      return
    }
    setStatus('loading')
    setError('')
    try {
      const t = await generateSectorTrend(sector)
      saveTrend(t)
      setTrend(t)
      setStatus('idle')
    } catch (e) {
      // Repli sur une version en cache même périmée, sinon message d'erreur.
      if (cached) {
        setTrend(cached.trend)
        setStatus('idle')
      } else {
        setError(describeError(e))
        setStatus('error')
      }
    }
  }

  useEffect(() => {
    const cached = loadCachedTrend(sector)
    if (cached) setTrend(cached.trend)
    if (aiEnabled && (!cached || !cached.fresh)) fetchTrend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, aiEnabled])

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">🌐 Tendance de votre secteur</h2>
          <p className="text-sm text-ink-500">Secteur : {sector} · actualisé chaque semaine</p>
        </div>
        {trend && (
          <span className={`pill ${DIRECTION[trend.direction].cls}`}>
            {DIRECTION[trend.direction].icon} {DIRECTION[trend.direction].label}
          </span>
        )}
      </div>

      {/* Mode démo : invitation à connecter Claude */}
      {!aiEnabled && !trend && (
        <div className="mt-4 rounded-2xl bg-ink-50 p-5 text-center">
          <p className="text-sm text-ink-600">
            Connectez l'IA Claude pour suivre l'actualité de votre secteur, recherchée et synthétisée chaque semaine.
          </p>
          <button onClick={onOpenSettings} className="btn-primary mt-3 py-2.5 text-sm">
            Activer le suivi de tendance
          </button>
        </div>
      )}

      {/* Chargement */}
      {status === 'loading' && (
        <div className="mt-4 flex items-center gap-3 text-sm text-ink-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          Claude recherche l'actualité du secteur…
        </div>
      )}

      {/* Erreur */}
      {status === 'error' && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">⚠️ {error}</p>
      )}

      {/* Résultat */}
      {trend && (
        <div className="mt-4">
          <p className="font-display text-lg font-bold text-ink-900">{trend.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{trend.summary}</p>
          {trend.signals.length > 0 && (
            <ul className="mt-4 space-y-2">
              {trend.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {s}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-ink-400">
            <span>Mis à jour le {fmtDate(trend.updatedAt)}</span>
            {aiEnabled && (
              <button onClick={() => fetchTrend(true)} className="font-medium text-brand-600 hover:text-brand-800" disabled={status === 'loading'}>
                Rafraîchir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
