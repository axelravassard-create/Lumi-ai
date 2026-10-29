import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  CreditCard,
  Download,
  Factory,
  Gauge,
  GraduationCap,
  Handshake,
  Headphones,
  Info,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LibraryBig,
  LifeBuoy,
  List,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Plug,
  Plus,
  RotateCw,
  Scale,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Timer,
  UserRound,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

// ─────────────────────────────────────────────────────────────────────────────
// Blumi — Espace entreprise (tableau de bord B2B)
// Direction « Soft Tech / Warm Professional » : neutres chauds (stone), accent
// azur Blumi utilisé avec parcimonie, couleurs sémantiques réservées aux statuts.
// Thème clair/sombre via la classe `dark` posée sur la racine du composant.
// Données de démonstration simulées « en direct » (aucun appel réseau).
// ─────────────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark'
type Period = '7j' | '30j' | '90j'
type DeptId =
  | 'rh'
  | 'marketing'
  | 'finance'
  | 'support'
  | 'juridique'
  | 'commercial'
  | 'operations'
  | 'it'
  | 'achats'
  | 'communication'
  | 'qualite'
  | 'logistique'
type FlowStatus = 'running' | 'review' | 'done' | 'paused' | 'error'
type ConnectorStatus = 'active' | 'setup' | 'attention' | 'off'
type FlowFilter = 'all' | 'running' | 'review' | 'error'
type ConnectorFilter = 'all' | 'active' | 'pending' | 'off'
type ConnectorView = 'grid' | 'list'
type Tone = 'brand' | 'green' | 'amber' | 'rose' | 'stone'

interface Flow {
  id: string
  name: string
  dept: DeptId
  owner: string
  status: FlowStatus
  progress: number
  weeklyHours: number
  runs: number
  lastRun: string
  humanCheck: boolean
  error?: string
}

interface Connector {
  id: DeptId
  status: ConnectorStatus
  flows: number
  adoption: number
  note?: string
}

interface Notice {
  id: number
  title: string
  time: string
  tone: Tone
  read: boolean
}

interface ToastItem {
  id: number
  title: string
  tone: Tone
}

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  target?: string
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

// ─── Référentiel métiers ────────────────────────────────────────────────────

const DEPTS: Record<DeptId, { name: string; icon: LucideIcon; description: string; tools: string[] }> = {
  rh: { name: 'Ressources humaines', icon: Users, description: 'Recrutement, onboarding et suivi des collaborateurs.', tools: ['Lucca', 'Welcome to the Jungle'] },
  marketing: { name: 'Marketing', icon: Megaphone, description: 'Campagnes, contenus et analyse de performance.', tools: ['HubSpot', 'Brevo'] },
  finance: { name: 'Finance', icon: Landmark, description: 'Rapprochements, prévisions et reporting.', tools: ['Pennylane', 'Qonto'] },
  support: { name: 'Service client', icon: Headphones, description: 'Tri des demandes et réponses assistées.', tools: ['Zendesk', 'Intercom'] },
  juridique: { name: 'Juridique', icon: Scale, description: 'Relecture de contrats et veille réglementaire.', tools: ['Docusign'] },
  commercial: { name: 'Commercial', icon: Handshake, description: 'Qualification des leads et préparation des rendez-vous.', tools: ['Salesforce'] },
  operations: { name: 'Opérations', icon: Factory, description: 'Planification, comptes rendus et procédures.', tools: ['Notion', 'Slack'] },
  it: { name: 'Informatique', icon: Server, description: 'Support interne et documentation technique.', tools: ['Jira', 'Google Workspace'] },
  achats: { name: 'Achats', icon: ShoppingCart, description: 'Comparaison des devis et suivi des fournisseurs.', tools: ['Coupa'] },
  communication: { name: 'Communication interne', icon: MessagesSquare, description: 'Newsletters, notes internes et annonces.', tools: ['Slack'] },
  qualite: { name: 'Qualité', icon: ShieldCheck, description: 'Contrôles, non-conformités et préparation des audits.', tools: ['SharePoint'] },
  logistique: { name: 'Logistique', icon: Package, description: 'Suivi des expéditions et des niveaux de stock.', tools: ['SAP'] },
}

const INITIAL_FLOWS: Flow[] = [
  { id: 'f1', name: 'Tri et préqualification des candidatures', dept: 'rh', owner: 'Inès B.', status: 'running', progress: 64, weeklyHours: 12, runs: 148, lastRun: 'il y a 2 min', humanCheck: true },
  { id: 'f2', name: 'Campagne e-mail de relance — novembre', dept: 'marketing', owner: 'Hugo L.', status: 'review', progress: 100, weeklyHours: 6, runs: 12, lastRun: 'il y a 18 min', humanCheck: true },
  { id: 'f3', name: 'Rapprochement bancaire mensuel', dept: 'finance', owner: 'Sarah K.', status: 'running', progress: 38, weeklyHours: 9, runs: 31, lastRun: 'il y a 5 min', humanCheck: true },
  { id: 'f4', name: 'Synthèse quotidienne des tickets', dept: 'support', owner: 'Mehdi R.', status: 'done', progress: 100, weeklyHours: 4, runs: 412, lastRun: 'il y a 1 h', humanCheck: false },
  { id: 'f5', name: 'Relecture des contrats fournisseurs', dept: 'juridique', owner: 'Paul V.', status: 'paused', progress: 52, weeklyHours: 7, runs: 19, lastRun: 'hier', humanCheck: true },
  { id: 'f6', name: 'Enrichissement des fiches prospects', dept: 'commercial', owner: 'Léa M.', status: 'error', progress: 21, weeklyHours: 5, runs: 87, lastRun: 'il y a 32 min', humanCheck: false, error: 'La connexion Salesforce a expiré. Reconnectez le métier Commercial pour relancer ce flux.' },
  { id: 'f7', name: 'Parcours d’intégration des nouveaux arrivants', dept: 'rh', owner: 'Inès B.', status: 'running', progress: 81, weeklyHours: 3, runs: 22, lastRun: 'il y a 1 min', humanCheck: false },
  { id: 'f8', name: 'Prévisions de trésorerie à 13 semaines', dept: 'finance', owner: 'Sarah K.', status: 'review', progress: 100, weeklyHours: 5, runs: 8, lastRun: 'il y a 46 min', humanCheck: true },
]

const INITIAL_CONNECTORS: Connector[] = [
  { id: 'rh', status: 'active', flows: 6, adoption: 88 },
  { id: 'marketing', status: 'active', flows: 5, adoption: 71 },
  { id: 'finance', status: 'active', flows: 4, adoption: 76 },
  { id: 'support', status: 'active', flows: 3, adoption: 64 },
  { id: 'juridique', status: 'active', flows: 2, adoption: 42 },
  { id: 'commercial', status: 'attention', flows: 2, adoption: 58, note: 'Connexion Salesforce expirée' },
  { id: 'it', status: 'setup', flows: 0, adoption: 18 },
  { id: 'operations', status: 'off', flows: 0, adoption: 0 },
]

const INITIAL_NOTICES: Notice[] = [
  { id: 1, title: 'Campagne e-mail de relance prête à être validée', time: 'il y a 18 min', tone: 'amber', read: false },
  { id: 2, title: 'Connexion Salesforce expirée (Commercial)', time: 'il y a 32 min', tone: 'rose', read: false },
  { id: 3, title: 'Adoption RH : 88 % — objectif trimestriel atteint', time: 'hier', tone: 'green', read: true },
]

// ─── Indicateurs (par période) ──────────────────────────────────────────────

// Série pseudo-aléatoire déterministe (même rendu à chaque chargement).
function series(n: number, start: number, end: number, seed: number): number[] {
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return Array.from({ length: n }, (_, i) => {
    const base = start + ((end - start) * i) / Math.max(1, n - 1)
    return Math.round(base * (0.88 + rand() * 0.24))
  })
}

