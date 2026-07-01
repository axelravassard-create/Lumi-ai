import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { AvatarMood, AvatarState } from '../avatar/RobotAvatar'
import type { Project } from '../../lib/studio/types'
import { fmtSize } from '../../lib/studio/types'
import { evalFrame } from '../../lib/studio/timeline'
import { avatarRect, drawBackground, drawEmptyBackground, renderOverlay } from '../../lib/studio/render'
import { scheduleSfx, sharedCtx } from '../../lib/studio/audio'
import { narrationFor } from '../../lib/studio/script'
import { speak, stopTTS, warmTTS } from '../../lib/studio/tts'

const RobotAvatar = lazy(() => import('../avatar/RobotAvatar'))

export interface PreviewHandle {
  master: HTMLCanvasElement | null
  video: HTMLVideoElement | null
  audio: HTMLAudioElement | null
  drawFrame: (t: number) => void
  setExportMode: (on: boolean) => void
}

interface Props {
  project: Project
  playing: boolean
  seek: number
  onUiTime: (t: number) => void
  onEnded: () => void
}

interface Control {
  glasses: boolean
  laptop: boolean
  mood: AvatarMood
  speaking: boolean
  state: AvatarState
}

const AVATAR_RES = 620 // résolution du canvas personnage (px) — composité dans le maître

