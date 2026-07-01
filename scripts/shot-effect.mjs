import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = process.env.SHOOT_PORT || '5199'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// Clique sur la tête du personnage central pour déclencher l'effet.
const carousel = page.locator('.max-w-xl').first()
const box = await carousel.boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height * 0.32
await page.mouse.click(cx, cy)
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(180)
  await carousel.screenshot({ path: `${process.env.OUTDIR || '/tmp'}/effect-${i}.png` })
}
await browser.close()
console.log('done')
