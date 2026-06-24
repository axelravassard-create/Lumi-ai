import { useState } from 'react'
import { clearApiKey, getApiKey, setApiKey } from '../lib/llm'

interface Props {
  onClose: () => void
  onChange: () => void
}

export function ApiKeyModal({ onClose, onChange }: Props) {
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
            <h2 className="font-display text-lg font-bold text-ink-900">Activer l'IA Claude</h2>
            <p className="mt-1 text-sm text-ink-500">
              Connectez votre clé API Anthropic pour générer des analyses rédigées par Claude.
              Sans clé, l'application fonctionne en mode démo (analyse locale).
            </p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-ink-700">Clé API Anthropic</label>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-..."
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <span>⚠️</span>
          <span>
            Prototype : la clé reste dans votre navigateur (localStorage) et appelle l'API directement.
            En production, elle devrait transiter par un serveur. Obtenez une clé sur{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="font-semibold underline">
              console.anthropic.com
            </a>.
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {existing ? (
            <button onClick={remove} className="text-sm font-medium text-rose-600 hover:text-rose-700">
              Supprimer la clé
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost py-2.5 text-sm">
              Annuler
            </button>
            <button onClick={save} disabled={!value.trim()} className="btn-primary px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
