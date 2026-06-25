import { ReactNode, useEffect, useRef, useState } from 'react'
import { CareerProfile, completeness, loadProfile, saveProfile, luminatorFields, luminatorFilledLabels } from '../lib/profile'
import { BilanRecord, clearHistory, loadHistory } from '../lib/history'
import { describeError, extractProfileFromCV } from '../lib/llm'
import { clearAllLocalData } from '../lib/privacy'
import { Logo } from './Logo'
import { useCountUp } from '../lib/ui'
import { brandName } from '../lib/entitlement'
import { t, useLang, getLang } from '../lib/i18n'

function riskColor(r: number): string {
  if (r < 30) return '#10b981'
  if (r < 55) return '#f59e0b'
  if (r < 75) return '#f97316'
  return '#ef4444'
}

// Les options des <Select> sont STOCKÉES en français (le moteur engine.ts les
// matche exactement) ; on n'en traduit que l'AFFICHAGE via cette table.
const OPTION_LABELS: Record<string, string> = {
  "Moins d'1 an": 'opt.exp.lt1', '1–3 ans': 'opt.exp.1_3', '3–7 ans': 'opt.exp.3_7', '7–15 ans': 'opt.exp.7_15', 'Plus de 15 ans': 'opt.exp.gt15',
  'Débutant·e': 'opt.lvl.beg', 'Confirmé·e': 'opt.lvl.conf', 'Senior': 'opt.lvl.senior', 'Manager / Direction': 'opt.lvl.mgr',
  'Salarié·e': 'opt.st.employee', 'Indépendant·e': 'opt.st.freelance', 'En recherche': 'opt.st.searching', 'Étudiant·e': 'opt.st.student', 'En reconversion': 'opt.st.reconv',
  'Sans diplôme / CAP / BEP': 'opt.edu.none', 'Bac': 'opt.edu.bac', 'Bac+2 / Bac+3': 'opt.edu.bac23', 'Bac+5 (Master)': 'opt.edu.bac5', 'Doctorat / Grande école': 'opt.edu.phd',
  'Établissement très sélectif (top)': 'opt.school.top', 'Établissement reconnu': 'opt.school.known', 'Établissement standard': 'opt.school.standard', 'Formation courte / autodidacte': 'opt.school.short',
  'Avancée — au quotidien': 'opt.ai.adv', 'Intermédiaire': 'opt.ai.inter', 'Débutante': 'opt.ai.beg', 'Aucune': 'opt.ai.none',
  'Évoluer dans mon métier': 'opt.goal.evolve', 'Me reconvertir': 'opt.goal.reconv', 'Sécuriser mon poste': 'opt.goal.secure', 'Entreprendre': 'opt.goal.entrepr',
  'Curieux·se / enthousiaste': 'opt.app.pos', 'Neutre': 'opt.app.neutral', 'Plutôt réticent·e': 'opt.app.neg',
}
function optLabel(v: string): string {
  const k = OPTION_LABELS[v]
  return k ? t(k) : v
}

interface Props {
  onBack: () => void
  onAnalyze: (role: string) => void
  aiEnabled: boolean
  onOpenSettings: () => void
}

