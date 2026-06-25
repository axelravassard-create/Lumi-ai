import { Logo } from './Logo'
import { SectorTrendCard } from './SectorTrendCard'
import { loadProfile } from '../lib/profile'
import { brandName } from '../lib/entitlement'
import { t, useLang } from '../lib/i18n'

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
  useLang()
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
            {t('common.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{t('veille.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t('veille.intro')}
          </p>

          {!sector ? (
            <div className="card mt-6 p-8 text-center">
              <div className="text-4xl">🧭</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('veille.emptyTitle')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                {t('veille.emptyDesc')}
              </p>
              <button onClick={onOpenProfile} className="btn-primary mx-auto mt-5">
                {t('veille.completeProfile')}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <SectorTrendCard sector={sector} aiEnabled={aiEnabled} onOpenSettings={onOpenSettings} />

              {/* De la veille à l'action */}
              <div className="card flex flex-col items-start gap-3 bg-gradient-to-br from-brand-50 to-violet-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display font-bold text-ink-900">{t('veille.actionTitle')}</h2>
                  <p className="mt-1 text-sm text-ink-600">{t('veille.actionDesc').replace('{name}', brandName())}</p>
                </div>
                <button
                  onClick={() => onOpenChat(t('veille.prompt').replace('{sector}', sector))}
                  className="btn-primary shrink-0"
                >
                  {t('veille.actionBtn')}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