const PERIODS: { value: Period; label: string; days: number; from: string; caption: string }[] = [
  { value: '7j', label: '7 jours', days: 7, from: 'Il y a 7 j', caption: 'Heures libérées / jour' },
  { value: '30j', label: '30 jours', days: 30, from: 'Il y a 30 j', caption: 'Heures libérées / jour' },
  { value: '90j', label: '90 jours', days: 90, from: 'Il y a 13 sem.', caption: 'Heures libérées / semaine' },
]

const KPI: Record<Period, { transitionDelta: number; hours: number; hoursDelta: number; adoptionDelta: number; hoursSeries: number[] }> = {
  '7j': { transitionDelta: 2, hours: 312, hoursDelta: 12, adoptionDelta: 3, hoursSeries: series(7, 38, 50, 11) },
  '30j': { transitionDelta: 6, hours: 1284, hoursDelta: 18, adoptionDelta: 9, hoursSeries: series(30, 33, 50, 23) },
  '90j': { transitionDelta: 15, hours: 3610, hoursDelta: 41, adoptionDelta: 24, hoursSeries: series(13, 225, 320, 41) },
}

const TRANSITION_SCORE = 68
const ADOPTION_RATE = 72
const STAGES = ['Exploration', 'Pilotes', 'Industrialisation', 'Maîtrise']
const CURRENT_STAGE = 2
const TEAM_ADOPTION: { dept: DeptId; value: number }[] = [
  { dept: 'rh', value: 88 },
  { dept: 'finance', value: 76 },
  { dept: 'marketing', value: 71 },
  { dept: 'juridique', value: 42 },
]
const EXECUTIONS_24H = [3, 2, 1, 1, 2, 4, 9, 18, 26, 31, 28, 24, 19, 22, 27, 30, 25, 17, 11, 8, 6, 5, 4, 3]

// ─── Jetons de style ────────────────────────────────────────────────────────

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900'

const TONE_BADGE: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/25',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25',
  stone: 'bg-stone-100 text-stone-600 ring-stone-500/20 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-600/40',
}
const TONE_DOT: Record<Tone, string> = {
  brand: 'bg-brand-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  stone: 'bg-stone-400',
}
const TONE_BAR: Record<Tone, string> = {
  brand: 'bg-brand-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  stone: 'bg-stone-400 dark:bg-stone-500',
}

const FLOW_STATUS: Record<FlowStatus, { label: string; tone: Tone }> = {
  running: { label: 'En cours', tone: 'brand' },
  review: { label: 'À valider', tone: 'amber' },
  done: { label: 'Terminé', tone: 'green' },
  paused: { label: 'En pause', tone: 'stone' },
  error: { label: 'Erreur', tone: 'rose' },
}
const CONNECTOR_STATUS: Record<ConnectorStatus, { label: string; tone: Tone }> = {
  active: { label: 'Actif', tone: 'green' },
  setup: { label: 'En configuration', tone: 'amber' },
  attention: { label: 'Attention requise', tone: 'rose' },
  off: { label: 'Déconnecté', tone: 'stone' },
}

const WORKSPACE_CSS = `
@keyframes bw-pop { from { opacity: 0; transform: translateY(-4px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes bw-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes bw-sheet { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes bw-drawer { from { transform: translateX(-24px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes bw-toast { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.bw-pop { animation: bw-pop .14s ease-out both }
.bw-fade { animation: bw-fade .18s ease-out both }
.bw-sheet { animation: bw-sheet .24s cubic-bezier(.16,1,.3,1) both }
.bw-drawer { animation: bw-drawer .24s cubic-bezier(.16,1,.3,1) both }
.bw-toast { animation: bw-toast .2s ease-out both }
@media (prefers-reduced-motion: reduce) {
  .bw-pop, .bw-fade, .bw-sheet, .bw-drawer, .bw-toast { animation: none }
}
`

// ─── Utilitaires ────────────────────────────────────────────────────────────

const THEME_KEY = 'lumi.workspace.theme'
const nf = new Intl.NumberFormat('fr-FR')
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* stockage indisponible : on suit le système */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function todayLabel(): string {
  const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Anime un nombre vers sa cible (désactivé si l'utilisateur réduit les animations).
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const fromRef = useRef(prefersReducedMotion() ? target : 0)
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

// Modale / panneau : Échap pour fermer, focus piégé, scroll de la page bloqué.
function useModalBehavior(open: boolean, onClose: () => void, ref: RefObject<HTMLElement>) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const node = ref.current
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initial = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node
    initial?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(
        node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open, ref])
}

// Menu déroulant : fermeture au clic extérieur et à Échap.
function useDismiss(open: boolean, onClose: () => void, ref: RefObject<HTMLElement>) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, ref])
}

// ─── Primitives UI (esprit shadcn/ui) ───────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary:
    'bg-white text-stone-800 shadow-sm ring-1 ring-inset ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700 dark:hover:bg-stone-800',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
}
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
}

function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        FOCUS,
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}

function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:shadow-none', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

function Badge({ tone = 'stone', dot, pulse, className, children }: { tone?: Tone; dot?: boolean; pulse?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_BADGE[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', TONE_DOT[tone])} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
        </span>
      )}
      {children}
    </span>
  )
}

function Progress({ value, tone = 'brand', label, className }: { value: number; tone?: Tone; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONE_BAR[tone])} style={{ width: `${v}%` }} />
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        FOCUS,
        checked ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (next: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  label: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800/70">
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-all',
              FOCUS,
              active
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1 text-[10px] tabular-nums',
                  active ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded border border-stone-200 bg-stone-50 px-1.5 font-inter text-[10px] font-medium text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

function InfoTip({ text, label }: { text: string; label: string }) {
  const id = useId()
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`À propos : ${label}`}
        aria-describedby={id}
        className={cn('rounded-md p-1 text-stone-400 transition hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300', FOCUS)}
      >
        <Info className="h-4 w-4" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-64 rounded-lg bg-stone-900 px-3 py-2 text-xs leading-relaxed text-stone-100 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:bg-stone-100 dark:text-stone-900"
      >
        {text}
      </span>
    </span>
  )
}

function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const c = cn('h-4 w-4 shrink-0', className)
  if (tone === 'green') return <CheckCircle2 className={cn(c, 'text-emerald-600 dark:text-emerald-400')} aria-hidden />
  if (tone === 'amber') return <AlertTriangle className={cn(c, 'text-amber-600 dark:text-amber-400')} aria-hidden />
  if (tone === 'rose') return <AlertTriangle className={cn(c, 'text-rose-600 dark:text-rose-400')} aria-hidden />
  if (tone === 'brand') return <Loader2 className={cn(c, 'text-brand-600 motion-safe:animate-spin dark:text-brand-400')} aria-hidden />
  return <Info className={cn(c, 'text-stone-500 dark:text-stone-400')} aria-hidden />
}

function DeptIcon({ dept, size = 'md' }: { dept: DeptId; size?: 'sm' | 'md' }) {
  const Icon = DEPTS[dept].icon
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200/70 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700',
        size === 'md' ? 'h-9 w-9' : 'h-8 w-8',
      )}
      aria-hidden
    >
      <Icon className={size === 'md' ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
    </span>
  )
}

function BlumiMark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white shadow-sm" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M8 4.5v13.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="12.7" cy="13.3" r="4.2" stroke="currentColor" strokeWidth="2.4" fill="none" />
        <circle cx="17.6" cy="5.8" r="1.7" fill="#fcd34d" />
      </svg>
    </span>
  )
}

function Sparkline({ data, label, className }: { data: number[]; label: string; className?: string }) {
  const gradientId = useId().replace(/:/g, '')
  const w = 240
  const h = 48
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const points = data.map((v, i) => [(i * w) / Math.max(1, data.length - 1), h - 4 - ((v - min) / span) * (h - 8)] as const)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const last = points[points.length - 1]
  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((y) => (
          <line key={y} x1="0" x2={w} y1={h * y} y2={h * y} className="stroke-stone-100 dark:stroke-stone-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow-sm dark:border-stone-900"
        style={{ left: `${(last[0] / w) * 100}%`, top: `${(last[1] / h) * 100}%` }}
        aria-hidden
      />
    </div>
  )
}

function Ring({ value, size = 92, stroke = 8 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-stone-100 dark:stroke-stone-800" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="stroke-brand-500"
      />
    </svg>
  )
}

function Delta({ value, unit }: { value: number; unit: string }) {
  const up = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
        up ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
      )}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
      {up ? '+' : '−'}
      {Math.abs(value)}
      {unit}
    </span>
  )
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        <Search className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium text-stone-900 dark:text-stone-100">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Surcouches : menu déroulant, panneau latéral, modale ───────────────────

