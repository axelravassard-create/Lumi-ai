import { useState } from 'react'
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
  const { owns } = useBrand()
  const account = useAccount()
  useLang() // re-render au changement de langue

  const [front, setFront] = useState(0) // index du perso au centre (3D)
  // Les deux persos de côté : gauche = (front+2)%3, droite = (front+1)%3.
  // Cliquer un côté téléporte ce perso au centre (swap instantané, pas d'animation).
  const leftIdx = (front + 2) % 3
  const rightIdx = (front + 1) % 3

  const submit = () => {
    if (mode === 'single') {
      if (value.trim()) onAnalyze(value.trim())
    } else {
      if (value.trim() && valueB.trim()) onCompare(value.trim(), valueB.trim())
    }
  }

  const canSubmit = mode === 'single' ? !!value.trim() : !!value.trim() && !!valueB.trim()

  // Les 3 personnages = les 3 paliers. Ordre fixe ; le carrousel fait tourner
  // lequel est au centre. Les noms sont des marques (non traduites).
  const TRIO = [
    { name: 'Blumi', emoji: '👋', glasses: false, laptop: false, descKey: 'trio.descFree', paid: false, img: '/avatars/blumi.png' },
    { name: 'Blumiman', emoji: '✨', glasses: true, laptop: false, descKey: 'trio.descBlumiman', paid: true, img: '/avatars/blumiman.png' },
    { name: 'Bluminator', emoji: '🚀', glasses: true, laptop: true, descKey: 'trio.descBluminator', paid: true, img: '/avatars/bluminator.png' },
  ]
  const activeChar = TRIO[front]

  return (
    <div className="min-h-screen">
      {/* Barre de navigation */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6 md:py-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-medium text-ink-600 md:gap-5">
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
              className="whitespace-nowrap rounded-full bg-gradient-to-r from-brand-500 to-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 md:px-3.5 md:text-sm"
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
        {/* 3 personnages = 3 paliers. Le centre est en 3D (animé) ; les côtés
            sont de simples IMAGES statiques (PNG pré-rendus) → toujours figés,
            aucun effet, aucune boucle GPU. Cliquer un côté swape instantanément
            ce perso au centre, pile à la même place.
            Conteneur max-w-xl : centre w-[44%] (28%-72%), côtés w-[20%] avec un
            gap naturel de ~8% entre chaque côté et le centre. */}
        {/* ⚠️ Mobile : le canvas central doit rester assez LARGE (ratio pas trop
            étroit) sinon la tête 3D est rognée sur les côtés. D'où center plus
            large + hauteur réduite en mobile, valeurs desktop rétablies en md. */}
        <div className="animate-fade-in relative mx-auto h-52 w-full max-w-xl md:h-72">
          {/* Côté gauche : image figée, cliquable */}
          <button
            onClick={() => setFront(leftIdx)}
            aria-label={t('trio.discover').replace('{name}', TRIO[leftIdx].name)}
            title={t('trio.discover').replace('{name}', TRIO[leftIdx].name)}
            className="absolute left-0 top-0 h-full w-[19%] cursor-pointer opacity-50 transition-opacity hover:opacity-80 md:w-[20%]"
          >
            <img src={TRIO[leftIdx].img} alt={TRIO[leftIdx].name} className="h-full w-full object-contain" />
          </button>

          {/* Centre : 3D animé — position fixe quelle que soit la valeur de front */}
          <div className="absolute left-1/2 h-full w-[62%] -translate-x-1/2 md:w-[44%]">
            <Avatar state="idle" glasses={activeChar.glasses} laptop={activeChar.laptop} className="h-full w-full" />
          </div>

          {/* Côté droit : image figée, cliquable */}
          <button
            onClick={() => setFront(rightIdx)}
            aria-label={t('trio.discover').replace('{name}', TRIO[rightIdx].name)}
            title={t('trio.discover').replace('{name}', TRIO[rightIdx].name)}
            className="absolute right-0 top-0 h-full w-[19%] cursor-pointer opacity-50 transition-opacity hover:opacity-80 md:w-[20%]"
          >
            <img src={TRIO[rightIdx].img} alt={TRIO[rightIdx].name} className="h-full w-full object-contain" />
          </button>
        </div>

        {/* Bulle du personnage au centre : présentation + (paliers payants) CTA. */}
        <div className="animate-fade-in -mt-3 mx-auto flex max-w-sm justify-center">
          <div className="relative max-w-xs rounded-2xl border border-brand-200 bg-white px-4 py-3 text-center text-sm shadow-card">
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-brand-200 bg-white" />
            <p className="font-display font-bold text-ink-900">
              {activeChar.emoji} {t('trio.meIm').replace('{name}', activeChar.name)}
            </p>
            <p className="mt-1 text-ink-600">{t(activeChar.descKey)}</p>
            {activeChar.paid ? (
              <div className="mt-2.5 flex justify-center">
                <button onClick={onOpenPricing} className="btn-primary py-2 text-sm">
                  {t('trio.unlock').replace('{name}', activeChar.name)}
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-ink-400">{t('trio.hint')}</p>
            )}
          </div>
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
          <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">{t('hero.h1b')}</span>
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
          <div className="card relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white md:p-12">
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
  useLang()
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
            <LumiSpeech text={t('mh.knowSpeech')} />
          </div>
        </div>

        <h1 className="animate-fade-up mt-6 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-4xl" style={{ animationDelay: '60ms' }}>
          {t('mh.knowTitle')}
        </h1>
        <p className="animate-fade-up mx-auto mt-3 max-w-md text-ink-500" style={{ animationDelay: '120ms' }}>
          {t('mh.knowDesc').replace('{name}', name)}
        </p>

        {/* Jauge de complétude */}
        <div className="animate-fade-up mx-auto mt-6 max-w-sm" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>{t('mh.profileCompleted')}</span>
            <span className="font-semibold text-brand-600">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
        </div>

        <div className="animate-fade-up mt-7 flex flex-col items-center gap-3" style={{ animationDelay: '200ms' }}>
          <button onClick={onOpenProfile} className="btn-primary px-6 py-3.5 text-base">
            {t('mh.completeProfile')}
          </button>
          <button
            onClick={() => onOpenChat(t('mh.completePrompt'))}
            className="text-sm text-ink-500 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            {t('mh.orChat').replace('{name}', name)}
          </button>
          {!aiEnabled && (
            <button onClick={onOpenSettings} className="text-xs text-ink-400 underline-offset-2 hover:text-brand-700 hover:underline">
              {t('mh.connectKey')}
            </button>
          )}
        </div>
      </section>
    )
  }

  const STARTERS = [
    t('mh.starter0'),
    t('mh.starter1'),
    t('mh.starter2'),
    location ? t('mh.starter3Loc').replace('{location}', location) : t('mh.starter3'),
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
                  ? t('mh.greetRole').replace('{role}', role as string)
                  : t('mh.greet')
              }
            />
          </div>
        </div>

        <h1 className="animate-fade-up mt-6 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-5xl" style={{ animationDelay: '60ms' }}>
          {t('mh.heroLine1')}
          <br />
          <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">{t('mh.heroLine2').replace('{name}', name)}</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-4 max-w-xl text-lg text-ink-500" style={{ animationDelay: '120ms' }}>
          {t('mh.heroDesc').replace('{name}', name)}
        </p>

        <div className="animate-fade-up mt-7 flex flex-col items-center gap-2" style={{ animationDelay: '160ms' }}>
          <button onClick={() => onOpenChat()} className="btn-primary px-6 py-3.5 text-base">
            {t('mh.chatCta').replace('{name}', name)}
          </button>
          {!aiEnabled && (
            <button onClick={onOpenSettings} className="text-xs text-ink-400 underline-offset-2 hover:text-brand-700 hover:underline">
              {t('mh.connectKey')}
            </button>
          )}
        </div>

        {/* Démarrages rapides : ouvrent le chat avec la question pré-remplie */}
        <div className="animate-fade-up mt-8" style={{ animationDelay: '200ms' }}>
          <p className="text-sm text-ink-400">{t('mh.quickIdeas')}</p>
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
              <p className="text-sm font-semibold text-ink-900">{t('mh.progressTitle')}</p>
              <p className="mt-0.5 text-xs text-ink-500">{t(progressLabel(progress.score))}</p>
            </div>
            <span className="font-display text-3xl font-extrabold text-brand-600">{progress.score}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${Math.max(progress.score, 3)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-400">
            {t('mh.progressFooter')
              .replace('{done}', String(progress.done))
              .replace('{total}', String(progress.total))
              .replace('{tools}', String(progress.tools))
              .replace('{pct}', String(progress.profilePct))}
          </p>
        </button>
      </section>

      {/* Raccourcis */}
      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            emoji="🗂️"
            title={t('mh.cardPlanTitle')}
            desc={t('mh.cardPlanDesc')}
            onClick={onOpenPlan}
          />
          <ActionCard
            emoji="🧰"
            title={t('mh.cardToolboxTitle')}
            desc={t('mh.cardToolboxDesc')}
            onClick={onOpenToolbox}
          />
          <ActionCard
            emoji="✨"
            title={t('mh.cardGenTitle')}
            desc={t('mh.cardGenDesc')}
            onClick={onOpenGenerators}
          />
          <ActionCard
            emoji="🌐"
            title={t('mh.cardVeilleTitle')}
            desc={t('mh.cardVeilleDesc')}
            onClick={onOpenVeille}
          />
          <ActionCard
            emoji="⚡"
            title={t('mh.cardAutoTitle')}
            desc={t('mh.cardAutoDesc').replace('{name}', name)}
            onClick={() => onOpenChat(t('mh.cardAutoPrompt'))}
          />
          <ActionCard
            emoji="🧭"
            title={t('mh.cardProfileTitle')}
            desc={t('mh.cardProfileDesc')}
            onClick={onOpenProfile}
          />
          <ActionCard
            emoji="📍"
            title={t('mh.cardLocalTitle')}
            desc={t('mh.cardLocalDesc')}
            onClick={() =>
              onOpenChat(
                location
                  ? t('mh.cardLocalPromptLoc').replace('{location}', location)
                  : t('mh.cardLocalPrompt')
              )
            }
          />
          <ActionCard
            emoji="📈"
            title={t('mh.cardRepointTitle')}
            desc={t('mh.cardRepointDesc')}
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
    <div className="search-box group">
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
