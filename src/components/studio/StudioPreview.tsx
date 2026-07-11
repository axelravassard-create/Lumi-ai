import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { AvatarLiveState, AvatarMood, AvatarState, PoseName, PropName } from '../avatar/RobotAvatar'
import type { Crop, Project } from '../../lib/studio/types'
import { PROP_ZOOM, fmtSize } from '../../lib/studio/types'
import { evalFrame } from '../../lib/studio/timeline'
import { evalPresentation, presProsody, presSfxMarkers, segProps, segmentLine } from '../../lib/studio/presentation'
import { avatarRect, drawBackground, drawEmptyBackground, presAvatarRect, renderOverlay, renderPresentation } from '../../lib/studio/render'
import { musicGain, playSfx, sfxMarkers, sharedCtx, syncMusicPlayback } from '../../lib/studio/audio'
import type { SfxMarker } from '../../lib/studio/audio'
import { voiceLineFor } from '../../lib/studio/script'
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
  pose?: PoseName
  props: PropName[]
  propsKey: string // signature de `props` pour comparer sans churn
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
  const [control, setControl] = useState<Control>({ glasses: false, laptop: false, mood: 'neutral', speaking: false, state: 'idle', props: [], propsKey: '' })
  const controlRef = useRef(control)
  controlRef.current = control
  const projectRef = useRef(project)
  projectRef.current = project
  const exportRef = useRef(false)
  // Canal impératif vers l'avatar 3D : mis à jour chaque frame (déterministe),
  // pilote pose/humeur/parole/accessoires de façon fiable (la réconciliation R3F
  // des props en rendu continu n'est pas fiable).
  const accRef = useRef<AvatarLiveState>({ glasses: false, laptop: false, props: [], pose: undefined, mood: 'neutral', speaking: false })
  // Cache des images de fond (mode présentation) — décodées une fois par URL.
  const bgImagesRef = useRef<Record<string, HTMLImageElement>>({})
  // Canvas hors-écran pour l'effet de flou (on rend la scène dedans puis on la
  // recompose floutée dans le maître — `ctx.filter` s'applique au drawImage).
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fxCanvas = (): HTMLCanvasElement => {
    let c = fxCanvasRef.current
    if (!c) {
      c = document.createElement('canvas')
      fxCanvasRef.current = c
    }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    return c
  }

  // (Re)charge les images de fond de la présentation quand la liste change.
  useEffect(() => {
    const cache = bgImagesRef.current
    for (const bg of project.presentation.backgrounds) {
      if (!bg.url) continue
      const ex = cache[bg.id]
      if (!ex || ex.dataset.url !== bg.url) {
        const img = new Image()
        img.dataset.url = bg.url
        img.src = bg.url
        cache[bg.id] = img
      }
    }
    // Redessine à l'arrêt une fois l'image chargée.
    for (const bg of project.presentation.backgrounds) {
      const img = cache[bg.id]
      if (img && !img.complete) img.onload = () => { if (!playing) drawFrame(seek) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.presentation.backgrounds])

  // Récupère le <canvas> WebGL du personnage (pour le compositing).
  const avatarCanvas = () => {
    if (!avatarCanvasRef.current && avatarBoxRef.current) {
      avatarCanvasRef.current = avatarBoxRef.current.querySelector('canvas')
    }
    return avatarCanvasRef.current
  }

  // Récupère l'image de fond décodée pour un id (ou null).
  const bgImage = (id: string | null): HTMLImageElement | null => {
    if (!id) return null
    const img = bgImagesRef.current[id]
    return img && img.complete && img.naturalWidth > 0 ? img : null
  }
  const bgCrop = (id: string | null): Crop => {
    const bg = projectRef.current.presentation.backgrounds.find((b) => b.id === id)
    return bg?.crop ?? { zoom: 1, x: 0, y: 0 }
  }

  // Synchronise les props (discrètes) du personnage → déclenche un re-render R3F
  // seulement si quelque chose change.
  const syncControl = (next: Control) => {
    const c = controlRef.current
    if (
      c.glasses !== next.glasses || c.laptop !== next.laptop || c.mood !== next.mood ||
      c.speaking !== next.speaking || c.state !== next.state || c.pose !== next.pose || c.propsKey !== next.propsKey
    ) {
      controlRef.current = next
      setControl(next)
    }
  }

  // Compose une frame complète du mode PRÉSENTATION à l'instant t.
  const drawPresentationFrame = (ctx: CanvasRenderingContext2D, p: Project, t: number) => {
    const f = evalPresentation(p, t)
    const a = accRef.current
    a.glasses = f.glasses; a.laptop = f.laptop; a.props = f.props; a.pose = f.pose; a.mood = f.mood; a.speaking = f.speaking
    syncControl({ glasses: f.glasses, laptop: f.laptop, mood: f.mood, speaking: f.speaking, state: 'idle', pose: f.pose, props: f.props.map((p) => p.name), propsKey: f.props.map((p) => `${p.name}${p.dx}${p.dy}${p.scale}`).join('|') })

    // Volume musique : fenêtre (from→to) + fondus + ducking sous la voix.
    const music = audioRef.current
    if (music && p.audio.musicUrl) music.volume = musicGain(p.audio, p.duration, t, f.speaking)

    // Scène (fond + personnage) : dessinée dans un contexte cible (le maître, ou un
    // canvas hors-écran quand on la floute avant de la recomposer).
    const drawScene = (dctx: CanvasRenderingContext2D) => {
      dctx.clearRect(0, 0, w, h)
      // Fond : diapo courante en fondu par-dessus la précédente (défilé de diapos).
      // Couche du dessous = fond précédent (ou dégradé si aucun).
      const prev = bgImage(f.bgPrevId)
      if (prev) drawBackground(dctx, prev, bgCrop(f.bgPrevId), w, h)
      else drawEmptyBackground(dctx, w, h)
      // Couche du dessus = fond courant qui apparaît (bgFade) + Ken Burns (zoom/pan
      // lent). Si pas d'image et pas de fond précédent → dégradé ; sinon on laisse la
      // couche du dessous visible.
      const cur = bgImage(f.bgId)
      dctx.save()
      dctx.globalAlpha = f.bgFade
      if (cur) {
        const base = bgCrop(f.bgId)
        drawBackground(dctx, cur, { zoom: base.zoom * f.bgZoom, x: base.x + f.bgPanX, y: base.y }, w, h)
      } else if (!prev) drawEmptyBackground(dctx, w, h)
      dctx.restore()

      // Personnage posé.
      const av = avatarCanvas()
      if (av && av.width > 0 && f.avatarAlpha > 0.001) {
        const r = presAvatarRect(p, f, w, h)
        dctx.save()
        dctx.globalAlpha = f.avatarAlpha
        dctx.drawImage(av, r.x, r.y, r.w, r.h)
        dctx.restore()
      }
    }

    // Effets d'écran (secousse / flou / noir & blanc) appliqués à la scène. La
    // secousse décale le rendu ; le flou et le noir & blanc passent par un canvas
    // hors-écran recomposé avec `ctx.filter` (léger sur-cadrage pour éviter les
    // bords sombres révélés par le flou/la secousse).
    const fx = f.fx
    const sh = fx.shake > 0.001 ? fx.shake * 34 : 0
    const sx = sh ? (Math.random() - 0.5) * sh : 0
    const sy = sh ? (Math.random() - 0.5) * sh : 0
    ctx.clearRect(0, 0, w, h)
    if (fx.blur > 0.001 || fx.gray > 0.001) {
      const tmp = fxCanvas()
      const tctx = tmp.getContext('2d')!
      drawScene(tctx)
      ctx.save()
      const parts: string[] = []
      if (fx.blur > 0.001) parts.push(`blur(${(fx.blur * 16).toFixed(1)}px)`)
      if (fx.gray > 0.001) parts.push(`grayscale(${Math.min(1, fx.gray).toFixed(3)})`)
      ctx.filter = parts.join(' ')
      const pad = Math.max(fx.blur > 0.001 ? 10 : 0, sh)
      ctx.drawImage(tmp, sx - pad, sy - pad, w + pad * 2, h + pad * 2)
      ctx.restore()
    } else if (sx || sy) {
      ctx.save()
      ctx.translate(sx, sy)
      drawScene(ctx)
      ctx.restore()
    } else {
      drawScene(ctx)
    }

    renderPresentation(ctx, f, p, w, h, { safeZones: !exportRef.current && p.showSafeZones, watermark: true })

    // Voile plein écran par-dessus tout (fondu noir / flash blanc) + vignette.
    if (fx.vignette > 0.001) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, `rgba(0,0,0,${(0.88 * Math.min(1, fx.vignette)).toFixed(3)})`)
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
    if (fx.black > 0.001) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, fx.black)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
    if (fx.white > 0.001) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, fx.white)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  // Compose une frame complète dans le canvas maître à l'instant t.
  const drawFrame = (t: number) => {
    const master = masterRef.current
    if (!master) return
    const ctx = master.getContext('2d')
    if (!ctx) return
    const p = projectRef.current
    if (p.mode === 'presentation') {
      drawPresentationFrame(ctx, p, t)
      return
    }
    const f = evalFrame(p, t)

    // Synchronise les props (discrètes) du personnage.
    {
      const a = accRef.current
      a.glasses = f.glasses; a.laptop = f.laptop; a.props = []; a.pose = undefined; a.mood = f.mood; a.speaking = f.speaking
    }
    syncControl({
      glasses: f.glasses,
      laptop: f.laptop,
      mood: f.mood,
      speaking: f.speaking,
      state: f.phase === 'scan' ? 'thinking' : 'idle',
      pose: undefined,
      props: [],
      propsKey: '',
    })

    // Volume musique : fenêtre (from→to) + fondus + ducking sous la voix.
    const music = audioRef.current
    if (music && p.audio.musicUrl) music.volume = musicGain(p.audio, p.duration, t, f.speaking)

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

    // Personnage (couche WebGL composée). Caché dans les trous sans moment.
    const av = avatarCanvas()
    if (av && av.width > 0 && f.avatarAlpha > 0.001) {
      const r = avatarRect(p, f, w, h)
      ctx.save()
      ctx.globalAlpha = f.avatarAlpha
      ctx.drawImage(av, r.x, r.y, r.w, r.h)
      ctx.restore()
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

  // Aperçu à l'arrêt : le personnage 3D est rendu en continu (canvas WebGL séparé)
  // et met un instant à rejoindre pose/humeur/accessoires. On recompose donc le
  // maître EN CONTINU tant qu'on est en pause → l'aperçu reflète toujours l'état
  // vivant du personnage (transitions de pose, changement d'objet, etc.). Lit
  // `projectRef.current` à chaque frame → les éditions se voient sans redémarrer.
  const settle = (t: number) => {
    let raf = 0
    const step = () => {
      drawFrame(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }

  // Positionne la vidéo de fond (lecture synchronisée ou seek pour le scrubbing).
  const syncVideo = (t: number, isPlaying: boolean) => {
    const v = videoRef.current
    const bg = projectRef.current.background
    // En mode présentation, les fonds sont des images (pas de vidéo à caler).
    if (projectRef.current.mode === 'presentation' || !v || !bg) return
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
      // Aperçu figé sur la position de scrubbing (avec settle de pose).
      syncVideo(seek, false)
      const cancel = settle(seek)
      stopTTS()
      audioRef.current?.pause()
      return cancel
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
    // ⚠️ Les bruitages sont déclenchés DEPUIS la boucle de lecture (horloge audio
    // vive), pas planifiés d'un coup à l'avance : sinon, si le contexte est encore
    // suspendu/à peine réveillé au moment du Play (surtout iOS), les sons planifiés
    // sont avalés → on n'entend rien. Ici chaque bruitage est joué pile quand la
    // lecture atteint son instant, avec le contexte réellement en marche.
    const sfxOn = !!p.audio.sfx
    const sfxVol = p.audio.sfxVolume ?? 1
    const markers: SfxMarker[] = sfxOn
      ? (p.mode === 'presentation' ? presSfxMarkers(p) : sfxMarkers(p)).slice().sort((a, b) => a.time - b.time)
      : []
    let sfxIdx = 0
    while (sfxIdx < markers.length && markers[sfxIdx].time < startOffset - 0.02) sfxIdx++
    if (p.audio.voice && p.mode === 'presentation') {
      // Voix off calée sur chaque segment (diapo), avec émotion (hauteur/débit
      // selon la pose et la ponctuation) pour un rendu plus vivant.
      for (const s of p.presentation.segments) {
        const text = segmentLine(s, p)
        if (!text || s.start < startOffset - 0.05) continue
        const pr = presProsody(s, p)
        ttsTimers.push(
          window.setTimeout(
            () => speak(text, pr.rate, p.audio.voiceVolume, s.voice || p.audio.voiceName, pr.pitch),
            (s.start - startOffset) * 1000,
          ),
        )
      }
    } else if (p.audio.voice) {
      for (const b of p.beats) {
        if (b.enabled === false) continue
        const { text, voice } = voiceLineFor(b.id, p.script)
        const at = b.start
        if (!text || at < startOffset - 0.05) continue
        ttsTimers.push(
          window.setTimeout(
            () => speak(text, p.audio.voiceRate, p.audio.voiceVolume, voice || p.audio.voiceName),
            (at - startOffset) * 1000,
          ),
        )
      }
    }
    const music = audioRef.current
    if (music && p.audio.musicUrl) syncMusicPlayback(music, p.audio, p.duration, startOffset)
    syncVideo(startOffset, true)

    const loop = () => {
      const t = (performance.now() - start) / 1000
      if (t >= p.duration) {
        drawFrame(p.duration)
        onEnded()
        return
      }
      if (music && p.audio.musicUrl) syncMusicPlayback(music, p.audio, p.duration, t)
      // Déclenche les bruitages dont l'instant vient de passer (horloge audio vive).
      if (actx && sfxOn) {
        while (sfxIdx < markers.length && markers[sfxIdx].time <= t) {
          playSfx(actx, markers[sfxIdx].kind, actx.currentTime + 0.01, actx.destination, sfxVol)
          sfxIdx++
        }
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

  // À l'édition (projet modifié, à l'arrêt) : re-cale la vidéo de fond. Le maître
  // est déjà recomposé en continu par la boucle de pause (qui lit le projet frais)
  // → pas besoin d'y relancer une seconde boucle.
  useEffect(() => {
    if (!playing) syncVideo(seek, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  const aspect = useMemo(() => `${w} / ${h}`, [w, h])
  // Zoom-arrière constant si la présentation utilise au moins un accessoire (pour
  // loger chapeaux/pointeurs sans rien couper). Constant sur toute la présentation
  // → la tête ne change jamais de taille (aucun à-coup au changement de diapo).
  const presZoom = useMemo(
    () => (project.mode === 'presentation' && project.presentation.segments.some((s) => segProps(s).length > 0) ? PROP_ZOOM : 1),
    [project.mode, project.presentation.segments],
  )

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
            pose={control.pose}
            props={control.props}
            bodyScale={presZoom}
            accessoryRef={accRef}
            interactive={false}
            capture
            active
            staticGaze
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

      {/* Médias sources : invisibles mais PAS display:none (sinon iOS ne décode
          pas les images de la vidéo → fond figé dans l'aperçu et l'export). */}
      {project.background?.url && (
        <video
          ref={videoRef}
          src={project.background.url}
          playsInline
          muted
          loop
          preload="auto"
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
          aria-hidden
        />
      )}
      {project.audio.musicUrl && <audio ref={audioRef} src={project.audio.musicUrl} loop className="hidden" />}
    </div>
  )
})
