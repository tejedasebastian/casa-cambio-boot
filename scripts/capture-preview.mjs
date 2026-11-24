import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = 4179
const URL_APP = `http://127.0.0.1:${PORT}/`

const RATES = {
  USD: 1,
  PEN: 3.4563,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 17.05,
  BRL: 5.02,
  CAD: 1.36,
  JPY: 149.5,
  INR: 83.2,
  CLP: 945.4,
  ARS: 980.5,
  COP: 3950.2
}

async function esperarServidor () {
  for (let intento = 0; intento < 60; intento += 1) {
    try {
      const respuesta = await fetch(URL_APP)
      if (respuesta.ok) return
    } catch {
      // El servidor todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error('El servidor local no arrancó a tiempo')
}

const servidor = spawn(process.execPath, ['e2e/server.mjs', '--port', String(PORT)], {
  cwd: ROOT,
  stdio: 'inherit'
})

let navegador

try {
  await esperarServidor()

  navegador = await chromium.launch()
  const pagina = await navegador.newPage({
    viewport: { width: 1440, height: 600 },
    deviceScaleFactor: 1
  })

  await pagina.route(/^https:\/\/open\.er-api\.com\/v6\/latest\/[A-Z]{3}$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ result: 'success', base_code: 'USD', rates: RATES })
    })
  )

  await pagina.goto(URL_APP)
  await pagina.waitForFunction(() => document.querySelectorAll('#selectMoneda option').length > 1)
  await pagina.selectOption('#selectMoneda', 'USD')
  await pagina.fill('#numeroCalcular', '100')
  await pagina.click('#botonCambiar')
  await pagina.waitForFunction(() =>
    document.querySelector('#estadoApi')?.textContent === 'Conversión actualizada desde USD.'
  )
  await pagina.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]))
  await pagina.waitForTimeout(300)

  await mkdir(join(ROOT, 'docs'), { recursive: true })
  await pagina.screenshot({ path: join(ROOT, 'docs', 'preview.png'), fullPage: true })

  console.log('Generado docs/preview.png')
} finally {
  if (navegador) await navegador.close()
  servidor.kill()
}
