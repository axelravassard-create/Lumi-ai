// Moteur de rendu 2D des overlays — PARTAGÉ entre l'aperçu et l'export.
// Dessine tout SAUF le personnage 3D (couche WebGL composée entre le fond et
// cette couche). Coordonnées de référence : la taille réelle du canvas.
import type { CaptionStyle, Crop, Frame, Project } from './types'
import { PLATFORM_SAFE } from './types'

const DISPLAY = '"Sora Variable", Sora, system-ui, sans-serif'
const BODY = '"Manrope Variable", Manrope, system-ui, sans-serif'

// ── Cadrage vidéo « cover » (crop + zoom + décalage) ─────────────────────────
export function coverRect(
  natW: number,
  natH: number,
  crop: Crop,
  cw: number,
  ch: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const zoom = Math.max(0.2, crop.zoom || 1)
  const scale = Math.max(cw / natW, ch / natH) * zoom
  const sw = cw / scale
  const sh = ch / scale
  const maxX = Math.max(0, natW - sw)
  const maxY = Math.max(0, natH - sh)
  const sx = (natW - sw) / 2 + (crop.x || 0) * (maxX / 2)
  const sy = (natH - sh) / 2 + (crop.y || 0) * (maxY / 2)
  return {
    sx: Math.max(0, Math.min(natW - sw, sx)),
    sy: Math.max(0, Math.min(natH - sh, sy)),
    sw,
    sh,
  }
}

// Rectangle d'affichage du personnage (aperçu CSS + export drawImage identiques).
export function avatarRect(project: Project, f: Frame, cw: number, ch: number) {
  const c = project.character
  const base = Math.min(cw, ch) * 1.05 * c.scale * (0.5 + 0.5 * f.avatarIn)
  const w = base
  const h = base
  const cx = cw / 2 + (c.x || 0) * cw * 0.4
  // Un peu plus haut que le centre pour laisser la place aux cartes/captions.
  const cy = ch * 0.38 + (c.y || 0) * ch * 0.3
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

// ── Fond ─────────────────────────────────────────────────────────────────────
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource & { videoWidth?: number; videoHeight?: number; width?: number; height?: number },
  crop: Crop,
  cw: number,
  ch: number,
) {
  const natW = (media.videoWidth as number) || (media.width as number) || cw
  const natH = (media.videoHeight as number) || (media.height as number) || ch
  const r = coverRect(natW, natH, crop, cw, ch)
  ctx.drawImage(media, r.sx, r.sy, r.sw, r.sh, 0, 0, cw, ch)
}

export function drawEmptyBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const g = ctx.createLinearGradient(0, 0, 0, ch)
  g.addColorStop(0, '#0a1830')
  g.addColorStop(0.5, '#0a53ad')
  g.addColorStop(1, '#123c73')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)
}

// ── Helpers de dessin ────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// Découpe un texte en lignes qui tiennent dans maxW (police déjà définie).
function wrap(ctx: CanvasRenderingContext2D, words: string[], maxW: number): string[][] {
  const lines: string[][] = []
  let cur: string[] = []
  for (const wd of words) {
    const test = [...cur, wd].join(' ')
    if (ctx.measureText(test).width > maxW && cur.length) {
      lines.push(cur)
      cur = [wd]
    } else cur.push(wd)
  }
  if (cur.length) lines.push(cur)
  return lines
}

