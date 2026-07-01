// Moteur de timeline DÉTERMINISTE : eval(project, t) → Frame.
// Aucune horloge réelle : l'aperçu et l'export lisent le même état pour un t
// donné → l'export est identique à l'aperçu, image par image.
import type { BeatDef, BeatKind, CaptionWord, Frame, FrameCard, Project } from './types'
import { interpolate, narrationFor, riskColor } from './script'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3)
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
// Rebond élastique pour l'entrée « pop » (petit → grand avec dépassement).
function elastic(p: number): number {
  p = clamp(p)
  if (p === 0 || p === 1) return p
  const c = (2 * Math.PI) / 3
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c) + 1
}

interface Win {
  start: number
  end: number
  dur: number
}

function windows(beats: BeatDef[]): Record<BeatKind, Win> {
  const out = {} as Record<BeatKind, Win>
  // Les beats désactivés sont ignorés → aucun overlay ni transition associés.
  for (const b of beats) if (b.enabled !== false) out[b.id] = { start: b.start, end: b.start + b.dur, dur: b.dur }
  return out
}

// Progression locale 0..1 dans un beat (avant/après → borne).
function local(w: Win | undefined, t: number): number {
  if (!w) return 0
  return clamp((t - w.start) / Math.max(0.001, w.dur))
}

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

// Découpe un texte en mots karaoké actifs selon t, sur une fenêtre temporelle.
function karaoke(text: string, start: number, span: number, t: number): CaptionWord[] {
  const words = splitWords(text)
  if (!words.length) return []
  const per = span / words.length
  return words.map((w, i) => {
    const ws = start + i * per
    const we = ws + per
    return { text: w, active: t >= ws && t < we, done: t >= we }
  })
}

export function activeBeat(beats: BeatDef[], t: number): BeatKind {
  const on = beats.filter((b) => b.enabled !== false)
  let best: BeatKind = on[0]?.id ?? 'hook'
  for (const b of on) if (t >= b.start) best = b.id
  return best
}

