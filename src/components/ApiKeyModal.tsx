import { useState } from 'react'
import { clearApiKey, getApiKey, setApiKey } from '../lib/llm'
import { t, useLang } from '../lib/i18n'

interface Props {
  onClose: () => void
  onChange: () => void
}

export function ApiKeyModal({ onClose, onChange }: Props) {
  useLang()
  const [value, setValue] = useState(getApiKey() ?? '')
  const existing = !!getApiKey()

  const save = () => {
    if (value.trim()) {
      setApiKey(value)
      onChange()
      onClose()
    }
  }

  const remove = () => {
    clearApiKey()
    setValue('')
    onChange()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">🤖</div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">{t('key.title')}</h2>
            <p className="mt-1 text-sm text-ink-500">{t('key.desc')}</p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-ink-700">{t('key.label')}</label>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-..."
          autoFocus
          className="field mt-1.5 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <span>⚠️</span>
          <span>
            {t('key.warnPre')}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="font-semibold underline">
              console.anthropic.com
            </a>.
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {existing ? (
            <button onClick={remove} className="text-sm font-medium text-rose-600 hover:text-rose-700">
              {t('key.remove')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost py-2.5 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={save} disabled={!value.trim()} className="btn-primary px-5 py-2.5 text-sm">
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
