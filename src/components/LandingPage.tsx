import { useState } from 'react'
import { Logo } from './Logo'
import { SUGGESTIONS } from '../lib/engine'

interface Props {
  onAnalyze: (profession: string) => void
}

export function LandingPage({ onAnalyze }: Props) {
  const [value, setValue] = useState('')

  const submit = (v: string) => {
    const profession = v.trim()
    if (profession) onAnalyze(profession)
  }

  return (
    <div className="min-h-screen">
      {/* Barre de navigation */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-600 md:flex">
          <a href="#how" className="transition hover:text-brand-700">Comment ça marche</a>
          <a href="#features" className="transition hover:text-brand-700">Fonctionnalités</a>
          <span className="pill bg-brand-50 text-brand-700">Prototype</span>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-6 pt-12 pb-16 text-center md:pt-20">
        <div className="animate-fade-up">
          <span className="pill mx-auto mb-6 border border-brand-100 bg-white text-brand-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
            </span>
            Analyse propulsée par l'IA
          </span>
        </div>

        <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-6xl" style={{ animationDelay: '60ms' }}>
          Votre métier survivra-t-il
          <br />
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">à l'intelligence artificielle ?</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-ink-500" style={{ animationDelay: '120ms' }}>
          Entrez votre profession. YourCareer estime votre risque de remplacement par l'IA,
          sa progression jusqu'en 2040, et vous donne un plan concret pour garder une longueur d'avance.
        </p>

        {/* Champ de recherche */}
        <form
          className="animate-fade-up mx-auto mt-10 max-w-xl"
          style={{ animationDelay: '180ms' }}
          onSubmit={(e) => {
            e.preventDefault()
            submit(value)
          }}
        >
          <div className="group flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-card transition focus-within:border-brand-300 focus-within:shadow-glow">
            <svg className="ml-3 h-5 w-5 shrink-0 text-ink-400" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex : développeur, comptable, infirmière…"
              className="w-full bg-transparent px-1 py-2 text-base text-ink-900 outline-none placeholder:text-ink-400"
            />
            <button type="submit" className="btn-primary shrink-0 px-5 py-3" disabled={!value.trim()}>
              Analyser
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Suggestions */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-ink-400">Essayez :</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-sm text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {/* Mini-stats de réassurance */}
        <div className="animate-fade-up mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4" style={{ animationDelay: '240ms' }}>
          {[
            { n: '35+', l: 'métiers analysés' },
            { n: '7', l: 'facteurs d\'exposition' },
            { n: '2040', l: 'horizon de projection' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/60 px-4 py-3 backdrop-blur">
              <div className="font-display text-2xl font-extrabold text-ink-900">{s.n}</div>
              <div className="text-xs text-ink-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-ink-900 md:text-3xl">En 3 étapes</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { i: '①', t: 'Décrivez votre métier', d: 'Saisissez simplement votre profession, telle que vous la nommeriez.' },
            { i: '②', t: "L'IA évalue l'exposition", d: 'Notre moteur croise 7 facteurs : routine, créativité, relationnel, jugement…' },
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
              { e: '🧩', t: 'Décomposition par tâche', d: 'Quelles activités sont menacées, lesquelles restent humaines.' },
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
        <p className="mt-4">
          Prototype à visée pédagogique — les estimations sont indicatives et ne constituent pas un conseil professionnel.
        </p>
      </footer>
    </div>
  )
}