export function evalFrame(project: Project, t: number): Frame {
  const w = windows(project.beats)
  const s = project.script
  const metier = s.metier || 'ton métier'
  const phase = activeBeat(project.beats, t)
  const tier = project.character.tier

  // ── Personnage ──────────────────────────────────────────────────────────
  // Glow-up : les lunettes apparaissent au milieu du beat « glowup » et restent.
  const glowMid = (w.glowup?.start ?? 8.5) + (w.glowup?.dur ?? 1.5) * 0.45
  const transformed = t >= glowMid
  const glasses = transformed && (tier === 'blumiman' || tier === 'bluminator')
  const laptop = transformed && tier === 'bluminator'

  // Entrée : progression linéaire eased, puis transformée selon le style choisi.
  const pin = w.hook ? clamp((t - w.hook.start) / Math.max(0.3, w.hook.dur * 0.8)) : 1
  const avatarIn = w.hook ? easeOut(pin) : 1
  let avatarScale = 1
  let avatarDX = 0
  let avatarDY = 0
  if (w.hook) {
    if (project.character.entrance === 'pop') {
      avatarScale = elastic(pin) // petit → grand avec rebond
    } else if (project.character.entrance === 'zoom') {
      avatarScale = 0.25 + 0.75 * easeOut(pin) // grossit depuis un petit point
    } else {
      // slide : arrive du bas du cadre.
      avatarScale = 1
      avatarDY = (1 - easeOut(pin)) * 0.6
    }
  }

  // Humeur : auto (pilotée par les beats) ou forcée par l'utilisateur.
  let mood: Frame['mood'] = 'neutral'
  if (phase === 'verdict' || phase === 'pivot') mood = 'concerned'
  else if (phase === 'glowup' || phase === 'solution' || phase === 'cta') mood = 'calm'
  if (project.character.mood !== 'auto') mood = project.character.mood

  // ── Hook (gros titre karaoké) ───────────────────────────────────────────
  const hookText = interpolate(s.abTest && Math.floor(t) % 2 === 1 ? s.hookB : s.hook, metier, s.score)
  const hookWords = w.hook ? karaoke(hookText, w.hook.start + 0.15, w.hook.dur * 0.85, t) : []
  const hookOut = w.scan ? easeOut(local(w.scan, t) / 0.25) : 0

  // ── Scan ────────────────────────────────────────────────────────────────
  const scanP = local(w.scan, t)
  const scanActive = w.scan ? t >= w.scan.start && t < w.scan.end : false
  const scanProgress = easeInOut(scanP)

  // ── Verdict ─────────────────────────────────────────────────────────────
  const vP = local(w.verdict, t)
  const verdictOn = w.verdict ? t >= w.verdict.start : false
  // La jauge n'apparaît que pendant le beat verdict, puis se fond dans le pivot.
  let gaugeIn = 0
  if (w.verdict) {
    if (t >= w.verdict.start && t <= w.verdict.end) gaugeIn = Math.min(1, (t - w.verdict.start) / (w.verdict.dur * 0.4))
    else if (t > w.verdict.end && t < w.verdict.end + 0.4) gaugeIn = 1 - (t - w.verdict.end) / 0.4
  }
  // Compteur : monte sur les 55 premiers % puis se fige.
  const countP = clamp(vP / 0.55)
  const scoreFrozen = vP >= 0.55
  const score = verdictOn ? Math.round(easeOut(countP) * s.score) : 0
  // Impact au gel : screen-shake + zoom bref.
  const freezeT = (w.verdict?.start ?? 0) + (w.verdict?.dur ?? 3) * 0.55
  const sinceFreeze = t - freezeT
  const impact = sinceFreeze >= 0 && sinceFreeze < 0.45 ? Math.sin((sinceFreeze / 0.45) * Math.PI) : 0
  const shake = impact * 18
  const zoomPulse = 1 + impact * 0.06

  // ── Pivot ───────────────────────────────────────────────────────────────
  const pivotIn = w.pivot ? easeOut(local(w.pivot, t) / 0.3) * (1 - easeOut((local(w.pivot, t) - 0.7) / 0.3)) : 0

  // ── Glow-up (flash maîtrisé) ────────────────────────────────────────────
  const gP = local(w.glowup, t)
  const flash = w.glowup && t >= glowMid - 0.12 && t < glowMid + 0.35 ? Math.sin(clamp((t - (glowMid - 0.12)) / 0.47) * Math.PI) : 0
  void gP

  // ── Solution (3 cartes qui poppent) ─────────────────────────────────────
  const cards: FrameCard[] = []
  if (w.solution) {
    const solEnd = w.solution.end
    // Les cartes se fondent à la fin du beat pour ne pas déborder sur le CTA.
    const solOut = t <= solEnd ? 1 : t < solEnd + 0.4 ? 1 - (t - solEnd) / 0.4 : 0
    if (solOut > 0) {
      const n = s.actions.length || 3
      const stagger = (w.solution.dur * 0.7) / n
      s.actions.forEach((a, i) => {
        const cardStart = w.solution.start + 0.15 + i * stagger
        const cin = elastic(clamp((t - cardStart) / 0.4)) * solOut
        if (t >= cardStart - 0.05) cards.push({ icon: a.icon, text: interpolate(a.text, metier, s.score), in: cin })
      })
    }
  }

  // ── CTA + boucle ────────────────────────────────────────────────────────
  const cP = local(w.cta, t)
  const ctaIn = w.cta ? easeOut(cP / 0.25) : 0
  const swipe = w.cta ? (t - w.cta.start) % 1 : 0
  const total = project.duration
  const loop = t > total - 0.6 ? clamp((t - (total - 0.6)) / 0.6) : 0

  // ── Caption karaoké (bas) — narration ───────────────────────────────────
  // Supprimée là où un gros graphique porte déjà le message (hook, verdict,
  // solution) pour éviter la surcharge visuelle.
  const NO_CAPTION = phase === 'hook' || phase === 'verdict' || phase === 'solution' || phase === 'cta'
  let caption: Frame['caption'] = null
  if (project.caption.enabled && !NO_CAPTION) {
    const cw = w[phase]
    const line = narrationFor(phase, s)
    // Uniquement dans la fenêtre du beat (évite une caption figée dans un « trou »
    // laissé par un moment désactivé).
    if (cw && line && t >= cw.start && t <= cw.end) {
      // Timing manuel : décalage + vitesse de défilement réglables.
      const manual = project.caption.timing === 'manual'
      const off = manual ? project.caption.offset : 0
      const pace = manual ? Math.max(0.3, project.caption.pace) : 1
      caption = { words: karaoke(line, cw.start + 0.1 + off, (cw.dur * 0.9) / pace, t), style: project.caption.style }
    }
  }

  const speaking = phase !== 'verdict' && (hookWords.some((x) => x.active) || (caption?.words.some((x) => x.active) ?? false))

  return {
    t,
    phase,
    glasses,
    laptop,
    mood,
    speaking,
    avatarIn,
    avatarScale,
    avatarDX,
    avatarDY,
    shake,
    flash,
    zoomPulse,
    hookWords,
    hookOut,
    scanActive,
    scanProgress,
    scanLabel: interpolate(s.scanLabel, metier, s.score),
    gaugeIn,
    score,
    scoreFrozen,
    verdictLabel: interpolate(s.verdictLabel, metier, s.score),
    riskColor: riskColor(s.score),
    pivotIn,
    pivotText: s.pivot,
    cards,
    ctaIn,
    ctaText: interpolate(s.cta, metier, s.score),
    swipe,
    loop,
    caption,
  }
}