export function ProfileScreen({ onBack, onAnalyze, aiEnabled, onOpenSettings }: Props) {
  useLang() // re-render au changement de langue
  const [profile, setProfile] = useState<CareerProfile>(() => loadProfile())
  const [history, setHistory] = useState<BilanRecord[]>(() => loadHistory())

  // Fusionne les champs extraits d'un CV (uniquement les valeurs non vides).
  const mergeExtracted = (extracted: Partial<CareerProfile>) => {
    setProfile((p) => {
      const merged = { ...p }
      for (const key of Object.keys(extracted) as (keyof CareerProfile)[]) {
        const v = extracted[key]
        if (v == null) continue
        if (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0) {
          ;(merged as Record<string, unknown>)[key] = v
        }
      }
      return merged
    })
  }

  // Sauvegarde automatique à chaque modification.
  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  const pct = completeness(profile)
  const animated = useCountUp(pct, 800)
  const set = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }))

  // Champs renseignés par Luminator pendant le chat (provenance).
  const [lumiFields] = useState(() => luminatorFields())
  const byLumi = (key: keyof CareerProfile) => {
    if (!lumiFields.has(key)) return false
    const v = profile[key]
    return Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0
  }
  const lumiLabels = luminatorFilledLabels(profile)

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('prof.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{t('prof.title')}</h1>
          <p className="mt-1 text-ink-500">
            {t('prof.intro')}
          </p>

          {/* Jauge de complétude */}
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-700">{t('prof.completed')}</span>
              <span className="font-display text-lg font-extrabold text-brand-700">{Math.round(animated)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              {pct < 40 ? t('prof.gaugeLow') : pct < 80 ? t('prof.gaugeMid') : t('prof.gaugeHigh')}
            </p>
          </div>

          {/* Ce que le copilote a complété pendant vos échanges */}
          {lumiLabels.length > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">🤓</span>
              <div className="text-sm">
                <p className="font-semibold text-brand-800">
                  {t('prof.filledBy').replace('{name}', brandName())}
                </p>
                <p className="mt-0.5 text-ink-600">
                  {t('prof.filledByDesc').replace('{labels}', lumiLabels.join(', '))}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Import de CV */}
        <CVImport aiEnabled={aiEnabled} onOpenSettings={onOpenSettings} onExtracted={mergeExtracted} />

        {/* Historique des bilans (couche 4) */}
        <HistorySection history={history} onClear={() => { clearHistory(); setHistory([]) }} />

        {/* Couche 1 — base */}
        <Section title={t('prof.sec1')} emoji="🪪" delay={80}>
          <Field label={t('prof.f.role')} hint={t('prof.hint.required')} mark={byLumi('role')}>
            <input className="inp" value={profile.role} onChange={(e) => set('role', e.target.value)} placeholder={t('prof.ph.role')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('prof.f.sector')} mark={byLumi('sector')}>
              <input className="inp" value={profile.sector} onChange={(e) => set('sector', e.target.value)} placeholder={t('prof.ph.sector')} />
            </Field>
            <Field label={t('prof.f.location')} mark={byLumi('location')}>
              <input className="inp" value={profile.location} onChange={(e) => set('location', e.target.value)} placeholder={t('prof.ph.location')} />
            </Field>
            <Select label={t('prof.f.experience')} value={profile.experience} onChange={(v) => set('experience', v)} mark={byLumi('experience')}
              options={['Moins d\'1 an', '1–3 ans', '3–7 ans', '7–15 ans', 'Plus de 15 ans']} />
            <Select label={t('prof.f.level')} value={profile.level} onChange={(v) => set('level', v)} mark={byLumi('level')}
              options={['Débutant·e', 'Confirmé·e', 'Senior', 'Manager / Direction']} />
            <Select label={t('prof.f.status')} value={profile.status} onChange={(v) => set('status', v)} mark={byLumi('status')}
              options={['Salarié·e', 'Indépendant·e', 'En recherche', 'Étudiant·e', 'En reconversion']} />
            <Select label={t('prof.f.educationLevel')} value={profile.educationLevel} onChange={(v) => set('educationLevel', v)}
              options={['Sans diplôme / CAP / BEP', 'Bac', 'Bac+2 / Bac+3', 'Bac+5 (Master)', 'Doctorat / Grande école']} />
            <Select label={t('prof.f.schoolPrestige')} value={profile.schoolPrestige} onChange={(v) => set('schoolPrestige', v)}
              options={['Établissement très sélectif (top)', 'Établissement reconnu', 'Établissement standard', 'Formation courte / autodidacte']} />
          </div>
          <p className="mt-1 text-xs text-ink-400">{t('prof.eduNote')}</p>
        </Section>

        {/* Couche 2 — carburant de l'IA */}
        <Section title={t('prof.sec2')} emoji="⚙️" delay={140}>
          <TagField label={t('prof.f.tasks')} hint={t('prof.hint.mostImportant')} mark={byLumi('tasks')} value={profile.tasks} onChange={(v) => set('tasks', v)}
            placeholder={t('prof.ph.tasks')} />
          <TagField label={t('prof.f.hardSkills')} mark={byLumi('hardSkills')} value={profile.hardSkills} onChange={(v) => set('hardSkills', v)}
            placeholder={t('prof.ph.hardSkills')} />
          <TagField label={t('prof.f.softSkills')} mark={byLumi('softSkills')} value={profile.softSkills} onChange={(v) => set('softSkills', v)}
            placeholder={t('prof.ph.softSkills')} />
          <Field label={t('prof.f.education')} mark={byLumi('education')}>
            <textarea className="inp min-h-[64px]" value={profile.education} onChange={(e) => set('education', e.target.value)}
              placeholder={t('prof.ph.education')} />
          </Field>
          <TagField label={t('prof.f.pastRoles')} mark={byLumi('pastRoles')} value={profile.pastRoles} onChange={(v) => set('pastRoles', v)}
            placeholder={t('prof.ph.pastRoles')} />
          <Select label={t('prof.f.aiSkill')} value={profile.aiSkill} onChange={(v) => set('aiSkill', v)} mark={byLumi('aiSkill')}
            options={['Avancée — au quotidien', 'Intermédiaire', 'Débutante', 'Aucune']} />
        </Section>

        {/* Couche 3 — aspirations & contraintes */}
        <Section title={t('prof.sec3')} emoji="🧭" delay={200}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('prof.f.goal')} value={profile.goal} onChange={(v) => set('goal', v)} mark={byLumi('goal')}
              options={['Évoluer dans mon métier', 'Me reconvertir', 'Sécuriser mon poste', 'Entreprendre']} />
            <Select label={t('prof.f.aiAppetite')} value={profile.aiAppetite} onChange={(v) => set('aiAppetite', v)} mark={byLumi('aiAppetite')}
              options={['Curieux·se / enthousiaste', 'Neutre', 'Plutôt réticent·e']} />
          </div>
          <Field label={t('prof.f.constraints')} mark={byLumi('constraints')}>
            <textarea className="inp min-h-[64px]" value={profile.constraints} onChange={(e) => set('constraints', e.target.value)}
              placeholder={t('prof.ph.constraints')} />
          </Field>
        </Section>

        {/* Action */}
        <section className="animate-fade-up mt-8 flex flex-col items-center gap-3" style={{ animationDelay: '260ms' }}>
          <button
            onClick={() => profile.role.trim() && onAnalyze(profile.role.trim())}
            disabled={!profile.role.trim()}
            className="btn-primary"
          >
            {t('prof.cta')}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {!profile.role.trim() && <span className="text-xs text-ink-400">{t('prof.ctaHint')}</span>}
        </section>

        {/* Confidentialité — droit à l'effacement */}
        <section className="animate-fade-up mt-10" style={{ animationDelay: '300ms' }}>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5">
            <h2 className="font-display text-sm font-bold text-ink-900">{t('prof.data.title')}</h2>
            <p className="mt-1 text-sm text-ink-600">
              {t('prof.data.desc')}
            </p>
            <button
              onClick={async () => {
                if (window.confirm(t('prof.data.confirm'))) {
                  await clearAllLocalData()
                  window.location.href = window.location.pathname
                }
              }}
              className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-600 hover:text-white"
            >
              {t('prof.data.delete')}
            </button>
          </div>
        </section>
      </main>

      <style>{`.inp{width:100%;border:1px solid #d6dae9;border-radius:0.75rem;background:#fff;padding:0.6rem 0.85rem;font-size:0.9rem;color:#1c2033;outline:none;transition:all .15s}.inp:focus{border-color:#818cf8;box-shadow:0 0 0 3px #e0e7ff}.inp::placeholder{color:#8893b8}`}</style>
    </div>
  )
}

