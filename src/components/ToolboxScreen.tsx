import { useState } from 'react'
import { Logo } from './Logo'
import { useToolbox, addTool, removeTool, type ToolItem } from '../lib/toolbox'
import { brandName } from '../lib/entitlement'
import { t, useLang } from '../lib/i18n'

interface Props {
  onBack: () => void
  onOpenChat: (message?: string) => void
}

export function ToolboxScreen({ onBack, onOpenChat }: Props) {
  useLang()
  const tools = useToolbox()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const add = () => {
    if (addTool(name, url)) {
      setName('')
      setUrl('')
    }
  }

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
          <h1 className="font-display text-2xl font-extrabold text-ink-900 md:text-3xl">{t('tb.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t('tb.intro').replace('{name}', brandName())}
          </p>

          {/* Ajout manuel rapide */}
          <form
            className="mt-6 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tb.namePlaceholder')}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('tb.urlPlaceholder')}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" disabled={!name.trim()} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-40">
              {t('common.add')}
            </button>
          </form>

          {tools.length === 0 ? (
            <div className="card mt-6 p-8 text-center">
              <div className="text-4xl">🧰</div>
              <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('tb.emptyTitle')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                {t('tb.emptyDesc').replace('{name}', brandName())}
              </p>
              <button
                onClick={() => onOpenChat(t('tb.promptRecommend'))}
                className="btn-primary mx-auto mt-5"
              >
                {t('common.askName').replace('{name}', brandName())}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
              <button
                onClick={() => onOpenChat(t('tb.promptMore'))}
                className="btn-ghost mt-2 w-full justify-center"
              >
                {t('tb.askMore').replace('{name}', brandName())}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function ToolCard({ tool }: { tool: ToolItem }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-lg">🧰</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{tool.name}</p>
        {tool.reason && <p className="mt-0.5 text-xs text-ink-500">{tool.reason}</p>}
        {tool.url && (
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            {t('tb.open')}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
      <button
        onClick={() => removeTool(tool.id)}
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
