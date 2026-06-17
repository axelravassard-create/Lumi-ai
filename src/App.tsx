import { useEffect, useState } from 'react'
import { analyze, Analysis } from './lib/engine'
import { LandingPage } from './components/LandingPage'
import { Dashboard } from './components/Dashboard'
import { Logo } from './components/Logo'

type View = 'landing' | 'analyzing' | 'dashboard'

const ANALYSIS_STEPS = [
  'Identification du métier…',
  'Cartographie des tâches…',
  'Évaluation des 7 facteurs d\'exposition…',
  'Projection 2026 → 2040…',
  'Génération de votre plan d\'action…',
]

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [step, setStep] = useState(0)

  const handleAnalyze = (profession: string) => {
    setAnalysis(analyze(profession))
    setStep(0)
    setView('analyzing')
  }

  // Séquence d'analyse simulée pour l'effet « IA au travail ».
  useEffect(() => {
    if (view !== 'analyzing') return
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 360)
    const done = setTimeout(() => {
      clearInterval(stepTimer)
      setView('dashboard')
      window.scrollTo({ top: 0 })
    }, 1900)
    return () => {
      clearInterval(stepTimer)
      clearTimeout(done)
    }
  }, [view])

  const reset = () => {
    setView('landing')
    setAnalysis(null)
    window.scrollTo({ top: 0 })
  }

  if (view === 'landing') return <LandingPage onAnalyze={handleAnalyze} />

  if (view === 'analyzing' && analysis) {
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
          <h2 className="font-display text-xl font-bold text-ink-900">
            Analyse de « {analysis.profession.label} »
          </h2>
          <div className="mt-6 space-y-2 text-left">
            {ANALYSIS_STEPS.map((label, i) => (
              <div
                key={label}
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
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (analysis) return <Dashboard analysis={analysis} onReset={reset} />
  return null
}
