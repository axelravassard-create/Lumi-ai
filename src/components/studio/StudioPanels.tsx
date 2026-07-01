import { useMemo, useRef, useState } from 'react'
import type { Fmt, Project } from '../../lib/studio/types'
import { PROFESSIONS } from '../../lib/professions'
import { analyze } from '../../lib/engine'
import { HOOKS, CTAS, PIVOTS, PRESETS } from '../../lib/studio/library'
import { riskEmoji } from '../../lib/studio/script'
import { deleteProject, duplicateProject, listProjects, newProject } from '../../lib/studio/projects'
import { Row, Section, Segmented, Slider } from './ui'

type P = { project: Project; onChange: (p: Project) => void }

// ── Fond vidéo ───────────────────────────────────────────────────────────────
export function BackgroundPanel({ project, onChange }: P) {
  const fileRef = useRef<HTMLInputElement>(null)
  const bg = project.background

  const load = (file: File) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.src = url
    v.onloadedmetadata = () => {
      onChange({
        ...project,
        background: {
          name: file.name,
          url,
          duration: v.duration || 15,
          trimIn: 0,
          trimOut: v.duration || 15,
          crop: { zoom: 1, x: 0, y: 0 },
          volume: 0,
        },
      })
    }
  }

  return (
    <Section title="🎬 Vidéo de fond">
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) load(f)
        }}
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 p-5 text-center text-sm text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
      >
        {bg ? `📼 ${bg.name}` : 'Glisse un reel ici, ou clique pour importer'}
      </div>

      {bg && (
        <div className="space-y-3">
          <Row label="Début (trim in)" hint={`${bg.trimIn.toFixed(1)}s`}>
            <Slider value={bg.trimIn} min={0} max={Math.max(0.1, bg.duration)} step={0.1} onChange={(v) => onChange({ ...project, background: { ...bg, trimIn: Math.min(v, bg.trimOut - 0.5) } })} />
          </Row>
          <Row label="Fin (trim out)" hint={`${bg.trimOut.toFixed(1)}s`}>
            <Slider value={bg.trimOut} min={0.5} max={bg.duration} step={0.1} onChange={(v) => onChange({ ...project, background: { ...bg, trimOut: Math.max(v, bg.trimIn + 0.5) } })} />
          </Row>
          <Row label="Zoom" hint={`${bg.crop.zoom.toFixed(2)}×`}>
            <Slider value={bg.crop.zoom} min={0.5} max={2.5} onChange={(v) => onChange({ ...project, background: { ...bg, crop: { ...bg.crop, zoom: v } } })} />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Position X">
              <Slider value={bg.crop.x} min={-1} max={1} onChange={(v) => onChange({ ...project, background: { ...bg, crop: { ...bg.crop, x: v } } })} />
            </Row>
            <Row label="Position Y">
              <Slider value={bg.crop.y} min={-1} max={1} onChange={(v) => onChange({ ...project, background: { ...bg, crop: { ...bg.crop, y: v } } })} />
            </Row>
          </div>
          <Row label="Volume du fond" hint={`${Math.round(bg.volume * 100)}%`}>
            <Slider value={bg.volume} min={0} max={1} onChange={(v) => onChange({ ...project, background: { ...bg, volume: v } })} />
          </Row>
          <button onClick={() => onChange({ ...project, background: null })} className="text-xs font-semibold text-red-500 hover:underline">
            Retirer la vidéo
          </button>
        </div>
      )}
    </Section>
  )
}

