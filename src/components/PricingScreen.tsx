import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { useLuminator, setLuminator } from '../lib/entitlement'
import { checkBilling, startCheckout } from '../lib/billing'

interface Props {
  onBack: () => void
  /** Ouvre le chat avec Luminator (proposé une fois l'offre acquise). */
  onOpenChat?: () => void
}

type Billing = 'monthly' | 'yearly'

const FREE_FEATURES = [
  'Score de remplaçabilité par l\'IA',
  'Verdict + projection 2026 → 2040',
  '1 bilan complet à l\'inscription',
  'Tendance de votre secteur, actualisée chaque semaine',
  'Profil carrière & jauge de complétude',
]

const PREMIUM_FEATURES = [
  'Luminator repère les tâches de VOTRE métier à automatiser — et vous montre comment',
  'Des solutions concrètes et accessibles : IA, no-code, modèles prêts à l\'emploi',
  'Calibré sur vos compétences et votre niveau technique',
  'Chat illimité avec Luminator, propulsé par Claude',
  'Il mémorise votre parcours et personnalise chaque conseil',
  'Suivi automatique, re-bilans & alertes quand votre secteur bouge',
  'Import de CV pré-rempli par Claude & comparateur de métiers illimité',
]

export function PricingScreen({ onBack, onOpenChat }: Props) {
  const [billing, setBilling] = useState<Billing>('monthly')
  const owns = useLuminator()
  const price = billing === 'monthly' ? '4,99 €' : '49 €'
  const period = billing === 'monthly' ? '/ mois' : '/ an'

  // Paiement réel disponible ? (Stripe configuré côté serveur). Sinon : simulé.
  const [billingOn, setBillingOn] = useState(false)
  const [buying, setBuying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    checkBilling().then(setBillingOn)
  }, [])

  const buy = async () => {
    setErr(null)
    if (!billingOn) {
      // Prototype : activation immédiate simulée (aucun paiement réel branché).
      setLuminator(true)
      return
    }
    try {
      setBuying(true)
      await startCheckout(billing) // redirige vers Stripe Checkout
    } catch (e) {
      setErr((e as Error).message)
      setBuying(false)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="animate-fade-up pt-12 text-center md:pt-16">
          <span className="pill mx-auto bg-brand-50 text-brand-700">💳 Tarifs</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 md:text-5xl">
            Évaluez avec Lumi. Gagnez du temps avec Luminator.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">
            Le gratuit évalue votre métier face à l'IA. Luminator passe à l'action : il automatise ce qui peut l'être, pour vous faire gagner des heures.
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
                {b === 'yearly' && <span className="ml-1.5 text-[10px] text-emerald-500">−18 %</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Cartes */}
        <section className="animate-fade-up mt-10 grid gap-6 md:grid-cols-2" style={{ animationDelay: '80ms' }}>
          {/* Lumi (gratuit) */}
          <div className="card flex flex-col p-7">
            <Avatar className="mx-auto h-28 w-28" glasses={false} />
            <h2 className="mt-2 font-display text-xl font-bold text-ink-900">Lumi</h2>
            <p className="mt-1 text-sm text-ink-500">Pour évaluer son métier face à l'IA.</p>
            <div className="mt-5 font-display text-4xl font-extrabold text-ink-900">0 €</div>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {FREE_FEATURES.map((f) => (
                <Feature key={f} text={f} />
              ))}
            </ul>
            <button onClick={onBack} className="btn-ghost mt-6 w-full justify-center">
              Commencer gratuitement
            </button>
          </div>

          {/* Luminator (premium) */}
          <div className="card relative flex flex-col border-2 border-brand-300 p-7 shadow-glow">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 pill bg-brand-600 text-white shadow">
              ⭐ Le plus populaire
            </span>
            <Avatar className="mx-auto h-28 w-28" glasses />
            <h2 className="mt-2 font-display text-xl font-bold text-brand-700">Luminator</h2>
            <p className="mt-1 text-sm text-ink-500">Votre copilote pour automatiser votre métier et garder une longueur d'avance.</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold text-ink-900">{price}</span>
              <span className="mb-1 text-sm text-ink-500">{period}</span>
            </div>
            {billing === 'yearly' && <span className="text-xs text-emerald-600">soit ~4,08 € / mois</span>}
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <Feature key={f} text={f} highlight />
              ))}
            </ul>
            {owns ? (
              <>
                <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  ✨ Vous êtes Luminator
                </div>
                {onOpenChat && (
                  <button onClick={onOpenChat} className="btn-primary mt-3 w-full justify-center">
                    💬 Discuter avec Luminator
                  </button>
                )}
                <button
                  onClick={() => setLuminator(false)}
                  className="mt-2 text-center text-xs text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
                >
                  Revenir à Lumi (gratuit)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={buy}
                  disabled={buying}
                  className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
                >
                  {buying ? 'Redirection vers le paiement…' : 'Devenir Luminator'}
                </button>
                <p className="mt-2 text-center text-xs text-ink-400">
                  {billingOn ? '🔒 Paiement sécurisé via Stripe — sans engagement' : 'Paiement simulé — prototype (activation immédiate)'}
                </p>
                {err && <p className="mt-2 text-center text-xs text-rose-500">{err}</p>}
              </>
            )}
          </div>
        </section>

        {/* Réassurance */}
        <section className="animate-fade-up mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-500" style={{ animationDelay: '160ms' }}>
          <span>✅ Sans engagement, annulable à tout moment</span>
          <span>🔒 Profil & données : sur votre appareil — les analyses IA sont envoyées à Anthropic (États-Unis)</span>
          <span>🚫 Aucune revente de données</span>
        </section>

        <p className="animate-fade-up mx-auto mt-10 max-w-2xl text-center text-xs text-ink-400" style={{ animationDelay: '220ms' }}>
          Tarifs indicatifs de prototype. Le gratuit reste volontairement large : le premium couvre les
          fonctionnalités à coût récurrent (suivi automatique, mises à jour hebdomadaires, analyses approfondies).
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
