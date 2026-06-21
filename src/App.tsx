import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { analyze, withScore, applyProfileAdjustment, personalAssets, Analysis } from './lib/engine'
import { describeError, generateComparison, generateNarrative, hasApiKey, ComparisonResult } from './lib/llm'
import { LandingPage } from './components/LandingPage'
import { Dashboard } from './components/Dashboard'
import { CompareView } from './components/CompareView'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ProfileScreen } from './components/ProfileScreen'
import { PricingScreen } from './components/PricingScreen'
import { MetiersDirectory } from './components/MetiersDirectory'
import { MetierLanding } from './components/MetierLanding'
import { LegalScreen, type LegalDoc } from './components/LegalScreen'
import { Logo } from './components/Logo'
import { Avatar } from './components/Avatar'
import { LuminatorChat } from './components/LuminatorChat'
import { loadProfile, profileToContext } from './lib/profile'
import { addBilan } from './lib/history'
import { useLuminator } from './lib/entitlement'
import { installAudioUnlock } from './lib/sfx'

type View = 'landing' | 'analyzing' | 'dashboard' | 'compare' | 'profile' | 'pricing' | 'directory' | 'metier' | 'legal'

const ANALYSIS_STEPS = [
  'Identification du métier…',
  'Cartographie des tâches…',
  'Évaluation des 7 facteurs d\'exposition…',
  'Projection 2026 → 2040…',
  'Génération du plan d\'action…',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Contexte injecté dans le chat avec Luminator : profil + dernier bilan.
function chatContext(analysis: Analysis | null): string | undefined {
  const parts: string[] = []
  const profile = profileToContext(loadProfile())
  if (profile) parts.push(profile)
  if (analysis) {
    parts.push(
      `Dernier bilan réalisé : « ${analysis.profession.label} » — exposition à l'IA ${analysis.currentRisk}% aujourd'hui, ${analysis.riskIn2040}% projetée en 2040, résilience humaine ${analysis.resilience}/100.`,
    )
  }
  return parts.length ? parts.join('\n\n') : undefined
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [compareData, setCompareData] = useState<{ a: Analysis; b: Analysis; comparison: ComparisonResult | null } | null>(null)
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState('')
  const [aiEnabled, setAiEnabled] = useState(hasApiKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [seoId, setSeoId] = useState('')
  const [legalDoc, setLegalDoc] = useState<LegalDoc>('confidentialite')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInitial, setChatInitial] = useState<string | undefined>(undefined)
  const ownsLuminator = useLuminator()

  // Ouvre le chat Luminator, éventuellement avec un message pré-rempli.
  const openChat = (message?: string) => {
    setChatInitial(message)
    setChatOpen(true)
  }
  const closeChat = () => {
    setChatOpen(false)
    setChatInitial(undefined)
  }

  // Débloque l'audio (bruitage) dès la première interaction de l'utilisateur.
  useEffect(() => {
    installAudioUnlock()
  }, [])

  // Routage léger par hash pour les pages SEO (#/metiers, #/metier/<id>).
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash
      if (h.startsWith('#/metier/')) {
        setSeoId(decodeURIComponent(h.slice('#/metier/'.length)))
        setView('metier')
        window.scrollTo({ top: 0 })
      } else if (h === '#/metiers') {
        setView('directory')
        window.scrollTo({ top: 0 })
      } else if (h.startsWith('#/legal/')) {
        const d = h.slice('#/legal/'.length)
        const valid: LegalDoc[] = ['mentions', 'confidentialite', 'cgu']
        setLegalDoc(valid.includes(d as LegalDoc) ? (d as LegalDoc) : 'confidentialite')
        setView('legal')
        window.scrollTo({ top: 0 })
      }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

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
        // Le score affiché est celui estimé par Claude (déjà personnalisé via le profil).
        result = withScore(
          { ...base, verdict: n.verdict, recommendations: n.recommendations, skills: n.skills, aiEnhanced: true },
          n.score,
        )
        if (withProfile) result = { ...result, personalized: true, personalAssets: personalAssets(loadProfile()) }
      } catch (e) {
        note = describeError(e)
      }
    } else if (withProfile) {
      // Mode démo : on personnalise le score localement selon le profil.
      result = applyProfileAdjustment(base, loadProfile())
    }

    await sleep(Math.max(0, (hasApiKey() ? 1100 : 1900) - (Date.now() - started)))
    addBilan({
      role: result.profession.label,
      score: result.currentRisk,
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
    if (window.location.hash) window.location.hash = ''
    setView('landing')
    setAnalysis(null)
    setCompareData(null)
    window.scrollTo({ top: 0 })
  }

  const goHome = () => {
    if (window.location.hash) window.location.hash = ''
    setView('landing')
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <Analytics />
      {view === 'landing' && (
        <LandingPage
          onAnalyze={(p) => handleAnalyze(p)}
          onCompare={handleCompare}
          aiEnabled={aiEnabled}
          onOpenSettings={() => setModalOpen(true)}
          onOpenProfile={() => setView('profile')}
          onOpenPricing={() => setView('pricing')}
          onOpenMetiers={() => { window.location.hash = '/metiers' }}
          onOpenChat={openChat}
        />
      )}

      {view === 'directory' && (
        <MetiersDirectory onBack={goHome} onOpenMetier={(id) => { window.location.hash = '/metier/' + id }} />
      )}

      {view === 'metier' && (
        <MetierLanding
          professionId={seoId}
          onBack={goHome}
          onOpenDirectory={() => { window.location.hash = '/metiers' }}
          onAnalyze={(label) => { if (window.location.hash) window.location.hash = ''; handleAnalyze(label) }}
        />
      )}

      {view === 'profile' && (
        <ProfileScreen
          onBack={() => setView('landing')}
          onAnalyze={(role) => handleAnalyze(role, true)}
          aiEnabled={aiEnabled}
          onOpenSettings={() => setModalOpen(true)}
        />
      )}

      {view === 'pricing' && (
        <PricingScreen onBack={() => setView('landing')} onOpenChat={() => openChat()} />
      )}

      {view === 'legal' && (
        <LegalScreen
          doc={legalDoc}
          onBack={goHome}
          onOpen={(d) => { window.location.hash = '/legal/' + d }}
        />
      )}

      {view === 'analyzing' && <AnalyzingScreen label={label} step={step} />}

      {view === 'dashboard' && analysis && (
        <Dashboard
          analysis={analysis}
          onReset={reset}
          onOpenProfile={() => setView('profile')}
          aiEnabled={aiEnabled}
          onOpenSettings={() => setModalOpen(true)}
        />
      )}

      {view === 'compare' && compareData && (
        <CompareView a={compareData.a} b={compareData.b} comparison={compareData.comparison} onReset={reset} />
      )}

      {modalOpen && (
        <ApiKeyModal onClose={() => setModalOpen(false)} onChange={() => setAiEnabled(hasApiKey())} />
      )}

      {/* Bouton flottant : discuter avec Luminator (une fois l'offre acquise). */}
      {ownsLuminator && !chatOpen && view !== 'analyzing' && (
        <button
          onClick={() => openChat()}
          aria-label="Discuter avec Luminator"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-600 py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700"
        >
          <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/15">
            <Avatar glasses className="h-full w-full" forceFallback />
          </span>
          Luminator
        </button>
      )}

      {chatOpen && (
        <LuminatorChat
          onClose={closeChat}
          aiEnabled={aiEnabled}
          onOpenSettings={() => setModalOpen(true)}
          extraContext={chatContext(analysis)}
          initialMessage={chatInitial}
        />
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
        <Logo className="mb-6 justify-center" />
        <div className="relative mx-auto mb-2 h-56 w-full">
          <Avatar state="thinking" className="h-full w-full" />
        </div>
        <h2 className="font-display text-xl font-bold text-ink-900">Lumi analyse « {label} »</h2>
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
