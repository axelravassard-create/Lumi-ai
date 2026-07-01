// Design sonore : SFX synthétisés à la volée (Web Audio) calés sur les beats,
// + mixage pour l'export (musique + SFX). Volumes réglables, ducking auto.
//
// ⚠️ La voix off (SpeechSynthesis) sort directement sur les haut-parleurs et
// n'est PAS routable dans Web Audio → elle est jouée à l'APERÇU mais n'est pas
// capturée dans le MP4 exporté. L'emplacement pour brancher une voix API (buffer
// audio réel, lui, mixable) est prévu dans tts.ts.
import type { BeatDef, BeatKind, Project } from './types'

export type SfxKind = 'pop' | 'riser' | 'sting' | 'shimmer' | 'whoosh'

let shared: AudioContext | null = null
export function sharedCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!shared) shared = new AC()
  if (shared.state === 'suspended') shared.resume().catch(() => {})
  return shared
}

// ── Synthèse d'un SFX à un instant `at` (temps du contexte) ──────────────────
export function playSfx(ctx: AudioContext, kind: SfxKind, at: number, out: AudioNode, vol = 1) {
  const g = ctx.createGain()
  g.connect(out)
  switch (kind) {
    case 'pop': {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(320, at)
      o.frequency.exponentialRampToValueAtTime(880, at + 0.06)
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.5 * vol, at + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      o.connect(g)
      o.start(at)
      o.stop(at + 0.2)
      break
    }
    case 'riser': {
      const dur = 2.4
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(120, at)
      o.frequency.exponentialRampToValueAtTime(1400, at + dur)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(300, at)
      bp.frequency.exponentialRampToValueAtTime(3000, at + dur)
      bp.Q.value = 6
      g.gain.setValueAtTime(0.0001, at)
      g.gain.linearRampToValueAtTime(0.28 * vol, at + dur * 0.9)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      o.connect(bp).connect(g)
      o.start(at)
      o.stop(at + dur + 0.05)
      break
    }
    case 'sting': {
      // Boom grave + éclat métallique.
      const boom = ctx.createOscillator()
      boom.type = 'sine'
      boom.frequency.setValueAtTime(180, at)
      boom.frequency.exponentialRampToValueAtTime(45, at + 0.5)
      const bg = ctx.createGain()
      bg.gain.setValueAtTime(0.7 * vol, at)
      bg.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
      boom.connect(bg).connect(g)
      boom.start(at)
      boom.stop(at + 0.65)
      const hit = ctx.createOscillator()
      hit.type = 'square'
      hit.frequency.setValueAtTime(1200, at)
      hit.frequency.exponentialRampToValueAtTime(300, at + 0.15)
      const hg = ctx.createGain()
      hg.gain.setValueAtTime(0.25 * vol, at)
      hg.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
      hit.connect(hg).connect(g)
      hit.start(at)
      hit.stop(at + 0.25)
      break
    }
    case 'shimmer': {
      const notes = [880, 1174, 1568, 2093]
      notes.forEach((f, i) => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        const og = ctx.createGain()
        const s = at + i * 0.05
        og.gain.setValueAtTime(0.0001, s)
        og.gain.exponentialRampToValueAtTime(0.22 * vol, s + 0.02)
        og.gain.exponentialRampToValueAtTime(0.0001, s + 0.5)
        o.connect(og).connect(g)
        o.start(s)
        o.stop(s + 0.55)
      })
      break
    }
    case 'whoosh': {
      const dur = 0.5
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(400, at)
      bp.frequency.exponentialRampToValueAtTime(2400, at + dur)
      bp.Q.value = 2
      g.gain.setValueAtTime(0.35 * vol, at)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      src.connect(bp).connect(g)
      src.start(at)
      src.stop(at + dur)
      break
    }
  }
}

// Marqueurs SFX dérivés des beats (temps en secondes sur la timeline).
export interface SfxMarker {
  time: number
  kind: SfxKind
}
export function sfxMarkers(project: Project): SfxMarker[] {
  const w: Partial<Record<BeatKind, BeatDef>> = {}
  for (const b of project.beats) w[b.id] = b
  const out: SfxMarker[] = []
  if (w.hook) out.push({ time: w.hook.start + 0.05, kind: 'pop' })
  if (w.scan) out.push({ time: w.scan.start, kind: 'riser' })
  if (w.verdict) out.push({ time: w.verdict.start + w.verdict.dur * 0.55, kind: 'sting' })
  if (w.glowup) out.push({ time: w.glowup.start + w.glowup.dur * 0.45, kind: 'shimmer' })
  if (w.solution) {
    const n = project.script.actions.length || 3
    const stagger = (w.solution.dur * 0.7) / n
    for (let i = 0; i < n; i++) out.push({ time: w.solution.start + 0.15 + i * stagger, kind: 'pop' })
  }
  if (w.cta) out.push({ time: w.cta.start, kind: 'whoosh' })
  return out
}

// Planifie tous les SFX pour une lecture commençant à l'instant `offset` de la
// timeline, à partir du temps de contexte `when0`.
export function scheduleSfx(
  ctx: AudioContext,
  project: Project,
  when0: number,
  offset: number,
  out: AudioNode,
  vol = 1,
) {
  if (!project.audio.sfx) return
  for (const m of sfxMarkers(project)) {
    if (m.time < offset - 0.05) continue
    playSfx(ctx, m.kind, when0 + (m.time - offset), out, vol * project.audio.sfxVolume)
  }
}
