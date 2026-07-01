import { useState } from 'react'
import { Analysis, BASE_YEAR, HORIZON_YEAR } from '../lib/engine'
import { RISK_THEME, useCountUp } from '../lib/ui'
import { REFERENCES } from '../lib/sources'
import { Logo } from './Logo'
import { RadialGauge } from './RadialGauge'
import { ProjectionChart } from './ProjectionChart'
import { SharePanel } from './SharePanel'
import { SectorTrendCard } from './SectorTrendCard'
import { Avatar } from './Avatar'
import { LumiSpeech } from './LumiSpeech'
import { moodFromScore, lumiReaction } from '../lib/lumi'
import { useBrand } from '../lib/entitlement'
import { t, useLang } from '../lib/i18n'

interface Props {
  analysis: Analysis
  onReset: () => void
  onOpenProfile: () => void
  aiEnabled: boolean
  onOpenSettings: () => void
}

const TAG_STYLES: Record<string, string> = {
  Augmentation: 'bg-brand-100 text-brand-700',
  Différenciation: 'bg-cyan-100 text-cyan-700',
  Évolution: 'bg-sky-100 text-sky-700',
  Protection: 'bg-emerald-100 text-emerald-700',
}

function riskColor(r: number): string {
  if (r < 30) return '#10b981'
  if (r < 55) return '#f59e0b'
  if (r < 75) return '#f97316'
  return '#ef4444'
}