// ── Métier + score + script (hook / CTA / actions) ───────────────────────────
export function ContentPanel({ project, onChange }: P) {
  const s = project.script
  const [q, setQ] = useState(s.metier)
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    return PROFESSIONS.filter((p) => p.label.toLowerCase().includes(n) || p.keywords.some((k) => k.includes(n))).slice(0, 6)
  }, [q])

  const setScript = (patch: Partial<typeof s>) => onChange({ ...project, script: { ...s, ...patch } })

  const applyMetier = (label: string) => {
    const a = analyze(label)
    setQ(label)
    setScript({ metier: label, score: a.currentRisk, level: a.level, verdictLabel: `{SCORE}% exposé ${riskEmoji(a.currentRisk)}` })
    onChange({ ...project, name: label, script: { ...s, metier: label, score: a.currentRisk, level: a.level, verdictLabel: `{SCORE}% exposé ${riskEmoji(a.currentRisk)}` } })
  }

  return (
    <Section title="🎯 Métier & score">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setScript({ metier: e.target.value })
          }}
          placeholder="Ex. Comptable, Graphiste…"
          className="field"
        />
        {matches.length > 0 && q !== s.metier && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
            {matches.map((m) => (
              <button key={m.id} onClick={() => applyMetier(m.label)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50">
                <span>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Row label="Score d'exposition (override)" hint={`${s.score}% ${riskEmoji(s.score)}`}>
        <Slider value={s.score} min={1} max={99} step={1} onChange={(v) => setScript({ score: Math.round(v), verdictLabel: `{SCORE}% exposé ${riskEmoji(v)}` })} />
      </Row>

      <h3 className="pt-2 font-display text-sm font-bold text-ink-900">✍️ Script</h3>

      <Row label="Hook (accroche)">
        <select value={HOOKS.includes(s.hook) ? s.hook : '__custom'} onChange={(e) => e.target.value !== '__custom' && setScript({ hook: e.target.value })} className="field mb-1">
          {HOOKS.map((hk) => <option key={hk} value={hk}>{hk}</option>)}
          <option value="__custom">Personnalisé…</option>
        </select>
        <input value={s.hook} onChange={(e) => setScript({ hook: e.target.value })} className="field" />
      </Row>

      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={s.abTest} onChange={(e) => setScript({ abTest: e.target.checked })} className="accent-brand-600" />
        Tester un 2ᵉ hook en A/B
      </label>
      {s.abTest && (
        <Row label="Hook B">
          <input value={s.hookB} onChange={(e) => setScript({ hookB: e.target.value })} className="field" />
        </Row>
      )}

      <Row label="Libellé du scan"><input value={s.scanLabel} onChange={(e) => setScript({ scanLabel: e.target.value })} className="field" /></Row>
      <Row label="Verdict (pastille)"><input value={s.verdictLabel} onChange={(e) => setScript({ verdictLabel: e.target.value })} className="field" /></Row>
      <Row label="Pivot (espoir)">
        <select value={PIVOTS.includes(s.pivot) ? s.pivot : '__c'} onChange={(e) => e.target.value !== '__c' && setScript({ pivot: e.target.value })} className="field mb-1">
          {PIVOTS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="__c">Personnalisé…</option>
        </select>
        <input value={s.pivot} onChange={(e) => setScript({ pivot: e.target.value })} className="field" />
      </Row>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-ink-600">3 actions (solution)</span>
        {s.actions.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input value={a.icon} onChange={(e) => setScript({ actions: s.actions.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })} className="field w-14 text-center" />
            <input value={a.text} onChange={(e) => setScript({ actions: s.actions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} className="field flex-1" />
          </div>
        ))}
      </div>

      <Row label="CTA (comment-bait)">
        <select value={CTAS.includes(s.cta) ? s.cta : '__c'} onChange={(e) => e.target.value !== '__c' && setScript({ cta: e.target.value })} className="field mb-1">
          {CTAS.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__c">Personnalisé…</option>
        </select>
        <input value={s.cta} onChange={(e) => setScript({ cta: e.target.value })} className="field" />
      </Row>
    </Section>
  )
}

// ── Captions ─────────────────────────────────────────────────────────────────
export function CaptionPanel({ project, onChange }: P) {
  const c = project.caption
  const set = (patch: Partial<typeof c>) => onChange({ ...project, caption: { ...c, ...patch } })
  return (
    <Section title="💬 Captions karaoké">
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={c.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="accent-brand-600" />
        Afficher les sous-titres
      </label>
      <Row label="Style">
        <Segmented value={c.style} onChange={(v) => set({ style: v })} options={[{ value: 'tiktok', label: 'TikTok' }, { value: 'hormozi', label: 'Hormozi' }, { value: 'neon', label: 'Néon' }]} />
      </Row>
      <Row label="Position verticale" hint={`${Math.round(c.posY * 100)}%`}>
        <Slider value={c.posY} min={0} max={1} onChange={(v) => set({ posY: v })} />
      </Row>
      <Row label="Taille" hint={`${c.scale.toFixed(2)}×`}>
        <Slider value={c.scale} min={0.6} max={1.6} onChange={(v) => set({ scale: v })} />
      </Row>
    </Section>
  )
}

// ── Personnage ───────────────────────────────────────────────────────────────
export function CharacterPanel({ project, onChange }: P) {
  const c = project.character
  const set = (patch: Partial<typeof c>) => onChange({ ...project, character: { ...c, ...patch } })
  return (
    <Section title="🤖 Personnage">
      <Row label="Palier final (après glow-up)">
        <Segmented value={c.tier} onChange={(v) => set({ tier: v })} options={[{ value: 'blumi', label: 'Blumi' }, { value: 'blumiman', label: 'Blumiman' }, { value: 'bluminator', label: 'Bluminator' }]} />
      </Row>
      <Row label="Style d'entrée">
        <Segmented value={c.entrance} onChange={(v) => set({ entrance: v })} options={[{ value: 'pop', label: 'Pop' }, { value: 'slide', label: 'Slide' }, { value: 'zoom', label: 'Zoom' }]} />
      </Row>
      <Row label="Échelle" hint={`${c.scale.toFixed(2)}×`}>
        <Slider value={c.scale} min={0.5} max={1.8} onChange={(v) => set({ scale: v })} />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Position X"><Slider value={c.x} min={-1} max={1} onChange={(v) => set({ x: v })} /></Row>
        <Row label="Position Y"><Slider value={c.y} min={-1} max={1} onChange={(v) => set({ y: v })} /></Row>
      </div>
    </Section>
  )
}

// ── Audio ────────────────────────────────────────────────────────────────────
export function AudioPanel({ project, onChange }: P) {
  const a = project.audio
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<typeof a>) => onChange({ ...project, audio: { ...a, ...patch } })
  return (
    <Section title="🔊 Audio">
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={a.voice} onChange={(e) => set({ voice: e.target.checked })} className="accent-brand-600" />
        Voix off (TTS FR) — aperçu uniquement
      </label>
      <Row label="Débit de la voix" hint={`${a.voiceRate.toFixed(2)}×`}>
        <Slider value={a.voiceRate} min={0.8} max={1.5} onChange={(v) => set({ voiceRate: v })} />
      </Row>

      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={a.sfx} onChange={(e) => set({ sfx: e.target.checked })} className="accent-brand-600" />
        Effets sonores (pop, riser, sting…)
      </label>
      <Row label="Volume SFX" hint={`${Math.round(a.sfxVolume * 100)}%`}>
        <Slider value={a.sfxVolume} min={0} max={1} onChange={(v) => set({ sfxVolume: v })} />
      </Row>

      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) set({ musicUrl: URL.createObjectURL(f), musicName: f.name })
      }} />
      <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full !py-2 text-sm">
        {a.musicName ? `🎵 ${a.musicName}` : '🎵 Importer une musique'}
      </button>
      {a.musicUrl && (
        <Row label="Volume musique" hint={`${Math.round(a.musicVolume * 100)}%`}>
          <Slider value={a.musicVolume} min={0} max={1} onChange={(v) => set({ musicVolume: v })} />
        </Row>
      )}
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={a.duck} onChange={(e) => set({ duck: e.target.checked })} className="accent-brand-600" />
        Ducking auto (baisse la musique sous la voix)
      </label>
    </Section>
  )
}

// ── Format & plateforme ──────────────────────────────────────────────────────
export function FormatPanel({ project, onChange }: P) {
  return (
    <Section title="📐 Format & safe zones">
      <Row label="Format">
        <Segmented value={project.fmt} onChange={(v: Fmt) => onChange({ ...project, fmt: v })} options={[{ value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }]} />
      </Row>
      <Row label="Repères plateforme">
        <Segmented value={project.platform} onChange={(v) => onChange({ ...project, platform: v })} options={[{ value: 'tiktok', label: 'TikTok' }, { value: 'reels', label: 'Reels' }, { value: 'shorts', label: 'Shorts' }]} />
      </Row>
      <Row label="Durée totale" hint={`${project.duration.toFixed(1)}s`}>
        <Slider value={project.duration} min={8} max={30} step={0.5} onChange={(v) => onChange({ ...project, duration: v })} />
      </Row>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={project.showSafeZones} onChange={(e) => onChange({ ...project, showSafeZones: e.target.checked })} className="accent-brand-600" />
        Afficher les safe zones (aperçu)
      </label>
    </Section>
  )
}

// ── Presets ──────────────────────────────────────────────────────────────────
export function PresetPanel({ project, onChange }: P) {
  return (
    <Section title="✨ Presets de cinématique">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange({ ...project, preset: preset.id, duration: preset.duration, beats: preset.beats.map((b) => ({ ...b })), script: { ...project.script, ...preset.patch } })}
          className={`w-full rounded-2xl border p-3 text-left transition ${project.preset === preset.id ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white hover:border-brand-200'}`}
        >
          <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
            <span className="text-lg">{preset.emoji}</span> {preset.name}
          </div>
          <p className="mt-0.5 text-xs text-ink-500">{preset.desc}</p>
        </button>
      ))}
    </Section>
  )
}

