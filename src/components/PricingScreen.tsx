import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { useTier, setTier, type Tier } from '../lib/entitlement'
import { checkBilling, startCheckout, openBillingPortal } from '../lib/billing'

interface Props {
  onBack: () => void
  /** Ouvre le chat avec le copilote (proposé une fois l'offre acquise). */
  onOpenChat?: () => void
}

type Billing = 'monthly' | 'yearly'
type PaidTier = 'blumiman' | 'bluminator'

interface Plan {
  key: Tier
  name: string
  glasses: boolean
  tagline: string
  monthly: string
  yearly: string
  yearlyNote?: string
  highlight?: boolean
  badge?: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Blumi',
    glasses: false,
    tagline: 'Évaluer son métier face à l’IA.',
    monthly: '0 €',
    yearly: '0 €',
    features: [
      'Score de remplaçabilité par l’IA',
      'Verdict + projection 2026 → 2040',
      'Tendance de ton secteur, chaque semaine',
      'Profil carrière & jauge de complétude',
    ],
  },
  {
    key: 'blumiman',
    name: 'Blumiman',
    glasses: true,
    tagline: 'Ton copilote pour automatiser ton métier.',
    monthly: '4,99 €',
    yearly: '49 €',
    yearlyNote: 'soit ~4,08 €/mois',
    highlight: true,
    badge: '⭐ Le plus populaire',
    features: [
      'Le copilote qui repère les tâches de TON métier à automatiser — et te montre comment',
      'Solutions concrètes : outils IA, no-code, modèles prêts à l’emploi',
      'Plan d’action, boîte à outils, veille & générateurs',
      'Il mémorise ton parcours et personnalise chaque conseil',
      'Import de CV & comparateur de métiers illimité',
      'Usage IA confortable pour un usage régulier',
    ],
  },
  {
    key: 'bluminator',
    name: 'Bluminator',
    glasses: true,
    tagline: 'Pour ceux qui s’en servent beaucoup.',
    monthly: '14,99 €',
    yearly: '149 €',
    yearlyNote: 'soit ~12,42 €/mois',
    badge: '🚀 Usage intensif',
    features: [
      'Tout Blumiman, en mieux',
      'Usage IA étendu (~4× plus) — pour automatiser au quotidien',
      'Réponses plus approfondies',
      'Priorité quand le service est très demandé',
      'Accès en avant-première aux nouveautés',
    ],
  },
]

export function PricingScreen({ onBack, onOpenChat }: Props) {
  const [billing, setBilling] = useState<Billing>('monthly')
  const current = useTier()
  const [billingOn, setBillingOn] = useState(false)
  const [buying, setBuying] = useState<PaidTier | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    checkBilling().then(setBillingOn)
  }, [])

  const buy = async (tk: PaidTier) => {
    setErr(null)
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

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="animate-fade-up pt-12 text-center md:pt-16">
          <span className="pill mx-auto bg-brand-50 text-brand-700">💳 Tarifs</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 md:text-5xl">
            Blumi évalue. Blumiman passe à l’action.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">
            Le gratuit évalue ton métier face à l’IA. Le copilote automatise ce qui peut l’être, pour te faire gagner des heures.
          </p>

          {/* Bascule mensuel / annuel */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1">
            {([
              ['monthly', 'Mensuel'],
              ['yearly', 'Annuel'],
            ] as const).map(([b, label]) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${billing === b ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-brand-700'}`}
              >
                {label}
                {b === 'yearly' && <span className="ml-1.5 text-[10px] text-emerald-500">2 mois offerts</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Cartes */}
        <section className="animate-fade-up mt-10 grid items-start gap-6 md:grid-cols-3" style={{ animationDelay: '80ms' }}>
          {PLANS.map((p) => {
            const isCurrent = current === p.key
            const price = billing === 'monthly' ? p.monthly : p.yearly
            return (
              <div
                key={p.key}
                className={`card relative flex flex-col p-7 ${p.highlight ? 'border-2 border-brand-300 shadow-glow' : ''}`}
              >
                {p.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 pill shadow ${p.highlight ? 'bg-brand-600 text-white' : 'bg-ink-900 text-white'}`}>
                    {p.badge}
                  </span>
                )}
                <Avatar className="mx-auto h-24 w-24" glasses={p.glasses} />
                <h2 className={`mt-2 font-display text-xl font-bold ${p.highlight ? 'text-brand-700' : 'text-ink-900'}`}>{p.name}</h2>
                <p className="mt-1 text-sm text-ink-500">{p.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-extrabold text-ink-900">{price}</span>
                  {p.key !== 'free' && <span className="mb-1 text-sm text-ink-500">{billing === 'monthly' ? '/ mois' : '/ an'}</span>}
                </div>
                {p.key !== 'free' && billing === 'yearly' && p.yearlyNote && (
                  <span className="text-xs text-emerald-600">{p.yearlyNote}</span>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <Feature key={f} text={f} highlight={p.key !== 'free'} />
                  ))}
                </ul>

                {/* Action */}
                <div className="mt-6">
                  {isCurrent ? (
                    <>
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        ✨ Ton offre actuelle
                      </div>
                      {p.key !== 'free' && onOpenChat && (
                        <button onClick={onOpenChat} className="btn-primary mt-3 w-full justify-center">
                          💬 Discuter avec {p.name}
                        </button>
                      )}
                      {p.key !== 'free' && (
                        billingOn ? (
                          <button onClick={manage} className="btn-ghost mt-3 w-full justify-center text-sm">
                            Gérer / résilier
                          </button>
                        ) : (
                          <button
                            onClick={() => setTier('free')}
                            className="mt-2 w-full text-center text-xs text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
                          >
                            Revenir au gratuit
                          </button>
                        )
                      )}
                    </>
                  ) : p.key === 'free' ? (
                    <button onClick={onBack} className="btn-ghost w-full justify-center">
                      Commencer gratuitement
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(p.key as PaidTier)}
                      disabled={buying !== null}
                      className={`w-full justify-center disabled:opacity-60 ${p.highlight ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {buying === p.key ? 'Redirection…' : current === 'blumiman' && p.key === 'bluminator' ? 'Passer à Bluminator' : `Choisir ${p.name}`}
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
          <span>✅ Sans engagement, résiliable à tout moment</span>
          <span>🔒 Données sur ton appareil — analyses IA envoyées à Anthropic (États-Unis)</span>
          <span>🚫 Aucune revente de données</span>
        </section>

        <p className="animate-fade-up mx-auto mt-8 max-w-2xl text-center text-xs text-ink-400" style={{ animationDelay: '220ms' }}>
          {billingOn ? '🔒 Paiement sécurisé via Stripe.' : 'Prototype : paiement simulé (activation immédiate).'}{' '}
          La plupart des gens choisissent Blumiman. Bluminator n’a d’intérêt que si tu utilises l’IA très souvent — pas la peine de payer plus sinon.
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
