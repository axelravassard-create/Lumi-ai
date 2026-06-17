export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M9 21V11l7 6 7-6v10"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
        Your<span className="text-brand-600">Career</span>
      </span>
    </div>
  )
}
