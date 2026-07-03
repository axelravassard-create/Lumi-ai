import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW_PATH || 'playwright')
const OUT = process.env.OUTDIR || '/tmp'
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0,200)) })

async function shot(name){ await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/smoke-${name}.png` }); console.log('shot', name) }

await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
await shot('1-landing')

// Tarifs / Abonnements
try { await page.getByText(/Abonnements|Subscriptions/).first().click({ timeout: 4000 }); await shot('2-pricing') } catch(e){ console.log('pricing nav fail', e.message) }

// Profil
try { await page.goto('http://localhost:5199/', { waitUntil:'domcontentloaded' }); await page.waitForTimeout(1500)
  await page.getByText(/Mon profil|My profile/).first().click({ timeout: 4000 }); await shot('3-profile') } catch(e){ console.log('profile nav fail', e.message) }

// Mentions légales (hash route)
await page.goto('http://localhost:5199/#/legal/mentions', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(1500); await shot('4-mentions')
const bodyText = await page.evaluate(() => document.body.innerText)
console.log('EMAIL contact.getblumi présent:', bodyText.includes('contact.getblumi@gmail.com'))
console.log('SIRET présent:', bodyText.includes('10675480700019'))
console.log('Ancien Gmail perso encore présent:', bodyText.includes('axel.ravassard'))

console.log('\n=== ERREURS CONSOLE/PAGE ===')
console.log(errors.length ? errors.join('\n') : 'Aucune ✅')
await browser.close()
