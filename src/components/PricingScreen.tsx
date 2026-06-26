import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { useTier, setTier, type Tier } from '../lib/entitlement'
import { checkBilling, startCheckout, openBillingPortal } from '../lib/billing'
import { DAILY_LIMITS } from '../lib/llm'
import { useAccount } from '../lib/account'
import { t, useLang } from '../lib/i18n'

interface Props {
  onBack: () => void
  /** Ouvre le chat avec le copilote (proposé une fois l'offre acquise). */
  onOpenChat?: () => void
  /** Ouvre la fenêtre de compte (connexion obligatoire pour s'abonner). */
  onOpenAccount?: () => void
}

type Billing = 'monthly' | 'yearly'
type PaidTier = 'blumiman' | 'bluminator'

// Données structurelles des paliers (les TEXTES viennent de l'i18n, cf. buildPlan).
interface PlanMeta {
  key: Tier
  name: string
  glasses: boolean
  laptop?: boolean
  monthly: string
  yearly: string
  highlight?: boolean
}

const PLAN_META: PlanMeta[] = [
  { key: 'free', name: 'Blumi', glasses: false, monthly: '0 €', yearly: '0 €' },
  { key: 'blumiman', name: 'Blumiman', glasses: true, monthly: '4,99 €', yearly: '49 €', highlight: true },
  { key: 'bluminator', name: 'Bluminator', glasses: true, laptop: true, monthly: '14,99 €', yearly: '149 €' },
]

// Préfixe i18n + nombre de features + quota injecté ({n}) par palier.
const PLAN_TEXT: Record<Tier, { prefix: string; featureCount: number; limit?: number }> = {
  free: { prefix: 'pricing.free', featureCount: 4 },
  blumiman: { prefix: 'pricing.bm', featureCount: 5, limit: DAILY_LIMITS.blumiman },
  bluminator: { prefix: 'pricing.bn', featureCount: 6, limit: DAILY_LIMITS.bluminator },
}