// ── Overlay principal ────────────────────────────────────────────────────────
export interface RenderOpts {
  safeZones?: boolean
  watermark?: boolean
}

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  project: Project,
  cw: number,
  ch: number,
  opts: RenderOpts = {},
) {
  const safe = PLATFORM_SAFE[project.platform]
  const topSafe = safe.top * ch
  const botSafe = safe.bottom * ch

  // Vignette cinématique (lisibilité du texte).
  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  grad.addColorStop(0, 'rgba(6,14,30,0.55)')
  grad.addColorStop(0.28, 'rgba(6,14,30,0)')
  grad.addColorStop(0.7, 'rgba(6,14,30,0)')
  grad.addColorStop(1, 'rgba(6,14,30,0.7)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cw, ch)

  if (f.scanActive) drawScan(ctx, f, cw, ch, topSafe, botSafe)
  drawHook(ctx, f, cw, topSafe)
  if (f.gaugeIn > 0) drawVerdict(ctx, f, cw, ch)
  if (f.pivotIn > 0) drawPivot(ctx, f, cw, ch)
  if (f.cards.length) drawCards(ctx, f, project, cw, ch, botSafe)
  if (f.caption) drawCaption(ctx, f, project, cw, ch, botSafe)
  if (f.ctaIn > 0) drawCTA(ctx, f, cw, ch, botSafe)

  if (opts.watermark !== false) drawWatermark(ctx, cw, topSafe, safe.right * cw)

  // Flash du glow-up (blanc maîtrisé, jamais saturé).
  if (f.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.5})`
    ctx.fillRect(0, 0, cw, ch)
  }
  // Fondu de bouclage vers le cadrage du hook.
  if (f.loop > 0) {
    ctx.fillStyle = `rgba(6,14,30,${f.loop * 0.35})`
    ctx.fillRect(0, 0, cw, ch)
  }

  if (opts.safeZones) drawSafeZones(ctx, cw, ch, safe)
}

// Gros titre karaoké (hook) sous la safe-zone haute.
function drawHook(ctx: CanvasRenderingContext2D, f: Frame, cw: number, topSafe: number) {
  if (!f.hookWords.length || f.hookOut >= 1) return
  const alpha = 1 - f.hookOut
  const size = cw * 0.082
  ctx.font = `900 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const maxW = cw * 0.86
  const lines = wrap(ctx, f.hookWords.map((w) => w.text), maxW)
  let idx = 0
  let y = topSafe + cw * 0.06
  const lh = size * 1.12
  for (const line of lines) {
    const widths = line.map((w) => ctx.measureText(w + ' ').width)
    const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width
    let x = cw / 2 - total / 2
    for (let i = 0; i < line.length; i++) {
      const wobj = f.hookWords[idx++]
      const active = wobj?.active
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.lineJoin = 'round'
      ctx.lineWidth = size * 0.14
      ctx.strokeStyle = 'rgba(6,14,30,0.9)'
      ctx.strokeText(line[i], x + widths[i] / 2, y)
      ctx.fillStyle = active ? '#ffd633' : '#ffffff'
      ctx.fillText(line[i], x + widths[i] / 2, y)
      ctx.restore()
      x += widths[i]
    }
    y += lh
  }
}

