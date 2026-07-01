import { useRef } from 'react'
import type { BeatDef, BeatKind, Project } from '../../lib/studio/types'

const BEAT_META: Record<BeatKind, { label: string; color: string; emoji: string }> = {
  hook: { label: 'Hook', color: '#ef4444', emoji: '👀' },
  scan: { label: 'Scan', color: '#27e2ff', emoji: '🔦' },
  verdict: { label: 'Verdict', color: '#ffb020', emoji: '📉' },
  pivot: { label: 'Pivot', color: '#a855f7', emoji: '🤔' },
  glowup: { label: 'Glow-up', color: '#38e07b', emoji: '😎' },
  solution: { label: 'Solution', color: '#1583ef', emoji: '✅' },
  cta: { label: 'CTA', color: '#f472b6', emoji: '👇' },
}

interface Props {
  project: Project
  time: number
  onChange: (beats: BeatDef[]) => void
  onSeek: (t: number) => void
  onSelect: (id: BeatKind) => void
  selected: BeatKind | null
}

export function Timeline({ project, time, onChange, onSeek, onSelect, selected }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dur = project.duration
  const pxPerSec = () => (trackRef.current?.clientWidth ?? 800) / dur
  // Pas d'aimantation : grille de tempo si activée, sinon 0,25 s.
  const grid = project.tempo.enabled ? 60 / Math.max(40, project.tempo.bpm) : 0.25
  const snap = (v: number) => Math.round(v / grid) * grid
  const beatSec = 60 / Math.max(40, project.tempo.bpm)

  const startDrag = (e: React.PointerEvent, beat: BeatDef, mode: 'move' | 'resize') => {
    e.stopPropagation()
    e.preventDefault()
    onSelect(beat.id)
    const pps = pxPerSec()
    const startX = e.clientX
    const orig = { ...beat }
    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / pps
      const beats = project.beats.map((b) => {
        if (b.id !== beat.id) return b
        if (mode === 'move') {
          const start = Math.max(0, Math.min(dur - b.dur, snap(orig.start + delta)))
          return { ...b, start }
        }
        const d = Math.max(0.3, Math.min(dur - orig.start, snap(orig.dur + delta)))
        return { ...b, dur: d }
      })
      onChange(beats)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const seekAt = (e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const t = ((e.clientX - rect.left) / rect.width) * dur
    onSeek(Math.max(0, Math.min(dur, t)))
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
        <span>Timeline · glisse pour déplacer, poignée droite pour la durée</span>
        <span className="tabular-nums">{time.toFixed(2)}s / {dur.toFixed(1)}s</span>
      </div>
      {/* Règle de scrubbing (clique/glisse pour déplacer la tête de lecture) */}
      <div
        onPointerDown={(e) => {
          seekAt(e)
          const move = (ev: PointerEvent) => seekAt({ clientX: ev.clientX } as React.PointerEvent)
          const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
        }}
        className="relative mb-1 h-4 w-full cursor-pointer rounded-t-lg bg-ink-200/60"
      >
        {Array.from({ length: Math.floor(dur) + 1 }).map((_, i) => (
          <div key={i} className="absolute top-1 h-2 w-px bg-ink-400/60" style={{ left: `${(i / dur) * 100}%` }} />
        ))}
        <div className="pointer-events-none absolute -top-0.5 h-5 w-0.5 bg-ink-900" style={{ left: `${(time / dur) * 100}%` }}>
          <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-ink-900" />
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-16 w-full overflow-hidden rounded-xl bg-ink-100"
      >
        {/* Graduations chaque seconde */}
        {Array.from({ length: Math.floor(dur) + 1 }).map((_, i) => (
          <div key={i} className="absolute top-0 h-full w-px bg-ink-200" style={{ left: `${(i / dur) * 100}%` }} />
        ))}
        {/* Marqueurs de tempo (grille BPM) */}
        {project.tempo.enabled &&
          Array.from({ length: Math.floor(dur / beatSec) + 1 }).map((_, i) => (
            <div key={`bpm${i}`} className="absolute top-0 h-full w-px bg-brand-400/40" style={{ left: `${((i * beatSec) / dur) * 100}%` }} />
          ))}
        {/* Beats */}
        {project.beats.map((b) => {
          const m = BEAT_META[b.id]
          const left = (b.start / dur) * 100
          const width = (b.dur / dur) * 100
          const off = b.enabled === false
          return (
            <div
              key={b.id}
              onPointerDown={(e) => startDrag(e, b, 'move')}
              className={`absolute top-1.5 flex h-[52px] cursor-grab items-center overflow-hidden rounded-lg px-2 text-[11px] font-bold text-white transition ${
                selected === b.id ? 'ring-2 ring-white' : ''
              } ${off ? 'opacity-30 grayscale' : ''}`}
              style={{
                left: `${left}%`,
                width: `calc(${width}% - 2px)`,
                background: m.color,
                ...(off ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,.25) 0 6px, transparent 6px 12px)' } : {}),
              }}
              title={`${m.label} — ${b.dur.toFixed(2)}s${off ? ' (masqué)' : ''}`}
            >
              <span className="pointer-events-none truncate drop-shadow">{off ? '🚫' : m.emoji} {m.label}</span>
              {/* Poignée de redimensionnement */}
              <div
                onPointerDown={(e) => startDrag(e, b, 'resize')}
                className="absolute right-0 top-0 h-full w-2.5 cursor-ew-resize bg-black/25"
              />
            </div>
          )
        })}
        {/* Tête de lecture */}
        <div className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-ink-900" style={{ left: `${(time / dur) * 100}%` }}>
          <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-ink-900" />
        </div>
      </div>
    </div>
  )
}

export { BEAT_META }
