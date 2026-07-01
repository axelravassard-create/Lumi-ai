// Petit UI-kit local au studio (sliders, segments, champs) — cohérent avec le
// langage visuel Blumi (azur, coins arrondis).
import type { ReactNode } from 'react'

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-600">{label}</span>
        {hint && <span className="text-[11px] tabular-nums text-ink-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function Slider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600"
    />
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            value === o.value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-bold text-ink-900">{title}</h3>
      {children}
    </div>
  )
}