// ── Projets ──────────────────────────────────────────────────────────────────
export function ProjectsPanel({ project, onChange, onSave }: P & { onSave: () => void }) {
  const [, force] = useState(0)
  const projects = listProjects()
  return (
    <Section title="📁 Projets">
      <button onClick={onSave} className="btn-primary w-full !py-2.5 text-sm">💾 Enregistrer ce projet</button>
      <div className="flex gap-2">
        <button onClick={() => onChange(newProject())} className="btn-ghost flex-1 !py-2 text-xs">➕ Nouveau</button>
        <button onClick={() => onChange(duplicateProject(project))} className="btn-ghost flex-1 !py-2 text-xs">⧉ Dupliquer</button>
      </div>
      <div className="space-y-1.5">
        {projects.map((p) => (
          <div key={p.id} className={`flex items-center gap-2 rounded-xl border p-2 ${p.id === project.id ? 'border-brand-300 bg-brand-50' : 'border-ink-100'}`}>
            <button onClick={() => onChange({ ...p })} className="flex-1 truncate text-left text-sm font-semibold text-ink-800">{p.name || 'Sans titre'}</button>
            <button onClick={() => { deleteProject(p.id); force((n) => n + 1) }} className="text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
        {!projects.length && <p className="text-xs text-ink-400">Aucun projet enregistré.</p>}
      </div>
    </Section>
  )
}