export function PricingScreen({ onBack, onOpenChat, onOpenAccount }: Props) {
  const [billing, setBilling] = useState<Billing>('monthly')
  const current = useTier()
  const account = useAccount()
  useLang() // re-render au changement de langue
  const [billingOn, setBillingOn] = useState(false)
  const [buying, setBuying] = useState<PaidTier | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Compte obligatoire pour s'abonner (quand les comptes sont activés côté
  // serveur) : l'abonnement ET les données sont liés au compte, pas à l'appareil.
  const needsAccount = account.configured && !account.email

  useEffect(() => {
    checkBilling().then(setBillingOn)
  }, [])

  const buy = async (tk: PaidTier) => {
    setErr(null)
    if (needsAccount) {
      onOpenAccount?.()
      return
    }
    if (!billingOn) {
      setTier(tk) // prototype : activation immédiate simulée
      return
    }
    try {
      setBuying(tk)
      await startCheckout(tk, billing)
    } catch (e) {
      setErr((e as Error).message)
      setBuying(null)
    }
  }

  const manage = async () => {
    setErr(null)
    try {
      await openBillingPortal()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  // Construit le contenu textuel (traduit) d'un palier.
  const buildPlan = (m: PlanMeta) => {
    const cfg = PLAN_TEXT[m.key]
    const features = Array.from({ length: cfg.featureCount }, (_, i) =>
      t(`${cfg.prefix}.f${i}`).replace('{n}', String(cfg.limit ?? '')),
    )
    return {
      tagline: t(`${cfg.prefix}.tagline`),
      badge: m.key === 'free' ? undefined : t(`${cfg.prefix}.badge`),
      yearlyNote: m.key === 'free' ? undefined : t(`${cfg.prefix}.yearlyNote`),
      features,
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('pricing.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="animate-fade-up pt-12 text-center md:pt-16">
          <span className="pill mx-auto bg-brand-50 text-brand-700">{t('pricing.tag')}</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 md:text-5xl">
            {t('pricing.heading')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">
            {t('pricing.sub')}
          </p>

          {/* Bascule mensuel / annuel */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1">
            {([
              ['monthly', t('pricing.monthly')],
              ['yearly', t('pricing.yearly')],
            ] as const).map(([b, label]) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${billing === b ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-brand-700'}`}
              >
                {label}
                {b === 'yearly' && <span className="ml-1.5 text-[10px] text-emerald-500">{t('pricing.twoMonthsFree')}</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Compte requis pour s'abonner (quand les comptes sont activés) */}
        {needsAccount && (
          <div className="animate-fade-up mx-auto mt-8 flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-4">
            <p className="text-sm text-ink-700">
              🔐 <strong>{t('pricing.needAccountTitle')}</strong> {t('pricing.needAccountDesc')}
            </p>
            <button onClick={() => onOpenAccount?.()} className="btn-primary shrink-0 py-2 text-sm">
              {t('pricing.createAccount')}
            </button>
          </div>
        )}

        {/* Cartes */}
        <section className="animate-fade-up mt-10 grid items-start gap-6 md:grid-cols-3" style={{ animationDelay: '80ms' }}>
          {PLAN_META.map((p) => {
            const txt = buildPlan(p)
            const isCurrent = current === p.key
            const price = billing === 'monthly' ? p.monthly : p.yearly
            return (
              <div
                key={p.key}
                className={`card relative flex flex-col p-7 ${p.highlight ? 'border-2 border-brand-300 shadow-glow' : ''}`}
              >
                {txt.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 pill shadow ${p.highlight ? 'bg-brand-600 text-white' : 'bg-ink-900 text-white'}`}>
                    {txt.badge}
                  </span>
                )}
                <Avatar className="mx-auto h-24 w-24" glasses={p.glasses} laptop={!!p.laptop} />
                <h2 className={`mt-2 font-display text-xl font-bold ${p.highlight ? 'text-brand-700' : 'text-ink-900'}`}>{p.name}</h2>
                <p className="mt-1 text-sm text-ink-500">{txt.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-extrabold text-ink-900">{price}</span>
                  {p.key !== 'free' && <span className="mb-1 text-sm text-ink-500">{billing === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear')}</span>}
                </div>
                {p.key !== 'free' && billing === 'yearly' && txt.yearlyNote && (
                  <span className="text-xs text-emerald-600">{txt.yearlyNote}</span>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {txt.features.map((f) => (
                    <Feature key={f} text={f} highlight={p.key !== 'free'} />
                  ))}
                </ul>

                {/* Action */}
                <div className="mt-6">
                  {isCurrent ? (
                    <>
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        {t('pricing.current')}
                      </div>
                      {p.key !== 'free' && onOpenChat && (
                        <button onClick={onOpenChat} className="btn-primary mt-3 w-full justify-center">
                          {t('pricing.chatWith').replace('{name}', p.name)}
                        </button>
                      )}
                      {p.key !== 'free' && (
                        billingOn ? (
                          <button onClick={manage} className="btn-ghost mt-3 w-full justify-center text-sm">
                            {t('pricing.manage')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setTier('free')}
                            className="mt-2 w-full text-center text-xs text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
                          >
                            {t('pricing.backToFree')}
                          </button>
                        )
                      )}
                    </>
                  ) : p.key === 'free' ? (
                    <button onClick={onBack} className="btn-ghost w-full justify-center">
                      {t('pricing.startFree')}
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(p.key as PaidTier)}
                      disabled={buying !== null}
                      className="btn-primary w-full justify-center disabled:opacity-60"
                    >
                      {buying === p.key ? t('pricing.redirecting') : needsAccount ? t('pricing.createToSubscribe') : current === 'blumiman' && p.key === 'bluminator' ? t('pricing.upgrade') : t('pricing.choose').replace('{name}', p.name)}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {err && <p className="mt-4 text-center text-sm text-rose-500">{err}</p>}

        {/* Réassurance */}
        <section className="animate-fade-up mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-500" style={{ animationDelay: '160ms' }}>
          <span>{t('pricing.reassure1')}</span>
          <span>{t('pricing.reassure2')}</span>
          <span>{t('pricing.reassure3')}</span>
        </section>

        <p className="animate-fade-up mx-auto mt-8 max-w-2xl text-center text-xs text-ink-400" style={{ animationDelay: '220ms' }}>
          {billingOn ? t('pricing.payStripe') : t('pricing.paySimulated')}{' '}
          {t('pricing.honest')}
        </p>
      </main>
    </div>
  )
}

function Feature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-brand-500' : 'text-emerald-500'}`} viewBox="0 0 24 24" fill="none">
        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-ink-700">{text}</span>
    </li>
  )
}
