import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import {
  Archive,
  ArrowRight,
  Check,
  ClipboardList,
  DraftingCompass,
  FolderClosed,
  FolderOpen,
  Menu,
  Newspaper,
  NotebookPen,
  Ruler,
  Scale,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import { analyze, professionLabel, riskLevel, type Analysis, type RiskLevel, type YearPoint } from '../lib/engine'
import { PROFESSIONS, type Factors, type Profession } from '../lib/professions'

// ─────────────────────────────────────────────────────────────────────────────
// Accueil Blumi — direction « Editorial & Trust ».
// Papier crème, encre bleu marine comme unique accent, titrage en Instrument
// Serif, texte en Inter, filets fins et grille stricte. Aucun code visuel « IA »
// (pas de dégradé fluo, pas de robot) : un vocabulaire d'outil de travail.
// Branché sur le vrai moteur d'analyse (`analyze`) et la vraie liste de métiers.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onAnalyze: (label: string) => void
  onCompare: (a: string, b: string) => void
  onOpenPricing: () => void
  onOpenDirectory: () => void
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

const SPECIMEN_IDS = ['accountant', 'graphic-designer', 'nurse'] as const
type SpecimenId = (typeof SPECIMEN_IDS)[number]
const POPULAR_IDS = ['accountant', 'graphic-designer', 'nurse', 'lawyer', 'developer', 'exec-assistant']

const LEVEL_STYLE: Record<RiskLevel, { text: string; bar: string }> = {
  Faible: { text: 'text-[#3f6b4f]', bar: 'bg-[#4f7d5f]' },
  Modéré: { text: 'text-[#8a6116]', bar: 'bg-[#b08429]' },
  Élevé: { text: 'text-[#9a4a2b]', bar: 'bg-[#a85633]' },
  Critique: { text: 'text-[#8f2f2f]', bar: 'bg-[#8f2f2f]' },
}

// Accord au féminin (« exposition modérée ») : libellés propres à cette page.
const EXPOSURE_LABEL: Record<RiskLevel, string> = { Faible: 'faible', Modéré: 'modérée', Élevé: 'élevée', Critique: 'critique' }

const FACTORS: { key: keyof Factors; label: string; exposes: boolean }[] = [
  { key: 'routine', label: 'Tâches répétitives', exposes: true },
  { key: 'digital', label: 'Travail sur écran', exposes: true },
  { key: 'judgment', label: 'Jugement et décision', exposes: false },
  { key: 'creativity', label: 'Créativité', exposes: false },
  { key: 'empathy', label: 'Empathie', exposes: false },
  { key: 'social', label: 'Relationnel', exposes: false },
  { key: 'physical', label: 'Gestes et présence physique', exposes: false },
]

const FOLDERS: { name: string; tools: string[] }[] = [
  { name: 'Rédaction et synthèse', tools: ['ChatGPT', 'Claude', 'Notion AI'] },
  { name: 'Recherche documentaire', tools: ['Perplexity', 'NotebookLM'] },
  { name: 'Automatisation des tâches', tools: ['Make', 'Zapier', 'n8n'] },
  { name: 'Tableurs et données', tools: ['Excel', 'Google Sheets', 'Airtable'] },
]

// ─── Utilitaires ────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function todayLabel(): string {
  const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function byId(id: string): Profession {
  return PROFESSIONS.find((p) => p.id === id) ?? PROFESSIONS[0]
}

function searchProfessions(query: string): Profession[] {
  const q = normalize(query.trim())
  if (!q) return []
  return PROFESSIONS.map((p) => {
    const label = normalize(p.label)
    const keywords = p.keywords.map(normalize)
    let score = 0
    if (label.startsWith(q)) score = 4
    else if (label.includes(q)) score = 3
    else if (keywords.some((k) => k.startsWith(q))) score = 2
    else if (keywords.some((k) => k.includes(q))) score = 1
    return { p, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.label.localeCompare(b.p.label, 'fr'))
    .slice(0, 6)
    .map((x) => x.p)
}

function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    if (prefersReducedMotion() || from === target) {
      fromRef.current = target
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const current = from + (target - from) * (1 - Math.pow(1 - p, 3))
      fromRef.current = current
      setValue(current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ─── Petits éléments ────────────────────────────────────────────────────────

function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500', className)}>{children}</p>
}

function SpecimenTabs({ value, onChange, idPrefix }: { value: SpecimenId; onChange: (id: SpecimenId) => void; idPrefix: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = SPECIMEN_IDS.indexOf(value)
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + SPECIMEN_IDS.length) % SPECIMEN_IDS.length
    onChange(SPECIMEN_IDS[next])
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label="Métier présenté en exemple" onKeyDown={onKeyDown} className="flex gap-5 border-b border-stone-200">
      {SPECIMEN_IDS.map((id, i) => {
        const active = id === value
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              '-mb-px border-b-2 pb-2.5 text-sm transition-colors',
              FOCUS,
              active ? 'border-navy-700 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800',
            )}
          >
            {professionLabel(byId(id))}
          </button>
        )
      })}
    </div>
  )
}

