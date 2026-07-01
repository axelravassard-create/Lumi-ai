import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = process.env.SHOOT_PORT || '5199'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
await page.waitForTimeout(300)
if (process.env.FULL) {
  await page.screenshot({ path: process.env.OUT || '/tmp/landing.png' })
} else {
  await page.locator('.max-w-xl').first().screenshot({ path: process.env.OUT || '/tmp/landing.png' })
}
await browser.close()
console.log('done')
