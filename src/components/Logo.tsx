export function Logo({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer transition hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={onClick ? "Retour à l'accueil" : undefined}
    >
      <div className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
          <defs>
            <radialGradient id="lumiEye" cx="0.4" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#a8f3ff" />
              <stop offset="0.55" stopColor="#27e2ff" />
              <stop offset="1" stopColor="#1aa8ff" />
            </radialGradient>
          </defs>
          {/* oreilles */}
          <ellipse cx="7" cy="17" rx="2.1" ry="2.9" fill="#fff" />
          <ellipse cx="25" cy="17" rx="2.1" ry="2.9" fill="#fff" />
          {/* tête simplifiée de Lumi */}
          <path
            d="M16 5.2c4.7 0 8 3.4 8 8.4 0 5.6-3.3 9.6-8 9.6s-8-4-8-9.6c0-5 3.3-8.4 8-8.4Z"
            fill="#fff"
          />
          {/* yeux lumineux */}
          <circle cx="12.7" cy="14.2" r="2.15" fill="url(#lumiEye)" />
          <circle cx="19.3" cy="14.2" r="2.15" fill="url(#lumiEye)" />
          {/* reflets de vie */}
          <circle cx="13.4" cy="13.5" r="0.7" fill="#fff" />
          <circle cx="20" cy="13.5" r="0.7" fill="#fff" />
        </svg>
      </div>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
        Lum<span className="text-brand-600">i</span>
      </span>
    </div>
  )
}
