import { useState } from 'react'
import { Logo } from './Logo'
import { usePlan, addPlanItem, setPlanStatus, removePlanItem, type PlanItem, type PlanStatus } from '../lib/plan'
import { useToolbox } from '../lib/toolbox'
import { loadProfile } from '../lib/profile'
import { automationProgress, progressLabel } from '../lib/score'
import { brandName } from '../lib/entitlement'
import { t, useLang } from '../lib/i18n'

interface Props {
  onBack: () => void
  onOpenChat: (message?: string) => void
}

const COLUMNS: { status: PlanStatus; labelKey: string; emoji: string }[] = [
  { status: 'todo', labelKey: 'plan.col.todo', emoji: '⬜' },
  { status: 'doing', labelKey: 'plan.col.doing', emoji: '🔧' },
  { status: 'done', labelKey: 'plan.col.done', emoji: '✅' },
]

export function PlanScreen({ onBack, onOpenChat }: Props) {
  useLang()
  const items = usePlan()
  const tools = useToolbox()
  const [draft, setDraft] = useState('')

  const add = () => {
    if (addPlanItem(draft)) setDraft('')
  }

  const done = items.filter((i) => i.status === 'done').length
  const progress = automationProgress(items, loadProfile(), tools)

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo onClick={onBack} />
          <button onClick={onBack} className="btn-ghost py-2.5 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-8-6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('common.back')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="animate-fade-up pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{t('plan.title')}</h1>
              <p className="mt-1 text-sm text-ink-500">
                {t('plan.intro').replace('{name}', brandName())}
              </p>
            </div>
            {items.length > 0 && (
              <span className="pill bg-brand-50 text-brand-700">{t('plan.doneCount').replace('{done}', String(done)).replace('{total}', String(items.length))}</span>
            )}
          </div>

          {/* Score d'automatisation : monte à mesure que tu coches tes actions. */}
          <div className="card mt-5 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">{t('plan.progressTitle')}</p>
                <p className="mt-0.5 text-xs text-ink-500">{t(progressLabel(progress.score))}</p>
              </div>
              <span className="font-display text-3xl font-extrabold text-brand-600">{progress.score}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${Math.max(progress.score, 3)}%` }} />
            </div>
          </div>

          {/* Ajout manuel rapide */}
          <form
            className="mt-6 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('plan.addPlaceholder')}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" disabled={!draft.trim()} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-40">
              {t('common.add')}
            </button>
          </form>

          {items.length === 0 ? (
            <div className="card mt-6 p-8 text-center">
              <div className="text-4xl">🗂️</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('plan.emptyTitle')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                {t('plan.emptyDesc').replace('{name}', brandName())}
              </p>
              <button
                onClick={() => onOpenChat(t('plan.promptAutomate'))}
                className="btn-primary mx-auto mt-5"
              >
                {t('common.askName').replace('{name}', brandName())}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {COLUMNS.map(({ status, labelKey, emoji }) => {
                const col = items.filter((i) => i.status === status)
                if (col.length === 0) return null
                return (
                  <div key={status}>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                      {emoji} {t(labelKey)} · {col.length}
                    </h2>
                    <div className="space-y-2">
                      {col.map((item) => (
                        <PlanCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )
              })}

              <button
                onClick={() => onOpenChat(t('plan.promptNext'))}
                className="btn-ghost w-full justify-center"
              >
                {t('plan.askMore').replace('{name}', brandName())}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function PlanCard({ item }: { item: PlanItem }) {
  const next: Record<PlanStatus, PlanStatus> = { todo: 'doing', doing: 'done', done: 'todo' }
  return (
    <div className={`card flex items-start gap-3 p-4 ${item.status === 'done' ? 'opacity-70' : ''}`}>
      <button
        onClick={() => setPlanStatus(item.id, next[item.status])}
        title={t('plan.changeStatus')}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs transition ${
          item.status === 'done'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : item.status === 'doing'
              ? 'border-brand-400 text-brand-600'
              : 'border-ink-300 text-transparent hover:border-brand-400'
        }`}
      >
        {item.status === 'done' ? '✓' : item.status === 'doing' ? '…' : '✓'}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium text-ink-900 ${item.status === 'done' ? 'line-through' : ''}`}>{item.title}</p>
        {item.detail && <p className="mt-0.5 text-xs text-ink-500">{item.detail}</p>}
      </div>
      <button
        onClick={() => removePlanItem(item.id)}
        aria-label={t('common.delete')}
        className="shrink-0 rounded-full p-1 text-ink-300 transition hover:bg-ink-50 hover:text-rose-500"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
