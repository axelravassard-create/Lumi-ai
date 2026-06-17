import { useEffect, useRef, useState } from 'react'
import { RiskLevel } from './engine'

// Palette par niveau de risque (Tailwind-compatible HEX + classes utilitaires).
export const RISK_THEME: Record<
  RiskLevel,
  { hex: string; soft: string; text: string; bg: string; ring: string; chip: string }
> = {
  Faible: {
    hex: '#10b981',
    soft: '#d1fae5',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'text-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  Modéré: {
    hex: '#f59e0b',
    soft: '#fef3c7',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'text-amber-500',
    chip: 'bg-amber-100 text-amber-700',
  },
  Élevé: {
    hex: '#f97316',
    soft: '#ffedd5',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    ring: 'text-orange-500',
    chip: 'bg-orange-100 text-orange-700',
  },
  Critique: {
    hex: '#ef4444',
    soft: '#fee2e2',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'text-rose-500',
    chip: 'bg-rose-100 text-rose-700',
  },
}

// Animation de comptage (0 → target) avec easing.
export function useCountUp(target: number, duration = 1100, start = true) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>()

  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    const animate = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setValue(target * eased)
      if (p < 1) raf.current = requestAnimationFrame(animate)
      else setValue(target)
    }
    raf.current = requestAnimationFrame(animate)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration, start])

  return value
}
