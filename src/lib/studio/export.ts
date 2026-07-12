// Export vidéo : compositing dans un canvas maître → captureStream + MediaRecorder
// (WebM), audio mixé (musique + SFX) via Web Audio, puis conversion WebM→MP4
// (H.264/AAC) via ffmpeg.wasm. Barre de progression via onProgress (0→1).
import type { Project } from './types'
import { scheduleMarkers, scheduleSfx, sharedCtx, syncMusicPlayback } from './audio'
import { presSfxMarkers } from './presentation'

export interface ExportHandle {
  canvas: HTMLCanvasElement
  // Dessine la frame de la timeline à l'instant t (fond + avatar + overlays).
  drawFrame: (t: number) => void
  project: Project
  musicEl?: HTMLAudioElement | null
  /** Vidéo de fond à faire jouer en temps réel pendant l'enregistrement (sinon figée). */
  videoEl?: HTMLVideoElement | null
  fps?: number
  /** Inclure la piste audio (musique+SFX). false sur iOS → vidéo seule, plus compatible. */
  includeAudio?: boolean
  onProgress?: (p: number) => void
  onStatus?: (s: string) => void
}

function pickMime(): string {
  // MP4 natif d'abord (Safari sait l'enregistrer directement → aucune conversion
  // ffmpeg nécessaire, donc pas de blocage). Sinon WebM (Chrome/Firefox → ffmpeg).
  const cands = [
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
  ]
  for (const c of cands) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  return 'video/webm'
}

// Enregistre l'aperçu en temps réel (WebM) puis convertit en MP4.
export async function exportClip(h: ExportHandle): Promise<Blob> {
  const { canvas, drawFrame, project, musicEl, videoEl } = h
  const fps = h.fps ?? 30
  const onProgress = h.onProgress ?? (() => {})
  const onStatus = h.onStatus ?? (() => {})
  const duration = project.duration

  onStatus('Préparation…')
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('captureStream non supporté par ce navigateur')
  }
  const stream = canvas.captureStream(fps)

  // ── Audio : musique + SFX mixés dans une piste capturable ─────────────────
  // Sur iOS, l'ajout d'une piste audio à un flux canvas fait souvent échouer
  // MediaRecorder → on peut exporter la vidéo SEULE (includeAudio: false).
  const actx = h.includeAudio === false ? null : sharedCtx()
  let musicPlaying = false
  if (actx) {
    try {
      const dest = actx.createMediaStreamDestination()
      const master = actx.createGain()
      master.gain.value = 1
      master.connect(dest)
      if (musicEl && project.audio.musicUrl) {
        try {
          const src = actx.createMediaElementSource(musicEl)
          const mg = actx.createGain()
          // Le niveau (volume + fenêtre + fondus + ducking) est porté par
          // musicEl.volume via drawFrame → gain unité ici (pas de double application).
          mg.gain.value = 1
          src.connect(mg).connect(master)
          musicPlaying = true
        } catch {
          /* déjà connectée */
        }
      }
      // SFX : cinématique = calés sur les beats ; présentation = bruitages placés
      // sur les diapos (positionnés dans le temps par l'utilisateur).
      const when0 = actx.currentTime + 0.15
      if (project.mode === 'presentation') {
        // Bruitages placés explicitement sur les diapos → toujours inclus (la case
        // « Effets sonores » ne pilote que les SFX auto de la cinématique).
        scheduleMarkers(actx, presSfxMarkers(project), when0, 0, master, project.audio.sfxVolume)
      } else {
        scheduleSfx(actx, project, when0, 0, master, 1)
      }
      for (const track of dest.stream.getAudioTracks()) stream.addTrack(track)
      // La lecture/position de la musique est pilotée dans la boucle d'enregistrement
      // (respecte le départ dans le morceau + la fenêtre from→to).
    } catch (e) {
      console.warn('Piste audio indisponible, export vidéo seule :', e)
    }
  }

  const mime = pickMime()
  const recordedMp4 = mime.includes('mp4')
  const chunks: BlobPart[] = []
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  // Fond vidéo : le jouer en temps réel pendant l'enregistrement, sinon il reste
  // figé sur une seule image dans l'export.
  const bg = project.background
  if (videoEl && bg && bg.url) {
    try {
      videoEl.loop = true
      videoEl.muted = true // pas de double audio ; autoplay muet autorisé (iOS)
      videoEl.currentTime = bg.trimIn || 0
      await videoEl.play().catch(() => {})
    } catch { /* ignore */ }
  }

  const recorded = await new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: recordedMp4 ? 'video/mp4' : 'video/webm' }))
    // Timeslice : force MediaRecorder à écrire des données régulièrement (plus
    // fiable, surtout sur mobile où un flush unique à l'arrêt peut être vide).
    rec.start(500)
    onStatus('Enregistrement…')
    const start = performance.now()
    const loop = () => {
      const t = (performance.now() - start) / 1000
      if (t >= duration) {
        drawFrame(duration)
        musicEl?.pause()
        videoEl?.pause()
        try { rec.requestData() } catch { /* ignore */ }
        setTimeout(() => { try { rec.stop() } catch { /* ignore */ } }, 120)
        return
      }
      if (musicPlaying && musicEl) syncMusicPlayback(musicEl, project.audio, duration, t)
      drawFrame(t)
      // Enregistrement = 0→98% si pas de conversion (MP4 natif), sinon 0→60%.
      onProgress((t / duration) * (recordedMp4 ? 0.98 : 0.6))
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })

  if (recorded.size === 0) throw new Error('Enregistrement vide (captureStream)')

  // MP4 natif (Safari) : terminé, aucune conversion.
  if (recordedMp4) {
    onStatus('Terminé ✓')
    onProgress(1)
    return recorded
  }

  // ── Conversion WebM → MP4 (H.264/AAC) via ffmpeg.wasm (Chrome/Firefox) ─────
  onStatus('Chargement du convertisseur…')
  try {
    const mp4 = await toMp4(recorded, (p) => onProgress(0.6 + p * 0.4), onStatus)
    onStatus('Terminé ✓')
    onProgress(1)
    return mp4
  } catch (e) {
    // Repli : si ffmpeg échoue ou traîne trop, on rend le WebM tel quel.
    console.warn('Conversion MP4 impossible, export WebM :', e)
    onStatus('Export WebM (MP4 indisponible sur ce navigateur)')
    onProgress(1)
    return recorded
  }
}

let ffmpegPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null
// Cœur ffmpeg (mono-thread, sans SharedArrayBuffer) chargé depuis un CDN, avec
// repli si le premier est indisponible.
const FFMPEG_CDNS = [
  'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',
]
async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ff = new FFmpeg()
      let lastErr: unknown
      for (const base of FFMPEG_CDNS) {
        try {
          await ff.load({
            coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
          })
          return ff
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr
    })()
    // Ne pas mémoriser un échec : autorise une nouvelle tentative au prochain export.
    ffmpegPromise.catch(() => {
      ffmpegPromise = null
    })
  }
  return ffmpegPromise
}

async function toMp4(webm: Blob, onProgress: (p: number) => void, onStatus: (s: string) => void, timeoutMs = 300_000): Promise<Blob> {
  const ff = await getFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')
  const prog = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)))
  ff.on('progress', prog)
  onStatus('Conversion MP4… (peut prendre 1–2 min, garde l\'onglet ouvert)')
  await ff.writeFile('in.webm', await fetchFile(webm))
  // preset ultrafast : bien plus rapide en mono-thread wasm (fichier un peu plus
  // gros mais parfait pour les réseaux). Timeout de sécurité → jamais bloqué.
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { ff.terminate() } catch { /* ignore */ }
      ffmpegPromise = null // force un rechargement propre au prochain export
      reject(new Error('Conversion trop longue (timeout)'))
    }, timeoutMs)
  })
  try {
    await Promise.race([
      ff.exec([
        '-i', 'in.webm',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        'out.mp4',
      ]),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
    ff.off('progress', prog)
  }
  const data = (await ff.readFile('out.mp4')) as Uint8Array
  const ab = new ArrayBuffer(data.byteLength)
  new Uint8Array(ab).set(data)
  return new Blob([ab], { type: 'video/mp4' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Génère une miniature (cover) accrocheuse à un instant donné (PNG).
export function captureCover(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
