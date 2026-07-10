import { useCallback, useEffect, useRef, useState } from 'react'
import type { BeatKind, Project } from '../../lib/studio/types'
import { compactBeats, loadCurrent, newProject, normalizeDuration, saveProject } from '../../lib/studio/projects'
import { captureCover, downloadBlob, exportClip } from '../../lib/studio/export'
import { warmTTS } from '../../lib/studio/tts'
import { sharedCtx } from '../../lib/studio/audio'
import { analyze } from '../../lib/engine'
import { riskEmoji } from '../../lib/studio/script'
import { POSE_LIST, presDuration } from '../../lib/studio/presentation'
import { StudioPreview, type PreviewHandle } from './StudioPreview'
import { Timeline } from './Timeline'
import {
  AudioPanel,
  BackgroundPanel,
  CaptionPanel,
  CharacterPanel,
  ContentPanel,
  BeatsPanel,
  FormatPanel,
  IdeasPanel,
  PresentationPanel,
  PresetPanel,
  ProjectsPanel,
  QueuePanel,
  SocialPanel,
} from './StudioPanels'

interface Props {
  onBack: () => void
}

type Tab = 'reel' | 'idees' | 'fond' | 'contenu' | 'moments' | 'captions' | 'perso' | 'audio' | 'format' | 'presets' | 'reseaux' | 'file' | 'projets'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'reel', label: 'Reel', icon: '📊' },
  { id: 'idees', label: 'Idées', icon: '💡' },
  { id: 'fond', label: 'Fond', icon: '🎬' },
  { id: 'contenu', label: 'Contenu', icon: '🎯' },
  { id: 'moments', label: 'Moments', icon: '🎞️' },
  { id: 'captions', label: 'Captions', icon: '💬' },
  { id: 'perso', label: 'Perso', icon: '🤖' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'format', label: 'Format', icon: '📐' },
  { id: 'presets', label: 'Presets', icon: '✨' },
  { id: 'reseaux', label: 'Réseaux', icon: '📣' },
  { id: 'file', label: 'File', icon: '🗂️' },
  { id: 'projets', label: 'Projets', icon: '📁' },
]

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'clip'

// iPhone / iPad (y compris iPad qui se fait passer pour un Mac).
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
}

// Bandeau de diapos (mode présentation) : aperçu proportionnel + tête de lecture,
// cliquable pour se positionner. L'édition fine se fait dans le panneau « Reel ».
function PresentationStrip({ project, time, onSeek }: { project: Project; time: number; onSeek: (t: number) => void }) {
  const total = Math.max(0.1, presDuration(project))
  const segs = project.presentation.segments
  return (
    <div className="space-y-1">
      <div className="relative flex h-11 w-full gap-0.5 overflow-hidden rounded-lg bg-white/5">
        {segs.map((s) => {
          const meta = POSE_LIST.find((p) => p.pose === s.pose)
          return (
            <button
              key={s.id}
              onClick={() => onSeek(s.start + 0.01)}
              title={`${meta?.label ?? s.pose} · ${s.dur.toFixed(1)}s`}
              className="flex min-w-0 items-center justify-center rounded-md bg-brand-500/25 text-sm hover:bg-brand-500/40"
              style={{ flex: `${s.dur} 0 0%` }}
            >
              <span className="truncate px-1">{meta?.emoji}</span>
            </button>
          )
        })}
        {!segs.length && <div className="grid w-full place-items-center text-xs text-white/40">Ajoute des diapos dans l’onglet « Reel »</div>}
        <div className="pointer-events-none absolute top-0 h-full w-0.5 bg-white" style={{ left: `${(time / total) * 100}%` }} />
      </div>
    </div>
  )
}