function CVImport({ aiEnabled, onOpenSettings, onExtracted }: { aiEnabled: boolean; onOpenSettings: () => void; onExtracted: (p: Partial<CareerProfile>) => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async (input: { pdfBase64?: string; text?: string }) => {
    setStatus('loading')
    setMessage('')
    try {
      const extracted = await extractProfileFromCV(input)
      onExtracted(extracted)
      const filled = Object.values(extracted).filter((v) => (Array.isArray(v) ? v.length : String(v).trim())).length
      setStatus('done')
      setMessage(t('prof.cv.filled').replace('{n}', String(filled)))
    } catch (e) {
      setStatus('error')
      setMessage(describeError(e))
    }
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setStatus('error')
      setMessage(t('prof.cv.tooBig'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const base64 = result.includes(',') ? result.split(',')[1] : result
      run({ pdfBase64: base64 })
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="animate-fade-up mt-6" style={{ animationDelay: '40ms' }}>
      <div className="card overflow-hidden bg-gradient-to-br from-ink-900 to-brand-900 p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl">📄</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">{t('prof.cv.title')}</h2>
            <p className="mt-1 text-sm text-white/60">
              {t('prof.cv.desc')}
              <span className="mt-1 block text-xs text-white/40">
                {t('prof.cv.privacy')}
              </span>
            </p>

            {!aiEnabled ? (
              <button onClick={onOpenSettings} className="btn-primary mt-4 py-2.5 text-sm">
                {t('prof.cv.connect')}
              </button>
            ) : status === 'loading' ? (
              <div className="mt-4 flex items-center gap-3 text-sm text-white/80">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('prof.cv.reading')}
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  <button onClick={() => fileRef.current?.click()} className="btn-primary py-2.5 text-sm">
                    {t('prof.cv.choosePdf')}
                  </button>
                  <button
                    onClick={() => setShowPaste((s) => !s)}
                    className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    {t('prof.cv.orPaste')}
                  </button>
                </div>

                {showPaste && (
                  <div className="mt-3">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('prof.cv.pastePlaceholder')}
                      className="min-h-[100px] w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                    />
                    <button
                      onClick={() => text.trim() && run({ text: text.trim() })}
                      disabled={!text.trim()}
                      className="btn-primary mt-2 py-2.5 text-sm disabled:opacity-40"
                    >
                      {t('prof.cv.analyzeText')}
                    </button>
                  </div>
                )}
              </>
            )}

            {message && (
              <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${status === 'error' ? 'bg-rose-500/20 text-rose-100' : 'bg-emerald-500/20 text-emerald-100'}`}>
                {status === 'error' ? '⚠️ ' : '✓ '}{message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', es: 'es-ES', zh: 'zh-CN' }

function HistorySection({ history, onClear }: { history: BilanRecord[]; onClear: () => void }) {
  const loc = LOCALES[getLang()] || 'en-US'
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: 'short' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })

  const first = history[0]
  const last = history[history.length - 1]
  const delta = first && last ? last.score - first.score : 0

  return (
    <section className="animate-fade-up mt-6" style={{ animationDelay: '60ms' }}>
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
              <span>📈</span> {t('prof.hist.title')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-400">{t('prof.hist.sub')}</p>
          </div>
          {history.length > 0 && (
            <button onClick={onClear} className="text-xs font-medium text-ink-400 hover:text-rose-600">
              {t('prof.hist.clear')}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="mt-3 rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            {t('prof.hist.empty')}
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink-500">{t('prof.hist.count').replace('{n}', String(history.length))}</span>
              {history.length > 1 && (
                <span className={`pill ${delta > 0 ? 'bg-rose-100 text-rose-700' : delta < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-600'}`}>
                  {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {t('prof.hist.delta').replace('{delta}', `${delta > 0 ? '+' : ''}${delta}`)}
                </span>
              )}
            </div>

            <div className="mt-4">
              <HistoryChart history={history} />
            </div>

            <div className="mt-4 space-y-1.5">
              {[...history].reverse().slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: riskColor(r.score) }} />
                  <span className="min-w-0 flex-1 truncate text-ink-700">{r.role}</span>
                  <span className="shrink-0 text-xs text-ink-400">{fmt(r.date)}</span>
                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: riskColor(r.score) }}>{r.score}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// Mini-graphique d'évolution du score de risque au fil des bilans.
function HistoryChart({ history }: { history: BilanRecord[] }) {
  const W = 620
  const H = 140
  const pad = { top: 14, right: 14, bottom: 14, left: 28 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const n = history.length
  const x = (i: number) => (n <= 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW)
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad.left} y1={y(g)} x2={W - pad.right} y2={y(g)} stroke="#eef0f7" strokeWidth="1" />
          <text x={pad.left - 8} y={y(g) + 4} textAnchor="end" className="fill-ink-400" fontSize="10">{g}</text>
        </g>
      ))}
      {n > 1 && (
        <path
          d={`M ${history.map((r, i) => `${x(i)},${y(r.score)}`).join(' L ')}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {history.map((r, i) => (
        <circle key={r.id} cx={x(i)} cy={y(r.score)} r={i === n - 1 ? 5 : 3.5} fill="white" stroke={riskColor(r.score)} strokeWidth="2.5" />
      ))}
    </svg>
  )
}

function Section({ title, emoji, delay, children }: { title: string; emoji: string; delay: number; children: ReactNode }) {
  return (
    <section className="animate-fade-up mt-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <span>{emoji}</span> {title}
        </h2>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </section>
  )
}

function Field({ label, hint, mark, children }: { label: string; hint?: string; mark?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-700">
        {label}
        {hint && <span className="pill bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">{hint}</span>}
        {mark && <span className="pill bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">🤓 {brandName()}</span>}
      </label>
      {children}
    </div>
  )
}

function Select({ label, value, onChange, options, mark }: { label: string; value: string; onChange: (v: string) => void; options: string[]; mark?: boolean }) {
  return (
    <Field label={label} mark={mark}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('prof.choose')}</option>
        {options.map((o) => (
          <option key={o} value={o}>{optLabel(o)}</option>
        ))}
      </select>
    </Field>
  )
}

function TagField({ label, hint, mark, value, onChange, placeholder }: { label: string; hint?: string; mark?: boolean; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <Field label={label} hint={hint} mark={mark}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span key={tag} className="pill bg-brand-100 text-brand-700">
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))} className="ml-0.5 text-brand-500 hover:text-brand-800">✕</button>
          </span>
        ))}
      </div>
      <input
        className="inp mt-2"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </Field>
  )
}