function ProjectionChart({ points, className }: { points: YearPoint[]; className?: string }) {
  const w = 320
  const h = 132
  const padL = 4
  const padR = 34
  const padT = 10
  const padB = 22
  const first = points[0]
  const last = points[points.length - 1]
  const x = (year: number) => padL + ((year - first.year) / Math.max(1, last.year - first.year)) * (w - padL - padR)
  const y = (v: number) => padT + (1 - v / 100) * (h - padT - padB)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(last.year).toFixed(1)},${y(0)} L${x(first.year).toFixed(1)},${y(0)} Z`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('w-full', className)}
      role="img"
      aria-label={`Projection de l’exposition : ${Math.round(first.value)} % en ${first.year}, ${Math.round(last.value)} % en ${last.year}`}
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} className="stroke-stone-200" strokeWidth={v === 0 ? 1 : 0.75} strokeDasharray={v === 0 ? undefined : '2 3'} />
          <text x={w - padR + 6} y={y(v) + 3} className="fill-stone-400 text-[9px] tabular-nums">
            {v} %
          </text>
        </g>
      ))}
      <path d={area} className="fill-navy-50" />
      <path d={line} fill="none" className="stroke-navy-700" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(first.year)} cy={y(first.value)} r="3" className="fill-paper stroke-navy-700" strokeWidth="1.5" />
      <circle cx={x(last.year)} cy={y(last.value)} r="3.5" className="fill-navy-700" />
      <text x={padL} y={h - 6} className="fill-stone-500 text-[10px] tabular-nums">
        {first.year}
      </text>
      <text x={w - padR} y={h - 6} textAnchor="end" className="fill-stone-500 text-[10px] tabular-nums">
        {last.year}
      </text>
    </svg>
  )
}

function Cell({
  icon: Icon,
  tag,
  title,
  intro,
  className,
  children,
}: {
  icon: LucideIcon
  tag: string
  title: string
  intro: string
  className?: string
  children?: ReactNode
}) {
  return (
    <article className={cn('flex flex-col bg-paper p-6 sm:p-8', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md border border-stone-300/80 text-stone-700" aria-hidden>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">{tag}</span>
      </div>
      <h3 className="mt-6 font-editorial text-[28px] leading-[1.08] text-stone-900">{title}</h3>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-stone-600">{intro}</p>
      {children && <div className="mt-6 flex flex-1 flex-col">{children}</div>}
    </article>
  )
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function EditorialHome({ onAnalyze, onCompare, onOpenPricing, onOpenDirectory }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [specimen, setSpecimen] = useState<SpecimenId>('accountant')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [openFolder, setOpenFolder] = useState<number | null>(0)
  const [compareA, setCompareA] = useState('accountant')
  const [compareB, setCompareB] = useState('nurse')

  const inputRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const errorId = useId()
  const specimenPrefix = useId().replace(/:/g, '')

  const suggestions = useMemo(() => searchProfessions(query), [query])
  const analyses = useMemo(() => {
    const out = {} as Record<SpecimenId, Analysis>
    SPECIMEN_IDS.forEach((id) => {
      out[id] = analyze(byId(id).label)
    })
    return out
  }, [])
  const current = analyses[specimen]
  const level = riskLevel(current.score)
  const shownScore = useCountUp(current.score)
  const sortedProfessions = useMemo(() => [...PROFESSIONS].sort((a, b) => a.label.localeCompare(b.label, 'fr')), [])
  const compared = useMemo(() => [analyze(byId(compareA).label), analyze(byId(compareB).label)], [compareA, compareB])
  const planItems = current.recommendations.slice(0, 3)
  const doneCount = planItems.filter((_, i) => done[`${specimen}:${i}`]).length

  // Ferme la liste de suggestions au clic extérieur.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const focusSearch = () => {
    setMenuOpen(false)
    const input = inputRef.current
    if (!input) return
    input.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
    window.setTimeout(() => input.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 350)
  }

  const scrollToFeatures = () => {
    setMenuOpen(false)
    document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  const choose = (p: Profession) => {
    setQuery(professionLabel(p))
    setOpen(false)
    setActive(-1)
    setError('')
    onAnalyze(p.label)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (open && active >= 0 && suggestions[active]) {
      choose(suggestions[active])
      return
    }
    const value = query.trim()
    if (!value) {
      setError('Indiquez un métier pour lancer l’analyse.')
      inputRef.current?.focus()
      return
    }
    setOpen(false)
    onAnalyze(value)
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(suggestions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  const listVisible = open && suggestions.length > 0

  return (
    <div className="min-h-screen bg-paper font-inter text-stone-900 antialiased" style={{ fontFeatureSettings: '"cv11", "ss01"' }}>
      <a
        href="#contenu"
        className="sr-only rounded-md bg-stone-900 px-3 py-2 text-sm text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Aller au contenu
      </a>

      {/* ── En-tête ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-paper/90 backdrop-blur-sm">
        <div className="hidden border-b border-stone-200/80 md:block">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-2 text-xs text-stone-500 lg:px-10">
            <span>{todayLabel()}</span>
            <span>Observatoire des métiers face à l’IA · {PROFESSIONS.length} fiches métier</span>
          </div>
        </div>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-6 lg:px-10">
          <a href="#contenu" className={cn('rounded font-editorial text-[30px] leading-none tracking-tight text-stone-900', FOCUS)} aria-label="Blumi, accueil">
            Blumi
          </a>
          <nav aria-label="Navigation principale" className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
            <button type="button" onClick={scrollToFeatures} className={cn('rounded transition-colors hover:text-stone-900', FOCUS)}>
              Fonctionnalités
            </button>
            <button type="button" onClick={onOpenDirectory} className={cn('rounded transition-colors hover:text-stone-900', FOCUS)}>
              Répertoire des métiers
            </button>
            <button type="button" onClick={onOpenPricing} className={cn('rounded transition-colors hover:text-stone-900', FOCUS)}>
              Abonnements
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={focusSearch}
              className={cn(
                'hidden h-10 items-center rounded-md border border-stone-900 px-4 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-900 hover:text-paper sm:inline-flex',
                FOCUS,
              )}
            >
              Analyser mon métier
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              className={cn('grid h-10 w-10 place-items-center rounded-md text-stone-700 hover:bg-stone-100 md:hidden', FOCUS)}
            >
              {menuOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="menu-mobile" aria-label="Navigation mobile" className="border-t border-stone-200 px-6 py-3 md:hidden">
            <ul className="divide-y divide-stone-200 text-[15px]">
              {[
                { label: 'Fonctionnalités', action: scrollToFeatures },
                { label: 'Répertoire des métiers', action: () => { setMenuOpen(false); onOpenDirectory() } },
                { label: 'Abonnements', action: () => { setMenuOpen(false); onOpenPricing() } },
                { label: 'Analyser mon métier', action: focusSearch },
              ].map((item) => (
                <li key={item.label}>
                  <button type="button" onClick={item.action} className={cn('flex w-full items-center justify-between rounded py-3 text-left text-stone-800', FOCUS)}>
                    {item.label}
                    <ArrowRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="contenu">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section aria-labelledby="hero-titre" className="mx-auto grid max-w-[1200px] gap-14 px-6 pb-16 pt-14 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-7">
            <Kicker>Le diagnostic de votre métier</Kicker>
            <h1 id="hero-titre" className="mt-5 font-editorial text-[46px] leading-[0.98] tracking-[-0.01em] text-stone-900 sm:text-[64px] lg:text-[80px]">
              Le travail change. Voyez comment <em className="text-navy-700">le vôtre</em> va évoluer.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-stone-600">
              Blumi analyse votre métier tâche par tâche, estime ce qui pourra être automatisé d’ici 2040 et vous indique, concrètement, quoi faire du
              temps libéré.
            </p>

            <form role="search" onSubmit={submit} className="mt-9 max-w-[36rem]" noValidate>
              <label htmlFor="recherche-metier" className="text-sm font-medium text-stone-800">
                Quel est votre métier ?
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div ref={searchBoxRef} className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" strokeWidth={1.5} aria-hidden />
                  <input
                    ref={inputRef}
                    id="recherche-metier"
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={listVisible}
                    aria-controls={listId}
                    aria-activedescendant={listVisible && active >= 0 ? `${listId}-opt-${active}` : undefined}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setOpen(true)
                      setActive(-1)
                      if (error) setError('')
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Ex. comptable, infirmier, chef de projet…"
                    className="h-12 w-full rounded-md border border-stone-300 bg-white pl-11 pr-4 text-[15px] text-stone-900 shadow-[0_1px_0_rgba(28,25,23,0.04)] transition placeholder:text-stone-400 focus:border-navy-700 focus:outline-none focus:ring-4 focus:ring-navy-700/10"
                  />
                  {listVisible && (
                    <ul
                      id={listId}
                      role="listbox"
                      aria-label="Métiers suggérés"
                      className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-md border border-stone-200 bg-white py-1 shadow-[0_12px_32px_-16px_rgba(28,25,23,0.25)]"
                    >
                      {suggestions.map((p, i) => (
                        <li
                          key={p.id}
                          id={`${listId}-opt-${i}`}
                          role="option"
                          aria-selected={i === active}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => choose(p)}
                          className={cn('flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 text-[15px]', i === active ? 'bg-navy-50 text-stone-900' : 'text-stone-700')}
                        >
                          <span>{professionLabel(p)}</span>
                          <span className="shrink-0 text-xs text-stone-500">{p.domain}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  className={cn('inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-navy-700 px-6 text-[15px] font-medium text-white transition-colors hover:bg-navy-800', FOCUS)}
                >
                  Analyser
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              {error && (
                <p id={errorId} role="alert" className="mt-2 text-sm text-[#8f2f2f]">
                  {error}
                </p>
              )}
            </form>

            <div className="mt-5 flex max-w-[36rem] flex-wrap items-baseline gap-x-3 gap-y-1.5 text-sm">
              <span className="text-stone-500">Recherches fréquentes :</span>
              {POPULAR_IDS.map((id) => {
                const p = byId(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onAnalyze(p.label)}
                    className={cn('rounded text-stone-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-navy-700 hover:decoration-navy-700', FOCUS)}
                  >
                    {professionLabel(p)}
                  </button>
                )
              })}
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-stone-200 pt-6 text-sm text-stone-600">
              {['Gratuit et sans inscription', 'Résultat en moins d’une minute', 'Méthode inspirée d’Oxford et de l’OCDE'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-navy-700" strokeWidth={1.75} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Fiche exemple */}
          <aside aria-label="Exemple de fiche métier" className="lg:col-span-5 lg:pt-3">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-[0_1px_0_rgba(28,25,23,0.03),0_24px_48px_-28px_rgba(28,25,23,0.28)] sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <Kicker>Fiche métier · exemple</Kicker>
                <span className="text-xs tabular-nums text-stone-400">Édition 2026</span>
              </div>
              <div className="mt-5">
                <SpecimenTabs value={specimen} onChange={setSpecimen} idPrefix={specimenPrefix} />
              </div>

              <div id={`${specimenPrefix}-panel`} role="tabpanel" aria-labelledby={`${specimenPrefix}-tab-${specimen}`} className="mt-6">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-editorial text-[34px] leading-none text-stone-900">{professionLabel(current.profession)}</h2>
                    <p className="mt-2 text-sm text-stone-500">{current.profession.domain}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-editorial text-[56px] leading-none tabular-nums text-stone-900">
                      {Math.round(shownScore)}
                      <span className="text-2xl text-stone-400">/100</span>
                    </p>
                    <p className={cn('mt-1 text-sm font-medium', LEVEL_STYLE[level].text)}>Exposition {EXPOSURE_LABEL[level]}</p>
                  </div>
                </div>

                {/* Règle graduée */}
                <div className="mt-6" aria-hidden>
                  <div className="relative h-2 overflow-hidden rounded-sm bg-stone-100">
                    <div className={cn('h-full rounded-sm transition-[width] duration-700 ease-out', LEVEL_STYLE[level].bar)} style={{ width: `${current.score}%` }} />
                  </div>
                  <div className="relative mt-1.5 h-4">
                    {[0, 25, 50, 75, 100].map((v) => (
                      <span
                        key={v}
                        className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-[10px] tabular-nums text-stone-400 first:translate-x-0 last:-translate-x-full"
                        style={{ left: `${v}%` }}
                      >
                        <span className="h-1.5 w-px bg-stone-300" />
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <table className="mt-6 w-full text-sm">
                  <caption className="mb-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-stone-500">Part automatisable par type de tâche</caption>
                  <tbody>
                    {current.tasks.slice(0, 4).map((task) => (
                      <tr key={task.label}>
                        <th scope="row" className="py-1.5 pr-3 text-left font-normal text-stone-700">
                          <span className="flex items-baseline">
                            <span className="shrink-0">{task.label}</span>
                            <span className="mx-2 flex-1 translate-y-[-3px] border-b border-dotted border-stone-300" aria-hidden />
                          </span>
                        </th>
                        <td className="w-12 py-1.5 text-right tabular-nums text-stone-900">{task.risk} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
                  <p className="text-xs leading-relaxed text-stone-500">Fig. 1 — Estimation Blumi, horizon 2040.</p>
                  <button
                    type="button"
                    onClick={() => onAnalyze(current.profession.label)}
                    className={cn('inline-flex items-center gap-1.5 rounded text-sm font-medium text-navy-700 hover:text-navy-900', FOCUS)}
                  >
                    Lire la fiche complète
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Registre de chiffres ───────────────────────────────────── */}
        <section aria-label="Blumi en chiffres" className="border-y border-stone-200">
          <dl className="mx-auto grid max-w-[1200px] grid-cols-2 lg:grid-cols-4">
            {[
              { value: String(PROFESSIONS.length), label: 'métiers analysés et documentés' },
              { value: '7', label: 'facteurs pondérés pour chaque métier' },
              { value: '2026 → 2040', label: 'projection, année par année' },
              { value: '0 €', label: 'pour votre premier diagnostic' },
            ].map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'flex flex-col-reverse gap-1 px-6 py-7 lg:px-10',
                  i % 2 === 1 && 'border-l border-stone-200',
                  i >= 2 && 'border-t border-stone-200 lg:border-t-0',
                  i === 2 && 'lg:border-l',
                )}
              >
                <dt className="text-sm text-stone-500">{s.label}</dt>
                <dd className="font-editorial text-[36px] leading-none tabular-nums text-stone-900 sm:text-[42px]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Fonctionnalités ─────────────────────────────────────────── */}
        <section id="fonctionnalites" aria-labelledby="fonctionnalites-titre" className="mx-auto max-w-[1200px] scroll-mt-28 px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Kicker>Fonctionnalités</Kicker>
              <h2 id="fonctionnalites-titre" className="mt-4 font-editorial text-[40px] leading-[1.02] text-stone-900 sm:text-[52px]">
                Un outil de travail, <em>pas</em> une boule de cristal.
              </h2>
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-stone-600 lg:col-span-5 lg:pb-2">
              Chaque module répond à une question concrète : qu’est-ce qui change dans mon métier, à quel rythme, et que dois-je faire ? Commencez
              gratuitement, passez au copilote quand vous voulez aller plus loin.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 md:grid-cols-2 lg:grid-cols-6">
            {/* Diagnostic */}
            <Cell
              icon={DraftingCompass}
              tag="Gratuit"
              title="Un diagnostic en sept facteurs"
              intro="Chaque métier est décrit par sept facteurs mesurables. Ceux qui exposent à l’automatisation, et ceux qui vous protègent."
              className="md:col-span-2 lg:col-span-4 lg:row-span-2"
            >
              <div className="mb-5">
                <SpecimenTabs value={specimen} onChange={setSpecimen} idPrefix={`${specimenPrefix}-f`} />
              </div>
              <ul id={`${specimenPrefix}-f-panel`} role="tabpanel" aria-labelledby={`${specimenPrefix}-f-tab-${specimen}`} className="space-y-3.5">
                {FACTORS.map((f) => {
                  const v = current.profession.factors[f.key]
                  return (
                    <li key={f.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[13rem_minmax(0,1fr)_auto]">
                      <span className="text-sm text-stone-700">{f.label}</span>
                      <span className="col-span-2 row-start-2 h-1.5 overflow-hidden rounded-sm bg-stone-200/70 sm:col-span-1 sm:row-start-auto">
                        <span
                          className={cn('block h-full rounded-sm transition-[width] duration-700 ease-out', f.exposes ? 'bg-stone-500' : 'bg-navy-700')}
                          style={{ width: `${v}%` }}
                        />
                      </span>
                      <span className="flex items-baseline gap-2 text-right">
                        <span className="text-[11px] uppercase tracking-[0.08em] text-stone-500">{f.exposes ? 'expose' : 'protège'}</span>
                        <span className="w-8 text-sm tabular-nums text-stone-900">{v}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-auto grid gap-4 border-t border-stone-200 pt-5 text-sm sm:grid-cols-2">
                <p className="flex gap-3 leading-relaxed text-stone-600">
                  <span className="mt-2 h-1.5 w-6 shrink-0 rounded-sm bg-stone-500" aria-hidden />
                  <span>
                    <span className="font-medium text-stone-800">Facteurs exposants.</span> Plus la barre est longue, plus les tâches se prêtent à
                    l’automatisation.
                  </span>
                </p>
                <p className="flex gap-3 leading-relaxed text-stone-600">
                  <span className="mt-2 h-1.5 w-6 shrink-0 rounded-sm bg-navy-700" aria-hidden />
                  <span>
                    <span className="font-medium text-stone-800">Facteurs protecteurs.</span> Plus la barre est longue, plus le métier repose sur des
                    qualités humaines.
                  </span>
                </p>
                <p className="text-xs text-stone-500 sm:col-span-2">Valeurs sur 100 pour le métier sélectionné. Méthode détaillée dans chaque fiche.</p>
              </div>
            </Cell>

            {/* Projection */}
            <Cell
              icon={Ruler}
              tag="Gratuit"
              title="Une projection jusqu’en 2040"
              intro="La part de votre métier automatisable, année par année, selon le rythme d’adoption de votre secteur."
              className="lg:col-span-2"
            >
              <ProjectionChart points={current.projection} className="mt-auto" />
            </Cell>

            {/* Plan d'action */}
            <Cell
              icon={ClipboardList}
              tag="Gratuit"
              title="Un plan d’action"
              intro="Des recommandations concrètes, à cocher au fil de l’eau."
              className="lg:col-span-2"
            >
              <fieldset>
                <legend className="sr-only">Plan d’action pour {professionLabel(current.profession)}</legend>
                <ul className="space-y-2.5">
                  {planItems.map((r, i) => {
                    const key = `${specimen}:${i}`
                    const checked = !!done[key]
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-stone-400 accent-navy-700"
                          />
                          <span className={cn('leading-snug transition-colors', checked ? 'text-stone-400 line-through decoration-stone-400' : 'text-stone-800')}>{r.title}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
              <p className="mt-auto pt-4 text-xs tabular-nums text-stone-500" aria-live="polite">
                {doneCount} sur {planItems.length} réalisée{doneCount > 1 ? 's' : ''}
              </p>
            </Cell>

            {/* Boîte à outils */}
            <Cell
              icon={FolderOpen}
              tag="Blumiman"
              title="Une boîte à outils classée"
              intro="Les outils recommandés pour votre métier, rangés par usage. Le meilleur pour chaque tâche, pas toujours le même."
              className="lg:col-span-2"
            >
              <ul className="divide-y divide-stone-200 border-y border-stone-200">
                {FOLDERS.map((folder, i) => {
                  const isOpen = openFolder === i
                  const FolderIcon = isOpen ? FolderOpen : FolderClosed
                  return (
                    <li key={folder.name}>
                      <button
                        type="button"
                        onClick={() => setOpenFolder(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        aria-controls={`dossier-${i}`}
                        className={cn('flex w-full items-center gap-3 rounded py-2.5 text-left text-sm text-stone-800 hover:text-navy-700', FOCUS)}
                      >
                        <FolderIcon className="h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.5} aria-hidden />
                        <span className="flex-1">{folder.name}</span>
                        <span className="text-xs tabular-nums text-stone-500">{folder.tools.length}</span>
                      </button>
                      {isOpen && (
                        <p id={`dossier-${i}`} className="pb-3 pl-7 text-sm text-stone-600">
                          {folder.tools.join(' · ')}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Cell>

            {/* Copilote */}
            <Cell
              icon={NotebookPen}
              tag="Blumiman"
              title="Un copilote qui connaît votre parcours"
              intro="Posez vos questions de travail. Les réponses tiennent compte de votre métier, de vos tâches et de vos objectifs."
              className="lg:col-span-2"
            >
              <figure className="mt-auto rounded-md border border-stone-200 bg-white p-4 text-sm">
                <p className="text-stone-500">
                  <span className="font-medium text-stone-800">Vous —</span> Comment gagner du temps sur mes relances clients ?
                </p>
                <p className="mt-3 border-l-2 border-navy-700 pl-3 leading-relaxed text-stone-700">
                  Préparez trois modèles d’e-mail selon le retard de paiement, puis programmez l’envoi depuis votre outil de facturation. Gain estimé : 2 h
                  par semaine.
                </p>
                <figcaption className="mt-3 text-xs text-stone-500">Exemple d’échange, abrégé.</figcaption>
              </figure>
            </Cell>

            {/* Comparer */}
            <Cell
              icon={Scale}
              tag="Gratuit"
              title="Comparer deux métiers"
              intro="Utile avant une reconversion : mettez deux métiers côte à côte."
              className="lg:col-span-2"
            >
              <div className="space-y-3">
                {[
                  { id: 'comparer-a', value: compareA, set: setCompareA, label: 'Premier métier', a: compared[0] },
                  { id: 'comparer-b', value: compareB, set: setCompareB, label: 'Second métier', a: compared[1] },
                ].map((row) => {
                  const lv = riskLevel(row.a.score)
                  return (
                    <div key={row.label}>
                      <label className="sr-only" htmlFor={row.id}>
                        {row.label}
                      </label>
                      <div className="flex items-center gap-3">
                        <select
                          id={row.id}
                          value={row.value}
                          onChange={(e) => row.set(e.target.value)}
                          className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-navy-700 focus:outline-none focus:ring-4 focus:ring-navy-700/10"
                        >
                          {sortedProfessions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {professionLabel(p)}
                            </option>
                          ))}
                        </select>
                        <span className={cn('w-12 text-right font-editorial text-2xl tabular-nums', LEVEL_STYLE[lv].text)}>{row.a.score}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => onCompare(byId(compareA).label, byId(compareB).label)}
                disabled={compareA === compareB}
                className={cn(
                  'mt-auto inline-flex items-center gap-1.5 self-start rounded pt-5 text-sm font-medium text-navy-700 hover:text-navy-900 disabled:cursor-not-allowed disabled:text-stone-400',
                  FOCUS,
                )}
              >
                Comparer en détail
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </Cell>

            {/* Veille */}
            <Cell
              icon={Newspaper}
              tag="Bluminator"
              title="Une note de veille sur votre secteur"
              intro="À la demande, une synthèse sourcée de ce qui bouge dans votre secteur, et ce que cela change pour vous."
              className="lg:col-span-3"
            >
              <div className="mt-auto rounded-md border border-stone-200 bg-white px-5 py-4">
                <p className="flex items-baseline justify-between border-b border-stone-200 pb-2 text-xs text-stone-500">
                  <span className="font-editorial text-base italic text-stone-800">La note de votre secteur</span>
                  <span>exemple de sommaire</span>
                </p>
                <ol className="mt-3 space-y-2 text-sm text-stone-700">
                  {['Les outils adoptés par les entreprises de votre secteur', 'Les évolutions réglementaires à anticiper', 'Les compétences les plus demandées dans les offres'].map(
                    (line, i) => (
                      <li key={line} className="flex gap-3">
                        <span className="font-editorial text-base tabular-nums text-stone-400">{i + 1}.</span>
                        {line}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            </Cell>

            {/* Données */}
            <Cell
              icon={Archive}
              tag="Engagement"
              title="Vos données vous appartiennent"
              intro="Un outil de travail doit être digne de confiance. Voici nos engagements, détaillés dans notre politique de confidentialité."
              className="md:col-span-2 lg:col-span-3"
            >
              <ul className="mt-auto space-y-2.5 text-sm text-stone-700">
                {['Votre profil est enregistré sur votre appareil', 'Supprimable à tout moment, en un clic', 'Jamais vendu ni loué à des tiers'].map((line) => (
                  <li key={line} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-navy-700" strokeWidth={1.75} aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href="#/legal/confidentialite"
                className={cn('mt-5 inline-flex items-center gap-1.5 self-start rounded text-sm font-medium text-navy-700 hover:text-navy-900', FOCUS)}
              >
                Lire la politique de confidentialité
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </a>
            </Cell>
          </div>

          {/* Appel à l'action */}
          <div className="mt-14 flex flex-col gap-6 border-t border-stone-900 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-editorial text-[32px] leading-tight text-stone-900 sm:text-[36px]">Commencez par votre propre métier.</p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={focusSearch}
                className={cn('inline-flex h-12 items-center gap-2 rounded-md bg-navy-700 px-6 text-[15px] font-medium text-white transition-colors hover:bg-navy-800', FOCUS)}
              >
                Analyser mon métier
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onOpenPricing}
                className={cn('rounded text-[15px] text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-navy-700 hover:decoration-navy-700', FOCUS)}
              >
                Voir les abonnements
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Pied de page ──────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>
            <span className="font-editorial text-lg text-stone-800">Blumi</span> — Observatoire des métiers face à l’IA. Estimations indicatives.
          </p>
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#/legal/mentions" className={cn('rounded hover:text-stone-900', FOCUS)}>
              Mentions légales
            </a>
            <a href="#/legal/confidentialite" className={cn('rounded hover:text-stone-900', FOCUS)}>
              Confidentialité
            </a>
            <a href="#/legal/cgu" className={cn('rounded hover:text-stone-900', FOCUS)}>
              CGU
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
