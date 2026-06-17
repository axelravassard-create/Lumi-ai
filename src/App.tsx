import { useEffect, useState } from 'react'
import { analyze, Analysis } from './lib/engine'
import { describeError, generateComparison, generateNarrative, hasApiKey, ComparisonResult } from './lib/llm'
import { LandingPage } from './components/LandingPage'
import { Dashboard } from './components/Dashboard'
import { CompareView } from './components/CompareView'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ProfileScreen } from './components/ProfileScreen'
import { Logo } from './components/Logo'
import { loadProfile, profileToContext } from './lib/profile'
import { addBilan } from './lib/history'

type View = 'landing' | 'analyzing' | 'dashboard' | 'compare' | 'profile'

const ANALYSIS_STEPS = [
  'Identification du métier…',
  'Cartographie des tâches…',
  'Évaluation des 7 facteurs d\'exposition…',
  'Projection 2026 → 2040…',
  'Génération du plan d\'action…',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [compareData, setCompareData] = useState<{ a: Analysis; b: Analysis; comparison: ComparisonResult | null } | null>(null)
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState('')
  const [aiEnabled, setAiEnabled] = useState(hasApiKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Séquence d'étapes animée pendant l'analyse.
  useEffect(() => {
    if (view !== 'analyzing') return
    setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 380)
    return () => clearInterval(t)
  }, [view])

  // Toast d'information auto-effacé.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const handleAnalyze = async (profession: string, withProfile = false) => {
    const base = analyze(profession)
    setLabel(base.profession.label)
    setView('analyzing')
    const started = Date.now()
    let result = base
    let note: string | null = null

    if (hasApiKey()) {
      try {
        const context = withProfile ? profileToContext(loadProfile()) : undefined
        const n = await generateNarrative(base, context || undefined)
        result = { ...base, verdict: n.verdict, recommendations: n.recommendations, skills: n.skills, aiEnhanced: true }
      } catch (e) {
        note = describeError(e)
      }
    }

    await sleep(Math.max(0, (hasApiKey() ? 1100 : 1900) - (Date.now() - started)))
    addBilan({
      role: result.profession.label,
      score: result.score,
      level: result.level,
      resilience: result.resilience,
      riskIn2040: result.riskIn2040,
    })
    setNotice(note)
    setAnalysis(result)
    setView('dashboard')
    window.scrollTo({ top: 0 })
  }

  const handleCompare = async (pa: string, pb: string) => {
    const a = analyze(pa)
    const b = analyze(pb)
    setLabel(`${a.profession.label} et ${b.profession.label}`)
    setView('analyzing')
    const started = Date.now()
    let comparison: ComparisonResult | null = null
    let note: string | null = null

    if (hasApiKey()) {
      try {
        comparison = await generateComparison(a, b)
      } catch (e) {
        note = describeError(e)
      }
    }

    await sleep(Math.max(0, (hasApiKey() ? 1100 : 1900) - (Date.now() - started)))
    setNotice(note)
    setCompareData({ a, b, comparison })
    setView('compare')
    window.scrollTo({ top: 0 })
  }

  const reset = () => {
    setView('landing')
    setAnalysis(null)
    setCompareData(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          onAnalyze={(p) => handleAnalyze(p)}
          onCompare={handleCompare}
          aiEnabled={aiEnabled}
          onOpenSettings={() => setModalOpen(true)}
          onOpenProfile={() => setView('profile')}
        />
      )}

      {view === 'profile' && (
        <ProfileScreen onBack={() => setView('landing')} onAnalyze={(role) => handleAnalyze(role, true)} />
      )}

      {view === 'analyzing' && <AnalyzingScreen label={label} step={step} />}

      {view === 'dashboard' && analysis && <Dashboard analysis={analysis} onReset={reset} />}

      {view === 'compare' && compareData && (
        <CompareView a={compareData.a} b={compareData.b} comparison={compareData.comparison} onReset={reset} />
      )}

      {modalOpen && (
        <ApiKeyModal onClose={() => setModalOpen(false)} onChange={() => setAiEnabled(hasApiKey())} />
      )}

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-sm text-white shadow-glow">
            <span>⚠️</span>
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-white/50 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

function AnalyzingScreen({ label, step }: { label: string; step: number }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-60" />
          <div className="absolute inset-0 grid place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-3xl shadow-glow">
            🤖
          </div>
        </div>
        <h2 className="font-display text-xl font-bold text-ink-900">Analyse de « {label} »</h2>
        <div className="mt-6 space-y-2 text-left">
          {ANALYSIS_STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ${
                i <= step ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-300'
              }`}
            >
              {i < step ? (
                <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i === step ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-ink-100" />
              )}
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
