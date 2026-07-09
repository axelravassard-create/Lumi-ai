import { useEffect, useMemo, useRef, useState } from 'react'
import type { BeatKind, Fmt, PresSegment, Project } from '../../lib/studio/types'
import { BEAT_ORDER } from '../../lib/studio/types'
import {
  ENTRANCE_LIST, POSE_LIST, PROP_LIST, SFX_LIST, TIER_LIST, addBackgroundToSegment, addSegment, addSfxCue,
  duplicateSegment, fitPresentationToVoice, moveSegment, poseLabel, presDuration, presProsody, removeSegment,
  removeSfxCue, segProps, segmentLine, sfxCuesForSegment, tierOf, toggleProp, updateSegment, updateSfxCue,
} from '../../lib/studio/presentation'
import { playSfx, sharedCtx } from '../../lib/studio/audio'
import { BEAT_META } from './Timeline'
import { ANGLES, PLATFORMS, SOCIAL_2026, SOURCES_2026, generatePost, platform, type PlatformKey } from '../../lib/studio/social'
import { aiReady, describeError, generateReelIdeas } from '../../lib/llm'
import { applyIdea, getDailyIdea, setDailyIdea, type ReelIdea } from '../../lib/studio/ideas'
import { PROFESSIONS } from '../../lib/professions'
import { analyze } from '../../lib/engine'
import { HOOKS, CTAS, PIVOTS, PRESETS } from '../../lib/studio/library'
import { interpolate, riskEmoji, voiceLineFor } from '../../lib/studio/script'
import { estimateSpeechSec, listVoices, speak } from '../../lib/studio/tts'
import { deleteProject, duplicateProject, fitToVoice, listProjects, newProject, setBeatDur, setBeatStart } from '../../lib/studio/projects'
import { Row, Section, Segmented, Slider } from './ui'

type P = { project: Project; onChange: (p: Project) => void }

// Voix TTS disponibles (dépend du navigateur/OS), rechargées si la liste change.
function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const load = () => setVoices(listVoices())
    load()
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener('voiceschanged', load)
      return () => speechSynthesis.removeEventListener('voiceschanged', load)
    }
  }, [])
  return voices
}

// Bouton « écouter » (TTS) une réplique.
function Listen({ text, project }: { text: string; project: Project }) {
  return (
    <button
      type="button"
      onClick={() => speak(interpolate(text, project.script.metier, project.script.score), project.audio.voiceRate, project.audio.voiceVolume)}
      title="Écouter cette réplique"
      className="shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-500 hover:border-brand-300 hover:text-brand-600"
    >
      🔊
    </button>
  )
}

const FACTOR_LABELS: Record<string, string> = {
  routine: 'Routine', digital: 'Numérique', creativity: 'Créativité', empathy: 'Empathie',
  physical: 'Physique', judgment: 'Jugement', social: 'Social',
}

