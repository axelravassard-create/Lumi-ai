import { useState } from 'react'
import { Logo } from './Logo'
import { AiStatusButton } from './AiStatusButton'
import { Avatar } from './Avatar'
import { LumiSpeech } from './LumiSpeech'
import { SUGGESTIONS } from '../lib/engine'
import { PROFESSIONS } from '../lib/professions'
import { useBrand } from '../lib/entitlement'

type Mode = 'single' | 'compare'

interface Props {
  onAnalyze: (profession: string) => void
  onCompare: (a: string, b: string) => void
  aiEnabled: boolean
  onOpenSettings: () => void
  onOpenProfile: () => void
  onOpenPricing: () => void
  onOpenMetiers: () => void
}

export function LandingPage({ onAnalyze, onCompare, aiEnabled, onOpenSettings, onOpenProfile, onOpenPricing, onOpenMetiers }: Props) {
  const [mode, setMode] = useState<Mode>('single')
  const [value, setValue] = useState('')
  const [valueB, setValueB] = useState('')
  const { owns, name } = useBrand()
  // Luminator avance à la place de Lumi au clic sur sa silhouette floue.
  const [reveal, setReveal] = useState(false)

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
          <button onClick={onOpenMetiers} className="hidden transition hover:text-brand-700 md:inline">Métiers</button>
          <button onClick={onOpenPricing} className="transition hover:text-brand-700">Tarifs</button>
          <button onClick={onOpenProfile} className="transition hover:text-brand-700">Mon profil</button>
          <AiStatusButton enabled={aiEnabled} onClick={onOpenSettings} />
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-6 pt-8 pb-16 text-center md:pt-12">
        {/* Scène : Lumi devant ; Luminator en retrait (flou) à droite. Cliquer
            sur la silhouette de Luminator le fait avancer à la place de Lumi. */}
        <div className="animate-fade-in relative mx-auto h-60 w-full max-w-sm md:h-72">
          {owns ? (
            <Avatar state="idle" className="h-full w-full" />
          ) : (
            <>
              {/* Lumi : devant par défaut ; s'efface quand Luminator avance */}
              <div
                className={`absolute inset-0 origin-center transition-all duration-700 ease-out will-change-transform ${
                  reveal ? 'z-0 scale-95 opacity-0' : 'z-20'
                }`}
              >
                <Avatar state="idle" glasses={false} className={`h-full w-full ${reveal ? 'pointer-events-none' : ''}`} />
              </div>

              {/* Luminator : en retrait ; avance pile à la place de Lumi au clic.
                  Effet « lointain » via échelle + opacité (pas de flou = pas de lag). */}
              <div
                className={`absolute inset-0 origin-center transition-all duration-700 ease-out will-change-transform ${
                  reveal ? 'z-30 opacity-100' : 'z-10 translate-x-[38%] -translate-y-[8%] scale-[0.5] opacity-30'
                }`}
              >
                <Avatar state="idle" glasses className="h-full w-full pointer-events-none" />
              </div>

              {/* Zone cliquable sur la silhouette floue (tant qu'il est en retrait) */}
              {!reveal && (
                <button
                  onClick={() => setReveal(true)}
                  aria-label="Découvrir Luminator"
                  title="Qui est là, derrière ?"
                  className="group absolute right-0 top-[18%] z-40 h-[64%] w-[42%] cursor-pointer"
                >
                  <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-ink-900/75 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                    Qui est là ? 👀
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Bulle : message de Lumi, ou offre de Luminator une fois révélé */}
        <div className="animate-fade-in -mt-3 flex justify-center">
          {reveal && !owns ? (
            <div className="relative max-w-sm rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm shadow-card">
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-brand-200 bg-white" />
              <p className="font-display font-bold text-ink-900">✨ Moi, c'est Luminator.</p>
              <p className="mt-1 text-ink-600">
                J'automatise les tâches répétitives de ton métier — outils IA, no-code, modèles prêts à l'emploi,
                adaptés à tes compétences.
              </p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                <button onClick={onOpenPricing} className="btn-primary py-2 text-sm">Débloquer Luminator</button>
                <button onClick={() => setReveal(false)} className="btn-ghost py-2 text-sm">Plus tard</button>
              </div>
            </div>
          ) : (
            <div className="relative max-w-sm rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-700 shadow-card">
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-ink-100 bg-white" />
              <LumiSpeech text={`👋 Salut, moi c'est ${name} — ton guide face à l'IA.`} />
              <span className="block text-xs text-ink-400">
                {owns ? '(tapote-moi sur la tête 👆)' : '(tapote-moi 👆 — et clique sur l’ombre à droite 👀)'}
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
            {aiEnabled ? 'Analyse propulsée par Claude' : 'Analyse propulsée par l\'IA'}
          </span>
        </div>

        <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-6xl" style={{ animationDelay: '60ms' }}>
          Votre métier survivra-t-il
          <br />
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">à l'intelligence artificielle ?</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-ink-500" style={{ animationDelay: '120ms' }}>
          Entrez votre profession. Lumi estime votre risque de remplacement par l'IA,
          sa progression jusqu'en 2040, et vous donne un plan concret pour garder une longueur d'avance.
        </p>

        {/* Sélecteur de mode */}
        <div className="animate-fade-up mt-9 flex justify-center" style={{ animationDelay: '160ms' }}>
          <div className="inline-flex rounded-2xl border border-ink-200 bg-white p-1 shadow-sm">
            {([
              ['single', '🎯 Analyser un métier'],
              ['compare', '⚔️ Comparer deux métiers'],
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
            <SearchInput value={value} setValue={setValue} placeholder="Ex : développeur, comptable, infirmière…" autoFocus />
          ) : (
            <div className="space-y-3">
              <SearchInput value={value} setValue={setValue} placeholder="Premier métier (ex : graphiste)" autoFocus prefix="A" />
              <SearchInput value={valueB} setValue={setValueB} placeholder="Second métier (ex : développeur)" prefix="B" />
            </div>
          )}

          <button type="submit" className="btn-primary mt-4 w-full py-3.5" disabled={!canSubmit}>
            {mode === 'single' ? 'Analyser mon métier' : 'Comparer les deux métiers'}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Suggestions */}
          {mode === 'single' && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-ink-400">Essayez :</span>
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
            { n: `${PROFESSIONS.length}`, l: 'métiers analysés' },
            { n: '7', l: 'facteurs d\'exposition' },
            { n: '2040', l: 'horizon de projection' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/60 px-4 py-3 backdrop-blur">
              <div className="font-display text-2xl font-extrabold text-ink-900">{s.n}</div>
              <div className="text-xs text-ink-500">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Réassurance / confiance */}
        <p className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-400" style={{ animationDelay: '300ms' }}>
          <span>🔒 Gratuit en mode démo</span>
          <span className="hidden sm:inline">·</span>
          <span>📍 Mode démo : vos données restent sur l'appareil</span>
          <span className="hidden sm:inline">·</span>
          <span>🚫 Aucune revente de données</span>
        </p>
      </section>

      {/* Comment ça marche */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-ink-900 md:text-3xl">En 3 étapes</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { i: '①', t: 'Décrivez votre métier', d: 'Saisissez simplement votre profession, telle que vous la nommeriez.' },
            { i: '②', t: 'Lumi évalue l\'exposition', d: 'Lumi croise 7 facteurs : routine, créativité, relationnel, jugement…' },
            { i: '③', t: 'Recevez votre plan', d: 'Score, projection 2026-2040, compétences clés et pistes de reconversion.' },
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
          <h2 className="font-display text-2xl font-bold md:text-3xl">Ce que vous obtenez</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { e: '🎯', t: 'Score de remplaçabilité', d: 'Un pourcentage clair, calibré sur la nature réelle de vos tâches.' },
              { e: '📈', t: 'Projection 2026 → 2040', d: 'La trajectoire d\'automatisation année par année.' },
              { e: '⚔️', t: 'Comparateur de métiers', d: 'Mettez deux professions face à face pour orienter un choix.' },
              { e: '🛡️', t: 'Plan anti-obsolescence', d: 'Compétences d\'avenir et pistes de reconversion concrètes.' },
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

      <footer className="mx-auto max-w-6xl px-6 py-12 text-center text-sm text-ink-400">
        <Logo className="justify-center opacity-70" />
        <p className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <span>🔒 Confidentialité : en mode démo, vos données restent sur votre appareil ; avec l'IA activée, elles sont envoyées à Anthropic pour produire l'analyse.</span>
        </p>
        <p className="mt-2">
          Prototype à visée pédagogique — les estimations sont indicatives et ne constituent pas un conseil professionnel.
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {([
            ['mentions', 'Mentions légales'],
            ['confidentialite', 'Confidentialité'],
            ['cgu', "Conditions d'utilisation"],
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
