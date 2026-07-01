import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')

const PORT = process.env.SHOOT_PORT || '5199'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.locator('.search-box').first().focus().catch(() => {})
await page.locator('.search-box input').first().focus()
await page.waitForTimeout(400)
await page.locator('.search-box').first().screenshot({ path: process.env.OUT || '/tmp/el.png' })
await browser.close()
console.log('done')
