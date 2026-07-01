import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = process.env.SHOOT_PORT || '5199'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
await page.screenshot({ path: process.env.OUT || '/tmp/mobile.png', fullPage: true, clip: { x: 0, y: 0, width: 390, height: 620 } })
await browser.close()
console.log('done')
