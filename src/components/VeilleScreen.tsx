import { Logo } from './Logo'
import { SectorTrendCard } from './SectorTrendCard'
import { loadProfile } from '../lib/profile'
import { brandName } from '../lib/entitlement'

interface Props {
  onBack: () => void
  aiEnabled: boolean
  onOpenSettings: () => void
  onOpenChat: (message?: string) => void
  onOpenProfile: () => void
}

// Veille du métier : reprend la tendance sectorielle (recherche web hebdo) et la
// transforme en point d'action — « voici ce qui bouge + que faire ».
export function VeilleScreen({ onBack, aiEnabled, onOpenSettings, onOpenChat, onOpenProfile }: Props) {
  const profile = loadProfile()
  const sector = profile.sector?.trim() || profile.role?.trim() || ''

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
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">Veille de mon métier</h1>
          <p className="mt-1 text-sm text-ink-500">
            Ce qui bouge pour ton secteur face à l'IA, recherché et synthétisé chaque semaine — et quoi en faire.
          </p>

          {!sector ? (
            <div className="card mt-6 p-8 text-center">
              <div className="text-4xl">🧭</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">Indique d'abord ton métier</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                La veille est calibrée sur ton secteur. Complète ton profil pour l'activer.
              </p>
              <button onClick={onOpenProfile} className="btn-primary mx-auto mt-5">
                Compléter mon profil
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <SectorTrendCard sector={sector} aiEnabled={aiEnabled} onOpenSettings={onOpenSettings} />

              {/* De la veille à l'action */}
              <div className="card flex flex-col items-start gap-3 bg-gradient-to-br from-brand-50 to-violet-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display font-bold text-ink-900">Passer à l'action</h2>
                  <p className="mt-1 text-sm text-ink-600">{brandName()} transforme cette tendance en actions concrètes pour toi.</p>
                </div>
                <button
                  onClick={() =>
                    onOpenChat(
                      `Au vu des dernières tendances IA de mon secteur (${sector}), donne-moi 2 à 3 actions concrètes à mener maintenant et ajoute-les à mon plan d'action.`
                    )
                  }
                  className="btn-primary shrink-0"
                >
                  💬 Que faire cette semaine ?
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