// Balayage lumineux + réticule d'analyse.
function drawScan(ctx: CanvasRenderingContext2D, f: Frame, cw: number, ch: number, topSafe: number, botSafe: number) {
  const y = topSafe + (ch - topSafe - botSafe) * f.scanProgress
  const g = ctx.createLinearGradient(0, y - 90, 0, y + 90)
  g.addColorStop(0, 'rgba(39,226,255,0)')
  g.addColorStop(0.5, 'rgba(39,226,255,0.55)')
  g.addColorStop(1, 'rgba(39,226,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, y - 90, cw, 180)
  ctx.fillStyle = '#27e2ff'
  ctx.fillRect(0, y - 2, cw, 4)

  // Réticule (coins).
  ctx.strokeStyle = 'rgba(39,226,255,0.85)'
  ctx.lineWidth = 5
  const m = cw * 0.08
  const bx = m
  const by = topSafe + cw * 0.05
  const bw = cw - m * 2
  const bh = ch - by - botSafe - cw * 0.05
  const c = 46
  for (const [px, py, sx, sy] of [
    [bx, by, 1, 1],
    [bx + bw, by, -1, 1],
    [bx, by + bh, 1, -1],
    [bx + bw, by + bh, -1, -1],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(px, py + sy * c)
    ctx.lineTo(px, py)
    ctx.lineTo(px + sx * c, py)
    ctx.stroke()
  }
  // Libellé « Analyse de … »
  const size = cw * 0.05
  ctx.font = `800 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = f.scanLabel.replace(/…$/, '') + '…'
  ctx.fillStyle = 'rgba(6,14,30,0.6)'
  roundRect(ctx, cw / 2 - ctx.measureText(label).width / 2 - 28, by - size * 0.7, ctx.measureText(label).width + 56, size * 1.5, size * 0.4)
  ctx.fill()
  ctx.fillStyle = '#eafaff'
  ctx.fillText(label, cw / 2, by)
}

// Jauge de risque + compteur % + libellé du verdict.
function drawVerdict(ctx: CanvasRenderingContext2D, f: Frame, cw: number, ch: number) {
  const cx = cw / 2
  const cy = ch * 0.4
  const R = cw * 0.28
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(f.zoomPulse, f.zoomPulse)
  ctx.globalAlpha = f.gaugeIn
  // Fond radial sombre : détache le compteur du visage blanc du personnage.
  const bd = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.15)
  bd.addColorStop(0, `rgba(6,10,24,${0.82 * f.gaugeIn})`)
  bd.addColorStop(0.7, `rgba(6,10,24,${0.6 * f.gaugeIn})`)
  bd.addColorStop(1, 'rgba(6,10,24,0)')
  ctx.fillStyle = bd
  ctx.beginPath()
  ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2)
  ctx.fill()
  // Anneau de fond.
  ctx.lineWidth = cw * 0.045
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.stroke()
  // Remplissage coloré proportionnel au compteur (qui monte puis se fige).
  const frac = f.score / 100
  ctx.strokeStyle = f.riskColor
  ctx.lineCap = 'round'
  ctx.shadowColor = f.riskColor
  ctx.shadowBlur = 40
  ctx.beginPath()
  ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0
  // Compteur.
  ctx.fillStyle = '#fff'
  ctx.font = `900 ${cw * 0.2}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${f.score}%`, 0, -cw * 0.01)
  ctx.font = `800 ${cw * 0.05}px ${BODY}`
  ctx.fillStyle = f.riskColor
  ctx.fillText('exposé à l\'IA', 0, cw * 0.11)
  ctx.restore()

  // Libellé verdict figé (pastille).
  if (f.scoreFrozen) {
    ctx.save()
    ctx.globalAlpha = f.gaugeIn
    const size = cw * 0.06
    ctx.font = `900 ${size}px ${DISPLAY}`
    const tw = ctx.measureText(f.verdictLabel).width
    const y = cy + R + cw * 0.14
    ctx.fillStyle = f.riskColor
    roundRect(ctx, cx - tw / 2 - 34, y - size * 0.75, tw + 68, size * 1.55, size * 0.5)
    ctx.fill()
    ctx.fillStyle = '#0a0f1e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(f.verdictLabel, cx, y)
    ctx.restore()
  }
}

function drawPivot(ctx: CanvasRenderingContext2D, f: Frame, cw: number, ch: number) {
  const size = cw * 0.07
  ctx.save()
  ctx.globalAlpha = f.pivotIn
  ctx.font = `800 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const y = ch * 0.62
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.16
  ctx.strokeStyle = 'rgba(6,14,30,0.9)'
  ctx.strokeText(f.pivotText, cw / 2, y)
  ctx.fillStyle = '#fff'
  ctx.fillText(f.pivotText, cw / 2, y)
  ctx.restore()
}

// Trois cartes d'action qui poppent une par une.
function drawCards(ctx: CanvasRenderingContext2D, f: Frame, _p: Project, cw: number, ch: number, botSafe: number) {
  const n = f.cards.length
  const cardH = cw * 0.15
  const gap = cw * 0.035
  const cardW = cw * 0.82
  const totalH = n * cardH + (n - 1) * gap
  const startY = ch - botSafe - totalH - cw * 0.06
  f.cards.forEach((c, i) => {
    const inp = Math.max(0, Math.min(1, c.in))
    if (inp <= 0) return
    const y = startY + i * (cardH + gap)
    const x = cw / 2 - cardW / 2
    ctx.save()
    ctx.globalAlpha = Math.min(1, inp)
    const sc = 0.85 + inp * 0.15
    ctx.translate(cw / 2, y + cardH / 2)
    ctx.scale(sc, sc)
    ctx.translate(-cw / 2, -(y + cardH / 2))
    // Carte.
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.shadowColor = 'rgba(6,104,214,0.5)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    roundRect(ctx, x, y, cardW, cardH, cardH * 0.28)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    // Pastille numéro/icône.
    const bs = cardH * 0.66
    ctx.fillStyle = '#1583ef'
    roundRect(ctx, x + cardH * 0.2, y + (cardH - bs) / 2, bs, bs, bs * 0.3)
    ctx.fill()
    ctx.font = `${bs * 0.6}px ${BODY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(c.icon, x + cardH * 0.2 + bs / 2, y + cardH / 2)
    // Texte.
    ctx.fillStyle = '#1c2033'
    ctx.font = `800 ${cardH * 0.32}px ${DISPLAY}`
    ctx.textAlign = 'left'
    ctx.fillStyle = '#123c73'
    ctx.font = `900 ${cardH * 0.2}px ${BODY}`
    ctx.fillText(`${i + 1}`, x + cardH * 0.2 + bs + cw * 0.02, y + cardH / 2 - cardH * 0.22)
    ctx.fillStyle = '#1c2033'
    ctx.font = `800 ${cardH * 0.3}px ${DISPLAY}`
    ctx.fillText(c.text, x + cardH * 0.2 + bs + cw * 0.02, y + cardH / 2 + cardH * 0.06)
    ctx.restore()
  })
}

const CAPTION_COLORS: Record<CaptionStyle, { fill: string; active: string; stroke: string; bg?: string }> = {
  tiktok: { fill: '#ffffff', active: '#ffd633', stroke: 'rgba(6,14,30,0.92)' },
  hormozi: { fill: '#ffffff', active: '#38e07b', stroke: 'rgba(0,0,0,0.95)', bg: 'rgba(6,14,30,0.35)' },
  neon: { fill: '#eafaff', active: '#27e2ff', stroke: 'rgba(6,14,30,0.9)' },
}

function drawCaption(ctx: CanvasRenderingContext2D, f: Frame, project: Project, cw: number, ch: number, botSafe: number) {
  if (!f.caption) return
  const st = CAPTION_COLORS[f.caption.style]
  const size = cw * 0.062 * project.caption.scale
  ctx.font = `900 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxW = cw * 0.82
  const lines = wrap(ctx, f.caption.words.map((w) => w.text), maxW)
  const lh = size * 1.2
  const baseY = ch - botSafe - lines.length * lh - cw * 0.04 + (1 - project.caption.posY) * 0
  const y0 = ch * (0.6 + project.caption.posY * 0.18)
  const startY = Math.min(baseY, ch - botSafe - lines.length * lh)
  const topY = Math.max(y0, startY)
  let idx = 0
  let y = topY
  for (const line of lines) {
    const widths = line.map((w) => ctx.measureText(w + ' ').width)
    const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width
    let x = cw / 2 - total / 2
    for (let i = 0; i < line.length; i++) {
      const wobj = f.caption.words[idx++]
      const active = wobj?.active
      if (st.bg && active) {
        ctx.fillStyle = st.active
        roundRect(ctx, x - 6, y - size * 0.62, widths[i] + 4, size * 1.24, size * 0.18)
        ctx.fill()
      }
      ctx.lineJoin = 'round'
      ctx.lineWidth = size * 0.16
      ctx.strokeStyle = st.stroke
      ctx.strokeText(line[i], x + widths[i] / 2, y)
      if (f.caption.style === 'neon' && active) {
        ctx.shadowColor = st.active
        ctx.shadowBlur = 24
      }
      ctx.fillStyle = st.bg && active ? '#0a0f1e' : active ? st.active : st.fill
      ctx.fillText(line[i], x + widths[i] / 2, y)
      ctx.shadowBlur = 0
      x += widths[i]
    }
    y += lh
  }
}

function drawCTA(ctx: CanvasRenderingContext2D, f: Frame, cw: number, ch: number, botSafe: number) {
  ctx.save()
  ctx.globalAlpha = f.ctaIn
  // Chevrons « swipe up ».
  const chY = ch - botSafe - cw * 0.02
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  for (let k = 0; k < 3; k++) {
    const off = ((f.swipe + k * 0.33) % 1)
    const yy = chY - off * cw * 0.12
    ctx.globalAlpha = f.ctaIn * (1 - off) * 0.8
    ctx.beginPath()
    ctx.moveTo(cw / 2 - 30, yy)
    ctx.lineTo(cw / 2, yy - 26)
    ctx.lineTo(cw / 2 + 30, yy)
    ctx.stroke()
  }
  ctx.globalAlpha = f.ctaIn
  // Bandeau comment-bait.
  const size = cw * 0.058
  ctx.font = `900 ${size}px ${DISPLAY}`
  const maxW = cw * 0.82
  const lines = wrap(ctx, f.ctaText.split(/\s+/), maxW)
  const lh = size * 1.15
  const bh = lines.length * lh + cw * 0.06
  const by = ch * 0.44
  ctx.fillStyle = '#1583ef'
  roundRect(ctx, cw / 2 - maxW / 2 - 20, by, maxW + 40, bh, cw * 0.05)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let y = by + cw * 0.03 + lh / 2
  for (const line of lines) {
    ctx.fillText(line.join(' '), cw / 2, y)
    y += lh
  }
  ctx.restore()
}

function drawWatermark(ctx: CanvasRenderingContext2D, cw: number, topSafe: number, _rightSafe: number) {
  const size = cw * 0.038
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.font = `900 ${size}px ${DISPLAY}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const x = cw * 0.06
  const y = topSafe + size * 0.9
  // Pastille.
  const r = size * 0.7
  ctx.fillStyle = '#1583ef'
  ctx.beginPath()
  ctx.arc(x + r, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.fillText('B', x + r, y + size * 0.02)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.fillText('Blumi', x + r * 2 + size * 0.3, y)
  ctx.restore()
}

function drawSafeZones(ctx: CanvasRenderingContext2D, cw: number, ch: number, safe: { top: number; bottom: number; right: number }) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,64,96,0.14)'
  ctx.fillRect(0, 0, cw, safe.top * ch)
  ctx.fillRect(0, ch - safe.bottom * ch, cw, safe.bottom * ch)
  ctx.fillRect(cw - safe.right * cw, 0, safe.right * cw, ch)
  ctx.strokeStyle = 'rgba(255,64,96,0.55)'
  ctx.setLineDash([14, 12])
  ctx.lineWidth = 3
  ctx.strokeRect(cw * 0.02, safe.top * ch, cw * 0.96 - safe.right * cw, ch - (safe.top + safe.bottom) * ch)
  ctx.restore()
}