// Les 7 facteurs d'exposition du métier détecté (informatif, lecture seule).
function FactorBars({ metier }: { metier: string }) {
  const factors = useMemo(() => {
    if (!metier.trim()) return null
    return analyze(metier).profession.factors as unknown as Record<string, number>
  }, [metier])
  if (!factors) return null
  return (
    <div className="space-y-1.5 rounded-xl bg-ink-50 p-3">
      <div className="text-xs font-semibold text-ink-600">7 facteurs du métier détecté</div>
      {Object.entries(FACTOR_LABELS).map(([k, label]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-[11px] text-ink-500">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${factors[k] ?? 0}%` }} />
          </div>
          <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-ink-400">{Math.round(factors[k] ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}

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
      <FactorBars metier={s.metier} />

      <h3 className="pt-2 font-display text-sm font-bold text-ink-900">✍️ Script</h3>

      <Row label="Hook (accroche)">
        <select value={HOOKS.includes(s.hook) ? s.hook : '__custom'} onChange={(e) => e.target.value !== '__custom' && setScript({ hook: e.target.value })} className="field mb-1">
          {HOOKS.map((hk) => <option key={hk} value={hk}>{hk}</option>)}
          <option value="__custom">Personnalisé…</option>
        </select>
        <div className="flex gap-2">
          <input value={s.hook} onChange={(e) => setScript({ hook: e.target.value })} className="field" />
          <Listen text={s.hook} project={project} />
        </div>
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

      <Row label="Libellé du scan">
        <div className="flex gap-2">
          <input value={s.scanLabel} onChange={(e) => setScript({ scanLabel: e.target.value })} className="field" />
          <Listen text={s.scanLabel} project={project} />
        </div>
      </Row>
      <Row label="Verdict (pastille)"><input value={s.verdictLabel} onChange={(e) => setScript({ verdictLabel: e.target.value })} className="field" /></Row>
      <Row label="Pivot (espoir)">
        <select value={PIVOTS.includes(s.pivot) ? s.pivot : '__c'} onChange={(e) => e.target.value !== '__c' && setScript({ pivot: e.target.value })} className="field mb-1">
          {PIVOTS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="__c">Personnalisé…</option>
        </select>
        <div className="flex gap-2">
          <input value={s.pivot} onChange={(e) => setScript({ pivot: e.target.value })} className="field" />
          <Listen text={s.pivot} project={project} />
        </div>
      </Row>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-ink-600">3 actions (solution)</span>
        {s.actions.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input value={a.icon} onChange={(e) => setScript({ actions: s.actions.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) })} className="field w-14 text-center" />
            <input value={a.text} onChange={(e) => setScript({ actions: s.actions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} className="field flex-1" />
            <Listen text={a.text} project={project} />
          </div>
        ))}
      </div>

      <Row label="CTA (comment-bait)">
        <select value={CTAS.includes(s.cta) ? s.cta : '__c'} onChange={(e) => e.target.value !== '__c' && setScript({ cta: e.target.value })} className="field mb-1">
          {CTAS.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__c">Personnalisé…</option>
        </select>
        <div className="flex gap-2">
          <input value={s.cta} onChange={(e) => setScript({ cta: e.target.value })} className="field" />
          <Listen text={s.cta} project={project} />
        </div>
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
      <Row label="Timing">
        <Segmented value={c.timing} onChange={(v) => set({ timing: v })} options={[{ value: 'auto', label: 'Auto (sur les beats)' }, { value: 'manual', label: 'Manuel' }]} />
      </Row>
      {c.timing === 'manual' && (
        <>
          <Row label="Décalage" hint={`${c.offset >= 0 ? '+' : ''}${c.offset.toFixed(2)}s`}>
            <Slider value={c.offset} min={-1} max={1} onChange={(v) => set({ offset: v })} />
          </Row>
          <Row label="Vitesse de défilement" hint={`${c.pace.toFixed(2)}×`}>
            <Slider value={c.pace} min={0.4} max={2.2} onChange={(v) => set({ pace: v })} />
          </Row>
        </>
      )}
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
      <Row label="Expression / humeur">
        <Segmented value={c.mood} onChange={(v) => set({ mood: v })} options={[{ value: 'auto', label: 'Auto' }, { value: 'neutral', label: '😐' }, { value: 'calm', label: '😌' }, { value: 'concerned', label: '😟' }]} />
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
  const s = project.script
  const voices = useVoices()
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<typeof a>) => onChange({ ...project, audio: { ...a, ...patch } })
  // Met à jour la voix off d'un beat (texte et/ou voix).
  const setVo = (id: (typeof BEAT_ORDER)[number], patch: { text?: string | undefined; voice?: string | undefined }) =>
    onChange({ ...project, script: { ...s, vo: { ...(s.vo || {}), [id]: { ...(s.vo?.[id] || {}), ...patch } } } })

  return (
    <Section title="🔊 Audio">
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={a.voice} onChange={(e) => set({ voice: e.target.checked })} className="accent-brand-600" />
        Voix off (TTS) — aperçu uniquement
      </label>
      <Row label="Voix">
        <select value={a.voiceName} onChange={(e) => set({ voiceName: e.target.value })} className="field">
          <option value="">Voix auto (français)</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>
          ))}
        </select>
      </Row>
      {voices.length === 0 && <p className="text-[11px] text-ink-400">Les voix se chargent selon ton navigateur/OS. Sur Mac, tu en as plusieurs en français (Thomas, Amélie…).</p>}
      <Row label="Débit de la voix" hint={`${a.voiceRate.toFixed(2)}×`}>
        <Slider value={a.voiceRate} min={0.8} max={1.5} onChange={(v) => set({ voiceRate: v })} />
      </Row>

      {/* Éditeur de voix off par réplique */}
      <div className="space-y-2 rounded-2xl bg-ink-50 p-3">
        <div className="text-xs font-bold text-ink-700">🎙️ Voix off (par réplique)</div>
        <p className="text-[11px] text-ink-400">Change ce que la voix dit (ajoute/enlève des mots). Laisse vide pour rendre la réplique muette ; « ↺ auto » remet le texte d'origine.</p>
        <button onClick={() => onChange(fitToVoice(project))} className="btn-ghost w-full !py-2 text-xs">
          ⏱️ Caler la durée des moments sur la voix off
        </button>
        <p className="text-[11px] text-ink-400">Astuce : si la voix est coupée, c'est qu'un moment est trop court. Ce bouton allonge chaque moment pour lui laisser le temps de finir (⚠️ = réplique qui déborde).</p>
        {BEAT_ORDER.map((id) => {
          const b = project.beats.find((x) => x.id === id)
          if (!b) return null
          const m = BEAT_META[id]
          const ov = s.vo?.[id]
          const shown = ov && ov.text !== undefined ? ov.text : voiceLineFor(id, s).text
          const off = b.enabled === false
          const est = a.voice ? estimateSpeechSec(shown, a.voiceRate) : 0
          const over = est > b.dur + 0.05
          return (
            <div key={id} className={`space-y-1 rounded-xl border bg-white p-2 ${over ? 'border-amber-300' : 'border-ink-100'} ${off ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
                <span>{m.emoji}</span> {m.label}{off && <span className="text-ink-400">(masqué)</span>}
                <span className={`ml-auto tabular-nums ${over ? 'text-amber-600' : 'text-ink-400'}`}>{est > 0 ? `${est.toFixed(1)}s / ${b.dur.toFixed(1)}s${over ? ' ⚠️' : ''}` : ''}</span>
                {ov && ov.text !== undefined && (
                  <button onClick={() => setVo(id, { text: undefined })} className="text-[10px] text-ink-400 hover:text-brand-600">↺ auto</button>
                )}
              </div>
              <div className="flex gap-1.5">
                <input value={shown} onChange={(e) => setVo(id, { text: e.target.value })} className="field !py-1.5 text-sm" />
                <button
                  onClick={() => speak(interpolate(shown, s.metier, s.score), a.voiceRate, a.voiceVolume, ov?.voice || a.voiceName)}
                  title="Écouter"
                  className="shrink-0 rounded-lg border border-ink-200 px-2 text-xs text-ink-500 hover:border-brand-300 hover:text-brand-600"
                >🔊</button>
              </div>
              {voices.length > 0 && (
                <select value={ov?.voice || ''} onChange={(e) => setVo(id, { voice: e.target.value || undefined })} className="field !py-1 text-[11px]">
                  <option value="">↳ voix globale</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </div>

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
        {project.autoDuration ? (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">🔗 Automatique : la vidéo dure exactement le temps de tes moments ({project.duration.toFixed(1)}s). Allonge un moment (ou « Caler sur la voix ») et la vidéo suit.</p>
        ) : (
          <Slider value={project.duration} min={8} max={40} step={0.5} onChange={(v) => onChange({ ...project, duration: v })} />
        )}
      </Row>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={project.autoDuration} onChange={(e) => onChange({ ...project, autoDuration: e.target.checked })} className="accent-brand-600" />
        Lier la durée de la vidéo aux moments
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={project.showSafeZones} onChange={(e) => onChange({ ...project, showSafeZones: e.target.checked })} className="accent-brand-600" />
        Afficher les safe zones (aperçu)
      </label>

      <h3 className="pt-2 font-display text-sm font-bold text-ink-900">🥁 Tempo</h3>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <input type="checkbox" checked={project.tempo.enabled} onChange={(e) => onChange({ ...project, tempo: { ...project.tempo, enabled: e.target.checked } })} className="accent-brand-600" />
        Grille de tempo + aimantation des beats
      </label>
      <Row label="BPM" hint={`${project.tempo.bpm}`}>
        <Slider value={project.tempo.bpm} min={60} max={180} step={1} onChange={(v) => onChange({ ...project, tempo: { ...project.tempo, bpm: Math.round(v) } })} />
      </Row>
    </Section>
  )
}

// ── Idées (actu IA → concept de réel) ────────────────────────────────────────
function IdeaCard({ idea, onApply }: { idea: ReelIdea; onApply: () => void }) {
  return (
    <div className="space-y-1.5 rounded-2xl border border-ink-100 bg-white p-3">
      {idea.info && <p className="text-xs text-ink-500">📰 {idea.info}</p>}
      <div className="font-display text-sm font-bold text-ink-900">« {idea.hook} »</div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">🎯 {idea.metier}</span>
        {idea.format && <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">🎬 {idea.format}</span>}
      </div>
      {idea.caption && <p className="text-[11px] italic text-ink-400">💬 {idea.caption}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button onClick={onApply} className="btn-primary !rounded-xl !px-3 !py-1.5 text-xs">Appliquer au projet</button>
        {idea.source && (
          <a href={idea.source.url} target="_blank" rel="noreferrer" className="truncate text-[11px] text-ink-400 underline hover:text-brand-600">source</a>
        )}
      </div>
    </div>
  )
}

export function IdeasPanel({ project, onChange }: P) {
  const [daily, setDaily] = useState<ReelIdea | null>(() => getDailyIdea())
  const [ideas, setIdeas] = useState<ReelIdea[]>([])
  const [loading, setLoading] = useState<'' | 'daily' | 'more'>('')
  const [error, setError] = useState('')
  const ready = aiReady()

  const genDaily = async () => {
    setLoading('daily')
    setError('')
    try {
      const list = await generateReelIdeas(1)
      if (list[0]) {
        setDailyIdea(list[0])
        setDaily(list[0])
      } else setError('Aucune idée trouvée, réessaie.')
    } catch (e) {
      setError(describeError(e))
    } finally {
      setLoading('')
    }
  }

  const genMore = async () => {
    setLoading('more')
    setError('')
    try {
      setIdeas(await generateReelIdeas(3))
    } catch (e) {
      setError(describeError(e))
    } finally {
      setLoading('')
    }
  }

  return (
    <Section title="💡 Idées">
      <p className="text-xs text-ink-500">Une actu IA récente transformée en concept de réel prêt à tourner. Idéal pour publier 1 clip/jour.</p>

      {!ready && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">Active l'IA (clé serveur ou personnelle) pour générer des idées à partir de l'actualité.</p>}

      {/* Idée du jour */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-brand-700">🗞️ Idée du jour</span>
          <button onClick={genDaily} disabled={!ready || loading !== ''} className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-500 disabled:opacity-40">
            {loading === 'daily' ? 'Recherche…' : daily ? 'Régénérer' : 'Générer'}
          </button>
        </div>
        {daily ? <IdeaCard idea={daily} onApply={() => onChange(applyIdea(project, daily))} /> : <p className="text-xs text-ink-400">Clique sur « Générer » : Blumi cherche une info IA du moment et t'en fait un concept.</p>}
      </div>

      {/* Plus d'idées */}
      <button onClick={genMore} disabled={!ready || loading !== ''} className="btn-ghost w-full !py-2 text-sm disabled:opacity-40">
        {loading === 'more' ? 'Recherche…' : '✨ Générer 3 idées de plus'}
      </button>
      {error && <p className="rounded-xl bg-red-50 p-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        {ideas.map((idea, i) => (
          <IdeaCard key={i} idea={idea} onApply={() => onChange(applyIdea(project, idea))} />
        ))}
      </div>
    </Section>
  )
}

// ── Réseaux (stratégie + légende + hashtags + angles) ────────────────────────
export function SocialPanel({ project, onChange }: P) {
  const [key, setKey] = useState<PlatformKey>('tiktok')
  const [copied, setCopied] = useState('')
  const info = platform(key)
  const post = useMemo(() => generatePost(project, key), [project, key])
  const [caption, setCaption] = useState(post.caption)
  useEffect(() => setCaption(post.caption), [post.caption])

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(label)
    setTimeout(() => setCopied(''), 1500)
  }

  const applyAngle = (a: (typeof ANGLES)[number]) => {
    let np = project
    if (a.presetId) {
      const pr = PRESETS.find((x) => x.id === a.presetId)
      if (pr) np = { ...np, preset: pr.id, duration: pr.duration, beats: pr.beats.map((b) => ({ ...b })), script: { ...np.script, ...pr.patch } }
    }
    if (a.hook) np = { ...np, script: { ...np.script, hook: a.hook } }
    onChange(np)
  }

  const hashLine = info.tags && post.hashtags.map((h) => '#' + h).join(' ')

  return (
    <Section title="📣 Réseaux">
      <p className="text-xs text-ink-500">Choisis un réseau : tu obtiens le format conseillé, la légende prête à coller, les hashtags et les bonnes pratiques.</p>

      {/* À retenir — données 2026 */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
        <div className="mb-1 text-xs font-bold text-brand-700">📌 À retenir (données 2026)</div>
        <ul className="space-y-1">
          {SOCIAL_2026.map((x, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-ink-600"><span className="text-brand-500">•</span>{x}</li>
          ))}
        </ul>
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-ink-400">
          Sources :
          {SOURCES_2026.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-brand-600">{s.label}</a>
          ))}
        </div>
      </div>

      {/* Plateforme */}
      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map((pf) => (
          <button
            key={pf.key}
            onClick={() => setKey(pf.key)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${key === pf.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'}`}
          >
            {pf.emoji} {pf.name}
          </button>
        ))}
      </div>

      {/* Format conseillé */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3 text-xs">
        <div><span className="text-ink-400">Format</span><div className="font-semibold text-ink-800">{info.ratio}</div></div>
        <div><span className="text-ink-400">Durée</span><div className="font-semibold text-ink-800">{info.length}</div></div>
        <div><span className="text-ink-400">Cadence</span><div className="font-semibold text-ink-800">{info.cadence}</div></div>
        <div><span className="text-ink-400">Créneau</span><div className="font-semibold text-ink-800">{info.best}</div></div>
      </div>

      {/* Légende prête à coller */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600">Légende</span>
          <button onClick={() => copy(caption, 'caption')} className="rounded-lg border border-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600">
            {copied === 'caption' ? 'Copié ✓' : '📋 Copier'}
          </button>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={8} className="field text-sm leading-relaxed" />
      </div>

      {/* Hashtags */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600">Hashtags</span>
          <button onClick={() => copy(hashLine || '', 'tags')} className="rounded-lg border border-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600">
            {copied === 'tags' ? 'Copié ✓' : '📋 Copier'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((h) => (
            <span key={h} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">#{h}</span>
          ))}
        </div>
      </div>

      {/* Bonnes pratiques */}
      <div>
        <span className="text-xs font-semibold text-ink-600">Ce qui marche sur {info.name}</span>
        <ul className="mt-1 space-y-1">
          {info.tips.map((tip, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-ink-600"><span className="text-brand-500">›</span>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Angles de contenu */}
      <div>
        <span className="text-xs font-semibold text-ink-600">Angles qui cartonnent (clic = appliquer)</span>
        <div className="mt-1 space-y-1.5">
          {ANGLES.map((a) => (
            <button key={a.title} onClick={() => applyAngle(a)} className="w-full rounded-xl border border-ink-100 p-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-800"><span>{a.emoji}</span>{a.title}</div>
              <div className="text-[11px] text-ink-500">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Moments (activer/retirer chaque beat) ────────────────────────────────────
export function BeatsPanel({ project, onChange, onCompact }: P & { onCompact: () => void }) {
  const setBeat = (id: BeatKind, enabled: boolean) =>
    onChange({ ...project, beats: project.beats.map((b) => (b.id === id ? { ...b, enabled } : b)) })
  const enabledCount = project.beats.filter((b) => b.enabled !== false).length
  return (
    <Section title="🎞️ Moments du clip">
      <p className="text-xs text-ink-500">Active/retire un moment, et règle précisément son <b>Début</b> (position dans le temps) et sa <b>Durée</b>. « Compacter » resserre tout bout à bout.</p>
      {BEAT_ORDER.map((id) => {
        const b = project.beats.find((x) => x.id === id)
        if (!b) return null
        const m = BEAT_META[id]
        const on = b.enabled !== false
        return (
          <div key={id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${on ? 'border-ink-100' : 'border-ink-100 bg-ink-50'}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg" style={{ background: on ? m.color : '#e5e7eb' }}>{m.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${on ? 'text-ink-800' : 'text-ink-400 line-through'}`}>{m.label}</div>
              {on ? (
                <div className="mt-1 space-y-1">
                  {/* Début : position du moment dans le temps */}
                  <div className="flex items-center gap-1">
                    <span className="w-11 shrink-0 text-[11px] text-ink-400">Début</span>
                    <button onClick={() => onChange(setBeatStart(project, id, b.start - 0.25))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">−</button>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={b.start}
                      onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(setBeatStart(project, id, v)) }}
                      className="field !w-16 !px-1 !py-1 text-center text-xs"
                    />
                    <span className="text-[11px] text-ink-400">s</span>
                    <button onClick={() => onChange(setBeatStart(project, id, b.start + 0.25))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">+</button>
                  </div>
                  {/* Durée du moment */}
                  <div className="flex items-center gap-1">
                    <span className="w-11 shrink-0 text-[11px] text-ink-400">Durée</span>
                    <button onClick={() => onChange(setBeatDur(project, id, b.dur - 0.25))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">−</button>
                    <input
                      type="number"
                      step={0.1}
                      min={0.3}
                      value={b.dur}
                      onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(setBeatDur(project, id, v)) }}
                      className="field !w-16 !px-1 !py-1 text-center text-xs"
                    />
                    <span className="text-[11px] text-ink-400">s</span>
                    <button onClick={() => onChange(setBeatDur(project, id, b.dur + 0.25))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">+</button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-ink-400">masqué</div>
              )}
            </div>
            <button
              onClick={() => setBeat(id, !on)}
              role="switch"
              aria-checked={on}
              className={`relative h-6 w-11 shrink-0 self-start rounded-full transition ${on ? 'bg-brand-500' : 'bg-ink-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        )
      })}
      <button onClick={onCompact} className="btn-ghost w-full !py-2 text-sm">↔️ Compacter la timeline ({enabledCount} moments)</button>
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

// ── File multi-métiers (export en lot) ───────────────────────────────────────
export function QueuePanel({ project, onRunQueue, busy }: P & { onRunQueue: (metiers: string[]) => void; busy: boolean }) {
  const [text, setText] = useState('Comptable\nGraphiste\nInfirmier·ère\nChauffeur·se')
  const metiers = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <Section title="🗂️ File multi-métiers">
      <p className="text-xs text-ink-500">Un métier par ligne. Le même montage sera exporté pour chacun (métier + score adaptés).</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        className="field font-mono text-sm"
        placeholder={'Comptable\nGraphiste\n…'}
      />
      <button
        onClick={() => onRunQueue(metiers)}
        disabled={busy || !metiers.length}
        className="btn-primary w-full !py-2.5 text-sm disabled:opacity-40"
      >
        {busy ? 'Export en cours…' : `⬇️ Exporter la file (${metiers.length} clips)`}
      </button>
      <p className="text-[11px] text-ink-400">Chaque clip est enregistré en temps réel : compte ~{project.duration.toFixed(0)} s par métier.</p>
    </Section>
  )
}

// ── Mode présentation (« 1 jour, 1 info ») ───────────────────────────────────
const rid = (p: string) => p + Math.random().toString(36).slice(2, 8)

function SegmentCard({ project, onChange, seg, index, count, voices }: P & { seg: PresSegment; index: number; count: number; voices: SpeechSynthesisVoice[] }) {
  const pm = project.presentation
  const bgRef = useRef<HTMLInputElement>(null)
  const bgName = seg.bgId ? pm.backgrounds.find((b) => b.id === seg.bgId)?.name ?? '—' : 'Dégradé'
  const line = segmentLine(seg, project)
  const est = estimateSpeechSec(line, project.audio.voiceRate)
  const tight = est > seg.dur + 0.05
  const meta = POSE_LIST.find((p) => p.pose === seg.pose)
  return (
    <div className="space-y-2 rounded-2xl border border-ink-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">{index + 1}</span>
        <span className="text-lg" title={poseLabel(seg.pose)}>{meta?.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">{poseLabel(seg.pose)}</span>
        <button onClick={() => onChange(moveSegment(project, seg.id, -1))} disabled={index === 0} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600 hover:bg-ink-200 disabled:opacity-30" title="Plus tôt">▲</button>
        <button onClick={() => onChange(moveSegment(project, seg.id, 1))} disabled={index === count - 1} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600 hover:bg-ink-200 disabled:opacity-30" title="Plus tard">▼</button>
        <button onClick={() => onChange(duplicateSegment(project, seg.id))} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600 hover:bg-ink-200" title="Dupliquer">⧉</button>
        <button onClick={() => onChange(removeSegment(project, seg.id))} className="rounded-md px-1.5 py-0.5 text-xs text-red-400 hover:text-red-600" title="Supprimer">✕</button>
      </div>

      {/* Pose */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-ink-400">Pose</span>
        <select
          value={seg.pose}
          onChange={(e) => onChange(updateSegment(project, seg.id, { pose: e.target.value as PresSegment['pose'] }))}
          className="field !py-1.5 text-sm"
        >
          {POSE_LIST.map((p) => <option key={p.pose} value={p.pose}>{p.emoji} {p.label}</option>)}
        </select>
      </div>

      {/* Texte dit + affiché */}
      <div className="flex items-start gap-2">
        <span className="w-14 shrink-0 pt-1.5 text-[11px] text-ink-400">Dit</span>
        <textarea
          value={seg.text}
          onChange={(e) => onChange(updateSegment(project, seg.id, { text: e.target.value }))}
          rows={2}
          placeholder="Ce que Blumi dit (et affiche mot à mot)…"
          className="field text-sm"
        />
        <button
          onClick={() => { const pr = presProsody(seg, project); speak(line, pr.rate, project.audio.voiceVolume, seg.voice || project.audio.voiceName, pr.pitch) }}
          title="Écouter (avec l'émotion de la pose)" className="shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-500 hover:border-brand-300 hover:text-brand-600"
        >🔊</button>
      </div>

      {/* Personnage + apparition */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-ink-400">Perso</span>
        <select
          value={tierOf(seg)}
          onChange={(e) => onChange(updateSegment(project, seg.id, { tier: e.target.value as PresSegment['tier'] }))}
          className="field !py-1.5 text-sm"
        >
          {TIER_LIST.map((tr) => <option key={tr.value} value={tr.value}>{tr.emoji} {tr.label}</option>)}
        </select>
        <select
          value={seg.entrance ?? 'none'}
          onChange={(e) => onChange(updateSegment(project, seg.id, { entrance: e.target.value as PresSegment['entrance'] }))}
          className="field !py-1.5 text-sm"
          title="Apparition au début de la diapo"
        >
          {ENTRANCE_LIST.map((en) => <option key={en.value} value={en.value}>↳ {en.label}</option>)}
        </select>
      </div>

      {/* Fond (par diapo) : choisir dans le pool OU importer directement ici */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-ink-400">Fond</span>
        <select
          value={seg.bgId ?? ''}
          onChange={(e) => onChange(updateSegment(project, seg.id, { bgId: e.target.value || null }))}
          className="field !py-1.5 text-sm"
          title={bgName}
        >
          <option value="">Dégradé (aucun)</option>
          {pm.backgrounds.map((b) => <option key={b.id} value={b.id}>🖼️ {b.name}</option>)}
        </select>
        <input
          ref={bgRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(addBackgroundToSegment(project, seg.id, { name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) })); e.target.value = '' }}
        />
        <button onClick={() => bgRef.current?.click()} title="Importer une image pour cette diapo" className="shrink-0 rounded-lg bg-brand-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-400">＋</button>
      </div>

      {/* Casier : objets attachés au personnage (plusieurs possibles à la fois) */}
      <div className="space-y-1">
        <span className="text-[11px] text-ink-400">🧰 Casier de Blumi <span className="text-ink-300">(plusieurs possibles)</span></span>
        <div className="flex flex-wrap gap-1">
          {PROP_LIST.map((pr) => {
            const active = segProps(seg)
            const on = pr.value === 'none' ? active.length === 0 : active.includes(pr.value)
            return (
              <button
                key={pr.value}
                onClick={() => onChange(toggleProp(project, seg.id, pr.value))}
                title={pr.value === 'none' ? 'Aucun objet' : pr.label}
                className={`grid h-8 w-8 place-items-center rounded-lg border text-base transition ${on ? 'border-brand-400 bg-brand-50' : 'border-ink-100 hover:border-brand-200'}`}
              >
                {pr.emoji}
              </button>
            )
          })}
        </div>
      </div>

      {/* Position dans la scène */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-ink-400">Position</span>
          <span className="w-4 text-[11px] text-ink-400">↔</span>
          <input type="range" min={-1} max={1} step={0.05} value={seg.x ?? 0}
            onChange={(e) => onChange(updateSegment(project, seg.id, { x: parseFloat(e.target.value) }))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600" />
          <span className="w-4 text-[11px] text-ink-400">↕</span>
          <input type="range" min={-1} max={1} step={0.05} value={seg.y ?? 0}
            onChange={(e) => onChange(updateSegment(project, seg.id, { y: parseFloat(e.target.value) }))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600" />
          {(seg.x || seg.y) ? (
            <button onClick={() => onChange(updateSegment(project, seg.id, { x: 0, y: 0 }))} title="Recentrer" className="shrink-0 text-[11px] text-ink-400 hover:text-brand-600">↺</button>
          ) : null}
        </div>
        {/* Profondeur (loin/petit ↔ proche/grand) */}
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-ink-400">Profondeur</span>
          <span className="w-4 text-[11px] text-ink-400" title="loin">🫥</span>
          <input type="range" min={-1} max={1} step={0.05} value={seg.z ?? 0}
            onChange={(e) => onChange(updateSegment(project, seg.id, { z: parseFloat(e.target.value) }))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600" />
          <span className="w-4 text-[11px] text-ink-400" title="proche">🔍</span>
          {seg.z ? (
            <button onClick={() => onChange(updateSegment(project, seg.id, { z: 0 }))} title="Distance normale" className="shrink-0 text-[11px] text-ink-400 hover:text-brand-600">↺</button>
          ) : null}
        </div>
      </div>

      {/* Voix (optionnelle) */}
      {voices.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-ink-400">Voix</span>
          <select
            value={seg.voice ?? ''}
            onChange={(e) => onChange(updateSegment(project, seg.id, { voice: e.target.value || undefined }))}
            className="field !py-1.5 text-sm"
          >
            <option value="">Voix globale</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* Bruitages placés sur la diapo (positionnés dans le temps) */}
      <div className="space-y-1.5 rounded-xl bg-ink-50 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink-500">🔊 Bruitages</span>
          <button onClick={() => onChange(addSfxCue(project, seg.id, 'pop', 0))} className="rounded-md bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-brand-400">+ Ajouter</button>
        </div>
        {sfxCuesForSegment(project, seg.id).map((cue) => (
          <div key={cue.id} className="flex items-center gap-1">
            <select
              value={cue.kind}
              onChange={(e) => onChange(updateSfxCue(project, cue.id, { kind: e.target.value as typeof cue.kind }))}
              className="field !py-1 text-xs"
            >
              {SFX_LIST.map((s) => <option key={s.kind} value={s.kind}>{s.emoji} {s.label} — {s.hint}</option>)}
            </select>
            <span className="text-[11px] text-ink-400">à</span>
            <button onClick={() => onChange(updateSfxCue(project, cue.id, { at: cue.at - 0.25 }))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">−</button>
            <input
              type="number" step={0.25} min={0} max={seg.dur} value={cue.at}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(updateSfxCue(project, cue.id, { at: v })) }}
              className="field !w-14 !px-1 !py-1 text-center text-xs"
            />
            <span className="text-[11px] text-ink-400">s</span>
            <button onClick={() => onChange(updateSfxCue(project, cue.id, { at: cue.at + 0.25 }))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">+</button>
            <button onClick={() => { const c = sharedCtx(); if (c) playSfx(c, cue.kind, c.currentTime + 0.02, c.destination, project.audio.sfxVolume) }} title="Écouter" className="shrink-0 rounded-md border border-ink-200 px-1.5 py-1 text-xs text-ink-500 hover:border-brand-300 hover:text-brand-600">🔊</button>
            <button onClick={() => onChange(removeSfxCue(project, cue.id))} title="Supprimer" className="shrink-0 px-1 text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* Durée */}
      <div className="flex items-center gap-1">
        <span className="w-14 shrink-0 text-[11px] text-ink-400">Durée</span>
        <button onClick={() => onChange(updateSegment(project, seg.id, { dur: seg.dur - 0.25 }))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">−</button>
        <input
          type="number" step={0.25} min={0.4} value={seg.dur}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(updateSegment(project, seg.id, { dur: v })) }}
          className="field !w-16 !px-1 !py-1 text-center text-xs"
        />
        <span className="text-[11px] text-ink-400">s</span>
        <button onClick={() => onChange(updateSegment(project, seg.id, { dur: seg.dur + 0.25 }))} className="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-ink-600 hover:bg-ink-200">+</button>
        <span className={`ml-2 text-[11px] tabular-nums ${tight ? 'text-amber-600' : 'text-ink-400'}`} title="Temps de parole estimé / durée">
          {tight ? '⚠️ ' : ''}voix ~{est.toFixed(1)}s
        </span>
      </div>
    </div>
  )
}

export function PresentationPanel({ project, onChange }: P) {
  const pm = project.presentation
  const voices = useVoices()
  const fileRef = useRef<HTMLInputElement>(null)
  const isPres = project.mode === 'presentation'

  const setPM = (patch: Partial<Project['presentation']>) => onChange({ ...project, presentation: { ...pm, ...patch } })

  const addBg = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files).map((f) => ({ id: rid('bg_'), name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), crop: { zoom: 1, x: 0, y: 0 } }))
    setPM({ backgrounds: [...pm.backgrounds, ...added] })
  }
  const removeBg = (id: string) =>
    onChange({
      ...project,
      presentation: {
        ...pm,
        backgrounds: pm.backgrounds.filter((b) => b.id !== id),
        segments: pm.segments.map((s) => (s.bgId === id ? { ...s, bgId: null } : s)),
      },
    })

  return (
    <Section title="📊 Présentation « 1 jour, 1 info »">
      {/* Choix du format de reel */}
      <Segmented
        options={[{ value: 'cinematic', label: '🎬 Cinématique' }, { value: 'presentation', label: '📊 Présentation' }]}
        value={project.mode}
        onChange={(v) => onChange({ ...project, mode: v })}
      />
      <p className="text-xs text-ink-500">
        Blumi enchaîne des <b>poses</b> en parlant devant des <b>fonds qui défilent</b> comme un diaporama. Le texte s’écrit au fil de la voix.
      </p>

      {!isPres && (
        <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
          Passe en mode <b>Présentation</b> ci-dessus pour voir ce montage dans l’aperçu.
        </p>
      )}

      {/* Titre */}
      <div className="space-y-2 rounded-2xl border border-ink-100 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600">Bandeau titre</span>
          <button
            onClick={() => setPM({ showTitle: !pm.showTitle })}
            role="switch" aria-checked={pm.showTitle}
            className={`relative h-6 w-11 rounded-full transition ${pm.showTitle ? 'bg-brand-500' : 'bg-ink-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${pm.showTitle ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        <input value={pm.title} onChange={(e) => setPM({ title: e.target.value })} placeholder="1 jour, 1 info · {METIER}" className="field text-sm" />
      </div>

      {/* Fonds (diaporama) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600">🖼️ Fonds ({pm.backgrounds.length})</span>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-400">+ Images</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addBg(e.target.files); e.target.value = '' }} />
        {pm.backgrounds.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {pm.backgrounds.map((b) => (
              <div key={b.id} className="group relative overflow-hidden rounded-xl border border-ink-100">
                {b.url ? <img src={b.url} alt={b.name} className="h-20 w-full object-cover" /> : <div className="grid h-20 w-full place-items-center bg-ink-100 text-[10px] text-ink-400">à ré-importer</div>}
                <div className="truncate px-1.5 py-1 text-[10px] text-ink-500">{b.name}</div>
                <button onClick={() => removeBg(b.id)} className="absolute right-1 top-1 rounded-md bg-black/50 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">✕</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink-400">Choisis un fond par diapo ci-dessous. Les images ne sont pas sauvegardées : ré-importe-les au besoin.</p>
      </div>

      {/* Segments (diapos) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600">🎞️ Diapos ({pm.segments.length}) · {presDuration(project).toFixed(1)}s</span>
          <button onClick={() => onChange(fitPresentationToVoice(project))} className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200" title="Ajuste chaque durée au temps de parole">⏱️ Caler sur la voix</button>
        </div>
        {pm.segments.map((s, i) => (
          <SegmentCard key={s.id} project={project} onChange={onChange} seg={s} index={i} count={pm.segments.length} voices={voices} />
        ))}
        <button onClick={() => onChange(addSegment(project))} className="btn-ghost w-full !py-2 text-sm">➕ Ajouter une diapo</button>
      </div>
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
