// Design sonore : SFX synthétisés à la volée (Web Audio) calés sur les beats,
// + mixage pour l'export (musique + SFX). Volumes réglables, ducking auto.
//
// ⚠️ La voix off (SpeechSynthesis) sort directement sur les haut-parleurs et
// n'est PAS routable dans Web Audio → elle est jouée à l'APERÇU mais n'est pas
// capturée dans le MP4 exporté. L'emplacement pour brancher une voix API (buffer
// audio réel, lui, mixable) est prévu dans tts.ts.
import type { BeatDef, BeatKind, Project } from './types'

export type SfxKind = 'pop' | 'riser' | 'sting' | 'shimmer' | 'whoosh' | 'applause'

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
    case 'applause': {
      // Foule qui applaudit : un « lit » de bruit (rumeur) qui enfle et retombe,
      // + de nombreux claps individuels (transitoires de bruit) répartis au hasard,
      // plus denses au milieu → effet de public enthousiaste.
      const dur = 2.4
      const sr = ctx.sampleRate
      // Clap partagé (~30 ms, décroissance rapide) réutilisé par toutes les mains.
      const clapBuf = ctx.createBuffer(1, Math.ceil(sr * 0.03), sr)
      const cd = clapBuf.getChannelData(0)
      for (let j = 0; j < cd.length; j++) cd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / cd.length, 2)
      // Lit de rumeur (bruit filtré) qui enfle puis décroît.
      const bedBuf = ctx.createBuffer(1, Math.ceil(sr * dur), sr)
      const bd = bedBuf.getChannelData(0)
      for (let i = 0; i < bd.length; i++) bd[i] = Math.random() * 2 - 1
      const bed = ctx.createBufferSource()
      bed.buffer = bedBuf
      const bedBp = ctx.createBiquadFilter()
      bedBp.type = 'bandpass'
      bedBp.frequency.value = 1600
      bedBp.Q.value = 0.6
      const bedG = ctx.createGain()
      bedG.gain.setValueAtTime(0.0001, at)
      bedG.gain.linearRampToValueAtTime(0.1 * vol, at + 0.3)
      bedG.gain.setValueAtTime(0.1 * vol, at + dur * 0.55)
      bedG.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      bed.connect(bedBp).connect(bedG).connect(g)
      bed.start(at)
      bed.stop(at + dur)
      // Claps individuels (montée/pic/descente d'intensité).
      const N = 60
      for (let i = 0; i < N; i++) {
        const rt = Math.random()
        const env = Math.sin(Math.min(1, rt / 0.92) * Math.PI) // pic au milieu
        if (env <= 0.03) continue
        const ct = at + rt * dur
        const src = ctx.createBufferSource()
        src.buffer = clapBuf
        src.playbackRate.value = 0.8 + Math.random() * 0.6
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 1000 + Math.random() * 2200
        bp.Q.value = 1
        const cg = ctx.createGain()
        cg.gain.value = (0.05 + Math.random() * 0.12) * env * vol
        src.connect(bp).connect(cg).connect(g)
        src.start(ct)
        src.stop(ct + 0.05)
      }
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

// Planifie une liste de marqueurs SFX (temps absolus sur la timeline) pour une
// lecture démarrant à `offset`, à partir du temps de contexte `when0`.
export function scheduleMarkers(
  ctx: AudioContext,
  markers: SfxMarker[],
  when0: number,
  offset: number,
  out: AudioNode,
  vol = 1,
) {
  for (const m of markers) {
    if (m.time < offset - 0.05) continue
    playSfx(ctx, m.kind, when0 + (m.time - offset), out, vol)
  }
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