export function Dashboard({ analysis, onReset, onOpenProfile, aiEnabled, onOpenSettings }: Props) {
  const sector = analysis.profession.domain.startsWith('Profil')
    ? analysis.profession.label
    : analysis.profession.domain
  const theme = RISK_THEME[analysis.level]
  const resilience = useCountUp(analysis.resilience, 1300)
  const risk2040 = useCountUp(analysis.riskIn2040, 1300)
  const current = useCountUp(analysis.currentRisk, 1300)
  const [showShare, setShowShare] = useState(false)
  const { name } = useBrand()
  useLang() // re-render au changement de langue

  return (
    <div className="min-h-screen pb-20">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo onClick={onReset} />
          <button onClick={onReset} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('dash.new')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Bandeau source de l'estimation */}
        <section className="animate-fade-up pt-6">
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${analysis.aiEnhanced ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-600'}`}>
            <span className="text-lg">{analysis.aiEnhanced ? '✦' : 'ℹ️'}</span>
            <span>
              {analysis.aiEnhanced ? t('dash.aiBanner') : t('dash.demoBanner')}
            </span>
          </div>
        </section>

        {/* En-tête de résultat */}
        <section className="animate-fade-up pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-card">
              {analysis.profession.emoji}
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">
                {analysis.profession.label}
              </h1>
              <span className="text-sm text-ink-500">{analysis.profession.domain}</span>
            </div>
            {!analysis.exact && (
              <span className="pill bg-ink-100 text-ink-500" title="Métier estimé par approximation">
                {t('dash.estProfile')}
              </span>
            )}
            <button onClick={() => setShowShare(true)} className="btn-ghost ml-auto py-2 text-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('dash.share')}
            </button>
          </div>
        </section>

        {/* Le personnage présente votre analyse (acteur de tous les bilans) */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '60ms' }}>
          <div className="card flex flex-col items-center gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative h-36 w-36 sm:h-44 sm:w-44">
                <Avatar state="idle" mood={moodFromScore(analysis.score)} className="h-full w-full" />
              </div>
              <span className="pill bg-brand-50 font-bold text-brand-700">{name}</span>
            </div>
            <div className={`relative flex-1 self-stretch rounded-2xl border-l-4 p-5 ${theme.bg}`} style={{ borderColor: theme.hex }}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-500">{t('dash.verdict').replace('{name}', name)}</h2>
                {analysis.aiEnhanced && (
                  <span className="pill bg-emerald-100 text-emerald-700">{t('dash.byClaude')}</span>
                )}
              </div>
              {/* Lumi réagit selon le score, en s'écrivant à l'écran */}
              <LumiSpeech
                text={lumiReaction(analysis.score)}
                className="mt-1.5 block font-display text-base font-bold text-ink-800"
              />
              <p className="mt-1.5 text-lg font-medium leading-snug text-ink-900">{analysis.verdict}</p>
            </div>
          </div>
        </section>

        {/* Bloc principal : jauge + métriques */}
        <section className="animate-fade-up mt-6 grid gap-6 lg:grid-cols-[320px_1fr]" style={{ animationDelay: '120ms' }}>
          <div className="card flex flex-col items-center justify-center gap-2 p-8">
            <span className="text-sm font-medium text-ink-500">{t('dash.riskTitle')}</span>
            <RadialGauge score={analysis.score} level={analysis.level} />
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-400" title={analysis.aiEnhanced ? t('dash.scoreClaudeTitle') : t('dash.scoreLocalTitle')}>
              {analysis.aiEnhanced ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {t('dash.estClaude')}
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
                  {t('dash.estLocal')}
                </>
              )}
            </span>
            {analysis.personalized && (
              <span className="pill bg-sky-100 text-sky-700" title={t('dash.adjustedTitle')}>
                {t('dash.adjusted')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label={t('dash.metricNow')} value={`${Math.round(current)}%`} hint={t('dash.metricNowHint')} accent={theme.hex} />
            <MetricCard label={t('dash.metricProj').replace('{year}', String(HORIZON_YEAR))} value={`${Math.round(risk2040)}%`} hint={t('dash.metricProjHint')} accent={theme.hex} />
            <MetricCard label={t('dash.metricResil')} value={`${Math.round(resilience)}%`} hint={t('dash.metricResilHint')} accent="#10b981" />
          </div>
        </section>

        {/* Projection temporelle */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '160ms' }}>
          <div className="card p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900">{t('dash.progTitle')}</h2>
                <p className="text-sm text-ink-500">{t('dash.progSub').replace('{base}', String(BASE_YEAR)).replace('{horizon}', String(HORIZON_YEAR))}</p>
              </div>
              <span className={`pill ${theme.chip}`}>
                {analysis.riskIn2040 > analysis.currentRisk ? '↑' : '→'} {t('dash.progDelta').replace('{pts}', String(Math.max(0, analysis.riskIn2040 - analysis.currentRisk))).replace('{year}', String(HORIZON_YEAR))}
              </span>
            </div>
            <div className="mt-4">
              <ProjectionChart data={analysis.projection} level={analysis.level} markerYear={analysis.currentYear} markerValue={analysis.currentRisk} />
            </div>
          </div>
        </section>

        {/* Tendance du secteur (note hebdomadaire) */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '200ms' }}>
          <SectorTrendCard sector={sector} aiEnabled={aiEnabled} onOpenSettings={onOpenSettings} />
        </section>

        {/* Décomposition par tâche + profil de compétences */}
        <section className="animate-fade-up mt-6 grid gap-6 lg:grid-cols-2" style={{ animationDelay: '220ms' }}>
          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">{t('dash.tasksTitle')}</h2>
            <p className="text-sm text-ink-500">{t('dash.tasksSub')}</p>
            <div className="mt-6 space-y-4">
              {analysis.tasks.map((task, i) => (
                <TaskBar key={task.label} label={task.label} risk={task.risk} delay={i * 80} />
              ))}
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">{t('dash.assetsTitle')}</h2>
            <p className="text-sm text-ink-500">{t('dash.assetsSub')}</p>
            <div className="mt-6 space-y-4">
              <FactorRow label={t('dash.factorCreativity')} value={analysis.profession.factors.creativity} />
              <FactorRow label={t('dash.factorEmpathy')} value={analysis.profession.factors.empathy} />
              <FactorRow label={t('dash.factorJudgment')} value={analysis.profession.factors.judgment} />
              <FactorRow label={t('dash.factorSocial')} value={analysis.profession.factors.social} />
              <FactorRow label={t('dash.factorPhysical')} value={analysis.profession.factors.physical} />
            </div>

            {analysis.personalAssets && analysis.personalAssets.length > 0 && (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-sky-700">{t('dash.personalAssets')}</h3>
                <div className="mt-3 space-y-4">
                  {analysis.personalAssets.map((a) => (
                    <FactorRow key={a.label} label={a.label} value={a.value} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Plan d'action */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink-900">{t('dash.planTitle')}</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {analysis.recommendations.map((r) => (
              <div key={r.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-glow">
                <span className={`pill ${TAG_STYLES[r.tag] ?? 'bg-ink-100 text-ink-600'}`}>{r.tag}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-ink-900">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{r.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compétences d'avenir */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '320ms' }}>
          <div className="card bg-gradient-to-br from-ink-900 to-brand-900 p-6 text-white md:p-8">
            <h2 className="font-display text-xl font-bold">{t('dash.skillsTitle')}</h2>
            <p className="text-sm text-white/60">{t('dash.skillsSub')}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {analysis.skills.map((s) => (
                <div key={s.name} className="flex gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="mt-1 text-sm text-white/60">{s.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pistes de reconversion */}
        {analysis.pivots.length > 0 && (
          <section className="animate-fade-up mt-6" style={{ animationDelay: '360ms' }}>
            <h2 className="font-display text-xl font-bold text-ink-900">{t('dash.pivotsTitle')}</h2>
            <p className="text-sm text-ink-500">{t('dash.pivotsSub')}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {analysis.pivots.map((p) => (
                <div key={p.label} className="card flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink-50 text-2xl">{p.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-ink-900">{p.label}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: riskColor(p.risk) }} />
                      <span className="text-xs text-ink-500">{t('dash.riskPct').replace('{x}', String(p.risk))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Méthodologie & sources */}
        <section className="animate-fade-up mt-6" style={{ animationDelay: '380ms' }}>
          <div className="card p-6 md:p-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">{t('dash.methoTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {t('dash.methoBody').replace('{state}', analysis.aiEnhanced ? t('dash.methoClaude') : t('dash.methoLocal'))}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {REFERENCES.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-ink-100 p-4 transition hover:border-brand-300 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">{r.name}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-ink-300 transition group-hover:text-brand-500" viewBox="0 0 24 24" fill="none">
                      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-brand-700">{r.org}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{r.detail}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA bas de page */}
        <section className="animate-fade-up mt-10 text-center" style={{ animationDelay: '400ms' }}>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={onOpenProfile} className="btn-primary">
              {t('dash.ctaProfile')}
            </button>
            <button onClick={onReset} className="btn-ghost">
              {t('dash.ctaAnother')}
            </button>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-xs text-ink-400">
            {t('dash.disclaimer')}
          </p>
        </section>
      </main>

      {showShare && (
        <SharePanel role={analysis.profession.label} score={analysis.score} level={analysis.level} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}

function MetricCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="card p-5">
      <div className="h-1.5 w-8 rounded-full" style={{ background: accent }} />
      <div className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-700">{label}</div>
      <div className="text-xs text-ink-400">{hint}</div>
    </div>
  )
}

function TaskBar({ label, risk, delay }: { label: string; risk: number; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: riskColor(risk) }}>{risk}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${risk}%`,
            background: riskColor(risk),
            animation: `grow 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
          }}
        />
      </div>
      <style>{`@keyframes grow { from { width: 0; } }`}</style>
    </div>
  )
}

function FactorRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-semibold tabular-nums text-brand-700">{value}/100</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          style={{ width: `${value}%`, animation: 'grow 1s cubic-bezier(0.16,1,0.3,1) both' }}
        />
      </div>
    </div>
  )
}
