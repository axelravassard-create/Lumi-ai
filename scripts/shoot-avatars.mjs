import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')
import { mkdirSync } from 'node:fs'

const PORT = process.env.SHOOT_PORT || '5199'
const OUT = new URL('../public/avatars/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1720, height: 640 }, deviceScaleFactor: 2 })
await page.goto(`http://localhost:${PORT}/shoot.html`, { waitUntil: 'networkidle' })

// Laisse le temps au canvas 3D + à l'environnement studio de se rendre.
await page.waitForTimeout(4000)

// Cadre serré autour du personnage (mêmes fractions pour les 3 → alignement
// identique). Le personnage est centré horizontalement ; la tête + (laptop)
// occupent la bande haute → on rogne le vide autour.
const CROP = { fx: 0.34, fy: 0.02, fw: 0.32, fh: 0.36 }
for (const id of ['blumi', 'blumiman', 'bluminator']) {
  const box = await page.locator(`#shot-${id}`).boundingBox()
  await page.screenshot({
    path: new URL(`${id}.png`, OUT).pathname,
    omitBackground: true,
    clip: {
      x: box.x + box.width * CROP.fx,
      y: box.y + box.height * CROP.fy,
      width: box.width * CROP.fw,
      height: box.height * CROP.fh,
    },
  })
  console.log('shot', id)
}

await browser.close()
console.log('done')
