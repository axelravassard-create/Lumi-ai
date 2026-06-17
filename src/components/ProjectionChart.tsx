import { useMemo, useState } from 'react'
import { RiskLevel, YearPoint } from '../lib/engine'
import { RISK_THEME } from '../lib/ui'

interface Props {
  data: YearPoint[]
  level: RiskLevel
}

// Graphique d'aire SVG : progression du risque d'automatisation année par année.
export function ProjectionChart({ data, level }: Props) {
  const theme = RISK_THEME[level]
  const [hover, setHover] = useState<number | null>(null)

  const W = 680
  const H = 280
  const pad = { top: 24, right: 24, bottom: 38, left: 40 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const minYear = data[0].year
  const maxYear = data[data.length - 1].year
  const x = (year: number) => pad.left + ((year - minYear) / (maxYear - minYear)) * innerW
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH

  const { linePath, areaPath } = useMemo(() => {
    const pts = data.map((d) => `${x(d.year)},${y(d.value)}`)
    const line = `M ${pts.join(' L ')}`
    const area = `${line} L ${x(maxYear)},${y(0)} L ${x(minYear)},${y(0)} Z`
    return { linePath: line, areaPath: area }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const gridLines = [0, 25, 50, 75, 100]
  const yearTicks = data.filter((d) => d.year % 2 === 0)
  const active = hover ?? data.length - 1
  const activePoint = data[active]

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Projection du risque">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.hex} stopOpacity="0.32" />
            <stop offset="100%" stopColor={theme.hex} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* grille horizontale */}
        {gridLines.map((g) => (
          <g key={g}>
            <line x1={pad.left} y1={y(g)} x2={W - pad.right} y2={y(g)} stroke="#eef0f7" strokeWidth="1" />
            <text x={pad.left - 10} y={y(g) + 4} textAnchor="end" className="fill-ink-400" fontSize="11">
              {g}
            </text>
          </g>
        ))}

        {/* aire + ligne */}
        <path d={areaPath} fill="url(#areaFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={theme.hex}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: 2000,
            animation: 'dash 1.6s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        />

        {/* repère interactif */}
        <line
          x1={x(activePoint.year)}
          y1={pad.top}
          x2={x(activePoint.year)}
          y2={pad.top + innerH}
          stroke={theme.hex}
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <circle cx={x(activePoint.year)} cy={y(activePoint.value)} r="6" fill="white" stroke={theme.hex} strokeWidth="3" />
        <g transform={`translate(${Math.min(x(activePoint.year), W - 90)}, ${y(activePoint.value) - 44})`}>
          <rect width="80" height="32" rx="8" fill="#1c2033" />
          <text x="40" y="14" textAnchor="middle" className="fill-white" fontSize="11" fontWeight="600">
            {activePoint.year}
          </text>
          <text x="40" y="26" textAnchor="middle" fill={theme.hex} fontSize="12" fontWeight="700">
            {activePoint.value}%
          </text>
        </g>

        {/* libellés des années */}
        {yearTicks.map((d) => (
          <text key={d.year} x={x(d.year)} y={H - 12} textAnchor="middle" className="fill-ink-400" fontSize="11">
            {d.year}
          </text>
        ))}

        {/* zones de survol */}
        {data.map((d, i) => (
          <rect
            key={d.year}
            x={x(d.year) - innerW / data.length / 2}
            y={pad.top}
            width={innerW / data.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  )
}