function Dropdown({
  open,
  onOpenChange,
  trigger,
  children,
  widthClass = 'w-72',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  widthClass?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, () => onOpenChange(false), ref)
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          role="menu"
          className={cn(
            'bw-pop absolute right-0 top-full z-50 mt-2 origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900',
            widthClass,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, children, onClick, tone }: { icon: LucideIcon; children: ReactNode; onClick: () => void; tone?: 'danger' }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        FOCUS,
        tone === 'danger'
          ? 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10'
          : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      {children}
    </button>
  )
}

function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModalBehavior(open, onClose, panelRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="bw-fade absolute inset-0 bg-stone-950/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bw-sheet absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-4 dark:border-stone-800">
          <h2 id={titleId} className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {title}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer le panneau">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200/80 px-6 py-4 dark:border-stone-800">{footer}</div>}
      </div>
    </div>
  )
}

function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  useModalBehavior(open, onClose, panelRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      <div className="bw-fade absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bw-pop relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-stone-900 dark:text-stone-50">
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {description}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-stone-200/80 bg-stone-50/70 px-6 py-3.5 dark:border-stone-800 dark:bg-stone-950/40">
          {footer}
        </div>
      </div>
    </div>
  )
}

// ─── Navigation latérale ────────────────────────────────────────────────────

function NavLink({ item, active, collapsed, onClick }: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        FOCUS,
        collapsed ? 'h-10 justify-center' : 'h-9 px-2.5',
        active
          ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80 dark:bg-stone-800/80 dark:text-stone-50 dark:ring-stone-700/60'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-100',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active ? 'text-brand-600 dark:text-brand-400' : 'text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300',
        )}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!!item.badge &&
        (collapsed ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-stone-50 dark:ring-stone-950" aria-hidden />
        ) : (
          <span className="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            {item.badge}
            <span className="sr-only"> à valider</span>
          </span>
        ))}
    </button>
  )
}

