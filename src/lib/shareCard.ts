import { RiskLevel } from './engine'
import { RISK_THEME } from './ui'

// Génère une carte-image (1080×1080) du résultat, prête à poster sur les
// réseaux. Dessinée via Canvas — aucun service externe, tout côté navigateur.

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function createShareCard(role: string, score: number, level: RiskLevel): Promise<Blob> {
  // S'assure que les polices Inter / Plus Jakarta sont chargées avant de dessiner.
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* ignore */
  }

  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const accent = RISK_THEME[level].hex

  // Fond dégradé
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#4f46e5')
  g.addColorStop(1, '#7c3aed')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Halos décoratifs
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 280, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(W * 0.12, H * 0.92, 220, 0, Math.PI * 2); ctx.fill()

  // Logo (badge + tracé)
  const bx = 80, by = 78, bs = 60
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, bx, by, bs, bs, 16); ctx.fill()
  const s = bs / 32
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bx + 9 * s, by + 21 * s)
  ctx.lineTo(bx + 9 * s, by + 11 * s)
  ctx.lineTo(bx + 16 * s, by + 17 * s)
  ctx.lineTo(bx + 23 * s, by + 11 * s)
  ctx.lineTo(bx + 23 * s, by + 21 * s)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = '700 46px "Plus Jakarta Sans", Inter, sans-serif'
  ctx.fillText('Lumi', bx + bs + 22, by + bs / 2 + 2)

  // Bloc central
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '500 42px Inter, sans-serif'
  ctx.fillText('Mon métier est exposé à l\'IA à', W / 2, 360)

  // Score géant
  ctx.fillStyle = '#fff'
  ctx.font = '800 320px "Plus Jakarta Sans", Inter, sans-serif'
  ctx.fillText(`${score}%`, W / 2, 540)

  // Métier
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = '700 60px Inter, sans-serif'
  const label = role.length > 28 ? role.slice(0, 27) + '…' : role
  ctx.fillText(label, W / 2, 740)

  // Pastille niveau
  ctx.font = '600 34px Inter, sans-serif'
  const pillText = `Risque ${level.toLowerCase()}`
  const tw = ctx.measureText(pillText).width
  const pw = tw + 56, ph = 64, px = (W - pw) / 2, py = 800
  ctx.fillStyle = accent
  roundRect(ctx, px, py, pw, ph, ph / 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(pillText, W / 2, py + ph / 2 + 2)

  // Pied : invitation
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '600 40px Inter, sans-serif'
  ctx.fillText('Et toi, à combien est ton métier ?', W / 2, 952)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '500 32px Inter, sans-serif'
  ctx.fillText('Teste gratuitement sur Lumi', W / 2, 1006)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

// Partage natif avec l'image si possible, sinon téléchargement.
export async function shareOrDownloadCard(blob: Blob, text: string) {
  const file = new File([blob], 'lumi.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text, title: 'Lumi' })
      return
    } catch {
      /* annulé → on retombe sur le téléchargement */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lumi.png'
  a.click()
  URL.revokeObjectURL(url)
}