export function ClipStudio({ onBack }: Props) {
  const [project, setProject] = useState<Project>(() => {
    const c = loadCurrent()
    if (!c) return newProject()
    // Les médias (object-URLs) ne survivent pas à un rechargement : on repart propre.
    if (c.background && !c.background.url) c.background = null
    if (!c.audio.musicUrl) c.audio = { ...c.audio, musicName: '' }
    return normalizeDuration(c)
  })
  const [tab, setTab] = useState<Tab>('contenu')
  const [playing, setPlaying] = useState(false)
  const [seek, setSeek] = useState(0)
  const [uiTime, setUiTime] = useState(0)
  const [selectedBeat, setSelectedBeat] = useState<BeatKind | null>(null)
  const timeRef = useRef(0)
  const previewRef = useRef<PreviewHandle>(null)
  const projectRef = useRef(project)
  projectRef.current = project
  const playingRef = useRef(playing)
  playingRef.current = playing
  const exportingRef = useRef(false)

  const [exporting, setExporting] = useState(false)
  exportingRef.current = exporting
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [saved, setSaved] = useState(false) // pastille « enregistré » (auto-save)

  useEffect(() => {
    warmTTS()
  }, [])

  // ── Enregistrement AUTOMATIQUE ────────────────────────────────────────────
  // Chaque modif du projet est sauvegardée (localStorage) après un court délai,
  // + à la fermeture/mise en arrière-plan → on ne perd jamais son travail.
  // (Les médias — vidéo/musique/images — ne sont pas persistés : à ré-importer.)
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false // ne pas ré-enregistrer le projet fraîchement chargé
      return
    }
    const id = window.setTimeout(() => {
      saveProject(projectRef.current)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    }, 700)
    return () => window.clearTimeout(id)
  }, [project])

  // Filet de sécurité : enregistre immédiatement si on quitte/masque l'onglet.
  useEffect(() => {
    const flush = () => saveProject(projectRef.current)
    const onVis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Toute édition passe par ici : la durée vidéo est reliée aux moments (si auto).
  const applyProject = useCallback((p: Project) => setProject(normalizeDuration(p)), [])

  const onUiTime = useCallback((t: number) => {
    timeRef.current = t
    setUiTime(t)
  }, [])

  const onEnded = useCallback(() => {
    setPlaying(false)
    setSeek(0)
    setUiTime(0)
    timeRef.current = 0
  }, [])

  const play = () => {
    sharedCtx() // débloque l'audio
    setSeek((s) => (s >= projectRef.current.duration - 0.05 ? 0 : s))
    setPlaying(true)
  }
  const pause = () => {
    setSeek(timeRef.current)
    setUiTime(timeRef.current)
    setPlaying(false)
  }
  const restart = () => {
    setPlaying(false)
    setSeek(0)
    setUiTime(0)
    timeRef.current = 0
    requestAnimationFrame(() => setPlaying(true))
  }
  const scrub = (t: number) => {
    setPlaying(false)
    setSeek(t)
    setUiTime(t)
    timeRef.current = t
  }
  // Avance/recul image par image (0,1 s ; ±1 s avec Maj).
  const step = (delta: number) => {
    scrub(Math.max(0, Math.min(projectRef.current.duration, timeRef.current + delta)))
  }

  // Raccourcis clavier d'éditeur (hors saisie de texte).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      if (exportingRef.current) return
      if (e.code === 'Space') {
        e.preventDefault()
        playingRef.current ? pause() : play()
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        step(e.shiftKey ? 1 : 0.1)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        step(e.shiftKey ? -1 : -0.1)
      } else if (e.code === 'Home') {
        e.preventDefault()
        scrub(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSave = () => {
    saveProject(project)
    setStatus('Projet enregistré ✓')
    setTimeout(() => setStatus(''), 2000)
  }

  const runExport = async () => {
    const h = previewRef.current
    if (!h || !h.master) return
    setPlaying(false)
    setExporting(true)
    setProgress(0)
    setStatus('Préparation…')
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      h.setExportMode(true)
      const blob = await exportClip({
        canvas: h.master,
        drawFrame: h.drawFrame,
        project,
        musicEl: h.audio,
        videoEl: h.video,
        // iOS : vidéo seule (l'ajout d'une piste audio fait échouer l'export sur iPhone).
        includeAudio: !isIOS(),
        onProgress: setProgress,
        onStatus: setStatus,
      })
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `blumi-${slug(project.script.metier)}.${ext}`)
    } catch (e) {
      console.error(e)
      // Message clair si le navigateur ne sait pas capturer le canvas.
      const msg = e instanceof Error && /captureStream/.test(e.message)
        ? 'Ton navigateur ne permet pas l\'export vidéo. Essaie une autre app ou un ordinateur.'
        : 'Erreur d\'export ✕'
      setStatus(msg)
      setTimeout(() => setStatus(''), 6000)
    } finally {
      h.setExportMode(false)
      setExporting(false)
      previewRef.current?.drawFrame(seek)
    }
  }

  // Export en lot : un clip par métier de la file.
  const runQueue = async (metiers: string[]) => {
    const h = previewRef.current
    if (!h || !h.master || !metiers.length) return
    setPlaying(false)
    setExporting(true)
    const base = projectRef.current
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      for (let i = 0; i < metiers.length; i++) {
        const label = metiers[i]
        const a = analyze(label)
        const np: Project = {
          ...base,
          name: label,
          script: { ...base.script, metier: label, score: a.currentRisk, level: a.level, verdictLabel: `{SCORE}% exposé ${riskEmoji(a.currentRisk)}` },
        }
        setProject(np)
        // Laisse l'aperçu (et l'avatar) se mettre à jour avant de capturer.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        setProgress(0)
        h.setExportMode(true)
        const blob = await exportClip({
          canvas: h.master,
          drawFrame: h.drawFrame,
          project: np,
          musicEl: h.audio,
          videoEl: h.video,
          includeAudio: !isIOS(),
          onProgress: setProgress,
          onStatus: (st) => setStatus(`Clip ${i + 1}/${metiers.length} · ${label} · ${st}`),
        })
        h.setExportMode(false)
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        downloadBlob(blob, `blumi-${slug(label)}.${ext}`)
      }
      setStatus(`File terminée ✓ (${metiers.length} clips)`)
    } catch (e) {
      console.error(e)
      setStatus('Erreur d\'export de la file ✕')
    } finally {
      h.setExportMode(false)
      setProject(base)
      setExporting(false)
      requestAnimationFrame(() => previewRef.current?.drawFrame(0))
    }
  }

  const exportCover = async () => {
    const h = previewRef.current
    if (!h || !h.master) return
    const w = project.beats.find((b) => b.id === 'verdict')
    const t = w ? w.start + w.dur * 0.6 : 4
    h.setExportMode(true)
    await new Promise((r) => requestAnimationFrame(() => { h.drawFrame(t); requestAnimationFrame(r) }))
    const cover = await captureCover(h.master)
    h.setExportMode(false)
    h.drawFrame(seek)
    if (cover) downloadBlob(cover, `blumi-cover-${slug(project.script.metier)}.png`)
  }

  const panel = () => {
    const p = { project, onChange: applyProject }
    switch (tab) {
      case 'reel': return <PresentationPanel {...p} />
      case 'idees': return <IdeasPanel {...p} />
      case 'fond': return <BackgroundPanel {...p} />
      case 'contenu': return <ContentPanel {...p} />
      case 'moments': return <BeatsPanel {...p} onCompact={() => { applyProject(compactBeats(projectRef.current)); scrub(0) }} />
      case 'captions': return <CaptionPanel {...p} />
      case 'perso': return <CharacterPanel {...p} />
      case 'audio': return <AudioPanel {...p} />
      case 'format': return <FormatPanel {...p} />
      case 'presets': return <PresetPanel {...p} />
      case 'reseaux': return <SocialPanel {...p} />
      case 'file': return <QueuePanel {...p} onRunQueue={runQueue} busy={exporting} />
      case 'projets': return <ProjectsPanel {...p} onSave={doSave} />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950 text-white">
      {/* Barre du haut */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button onClick={onBack} className="rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/10">←<span className="hidden sm:inline"> Quitter</span></button>
        <div className="hidden items-center gap-2 font-display text-sm font-bold sm:flex">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs">B</span>
          Blumi Clip Studio
        </div>
        <input
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1 text-sm text-white/90 outline-none focus:bg-white/10 sm:ml-2 sm:w-44 sm:flex-none"
        />
        <span className={`hidden text-xs transition-opacity sm:inline ${saved ? 'text-emerald-300 opacity-100' : 'text-white/30 opacity-100'}`}>
          {saved ? '✓ Enregistré' : '⤳ Auto'}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={doSave} title="Enregistré automatiquement — clique pour forcer" className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-semibold hover:bg-white/20">💾<span className="hidden sm:inline"> Enregistrer</span></button>
          <button onClick={exportCover} disabled={exporting} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-40">🖼️<span className="hidden sm:inline"> Cover</span></button>
          <button onClick={runExport} disabled={exporting} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-bold hover:bg-brand-400 disabled:opacity-50">
            {exporting ? 'Export…' : <>⬇️<span className="hidden sm:inline"> Exporter MP4</span></>}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Aperçu */}
        <div className="flex shrink-0 flex-col lg:min-w-0 lg:flex-1 lg:shrink lg:overflow-hidden">
          <div className="flex h-[46vh] shrink-0 items-center justify-center p-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:p-4">
            <StudioPreview ref={previewRef} project={project} playing={playing} seek={seek} onUiTime={onUiTime} onEnded={onEnded} />
          </div>

          {/* Transport + timeline */}
          <div className="border-t border-white/10 bg-ink-900/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={() => step(-0.1)} title="Recul (←)" className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20">⏪</button>
              <button onClick={playing ? pause : play} title="Lecture/Pause (Espace)" className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-bold hover:bg-brand-400">
                {playing ? '⏸ Pause' : '▶︎ Lecture'}
              </button>
              <button onClick={() => step(0.1)} title="Avance (→)" className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20">⏩</button>
              <button onClick={restart} title="Rejouer" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">↺</button>
              <span className="ml-1 text-xs tabular-nums text-white/60">{uiTime.toFixed(2)}s / {project.duration.toFixed(1)}s</span>
              <span className="ml-2 hidden text-[11px] text-white/30 md:inline">Espace lecture · ← → image · Maj = 1 s · Début = 0</span>
              {status && <span className="ml-auto text-xs text-brand-200">{status}</span>}
            </div>
            {project.mode === 'presentation' ? (
              <PresentationStrip project={project} time={uiTime} onSeek={scrub} />
            ) : (
              <div className="[&_*]:text-white">
                <Timeline
                  project={project}
                  time={uiTime}
                  onChange={(beats) => applyProject({ ...project, beats })}
                  onSeek={scrub}
                  onSelect={setSelectedBeat}
                  selected={selectedBeat}
                />
              </div>
            )}
          </div>
        </div>

        {/* Panneaux d'édition */}
        <aside className="flex w-full shrink-0 flex-col border-t border-white/10 bg-white text-ink-900 lg:w-[340px] lg:border-l lg:border-t-0">
          <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-ink-100 bg-white p-2">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${tab === tb.id ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100'}`}
              >
                {tb.icon} {tb.label}
              </button>
            ))}
          </div>
          <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{panel()}</div>
        </aside>
      </div>

      {/* Overlay de progression d'export */}
      {exporting && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-950/80 backdrop-blur">
          <div className="w-80 rounded-3xl bg-white p-6 text-center text-ink-900 shadow-glow">
            <div className="mb-3 font-display text-lg font-bold">Export en cours…</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="mt-2 text-sm text-ink-500">{status} · {Math.round(progress * 100)}%</div>
            <p className="mt-3 text-xs text-ink-400">Garde cet onglet au premier plan pendant l'enregistrement.</p>
          </div>
        </div>
      )}
    </div>
  )
}