function SidebarContent({
  groups,
  footer,
  active,
  collapsed,
  onNavigate,
  onWorkspace,
  onRoadmap,
  onClose,
}: {
  groups: NavGroup[]
  footer: NavItem[]
  active: string
  collapsed: boolean
  onNavigate: (item: NavItem) => void
  onWorkspace: () => void
  onRoadmap: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 border-b border-stone-200/80 dark:border-stone-800', collapsed ? 'justify-center px-2' : 'px-5')}>
        <BlumiMark />
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-50">Blumi</span>
            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              Entreprise
            </span>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onClose} aria-label="Fermer la navigation">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className={cn('pt-4', collapsed ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={onWorkspace}
          aria-label={collapsed ? 'Espace de travail : Groupe Horizon' : undefined}
          title={collapsed ? 'Groupe Horizon' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-stone-200/80 bg-white p-2 text-left transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700',
            FOCUS,
            collapsed && 'justify-center',
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" aria-hidden>
            <Building2 className="h-4 w-4" />
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-100">Groupe Horizon</span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">248 membres · Entreprise</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            </>
          )}
        </button>
      </div>

      <nav aria-label="Navigation principale" className={cn('mt-5 flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
        {groups.map((group, gi) => (
          <div key={group.title} className={gi ? 'mt-6' : undefined}>
            {collapsed ? (
              gi > 0 && <div className="mx-2 mb-3 border-t border-stone-200 dark:border-stone-800" aria-hidden />
            ) : (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink item={item} active={active === item.id} collapsed={collapsed} onClick={() => onNavigate(item)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-stone-200/80 py-3 dark:border-stone-800', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <div className="mb-3 rounded-xl border border-stone-200/80 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">Feuille de route IA</p>
              <span className="text-[11px] tabular-nums text-stone-500 dark:text-stone-400">Phase 3/4</span>
            </div>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Industrialisation en cours</p>
            <Progress value={TRANSITION_SCORE} className="mt-3" label="Avancement de la feuille de route" />
            <button
              type="button"
              onClick={onRoadmap}
              className={cn('mt-3 rounded text-xs font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300', FOCUS)}
            >
              Voir les prochaines étapes →
            </button>
          </div>
        )}
        <ul className="space-y-0.5">
          {footer.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={active === item.id} collapsed={collapsed} onClick={() => onNavigate(item)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Cartes KPI ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, title, info, className, children }: { icon: LucideIcon; title: string; info: string; className?: string; children: ReactNode }) {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300" aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="truncate text-sm font-medium text-stone-600 dark:text-stone-300">{title}</h3>
        </div>
        <InfoTip text={info} label={title} />
      </div>
      {children}
    </Card>
  )
}

// ─── Métiers connectés ──────────────────────────────────────────────────────

function ConnectorAction({ connector, onConnect, onFinish, onConfigure }: { connector: Connector; onConnect: () => void; onFinish: () => void; onConfigure: () => void }) {
  const name = DEPTS[connector.id].name
  if (connector.status === 'attention')
    return (
      <Button size="sm" variant="secondary" onClick={onConnect} aria-label={`Reconnecter ${name}`}>
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
        Reconnecter
      </Button>
    )
  if (connector.status === 'setup')
    return (
      <Button size="sm" variant="secondary" onClick={onFinish} aria-label={`Finaliser la configuration de ${name}`}>
        <Check className="h-3.5 w-3.5" aria-hidden />
        Finaliser
      </Button>
    )
  if (connector.status === 'off')
    return (
      <Button size="sm" variant="ghost" onClick={onConnect} aria-label={`Connecter ${name}`}>
        <Plug className="h-3.5 w-3.5" aria-hidden />
        Connecter
      </Button>
    )
  return (
    <Button size="sm" variant="ghost" onClick={onConfigure} aria-label={`Configurer ${name}`}>
      <Settings className="h-3.5 w-3.5" aria-hidden />
      Configurer
    </Button>
  )
}

function ConnectorCard({
  connector,
  onToggle,
  onConnect,
  onFinish,
  onConfigure,
}: {
  connector: Connector
  onToggle: (on: boolean) => void
  onConnect: () => void
  onFinish: () => void
  onConfigure: () => void
}) {
  const dept = DEPTS[connector.id]
  const meta = CONNECTOR_STATUS[connector.status]
  const on = connector.status !== 'off'
  return (
    <li className="flex flex-col rounded-xl border border-stone-200/80 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DeptIcon dept={connector.id} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{dept.name}</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {connector.flows} flux {connector.flows > 1 ? 'actifs' : 'actif'}
            </p>
          </div>
        </div>
        <Switch checked={on} onChange={onToggle} label={`${on ? 'Déconnecter' : 'Connecter'} ${dept.name}`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={meta.tone} dot pulse={connector.status === 'setup'}>
          {meta.label}
        </Badge>
      </div>
      {connector.note && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {connector.note}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500 dark:text-stone-400">Adoption</span>
          <span className="font-medium tabular-nums text-stone-900 dark:text-stone-100">{connector.adoption} %</span>
        </div>
        <Progress value={connector.adoption} tone={on ? (connector.adoption < 50 ? 'amber' : 'brand') : 'stone'} className="mt-1.5" label={`Adoption ${dept.name}`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {dept.tools.map((tool) => (
          <span key={tool} className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {tool}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="flex justify-end border-t border-stone-100 pt-3 dark:border-stone-800">
          <ConnectorAction connector={connector} onConnect={onConnect} onFinish={onFinish} onConfigure={onConfigure} />
        </div>
      </div>
    </li>
  )
}

function ConnectorRow({
  connector,
  onToggle,
  onConnect,
  onFinish,
  onConfigure,
}: {
  connector: Connector
  onToggle: (on: boolean) => void
  onConnect: () => void
  onFinish: () => void
  onConfigure: () => void
}) {
  const dept = DEPTS[connector.id]
  const meta = CONNECTOR_STATUS[connector.status]
  const on = connector.status !== 'off'
  return (
    <li className="flex items-center gap-3 py-3.5 sm:gap-4">
      <DeptIcon dept={connector.id} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{dept.name}</h3>
          <Badge tone={meta.tone} dot pulse={connector.status === 'setup'}>
            {meta.label}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{connector.note ?? `${dept.description} · ${dept.tools.join(', ')}`}</p>
      </div>
      <div className="hidden w-28 shrink-0 sm:block">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-500 dark:text-stone-400">Adoption</span>
          <span className="font-medium tabular-nums text-stone-900 dark:text-stone-100">{connector.adoption} %</span>
        </div>
        <Progress value={connector.adoption} tone={on ? (connector.adoption < 50 ? 'amber' : 'brand') : 'stone'} className="mt-1" label={`Adoption ${dept.name}`} />
      </div>
      <div className="hidden md:block">
        <ConnectorAction connector={connector} onConnect={onConnect} onFinish={onFinish} onConfigure={onConfigure} />
      </div>
      <Switch checked={on} onChange={onToggle} label={`${on ? 'Déconnecter' : 'Connecter'} ${dept.name}`} />
    </li>
  )
}

// ─── Détail d'un flux ───────────────────────────────────────────────────────

type StepState = 'done' | 'current' | 'todo' | 'paused' | 'error' | 'waiting'

function flowSteps(flow: Flow): { label: string; state: StepState }[] {
  const labels = ['Collecte des données', 'Traitement par l’IA', 'Contrôle qualité automatique', ...(flow.humanCheck ? ['Validation humaine'] : []), 'Diffusion des résultats']
  if (flow.status === 'done') return labels.map((label) => ({ label, state: 'done' }))
  const reviewIndex = labels.indexOf('Validation humaine')
  const current = flow.status === 'review' ? reviewIndex : Math.min(2, Math.floor(flow.progress / 34))
  return labels.map((label, i) => {
    if (i < current) return { label, state: 'done' }
    if (i > current) return { label, state: 'todo' }
    if (flow.status === 'review') return { label, state: 'waiting' }
    if (flow.status === 'paused') return { label, state: 'paused' }
    if (flow.status === 'error') return { label, state: 'error' }
    return { label, state: 'current' }
  })
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
  if (state === 'current') return <Loader2 className="h-5 w-5 text-brand-600 motion-safe:animate-spin dark:text-brand-400" aria-hidden />
  if (state === 'paused') return <Pause className="h-5 w-5 text-stone-500" aria-hidden />
  if (state === 'error') return <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden />
  if (state === 'waiting') return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
  return <span className="mx-[3px] block h-3.5 w-3.5 rounded-full border-2 border-stone-300 dark:border-stone-600" aria-hidden />
}

const STEP_STATE_LABEL: Record<StepState, string> = {
  done: 'terminée',
  current: 'en cours',
  todo: 'à venir',
  paused: 'en pause',
  error: 'en erreur',
  waiting: 'en attente de votre validation',
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function BlumiWorkspace({ onBack }: { onBack?: () => void }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [activeNav, setActiveNav] = useState('overview')
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<Period>('30j')
  const [flows, setFlows] = useState<Flow[]>(INITIAL_FLOWS)
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connectors, setConnectors] = useState<Connector[]>(INITIAL_CONNECTORS)
  const [connectorFilter, setConnectorFilter] = useState<ConnectorFilter>('all')
  const [connectorView, setConnectorView] = useState<ConnectorView>('grid')
  const [addOpen, setAddOpen] = useState(false)
  const [addChoice, setAddChoice] = useState<DeptId | null>(null)
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const searchRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const flowsRef = useRef(flows)
  flowsRef.current = flows
  const timers = useRef<number[]>([])
  const toastSeq = useRef(0)
  const noticeSeq = useRef(INITIAL_NOTICES.length)

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const periodMeta = PERIODS.find((p) => p.value === period) ?? PERIODS[1]
  const kpi = KPI[period]

  // ── Minuteries et notifications éphémères ──
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id)
      fn()
    }, ms)
    timers.current.push(id)
  }, [])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const pushToast = useCallback(
    (title: string, tone: Tone = 'stone') => {
      const id = ++toastSeq.current
      setToasts((list) => [...list.slice(-2), { id, title, tone }])
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
    },
    [later],
  )

  // ── Thème ──
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* préférence non mémorisée, sans conséquence */
    }
  }, [theme])

  // ── Raccourci ⌘K / Ctrl+K vers la recherche ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useModalBehavior(mobileNav, () => setMobileNav(false), drawerRef)

  // ── Simulation « en direct » : les flux en cours avancent ──
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = flowsRef.current
      if (!current.some((f) => f.status === 'running')) return
      const finished: Flow[] = []
      const next = current.map((f) => {
        if (f.status !== 'running') return f
        const progress = Math.min(100, f.progress + 2 + Math.round(Math.random() * 4))
        if (progress >= 100) {
          const done: Flow = { ...f, progress: 100, status: f.humanCheck ? 'review' : 'done', runs: f.runs + 1, lastRun: 'à l’instant' }
          finished.push(done)
          return done
        }
        return { ...f, progress, lastRun: 'à l’instant' }
      })
      setFlows(next)
      finished.forEach((f) => {
        if (f.status === 'review') {
          pushToast(`« ${f.name} » est prêt à être validé.`, 'amber')
          const nid = ++noticeSeq.current
          setNotices((list) => [{ id: nid, title: `« ${f.name} » est prêt à être validé`, time: 'à l’instant', tone: 'amber', read: false }, ...list])
        } else {
          pushToast(`« ${f.name} » s’est terminé avec succès.`, 'green')
        }
      })
    }, 2600)
    return () => window.clearInterval(id)
  }, [pushToast])

  // ── Recherche + filtres ──
  const q = normalize(query.trim())
  const flowMatches = useCallback((f: Flow) => !q || [f.name, DEPTS[f.dept].name, f.owner].some((s) => normalize(s).includes(q)), [q])
  const connectorMatches = useCallback(
    (c: Connector) => !q || [DEPTS[c.id].name, DEPTS[c.id].description, ...DEPTS[c.id].tools].some((s) => normalize(s).includes(q)),
    [q],
  )

  const searchedFlows = useMemo(() => flows.filter(flowMatches), [flows, flowMatches])
  const flowCounts = useMemo(
    () => ({
      all: searchedFlows.length,
      running: searchedFlows.filter((f) => f.status === 'running').length,
      review: searchedFlows.filter((f) => f.status === 'review').length,
      error: searchedFlows.filter((f) => f.status === 'error').length,
    }),
    [searchedFlows],
  )
  const visibleFlows = flowFilter === 'all' ? searchedFlows : searchedFlows.filter((f) => f.status === flowFilter)

  const searchedConnectors = useMemo(() => connectors.filter(connectorMatches), [connectors, connectorMatches])
  const connectorCounts = useMemo(
    () => ({
      all: searchedConnectors.length,
      active: searchedConnectors.filter((c) => c.status === 'active').length,
      pending: searchedConnectors.filter((c) => c.status === 'setup' || c.status === 'attention').length,
      off: searchedConnectors.filter((c) => c.status === 'off').length,
    }),
    [searchedConnectors],
  )
  const visibleConnectors = searchedConnectors.filter((c) => {
    if (connectorFilter === 'all') return true
    if (connectorFilter === 'pending') return c.status === 'setup' || c.status === 'attention'
    return c.status === connectorFilter
  })

  const reviewCount = flows.filter((f) => f.status === 'review').length
  const runningCount = flows.filter((f) => f.status === 'running').length
  const errorCount = flows.filter((f) => f.status === 'error').length
  const activeConnectors = connectors.filter((c) => c.status === 'active')
  const avgAdoption = activeConnectors.length ? Math.round(activeConnectors.reduce((s, c) => s + c.adoption, 0) / activeConnectors.length) : 0
  const unread = notices.filter((n) => !n.read).length
  const selected = flows.find((f) => f.id === selectedId) ?? null
  const available = (Object.keys(DEPTS) as DeptId[]).filter((id) => !connectors.some((c) => c.id === id))

  const scoreAnim = useCountUp(TRANSITION_SCORE, 900)
  const hoursAnim = useCountUp(kpi.hours)
  const adoptionAnim = useCountUp(ADOPTION_RATE, 900)
  const etp = kpi.hours / ((35 * periodMeta.days) / 7)

  const totalExec = EXECUTIONS_24H.reduce((s, v) => s + v, 0)
  const maxExec = Math.max(...EXECUTIONS_24H)
  const peakHour = EXECUTIONS_24H.indexOf(maxExec)

  // ── Actions : flux ──
  const patchFlow = (id: string, patch: Partial<Flow>) => setFlows((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const connectorFor = (dept: DeptId) => connectors.find((c) => c.id === dept)
  const canRun = (dept: DeptId) => connectorFor(dept)?.status === 'active'

  const togglePause = (flow: Flow) => {
    if (flow.status === 'running') {
      patchFlow(flow.id, { status: 'paused' })
      pushToast(`« ${flow.name} » a été mis en pause.`, 'stone')
    } else if (flow.status === 'paused') {
      if (!canRun(flow.dept)) {
        pushToast(`Reconnectez d’abord le métier « ${DEPTS[flow.dept].name} ».`, 'amber')
        return
      }
      patchFlow(flow.id, { status: 'running', lastRun: 'à l’instant' })
      pushToast(`« ${flow.name} » a repris.`, 'brand')
    }
  }

  const validateFlow = (flow: Flow) => {
    patchFlow(flow.id, { status: 'done', progress: 100 })
    setNotices((list) => list.map((n) => (n.title.includes(flow.name) ? { ...n, read: true } : n)))
    pushToast(`Résultats de « ${flow.name} » validés et diffusés.`, 'green')
  }

  const retryFlow = (flow: Flow) => {
    if (!canRun(flow.dept)) {
      pushToast(`Reconnectez d’abord le métier « ${DEPTS[flow.dept].name} » pour relancer ce flux.`, 'amber')
      return
    }
    patchFlow(flow.id, { status: 'running', progress: 0, error: undefined, lastRun: 'à l’instant' })
    pushToast(`« ${flow.name} » a été relancé.`, 'brand')
  }

  // ── Actions : métiers connectés ──
  const patchConnector = (id: DeptId, patch: Partial<Connector>) => setConnectors((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const connect = (id: DeptId) => {
    patchConnector(id, { status: 'setup', note: undefined })
    pushToast(`Connexion du métier « ${DEPTS[id].name} » en cours…`, 'brand')
    later(() => {
      patchConnector(id, { status: 'active' })
      pushToast(`« ${DEPTS[id].name} » est connecté et opérationnel.`, 'green')
    }, 1600)
  }

  const disconnect = (id: DeptId) => {
    patchConnector(id, { status: 'off', note: undefined })
    setFlows((list) => list.map((f) => (f.dept === id && f.status === 'running' ? { ...f, status: 'paused' } : f)))
    pushToast(`« ${DEPTS[id].name} » déconnecté — ses flux en cours sont mis en pause.`, 'stone')
  }

  const finishSetup = (id: DeptId) => {
    patchConnector(id, { status: 'active' })
    pushToast(`Configuration de « ${DEPTS[id].name} » terminée.`, 'green')
  }

  const configure = (id: DeptId) => pushToast(`Réglages de « ${DEPTS[id].name} » : bientôt disponibles dans cette démo.`, 'stone')

  const addConnector = () => {
    if (!addChoice) return
    const id = addChoice
    setConnectors((list) => [...list, { id, status: 'setup', flows: 0, adoption: 0 }])
    setConnectorFilter('all')
    setAddOpen(false)
    setAddChoice(null)
    pushToast(`Connexion du métier « ${DEPTS[id].name} » en cours…`, 'brand')
    later(() => {
      patchConnector(id, { status: 'active' })
      pushToast(`« ${DEPTS[id].name} » est connecté et opérationnel.`, 'green')
    }, 1800)
  }

  // ── Navigation & divers ──
  const navigate = (item: NavItem) => {
    setActiveNav(item.id)
    setMobileNav(false)
    if (item.target) {
      document.getElementById(`bw-${item.target}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    } else {
      pushToast(`Le module « ${item.label} » arrive bientôt dans cette démo.`, 'stone')
    }
  }

  const showReview = () => {
    setFlowFilter('review')
    setActiveNav('flows')
    document.getElementById('bw-flows')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  const exportCsv = () => {
    const header = ['Flux', 'Métier', 'Responsable', 'Statut', 'Avancement (%)', 'Gain hebdomadaire (h)', 'Exécutions']
    const rows = flows.map((f) => [f.name, DEPTS[f.dept].name, f.owner, FLOW_STATUS[f.status].label, String(f.progress), String(f.weeklyHours), String(f.runs)])
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `blumi-vue-ensemble-${period}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    later(() => URL.revokeObjectURL(url), 1000)
    pushToast('Export CSV téléchargé.', 'green')
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Pilotage',
      items: [
        { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard, target: 'overview' },
        { id: 'flows', label: 'Flux IA', icon: Workflow, target: 'flows', badge: reviewCount },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, target: 'kpis' },
      ],
    },
    {
      title: 'Outils connectés',
      items: [
        { id: 'metiers', label: 'Métiers connectés', icon: Briefcase, target: 'metiers' },
        { id: 'integrations', label: 'Intégrations', icon: Plug },
        { id: 'library', label: 'Bibliothèque de modèles', icon: LibraryBig },
      ],
    },
    {
      title: 'Équipes',
      items: [
        { id: 'adoption', label: 'Adoption & formation', icon: GraduationCap, target: 'kpis' },
        { id: 'members', label: 'Membres', icon: Users },
      ],
    },
  ]
  const navFooter: NavItem[] = [
    { id: 'settings', label: 'Paramètres', icon: Settings },
    { id: 'help', label: 'Aide & support', icon: LifeBuoy },
  ]

  const sidebarProps = {
    groups: navGroups,
    footer: navFooter,
    active: activeNav,
    onNavigate: navigate,
    onWorkspace: () => pushToast('Un seul espace de travail est disponible dans cette démo.', 'stone'),
    onRoadmap: () => pushToast('Prochaine étape : former les équipes Juridique et Commercial.', 'brand'),
  }

  const flowTone = (s: FlowStatus): Tone => FLOW_STATUS[s].tone

  // ─── Rendu ───
  return (
    <div className={cn(theme === 'dark' && 'dark')} style={{ colorScheme: theme }}>
      <style>{WORKSPACE_CSS}</style>
      <div
        className="flex min-h-screen bg-stone-50 font-inter text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100"
        style={{ fontFeatureSettings: '"cv11", "ss01"' }}
      >
        <a
          href="#bw-main"
          className="sr-only rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90]"
        >
          Aller au contenu
        </a>

        {/* Navigation latérale (bureau) */}
        <aside
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 border-r border-stone-200/80 bg-stone-50 transition-[width] duration-200 dark:border-stone-800 dark:bg-stone-950 lg:block',
            collapsed ? 'w-[76px]' : 'w-64',
          )}
        >
          <SidebarContent {...sidebarProps} collapsed={collapsed} />
        </aside>

        {/* Navigation latérale (mobile) */}
        {mobileNav && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="bw-fade absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} aria-hidden />
            <div
              ref={drawerRef}
              tabIndex={-1}
              className="bw-drawer absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-stone-200 bg-stone-50 shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-950"
            >
              <SidebarContent {...sidebarProps} collapsed={false} onClose={() => setMobileNav(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En-tête */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-stone-200/80 bg-stone-50/85 px-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/85 sm:gap-3 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Ouvrir la navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            </Button>

            <form role="search" className="relative min-w-0 max-w-xl flex-1" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="bw-search" className="sr-only">
                Rechercher un flux, un métier ou un outil
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
              <input
                ref={searchRef}
                id="bw-search"
                type="text"
                role="searchbox"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setQuery('')
                }}
                placeholder="Rechercher un flux, un métier, un outil…"
                className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-16 text-sm text-stone-900 shadow-sm transition placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                    aria-label="Effacer la recherche"
                    className={cn('rounded-md p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200', FOCUS)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Kbd className="hidden sm:inline-flex">{isMac ? '⌘ K' : 'Ctrl K'}</Kbd>
                )}
              </div>
            </form>

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
              >
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>

              <Dropdown
                open={notifOpen}
                onOpenChange={setNotifOpen}
                widthClass="w-[22rem] max-w-[calc(100vw-2rem)]"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => {
                      setNotifOpen((o) => !o)
                      setProfileOpen(false)
                    }}
                    aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
                    aria-haspopup="menu"
                    aria-expanded={notifOpen}
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {unread > 0 && (
                      <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-stone-50 dark:ring-stone-950">
                        {unread}
                      </span>
                    )}
                  </Button>
                }
              >
                <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button
                    type="button"
                    onClick={() => setNotices((list) => list.map((n) => ({ ...n, read: true })))}
                    disabled={!unread}
                    className={cn('rounded text-xs font-medium text-brand-700 hover:text-brand-800 disabled:text-stone-400 dark:text-brand-400 dark:disabled:text-stone-600', FOCUS)}
                  >
                    Tout marquer comme lu
                  </button>
                </div>
                <ul className="max-h-80 overflow-y-auto p-1.5">
                  {notices.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800',
                          FOCUS,
                          !n.read && 'bg-brand-50/60 dark:bg-brand-500/5',
                        )}
                      >
                        <ToneIcon tone={n.tone} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-sm', n.read ? 'text-stone-600 dark:text-stone-400' : 'font-medium text-stone-900 dark:text-stone-100')}>
                            {n.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500">{n.time}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Non lue" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </Dropdown>

              <span className="mx-1 hidden h-6 w-px bg-stone-200 dark:bg-stone-800 sm:block" aria-hidden />

              <Dropdown
                open={profileOpen}
                onOpenChange={setProfileOpen}
                widthClass="w-64"
                trigger={
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((o) => !o)
                      setNotifOpen(false)
                    }}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-label="Menu du profil : Camille Durand"
                    className={cn('flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 sm:pr-2', FOCUS)}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-100 to-orange-200 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 dark:from-amber-500/30 dark:to-orange-500/30 dark:text-amber-100 dark:ring-amber-500/30">
                      CD
                    </span>
                    <span className="hidden text-left md:block">
                      <span className="block text-sm font-medium leading-tight text-stone-900 dark:text-stone-100">Camille Durand</span>
                      <span className="block text-xs leading-tight text-stone-500 dark:text-stone-400">Resp. transformation</span>
                    </span>
                  </button>
                }
              >
                <div className="border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
                  <p className="text-sm font-semibold">Camille Durand</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Responsable transformation · Groupe Horizon</p>
                  <Badge tone="brand" className="mt-2">
                    Plan Entreprise
                  </Badge>
                </div>
                <div className="p-1.5">
                  <MenuItem icon={UserRound} onClick={() => { setProfileOpen(false); pushToast('Profil : bientôt disponible dans cette démo.') }}>
                    Mon profil
                  </MenuItem>
                  <MenuItem icon={CreditCard} onClick={() => { setProfileOpen(false); pushToast('Facturation : bientôt disponible dans cette démo.') }}>
                    Facturation & plan
                  </MenuItem>
                  <MenuItem icon={Settings} onClick={() => { setProfileOpen(false); pushToast('Préférences : bientôt disponibles dans cette démo.') }}>
                    Préférences
                  </MenuItem>
                </div>
                <div className="border-t border-stone-200/80 p-1.5 dark:border-stone-800">
                  {onBack && (
                    <MenuItem icon={ArrowLeft} onClick={() => { setProfileOpen(false); onBack() }}>
                      Retour au site Blumi
                    </MenuItem>
                  )}
                  <MenuItem icon={LogOut} tone="danger" onClick={() => { setProfileOpen(false); pushToast('Déconnexion simulée — aucune session réelle dans cette démo.') }}>
                    Se déconnecter
                  </MenuItem>
                </div>
              </Dropdown>
            </div>
          </header>

          <main id="bw-main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Titre de page */}
            <section id="bw-overview" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-stone-500 dark:text-stone-400">{todayLabel()}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-[28px]">Vue d’ensemble</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  Bonjour Camille. Voici où en est la transition IA de Groupe Horizon.{' '}
                  {reviewCount > 0 ? (
                    <>
                      <strong className="font-medium text-stone-900 dark:text-stone-100">
                        {reviewCount} {reviewCount > 1 ? 'résultats attendent' : 'résultat attend'} votre validation.
                      </strong>{' '}
                      <button
                        type="button"
                        onClick={showReview}
                        className={cn('rounded font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-400', FOCUS)}
                      >
                        Les voir
                      </button>
                    </>
                  ) : (
                    'Rien n’attend votre validation pour le moment.'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  label="Période"
                  value={period}
                  onChange={setPeriod}
                  options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
                />
                <Button variant="secondary" onClick={exportCsv}>
                  <Download className="h-4 w-4" aria-hidden />
                  Exporter
                </Button>
              </div>
            </section>

            {query.trim() && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/70 px-3.5 py-2.5 text-sm text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-brand-200">
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Résultats pour « <strong className="font-semibold">{query.trim()}</strong> » : {searchedFlows.length} flux · {searchedConnectors.length} métier
                  {searchedConnectors.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className={cn('ml-auto rounded text-xs font-medium underline-offset-4 hover:underline', FOCUS)}
                >
                  Effacer la recherche
                </button>
              </div>
            )}

            {/* Indicateurs clés */}
            <section id="bw-kpis" aria-label="Indicateurs clés" className="mt-6 grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                icon={Gauge}
                title="Indicateur de transition IA"
                info="Score de maturité de 0 à 100 : part des processus automatisés, usage réel par les équipes et compétences acquises. Il se met à jour chaque semaine."
              >
                <div className="mt-5 flex items-center gap-5">
                  <div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center">
                    <Ring value={scoreAnim} />
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <span className="block text-2xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">{Math.round(scoreAnim)}</span>
                        <span className="block text-[11px] text-stone-500 dark:text-stone-400">sur 100</span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Badge tone="brand">Phase 3 · {STAGES[CURRENT_STAGE]}</Badge>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Delta value={kpi.transitionDelta} unit=" pts" />
                      <span className="text-xs text-stone-500 dark:text-stone-400">sur {periodMeta.label}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">Processus automatisés, usages et compétences des équipes.</p>
                  </div>
                </div>
                <ol className="mt-auto grid grid-cols-4 gap-1.5 pt-5" aria-label="Étapes de la transition">
                  {STAGES.map((stage, i) => (
                    <li key={stage} aria-current={i === CURRENT_STAGE ? 'step' : undefined}>
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          i < CURRENT_STAGE ? 'bg-brand-500' : i === CURRENT_STAGE ? 'bg-brand-300 dark:bg-brand-500/50' : 'bg-stone-200 dark:bg-stone-800',
                        )}
                      />
                      <span
                        className={cn(
                          'mt-1.5 block truncate text-[11px]',
                          i === CURRENT_STAGE ? 'font-medium text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400',
                        )}
                      >
                        {stage}
                      </span>
                    </li>
                  ))}
                </ol>
              </KpiCard>

              <KpiCard
                icon={Timer}
                title="Temps humain optimisé"
                info="Heures de travail répétitif prises en charge par les flux IA sur la période, après validation humaine. Converti en équivalents temps plein (35 h / semaine)."
              >
                <div className="mt-5">
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
                    {nf.format(Math.round(hoursAnim))}
                    <span className="ml-1 text-lg font-medium text-stone-400">h</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Delta value={kpi.hoursDelta} unit=" %" />
                    <span className="text-xs text-stone-500 dark:text-stone-400">vs les {periodMeta.label} précédents</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    ≈ <strong className="font-medium text-stone-800 dark:text-stone-200">{nf1.format(etp)} ETP</strong> réalloués à des tâches à plus forte valeur.
                  </p>
                </div>
                <div className="mt-auto pt-4">
                  <Sparkline data={kpi.hoursSeries} label={`${periodMeta.caption}, tendance sur ${periodMeta.label}`} className="h-12 w-full text-brand-500" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-stone-400 dark:text-stone-500">
                    <span>{periodMeta.from}</span>
                    <span>{periodMeta.caption}</span>
                    <span>Aujourd’hui</span>
                  </div>
                </div>
              </KpiCard>

              <KpiCard
                icon={Users}
                title="Taux d’adoption par les équipes"
                info="Part des collaborateurs ayant utilisé au moins un flux IA dans la semaine. Les équipes sous 60 % sont signalées pour un accompagnement."
                className="md:col-span-2 xl:col-span-1"
              >
                <div className="mt-5">
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
                    {Math.round(adoptionAnim)}
                    <span className="ml-0.5 text-lg font-medium text-stone-400">%</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Delta value={kpi.adoptionDelta} unit=" pts" />
                    <span className="text-xs text-stone-500 dark:text-stone-400">des collaborateurs actifs chaque semaine</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {TEAM_ADOPTION.map((team) => {
                    const low = team.value < 60
                    return (
                      <li key={team.dept}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-stone-600 dark:text-stone-300">{DEPTS[team.dept].name}</span>
                          <span className="flex shrink-0 items-center gap-2 font-medium tabular-nums text-stone-900 dark:text-stone-100">
                            {low && <span className="font-normal text-amber-700 dark:text-amber-400">À accompagner</span>}
                            {team.value} %
                          </span>
                        </div>
                        <Progress value={team.value} tone={low ? 'amber' : 'brand'} className="mt-1.5" label={`Adoption ${DEPTS[team.dept].name}`} />
                      </li>
                    )
                  })}
                </ul>
              </KpiCard>
            </section>

            {/* Section centrale : flux IA + métiers connectés */}
            <div className="mt-6 grid gap-6 2xl:grid-cols-12">
              {/* Activité des flux IA */}
              <Card id="bw-flows" className="scroll-mt-24 overflow-hidden 2xl:col-span-7" aria-labelledby="bw-flows-title" role="region">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 id="bw-flows-title" className="text-base font-semibold text-stone-900 dark:text-stone-50">
                        Activité des flux IA
                      </h2>
                      <Badge tone="green" dot pulse>
                        En direct
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                      {runningCount} en cours · {reviewCount} à valider · {errorCount} en erreur
                    </p>
                  </div>
                  <Segmented
                    label="Filtrer les flux"
                    value={flowFilter}
                    onChange={setFlowFilter}
                    options={[
                      { value: 'all', label: 'Tous', count: flowCounts.all },
                      { value: 'running', label: 'En cours', count: flowCounts.running },
                      { value: 'review', label: 'À valider', count: flowCounts.review },
                      { value: 'error', label: 'Erreurs', count: flowCounts.error },
                    ]}
                  />
                </div>

                <div className="border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Exécutions par heure · 24 h glissantes</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">{nf.format(totalExec)}</span> exécutions · pic à {peakHour} h
                    </p>
                  </div>
                  <div className="mt-3 flex h-14 items-end gap-[3px]" role="img" aria-label={`${totalExec} exécutions sur 24 heures, pic à ${peakHour} heures avec ${maxExec} exécutions`}>
                    {EXECUTIONS_24H.map((v, hour) => (
                      <div key={hour} className="flex h-full flex-1 items-end" title={`${String(hour).padStart(2, '0')} h : ${v} exécutions`}>
                        <div
                          className={cn(
                            'w-full rounded-[3px] transition-colors',
                            hour === peakHour ? 'bg-brand-500' : 'bg-brand-200 hover:bg-brand-400 dark:bg-brand-500/30 dark:hover:bg-brand-400/70',
                          )}
                          style={{ height: `${Math.max(6, (v / maxExec) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
                    <span>00 h</span>
                    <span>06 h</span>
                    <span>12 h</span>
                    <span>18 h</span>
                    <span>23 h</span>
                  </div>
                </div>

                {visibleFlows.length === 0 ? (
                  <EmptyState
                    title="Aucun flux ne correspond"
                    text="Modifiez la recherche ou le filtre pour retrouver vos flux."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFlowFilter('all')
                          setQuery('')
                        }}
                      >
                        Réinitialiser les filtres
                      </Button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200/80 text-left text-xs font-medium text-stone-500 dark:border-stone-800 dark:text-stone-400">
                          <th scope="col" className="px-5 py-2.5 font-medium">
                            Flux
                          </th>
                          <th scope="col" className="w-px whitespace-nowrap px-3 py-2.5 font-medium">
                            Statut
                          </th>
                          <th scope="col" className="hidden w-44 px-3 py-2.5 font-medium sm:table-cell">
                            Avancement
                          </th>
                          <th scope="col" className="hidden w-px whitespace-nowrap px-3 py-2.5 text-right font-medium md:table-cell">
                            Gain / sem.
                          </th>
                          <th scope="col" className="w-px px-5 py-2.5 text-right font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {visibleFlows.map((flow) => {
                          const status = FLOW_STATUS[flow.status]
                          return (
                            <tr
                              key={flow.id}
                              onClick={() => setSelectedId(flow.id)}
                              className="cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40"
                            >
                              <td className="max-w-0 px-5 py-3.5">
                                <div className="flex min-w-0 items-center gap-3">
                                  <DeptIcon dept={flow.dept} size="sm" />
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedId(flow.id)
                                      }}
                                      className={cn('block max-w-full truncate rounded text-left font-medium text-stone-900 hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-300', FOCUS)}
                                    >
                                      {flow.name}
                                    </button>
                                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                                      {DEPTS[flow.dept].name} · {flow.owner} · {flow.lastRun}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3.5">
                                <Badge tone={status.tone} dot pulse={flow.status === 'running'}>
                                  {status.label}
                                </Badge>
                              </td>
                              <td className="hidden px-3 py-3.5 sm:table-cell">
                                <div className="flex items-center gap-2.5">
                                  <Progress value={flow.progress} tone={flowTone(flow.status)} label={`Avancement de ${flow.name}`} />
                                  <span className="w-11 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-stone-500 dark:text-stone-400">{flow.progress} %</span>
                                </div>
                              </td>
                              <td className="hidden whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-stone-700 dark:text-stone-300 md:table-cell">
                                {flow.weeklyHours} h
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                {flow.status === 'running' && (
                                  <Button variant="ghost" size="icon-sm" onClick={() => togglePause(flow)} aria-label={`Mettre en pause ${flow.name}`} title="Mettre en pause">
                                    <Pause className="h-4 w-4" />
                                  </Button>
                                )}
                                {flow.status === 'paused' && (
                                  <Button variant="ghost" size="icon-sm" onClick={() => togglePause(flow)} aria-label={`Reprendre ${flow.name}`} title="Reprendre">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                                {flow.status === 'review' && (
                                  <Button variant="primary" size="sm" onClick={() => validateFlow(flow)} aria-label={`Valider ${flow.name}`}>
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                    Valider
                                  </Button>
                                )}
                                {flow.status === 'error' && (
                                  <Button variant="secondary" size="sm" onClick={() => retryFlow(flow)} aria-label={`Relancer ${flow.name}`}>
                                    <RotateCw className="h-3.5 w-3.5" aria-hidden />
                                    Relancer
                                  </Button>
                                )}
                                {flow.status === 'done' && (
                                  <Button variant="ghost" size="sm" onClick={() => setSelectedId(flow.id)} aria-label={`Voir le détail de ${flow.name}`}>
                                    Détails
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-stone-200/80 bg-stone-50/60 px-5 py-3 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-950/30 dark:text-stone-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Les flux sensibles passent toujours par une validation humaine avant diffusion.
                </div>
              </Card>

              {/* Métiers connectés */}
              <Card id="bw-metiers" className="scroll-mt-24 2xl:col-span-5" aria-labelledby="bw-metiers-title" role="region">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
                  <div>
                    <h2 id="bw-metiers-title" className="text-base font-semibold text-stone-900 dark:text-stone-50">
                      Métiers connectés
                    </h2>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                      {activeConnectors.length} actifs sur {connectors.length} · adoption moyenne {avgAdoption} %
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setAddChoice(available[0] ?? null)
                      setAddOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter un métier
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                  <Segmented
                    label="Filtrer les métiers"
                    value={connectorFilter}
                    onChange={setConnectorFilter}
                    options={[
                      { value: 'all', label: 'Tous', count: connectorCounts.all },
                      { value: 'active', label: 'Actifs', count: connectorCounts.active },
                      { value: 'pending', label: 'À traiter', count: connectorCounts.pending },
                      { value: 'off', label: 'Déconnectés', count: connectorCounts.off },
                    ]}
                  />
                  <div className="inline-flex items-center gap-0.5 rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800/70" role="group" aria-label="Affichage">
                    {(
                      [
                        { value: 'grid', icon: LayoutGrid, label: 'Affichage en grille' },
                        { value: 'list', icon: List, label: 'Affichage en liste' },
                      ] as const
                    ).map((option) => {
                      const active = connectorView === option.value
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setConnectorView(option.value)}
                          aria-pressed={active}
                          aria-label={option.label}
                          title={option.label}
                          className={cn(
                            'grid h-7 w-7 place-items-center rounded-md transition-all',
                            FOCUS,
                            active ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-100' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="p-5">
                  {visibleConnectors.length === 0 ? (
                    <EmptyState
                      title="Aucun métier à afficher"
                      text="Aucun métier ne correspond à ce filtre ou à votre recherche."
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setConnectorFilter('all')
                            setQuery('')
                          }}
                        >
                          Réinitialiser les filtres
                        </Button>
                      }
                    />
                  ) : connectorView === 'grid' ? (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-2">
                      {visibleConnectors.map((c) => (
                        <ConnectorCard
                          key={c.id}
                          connector={c}
                          onToggle={(on) => (on ? connect(c.id) : disconnect(c.id))}
                          onConnect={() => connect(c.id)}
                          onFinish={() => finishSetup(c.id)}
                          onConfigure={() => configure(c.id)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <ul className="-my-3.5 divide-y divide-stone-100 dark:divide-stone-800">
                      {visibleConnectors.map((c) => (
                        <ConnectorRow
                          key={c.id}
                          connector={c}
                          onToggle={(on) => (on ? connect(c.id) : disconnect(c.id))}
                          onConnect={() => connect(c.id)}
                          onFinish={() => finishSetup(c.id)}
                          onConfigure={() => configure(c.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>

            <p className="mt-8 text-center text-xs text-stone-400 dark:text-stone-500">
              Données de démonstration · Blumi Entreprise accompagne vos métiers dans leur transition vers l’IA.
            </p>
          </main>
        </div>

        {/* Détail d'un flux */}
        <Sheet
          open={!!selected}
          onClose={() => setSelectedId(null)}
          title="Détail du flux"
          footer={
            selected && (
              <>
                <Button variant="secondary" onClick={() => setSelectedId(null)}>
                  Fermer
                </Button>
                {(selected.status === 'running' || selected.status === 'paused') && (
                  <Button variant="secondary" onClick={() => togglePause(selected)}>
                    {selected.status === 'running' ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                    {selected.status === 'running' ? 'Mettre en pause' : 'Reprendre'}
                  </Button>
                )}
                {selected.status === 'review' && (
                  <Button variant="primary" onClick={() => validateFlow(selected)} data-autofocus>
                    <Check className="h-4 w-4" aria-hidden />
                    Valider et diffuser
                  </Button>
                )}
                {selected.status === 'error' && (
                  <Button variant="primary" onClick={() => retryFlow(selected)}>
                    <RotateCw className="h-4 w-4" aria-hidden />
                    Relancer le flux
                  </Button>
                )}
              </>
            )
          }
        >
          {selected && (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="stone">{DEPTS[selected.dept].name}</Badge>
                <Badge tone={FLOW_STATUS[selected.status].tone} dot pulse={selected.status === 'running'}>
                  {FLOW_STATUS[selected.status].label}
                </Badge>
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-stone-900 dark:text-stone-50">{selected.name}</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Responsable : {selected.owner} · dernière activité {selected.lastRun}
              </p>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600 dark:text-stone-300">Avancement</span>
                  <span className="font-semibold tabular-nums">{selected.progress} %</span>
                </div>
                <Progress value={selected.progress} tone={flowTone(selected.status)} className="mt-2 h-2" label={`Avancement de ${selected.name}`} />
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Gain / sem.', value: `${selected.weeklyHours} h` },
                  { label: 'Exécutions', value: nf.format(selected.runs) },
                  { label: 'Contrôle humain', value: selected.humanCheck ? 'Oui' : 'Non' },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-stone-200/80 px-3 py-2.5 dark:border-stone-800">
                    <dt className="text-[11px] text-stone-500 dark:text-stone-400">{m.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">{m.value}</dd>
                  </div>
                ))}
              </dl>

              {selected.status === 'error' && selected.error && (
                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {selected.error}
                  </p>
                  {!canRun(selected.dept) && (
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => connect(selected.dept)}>
                      <RotateCw className="h-3.5 w-3.5" aria-hidden />
                      Reconnecter {DEPTS[selected.dept].name}
                    </Button>
                  )}
                </div>
              )}
              {selected.status === 'review' && (
                <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Les résultats sont prêts. Vérifiez-les avant leur diffusion aux équipes.
                </div>
              )}

              <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Étapes</h4>
              <ol className="mt-3">
                {flowSteps(selected).map((step, i, all) => (
                  <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < all.length - 1 && <span className="absolute left-[9.5px] top-6 h-[calc(100%-1.25rem)] w-px bg-stone-200 dark:bg-stone-800" aria-hidden />}
                    <span className="relative grid h-5 w-5 place-items-center bg-white dark:bg-stone-900">
                      <StepIcon state={step.state} />
                    </span>
                    <span className={cn('text-sm', step.state === 'todo' ? 'text-stone-500 dark:text-stone-400' : 'text-stone-900 dark:text-stone-100')}>
                      {step.label}
                      <span className="sr-only"> — {STEP_STATE_LABEL[step.state]}</span>
                      {step.state === 'waiting' && <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">en attente de vous</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Sheet>

        {/* Ajouter un métier */}
        <Dialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title="Ajouter un métier"
          description="Connectez un nouveau métier pour automatiser ses tâches répétitives. La configuration prend quelques secondes."
          footer={
            <>
              <Button variant="secondary" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={addConnector} disabled={!addChoice}>
                <Plug className="h-4 w-4" aria-hidden />
                Connecter
              </Button>
            </>
          }
        >
          {available.length === 0 ? (
            <p className="text-sm text-stone-600 dark:text-stone-300">Tous les métiers disponibles sont déjà connectés.</p>
          ) : (
            <fieldset>
              <legend className="sr-only">Métier à connecter</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {available.map((id) => {
                  const dept = DEPTS[id]
                  const checked = addChoice === id
                  return (
                    <label
                      key={id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition',
                        checked
                          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-500/10 dark:ring-brand-400'
                          : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700',
                      )}
                    >
                      <input
                        type="radio"
                        name="bw-add-dept"
                        value={id}
                        checked={checked}
                        onChange={() => setAddChoice(id)}
                        className="sr-only"
                        data-autofocus={checked ? true : undefined}
                      />
                      <DeptIcon dept={id} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">{dept.name}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{dept.description}</span>
                      </span>
                      {checked && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
        </Dialog>

        {/* Notifications éphémères */}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="bw-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-stone-800 dark:bg-stone-900"
            >
              <ToneIcon tone={t.tone} className="mt-0.5" />
              <p className="flex-1 text-stone-800 dark:text-stone-100">{t.title}</p>
              <button
                type="button"
                onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
                aria-label="Fermer la notification"
                className={cn('rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200', FOCUS)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
