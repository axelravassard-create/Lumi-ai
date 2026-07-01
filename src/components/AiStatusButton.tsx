interface Props {
  enabled: boolean
  onClick: () => void
}

// Pastille cliquable indiquant si l'IA Claude est connectée, sinon le mode démo.
export function AiStatusButton({ enabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`pill border transition hover:-translate-y-0.5 ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-ink-200 bg-white text-ink-500'
      }`}
      title={enabled ? 'IA Claude connectée — cliquez pour gérer la clé' : 'Mode démo — cliquez pour connecter Claude'}
    >
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-ink-300'}`} />
      <span className="hidden sm:inline">{enabled ? 'IA Claude' : 'Mode démo'}</span>
      <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 2.5V2.4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
