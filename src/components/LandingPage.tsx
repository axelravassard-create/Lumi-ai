import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'
import { AiStatusButton } from './AiStatusButton'
import { Avatar } from './Avatar'
import { LumiSpeech } from './LumiSpeech'
import { SUGGESTIONS } from '../lib/engine'
import { PROFESSIONS } from '../lib/professions'
import { useBrand } from '../lib/entitlement'
import { loadProfile, completeness, profileReady } from '../lib/profile'
import { usePlan } from '../lib/plan'
import { useToolbox } from '../lib/toolbox'
import { automationProgress, progressLabel } from '../lib/score'
import { useAccount } from '../lib/account'
import { t, useLang } from '../lib/i18n'
import { LangSwitcher } from './LangSwitcher'

type Mode = 'single' | 'compare'

interface Props {
  onAnalyze: (profession: string) => void
  onCompare: (a: string, b: string) => void
  aiEnabled: boolean
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenPricing: () => void
  onOpenMetiers: () => void
  onOpenChat: (message?: string) => void
  onOpenPlan: () => void
  onOpenToolbox: () => void
  onOpenVeille: () => void
  onOpenGenerators: () => void
  onOpenAccount: () => void
}

export function LandingPage({ onAnalyze, onCompare, aiEnabled, onOpenSettings, onOpenProfile, onOpenPricing, onOpenMetiers, onOpenChat, onOpenPlan, onOpenToolbox, onOpenVeille, onOpenGenerators, onOpenAccount }: Props) {
  const [mode, setMode] = useState<Mode>('single')
  const [value, setValue] = useState('')
  const [valueB, setValueB] = useState('')
  const { owns, name } = useBrand()
  const account = useAccount()
  useLang() // re-render au changement de langue
  // Luminator avance à la place de Lumi au clic sur sa silhouette floue.
  const [reveal, setReveal] = useState(false)
  // Pendant le déplacement (0,8 s), on GÈLE le rendu 3D des 2 persos : la
  // transition CSS n'anime plus qu'une image figée → fluide, sans lag.
  const [moving, setMoving] = useState(false)
  const moveTimer = useRef<ReturnType<typeof setTimeout>>()
  const setRevealAnimated = (v: boolean) => {
    setReveal(v)
    setMoving(true)
    clearTimeout(moveTimer.current)
    moveTimer.current = setTimeout(() => setMoving(false), 850)
  }
  // Nettoyage du timer si le composant est démonté pendant la transition.
  useEffect(() => () => clearTimeout(moveTimer.current), [])

  const submit = () => {
    if (mode === 'single') {
      if (value.trim()) onAnalyze(value.trim())
    } else {
      if (value.trim() && valueB.trim()) onCompare(value.trim(), valueB.trim())
    }
  }

  const canSubmit = mode === 'single' ? !!value.trim() : !!value.trim() && !!valueB.trim()

  return (
    <div className="min-h-screen">
      {/* Barre de navigation */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-3 text-sm font-medium text-ink-600 md:gap-5">
          <button onClick={onOpenMetiers} className="hidden transition hover:text-brand-700 md:inline">{t('nav.metiers')}</button>
          <button onClick={onOpenProfile} className="hidden transition hover:text-brand-700 sm:inline">{t('nav.profile')}</button>
          {account.configured && (
            <button
              onClick={onOpenAccount}
              title={account.email || t('nav.login')}
              className="transition hover:text-brand-700"
            >
              {account.email ? '👤' : t('nav.login')}
            </button>
          )}
          <LangSwitcher />
          <AiStatusButton enabled={aiEnabled} onClick={onOpenSettings} />
          {owns ? (
            <button onClick={onOpenPricing} className="transition hover:text-brand-700">
              {t('nav.subscription')}
            </button>
          ) : (
            <button
              onClick={onOpenPricing}
              className="rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {t('nav.luminator')}
            </button>
          )}
        </nav>
      </header>

      {owns ? (
        <MemberHome
          aiEnabled={aiEnabled}
          onOpenChat={onOpenChat}
          onOpenProfile={onOpenProfile}
          onAnalyze={onAnalyze}
          onOpenSettings={onOpenSettings}
          onOpenPlan={onOpenPlan}
          onOpenToolbox={onOpenToolbox}
          onOpenVeille={onOpenVeille}
          onOpenGenerators={onOpenGenerators}
        />
      ) : (
        <>
      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-6 pt-8 pb-16 text-center md:pt-12">
        {/* Scène : Lumi devant ; Luminator en retrait (flou) à droite. Cliquer
            sur la silhouette de Luminator le fait avancer à la place de Lumi. */}
        <div className="animate-fade-in relative mx-auto h-60 w-full max-w-sm md:h-72">
          {owns ? (
            <Avatar state="idle" className="h-full w-full" />
          ) : (
            <>
              {/* Deux états SEULEMENT, déterministes (aucun re-rendu ne peut les
                  désynchroniser) :
                  • repos  → Lumi centré (devant), Luminator caché en arrière-plan (haut-droite)
                  • cliqué → Luminator à gauche (devant), Lumi à droite (derrière) */}
              {/* Lumi */}
              <div
                className={`absolute inset-0 will-change-transform ${reveal ? 'pointer-events-none' : ''}`}
                style={{
                  transition: 'transform 800ms ease-in-out, opacity 800ms ease-in-out',
                  transform: reveal ? 'translate(40%, -14%) scale(0.55)' : 'translate(0%, 0%) scale(1)',
                  opacity: reveal ? 0.5 : 1,
                  zIndex: reveal ? 10 : 20,
                }}
              >
                <Avatar state="idle" glasses={false} paused={moving} className="h-full w-full" />
              </div>

              {/* Luminator */}
              <div
                className={`absolute inset-0 will-change-transform ${reveal ? '' : 'pointer-events-none'}`}
                style={{
                  transition: 'transform 800ms ease-in-out, opacity 800ms ease-in-out',
                  transform: reveal ? 'translate(-22%, 4%) scale(1)' : 'translate(28%, -22%) scale(0.55)',
                  opacity: reveal ? 1 : 0.5,
                  zIndex: reveal ? 20 : 10,
                }}
              >
                {/* Perf : tant que Luminator est en retrait (non révélé), on
                    n'allume PAS un 2e canvas WebGL — repli léger (emoji). Il
                    passe en 3D au clic. → un seul canvas 3D au repos sur l'accueil. */}
                <Avatar state="idle" glasses paused={moving} forceFallback={!reveal} className="h-full w-full" />
              </div>

              {/* Zone cliquable sur la silhouette floue (tant qu'il est en retrait) */}
              {!reveal && (
                <button
                  onClick={() => setRevealAnimated(true)}
                  aria-label="Découvrir Blumiman"
                  title="Qui est là, derrière ?"
                  className="group absolute right-0 top-0 z-40 h-[56%] w-[44%] cursor-pointer"
                >
                  <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-ink-900/75 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                    {t('hero.whoIsThere')}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Bulle : message de Lumi (centrée), ou de Luminator (à gauche, pour
            montrer que c'est lui qui parle) une fois révélé */}
        <div className={`animate-fade-in -mt-3 mx-auto flex max-w-sm ${reveal && !owns ? 'justify-start' : 'justify-center'}`}>
          {reveal && !owns ? (
            <div className="relative max-w-xs rounded-2xl border border-brand-200 bg-white px-4 py-3 text-left text-sm shadow-card">
              <span className="absolute -top-1.5 left-7 h-3 w-3 rotate-45 border-l border-t border-brand-200 bg-white" />
              <p className="font-display font-bold text-ink-900">{t('reveal.title')}</p>
              <p className="mt-1 text-ink-600">{t('reveal.desc')}</p>
              <div className="mt-2.5 flex flex-wrap justify-start gap-2">
                <button onClick={onOpenPricing} className="btn-primary py-2 text-sm">{t('reveal.unlock')}</button>
                <button onClick={() => setRevealAnimated(false)} className="btn-ghost py-2 text-sm">{t('reveal.later')}</button>
              </div>
            </div>
          ) : (
            <div className="relative max-w-sm rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-700 shadow-card">
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-ink-100 bg-white" />
              <LumiSpeech text={t('hero.bubble').replace('{name}', name)} />
              <span className="block text-xs text-ink-400">
                {owns ? t('hero.tapHintOwns') : t('hero.tapHint')}
              </span>
            </div>
          )}
        </div>

        <div className="animate-fade-up">
          <span className="pill mx-auto mb-6 border border-brand-100 bg-white text-brand-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
            </span>
            {aiEnabled ? t('ai.poweredClaude') : t('ai.poweredAI')}
          </span>
        </div>

        <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-6xl" style={{ animationDelay: '60ms' }}>
          {t('hero.h1a')}
          <br />
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">{t('hero.h1b')}</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-ink-500" style={{ animationDelay: '120ms' }}>
          {t('hero.subtitle')}
        </p>

        {/* Sélecteur de mode */}
        <div className="animate-fade-up mt-9 flex justify-center" style={{ animationDelay: '160ms' }}>
          <div className="inline-flex rounded-2xl border border-ink-200 bg-white p-1 shadow-sm">
            {([
              ['single', t('mode.single')],
              ['compare', t('mode.compare')],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === m ? 'bg-brand-600 text-white shadow' : 'text-ink-600 hover:text-brand-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Champ(s) de recherche */}
        <form
          className="animate-fade-up mx-auto mt-6 max-w-xl"
          style={{ animationDelay: '200ms' }}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {mode === 'single' ? (
            <SearchInput value={value} setValue={setValue} placeholder={t('search.single')} autoFocus />
          ) : (
            <div className="space-y-3">
              <SearchInput value={value} setValue={setValue} placeholder={t('search.a')} autoFocus prefix="A" />
              <SearchInput value={valueB} setValue={setValueB} placeholder={t('search.b')} prefix="B" />
            </div>
          )}

          <button type="submit" className="btn-primary mt-4 w-full py-3.5" disabled={!canSubmit}>
            {mode === 'single' ? t('cta.analyze') : t('cta.compare')}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Suggestions */}
          {mode === 'single' && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-ink-400">{t('suggest.try')}</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onAnalyze(s)}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Mini-stats de réassurance */}
        <div className="animate-fade-up mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4" style={{ animationDelay: '260ms' }}>
          {[
            { n: `${PROFESSIONS.length}`, l: t('stats.jobs') },
            { n: '7', l: t('stats.factors') },
            { n: '2040', l: t('stats.horizon') },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/60 px-4 py-3 backdrop-blur">
              <div className="font-display text-2xl font-extrabold text-ink-900">{s.n}</div>
              <div className="text-xs text-ink-500">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Réassurance / confiance */}
        <p className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-400" style={{ animationDelay: '300ms' }}>
          <span>{t('reassure.free')}</span>
          <span className="hidden sm:inline">·</span>
          <span>{t('reassure.local')}</span>
          <span className="hidden sm:inline">·</span>
          <span>{t('reassure.noresale')}</span>
        </p>
      </section>

      {/* Mise en avant de l'offre Luminator — la vraie valeur, visible dès l'accueil.
          L'analyse gratuite montre le risque ; Luminator est ce qui aide à agir
          dans la durée (rétention + valeur de l'abonnement). */}
      {!owns && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="card relative overflow-hidden bg-gradient-to-br from-brand-600 to-violet-600 p-8 text-white md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <span className="pill mb-4 bg-white/15 text-white">{t('promo.pill')}</span>
                <h2 className="font-display text-2xl font-extrabold leading-tight md:text-3xl">
                  {t('promo.h2a')}
                  <br />
                  {t('promo.h2b')}
                </h2>
                <p className="mt-3 max-w-xl text-white/85">{t('promo.desc')}</p>
                <ul className="mt-5 grid gap-2 text-sm text-white/90 sm:grid-cols-2">
                  <li>{t('promo.b1')}</li>
                  <li>{t('promo.b2')}</li>
                  <li>{t('promo.b3')}</li>
                  <li>{t('promo.b4')}</li>
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={onOpenPricing}
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90"
                  >
                    {t('promo.cta')}
                  </button>
                  <span className="text-sm text-white/70">{t('promo.note')}</span>
                </div>
              </div>
              <div className="hidden h-40 w-40 shrink-0 md:block">
                <Avatar glasses forceFallback className="h-full w-full" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comment ça marche */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-ink-900 md:text-3xl">{t('how.title')}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { i: '①', t: t('how.s1t'), d: t('how.s1d') },
            { i: '②', t: t('how.s2t'), d: t('how.s2d') },
            { i: '③', t: t('how.s3t'), d: t('how.s3d') },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <div className="font-display text-3xl text-brand-500">{s.i}</div>
              <h3 className="mt-3 font-display text-lg font-bold text-ink-900">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-10">
        <div className="card overflow-hidden bg-gradient-to-br from-ink-900 to-brand-900 p-8 text-white md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t('feat.title')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { e: '🎯', t: t('feat.f1t'), d: t('feat.f1d') },
              { e: '📈', t: t('feat.f2t'), d: t('feat.f2d') },
              { e: '⚔️', t: t('feat.f3t'), d: t('feat.f3d') },
              { e: '🛡️', t: t('feat.f4t'), d: t('feat.f4d') },
            ].map((f) => (
              <div key={f.t} className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-xl">{f.e}</div>
                <div>
                  <h3 className="font-semibold">{f.t}</h3>
                  <p className="mt-1 text-sm text-white/60">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
        </>
      )}

      <footer className="mx-auto max-w-6xl px-6 py-12 text-center text-sm text-ink-400">
        <Logo className="justify-center opacity-70" />
        <p className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <span>{t('footer.privacy')}</span>
        </p>
        <p className="mt-2">
          {t('footer.proto')}
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {([
            ['mentions', t('footer.mentions')],
            ['confidentialite', t('footer.privacyLink')],
            ['cgu', t('footer.cgu')],
          ] as const).map(([d, label]) => (
            <a
              key={d}
              href={`#/legal/${d}`}
              className="text-ink-400 underline-offset-2 transition hover:text-brand-700 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  )
}

// Accueil dédié aux abonnés Luminator : plus de « ton métier est-il exposé ? »
// (ils ont déjà testé). Tout est tourné vers l'ACTION : automatiser son métier,
// avec accès immédiat au copilote.
//
// ⚠️ Profil D'ABORD : tant que Luminator ne connaît pas assez l'utilisateur, on
// l'invite à faire connaissance avant de proposer l'accompagnement.
function MemberHome({
  aiEnabled,
  onOpenChat,
  onOpenProfile,
  onAnalyze,
  onOpenSettings,
  onOpenPlan,
  onOpenToolbox,
  onOpenVeille,
  onOpenGenerators,
}: {
  aiEnabled: boolean
  onOpenChat: (message?: string) => void
  onOpenProfile: () => void
  onAnalyze: (role: string) => void
  onOpenSettings: () => void
  onOpenPlan: () => void
  onOpenToolbox: () => void
  onOpenVeille: () => void
  onOpenGenerators: () => void
}) {
  const profile = loadProfile()
  const plan = usePlan()
  const tools = useToolbox()
  const { name } = useBrand() // nom du palier du membre (Blumiman / Bluminator)
  const role = profile.role
  const hasRole = !!role?.trim()
  const location = profile.location?.trim()
  const ready = profileReady(profile)
  const pct = completeness(profile)
  const progress = automationProgress(plan, profile, tools)

  // Étape « faisons connaissance » : Luminator a besoin du profil pour guider.
  if (!ready) {
    return (
      <section className="relative mx-auto max-w-2xl px-6 pt-6 pb-16 text-center md:pt-10">
        <div className="animate-fade-in mx-auto h-48 w-full max-w-xs md:h-56">
          <Avatar state="idle" glasses className="h-full w-full" />
        </div>
        <div className="animate-fade-in -mt-2 flex justify-center">
          <div className="relative max-w-sm rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm text-ink-700 shadow-card">
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-brand-200 bg-white" />
            <LumiSpeech text="Avant de t'aider, j'ai besoin de bien te connaître 🙂 Parle-moi de ton métier et de ton parcours — ensuite je personnalise tout." />
          </div>
        </div>

        <h1 className="animate-fade-up mt-6 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-4xl" style={{ animationDelay: '60ms' }}>
          Faisons connaissance d'abord
        </h1>
        <p className="animate-fade-up mx-auto mt-3 max-w-md text-ink-500" style={{ animationDelay: '120ms' }}>
          Plus {name} connaît ton métier, tes tâches et ton objectif, plus ses conseils d'automatisation sont
          précis et utiles. Deux minutes pour un accompagnement vraiment sur-mesure.
        </p>

        {/* Jauge de complétude */}
        <div className="animate-fade-up mx-auto mt-6 max-w-sm" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>Profil complété</span>
            <span className="font-semibold text-brand-600">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>

        <div className="animate-fade-up mt-7 flex flex-col items-center gap-3" style={{ animationDelay: '200ms' }}>
          <button onClick={onOpenProfile} className="btn-primary px-6 py-3.5 text-base">
            🧭 Compléter mon profil
          </button>
          <button
            onClick={() => onOpenChat('Aide-moi à compléter mon profil : pose-moi les questions clés sur mon métier, mon parcours et mon objectif, puis enregistre mes réponses.')}
            className="text-sm text-ink-500 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            …ou le faire en discutant avec {name}
          </button>
          {!aiEnabled && (
            <button onClick={onOpenSettings} className="text-xs text-ink-400 underline-offset-2 hover:text-brand-700 hover:underline">
              Connecte ta clé API Claude pour discuter
            </button>
          )}
        </div>
      </section>
    )
  }

  const STARTERS = [
    'Quelles tâches de mon métier puis-je automatiser ?',
    'Un outil IA pour me faire gagner du temps',
    'Crée-moi un modèle / template réutilisable',
    location
      ? `Formations & opportunités près de ${location} ?`
      : 'Quelles formations pour faire évoluer mon métier ?',
  ]

  return (
    <>
      <section className="relative mx-auto max-w-3xl px-6 pt-6 pb-10 text-center md:pt-10">
        <div className="animate-fade-in mx-auto h-52 w-full max-w-xs md:h-60">
          <Avatar state="idle" glasses className="h-full w-full" />
        </div>
        <div className="animate-fade-in -mt-2 flex justify-center">
          <div className="relative max-w-sm rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm text-ink-700 shadow-card">
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-brand-200 bg-white" />
            <LumiSpeech
              text={
                hasRole
                  ? `Content de te revoir 👋 On automatise quoi dans ton métier de ${role} aujourd'hui ?`
                  : "Content de te revoir 👋 On automatise quoi aujourd'hui ?"
              }
            />
          </div>
        </div>

        <h1 className="animate-fade-up mt-6 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-5xl" style={{ animationDelay: '60ms' }}>
          Gagne du temps.
          <br />
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">{name} automatise ton métier.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-4 max-w-xl text-lg text-ink-500" style={{ animationDelay: '120ms' }}>
          Décris une tâche et {name} te montre comment la faire plus vite — outils IA, no-code, modèles prêts à
          l'emploi, adaptés à ton parcours.
        </p>

        <div className="animate-fade-up mt-7 flex flex-col items-center gap-2" style={{ animationDelay: '160ms' }}>
          <button onClick={() => onOpenChat()} className="btn-primary px-6 py-3.5 text-base">
            💬 Discuter avec {name}
          </button>
          {!aiEnabled && (
            <button onClick={onOpenSettings} className="text-xs text-ink-400 underline-offset-2 hover:text-brand-700 hover:underline">
              Connecte ta clé API Claude pour discuter
            </button>
          )}
        </div>

        {/* Démarrages rapides : ouvrent le chat avec la question pré-remplie */}
        <div className="animate-fade-up mt-8" style={{ animationDelay: '200ms' }}>
          <p className="text-sm text-ink-400">Idées rapides :</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => onOpenChat(s)}
                className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Score d'automatisation : la progression dans le temps (monte quand on
          coche son plan). Transforme le bilan one-shot en suivi. */}
      <section className="mx-auto max-w-4xl px-6 pb-2">
        <button onClick={onOpenPlan} className="card w-full p-5 text-left transition hover:shadow-glow">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">Mon avancée automatisation</p>
              <p className="mt-0.5 text-xs text-ink-500">{t(progressLabel(progress.score))}</p>
            </div>
            <span className="font-display text-3xl font-extrabold text-brand-600">{progress.score}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${Math.max(progress.score, 3)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-400">
            {progress.done}/{progress.total} action{progress.total > 1 ? 's' : ''} faite{progress.done > 1 ? 's' : ''} · {progress.tools} outil{progress.tools > 1 ? 's' : ''} · profil {progress.profilePct}% — voir mon plan →
          </p>
        </button>
      </section>

      {/* Raccourcis */}
      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            emoji="🗂️"
            title="Mon plan d'action"
            desc="Tes actions à automatiser, suivies pas à pas."
            onClick={onOpenPlan}
          />
          <ActionCard
            emoji="🧰"
            title="Ma boîte à outils"
            desc="Les outils recommandés pour ton métier, avec leurs liens."
            onClick={onOpenToolbox}
          />
          <ActionCard
            emoji="✨"
            title="Générateurs express"
            desc="CV, pitch, audit d'auto… des livrables en 1 clic."
            onClick={onOpenGenerators}
          />
          <ActionCard
            emoji="🌐"
            title="Veille de mon métier"
            desc="Ce qui bouge cette semaine + quoi en faire."
            onClick={onOpenVeille}
          />
          <ActionCard
            emoji="⚡"
            title="Automatiser une tâche"
            desc={`${name} te guide, adapté à ton métier.`}
            onClick={() => onOpenChat('Aide-moi à automatiser une tâche précise de mon métier, étape par étape.')}
          />
          <ActionCard
            emoji="🧭"
            title="Mon profil & parcours"
            desc="Plus il te connaît, mieux il cible ses conseils."
            onClick={onOpenProfile}
          />
          <ActionCard
            emoji="📍"
            title="Opportunités locales"
            desc="Formations & pistes près de chez toi."
            onClick={() =>
              onOpenChat(
                location
                  ? `Quelles formations, aides et opportunités près de ${location} pour mon métier ?`
                  : 'Quelles formations et opportunités pour faire évoluer mon métier ? (je peux préciser ma ville)'
              )
            }
          />
          <ActionCard
            emoji="📈"
            title="Refaire le point"
            desc="Mets à jour ton exposition à l'IA dans le temps."
            onClick={() => (hasRole ? onAnalyze(role) : onOpenProfile())}
          />
        </div>
      </section>
    </>
  )
}

function ActionCard({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-start p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-xl">{emoji}</span>
      <h3 className="mt-3 font-display font-bold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{desc}</p>
    </button>
  )
}

function SearchInput({
  value,
  setValue,
  placeholder,
  autoFocus,
  prefix,
}: {
  value: string
  setValue: (v: string) => void
  placeholder: string
  autoFocus?: boolean
  prefix?: string
}) {
  return (
    <div className="group flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-card transition focus-within:border-brand-300 focus-within:shadow-glow">
      {prefix ? (
        <span className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
          {prefix}
        </span>
      ) : (
        <svg className="ml-3 h-5 w-5 shrink-0 text-ink-400" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent px-1 py-2 text-base text-ink-900 outline-none placeholder:text-ink-400"
      />
    </div>
  )
}
