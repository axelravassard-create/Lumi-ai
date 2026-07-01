import { useCallback, useEffect, useRef, useState } from 'react'
import type { BeatKind, Project } from '../../lib/studio/types'
import { loadCurrent, newProject, saveProject } from '../../lib/studio/projects'
import { captureCover, downloadBlob, exportClip } from '../../lib/studio/export'
import { warmTTS } from '../../lib/studio/tts'
import { sharedCtx } from '../../lib/studio/audio'
import { StudioPreview, type PreviewHandle } from './StudioPreview'
import { Timeline } from './Timeline'
import {
  AudioPanel,
  BackgroundPanel,
  CaptionPanel,
  CharacterPanel,
  ContentPanel,
  FormatPanel,
  PresetPanel,
  ProjectsPanel,
} from './StudioPanels'

interface Props {
  onBack: () => void
}

type Tab = 'fond' | 'contenu' | 'captions' | 'perso' | 'audio' | 'format' | 'presets' | 'projets'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'fond', label: 'Fond', icon: '🎬' },
  { id: 'contenu', label: 'Contenu', icon: '🎯' },
  { id: 'captions', label: 'Captions', icon: '💬' },
  { id: 'perso', label: 'Perso', icon: '🤖' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'format', label: 'Format', icon: '📐' },
  { id: 'presets', label: 'Presets', icon: '✨' },
  { id: 'projets', label: 'Projets', icon: '📁' },
]

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'clip'

export function ClipStudio({ onBack }: Props) {
  const [project, setProject] = useState<Project>(() => {
    const c = loadCurrent()
    if (!c) return newProject()
    // Les médias (object-URLs) ne survivent pas à un rechargement : on repart propre.
    if (c.background && !c.background.url) c.background = null
    if (!c.audio.musicUrl) c.audio = { ...c.audio, musicName: '' }
    return c
  })
  const [tab, setTab] = useState<Tab>('contenu')
  const [playing, setPlaying] = useState(false)
  const [seek, setSeek] = useState(0)
  const [uiTime, setUiTime] = useState(0)
  const [selectedBeat, setSelectedBeat] = useState<BeatKind | null>(null)
  const timeRef = useRef(0)
  const previewRef = useRef<PreviewHandle>(null)

  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')

  useEffect(() => {
    warmTTS()
  }, [])

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
    setSeek((s) => (s >= project.duration - 0.05 ? 0 : s))
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
        onProgress: setProgress,
        onStatus: setStatus,
      })
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `blumi-${slug(project.script.metier)}.${ext}`)
    } catch (e) {
      console.error(e)
      setStatus('Erreur d\'export ✕')
    } finally {
      h.setExportMode(false)
      setExporting(false)
      previewRef.current?.drawFrame(seek)
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
    const p = { project, onChange: setProject }
    switch (tab) {
      case 'fond': return <BackgroundPanel {...p} />
      case 'contenu': return <ContentPanel {...p} />
      case 'captions': return <CaptionPanel {...p} />
      case 'perso': return <CharacterPanel {...p} />
      case 'audio': return <AudioPanel {...p} />
      case 'format': return <FormatPanel {...p} />
      case 'presets': return <PresetPanel {...p} />
      case 'projets': return <ProjectsPanel {...p} onSave={doSave} />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950 text-white">
      {/* Barre du haut */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <button onClick={onBack} className="rounded-lg px-2.5 py-1.5 text-sm text-white/70 hover:bg-white/10">← Quitter</button>
        <div className="flex items-center gap-2 font-display text-sm font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs">B</span>
          Blumi Clip Studio
        </div>
        <input
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          className="ml-2 rounded-lg bg-white/5 px-2 py-1 text-sm text-white/90 outline-none focus:bg-white/10"
        />
        <div className="ml-auto flex items-center gap-2">
          <button onClick={doSave} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">💾 Enregistrer</button>
          <button onClick={exportCover} disabled={exporting} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-40">🖼️ Cover</button>
          <button onClick={runExport} disabled={exporting} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-bold hover:bg-brand-400 disabled:opacity-50">
            {exporting ? 'Export…' : '⬇️ Exporter MP4'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Aperçu */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <StudioPreview ref={previewRef} project={project} playing={playing} seek={seek} onUiTime={onUiTime} onEnded={onEnded} />
          </div>

          {/* Transport + timeline */}
          <div className="border-t border-white/10 bg-ink-900/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={playing ? pause : play} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-bold hover:bg-brand-400">
                {playing ? '⏸ Pause' : '▶︎ Lecture'}
              </button>
              <button onClick={restart} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">↺</button>
              <span className="ml-1 text-xs tabular-nums text-white/60">{uiTime.toFixed(2)}s / {project.duration.toFixed(1)}s</span>
              {status && <span className="ml-auto text-xs text-brand-200">{status}</span>}
            </div>
            <div className="[&_*]:text-white">
              <Timeline
                project={project}
                time={uiTime}
                onChange={(beats) => setProject({ ...project, beats })}
                onSeek={scrub}
                onSelect={setSelectedBeat}
                selected={selectedBeat}
              />
            </div>
          </div>
        </div>

        {/* Panneaux d'édition */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-white/10 bg-white text-ink-900">
          <div className="flex flex-wrap gap-1 border-b border-ink-100 p-2">
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
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{panel()}</div>
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
