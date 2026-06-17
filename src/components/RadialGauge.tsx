import { RiskLevel } from '../lib/engine'
import { RISK_THEME, useCountUp } from '../lib/ui'

interface Props {
  score: number
  level: RiskLevel
}

// Jauge circulaire animée affichant le pourcentage de remplaçabilité.
export function RadialGauge({ score, level }: Props) {
  const theme = RISK_THEME[level]
  const animated = useCountUp(score, 1300)
  const radius = 78
  const circumference = 2 * Math.PI * radius
  const dash = (animated / 100) * circumference

  return (
    <div className="relative grid place-items-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#eef0f7" strokeWidth="16" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={theme.hex}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: `drop-shadow(0 4px 14px ${theme.hex}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-5xl font-extrabold tabular-nums text-ink-900">
          {Math.round(animated)}
          <span className="text-2xl align-top text-ink-400">%</span>
        </span>
        <span className={`mt-1 pill ${theme.chip}`}>Risque {level.toLowerCase()}</span>
      </div>
    </div>
  )
}