export const StudioPreview = forwardRef<PreviewHandle, Props>(function StudioPreview(
  { project, playing, seek, onUiTime, onEnded },
  ref,
) {
  const { w, h } = fmtSize(project.fmt)
  const masterRef = useRef<HTMLCanvasElement>(null)
  const avatarBoxRef = useRef<HTMLDivElement>(null)
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [control, setControl] = useState<Control>({ glasses: false, laptop: false, mood: 'neutral', speaking: false, state: 'idle' })
  const controlRef = useRef(control)
  controlRef.current = control
  const projectRef = useRef(project)
  projectRef.current = project
  const exportRef = useRef(false)

  // Récupère le <canvas> WebGL du personnage (pour le compositing).
  const avatarCanvas = () => {
    if (!avatarCanvasRef.current && avatarBoxRef.current) {
      avatarCanvasRef.current = avatarBoxRef.current.querySelector('canvas')
    }
    return avatarCanvasRef.current
  }

  // Compose une frame complète dans le canvas maître à l'instant t.
  const drawFrame = (t: number) => {
    const master = masterRef.current
    if (!master) return
    const ctx = master.getContext('2d')
    if (!ctx) return
    const p = projectRef.current
    const f = evalFrame(p, t)

    // Synchronise les props (discrètes) du personnage.
    const next: Control = {
      glasses: f.glasses,
      laptop: f.laptop,
      mood: f.mood,
      speaking: f.speaking,
      state: f.phase === 'scan' ? 'thinking' : 'idle',
    }
    const c = controlRef.current
    if (
      c.glasses !== next.glasses || c.laptop !== next.laptop || c.mood !== next.mood ||
      c.speaking !== next.speaking || c.state !== next.state
    ) {
      controlRef.current = next
      setControl(next)
    }

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    if (f.shake) ctx.translate((Math.random() - 0.5) * f.shake, (Math.random() - 0.5) * f.shake)

    // Fond (vidéo importée ou dégradé).
    const video = videoRef.current
    if (p.background && video && video.readyState >= 2) {
      drawBackground(ctx, video, p.background.crop, w, h)
    } else {
      drawEmptyBackground(ctx, w, h)
    }

    // Personnage (couche WebGL composée).
    const av = avatarCanvas()
    if (av && av.width > 0) {
      const r = avatarRect(p, f, w, h)
      ctx.drawImage(av, r.x, r.y, r.w, r.h)
    }

    // Overlays 2D (hook, scan, jauge, cartes, captions, CTA…).
    renderOverlay(ctx, f, p, w, h, { safeZones: !exportRef.current && p.showSafeZones, watermark: true })
    ctx.restore()
  }

  useImperativeHandle(ref, () => ({
    master: masterRef.current,
    video: videoRef.current,
    audio: audioRef.current,
    drawFrame,
    setExportMode: (on: boolean) => {
      exportRef.current = on
    },
  }))

  // Positionne la vidéo de fond (lecture synchronisée ou seek pour le scrubbing).
  const syncVideo = (t: number, isPlaying: boolean) => {
    const v = videoRef.current
    const bg = projectRef.current.background
    if (!v || !bg) return
    const target = bg.trimIn + t
    if (isPlaying) {
      if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target
      v.muted = bg.volume <= 0
      v.volume = Math.min(1, bg.volume)
      if (v.paused) v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = Math.min(target, bg.trimOut || v.duration || target)
    }
  }

  // ── Boucle de lecture ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      // Aperçu figé sur la position de scrubbing.
      syncVideo(seek, false)
      const id = requestAnimationFrame(() => drawFrame(seek))
      stopTTS()
      audioRef.current?.pause()
      return () => cancelAnimationFrame(id)
    }

    warmTTS()
    const p = projectRef.current
    const startOffset = seek >= p.duration - 0.05 ? 0 : seek
    let raf = 0
    const start = performance.now() - startOffset * 1000
    let lastUi = 0

    // Audio : SFX (Web Audio) + voix (TTS) + musique, calés sur la timeline.
    const actx = sharedCtx()
    const ttsTimers: number[] = []
    if (actx) scheduleSfx(actx, p, actx.currentTime + 0.05, startOffset, actx.destination, 1)
    if (p.audio.voice) {
      for (const b of p.beats) {
        const line = narrationFor(b.id, p.script)
        const at = b.start
        if (!line || at < startOffset - 0.05) continue
        ttsTimers.push(window.setTimeout(() => speak(line, p.audio.voiceRate, p.audio.voiceVolume), (at - startOffset) * 1000))
      }
    }
    const music = audioRef.current
    if (music && p.audio.musicUrl) {
      music.volume = p.audio.musicVolume
      music.currentTime = startOffset
      music.play().catch(() => {})
    }
    syncVideo(startOffset, true)

    const loop = () => {
      const t = (performance.now() - start) / 1000
      if (t >= p.duration) {
        drawFrame(p.duration)
        onEnded()
        return
      }
      drawFrame(t)
      if (t - lastUi > 0.08) {
        lastUi = t
        onUiTime(t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ttsTimers.forEach((id) => clearTimeout(id))
      stopTTS()
      music?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, seek])

  // Redessine quand le projet change (édition en direct, à l'arrêt).
  useEffect(() => {
    if (!playing) {
      syncVideo(seek, false)
      const id = requestAnimationFrame(() => drawFrame(seek))
      return () => cancelAnimationFrame(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  const aspect = useMemo(() => `${w} / ${h}`, [w, h])

  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ aspectRatio: aspect, height: '100%', maxHeight: '100%' }}>
      {/* Personnage 3D (rendu hors-vue, composité dans le canvas maître). */}
      <div
        ref={avatarBoxRef}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        style={{ width: AVATAR_RES, height: AVATAR_RES }}
        aria-hidden
      >
        <Suspense fallback={null}>
          <RobotAvatar
            state={control.state}
            mood={control.mood}
            glasses={control.glasses}
            laptop={control.laptop}
            speaking={control.speaking}
            interactive={false}
            capture
            active
          />
        </Suspense>
      </div>

      {/* Canvas maître affiché. */}
      <canvas
        ref={masterRef}
        width={w}
        height={h}
        className="h-full w-full rounded-2xl bg-ink-950 shadow-glow"
        style={{ objectFit: 'contain' }}
      />

      {/* Médias sources (cachés). */}
      {project.background?.url && (
        <video ref={videoRef} src={project.background.url} playsInline loop preload="auto" className="hidden" />
      )}
      {project.audio.musicUrl && <audio ref={audioRef} src={project.audio.musicUrl} loop className="hidden" />}
    </div>
  )
})
