import { test, expect } from '@playwright/test'

const RATES = Object.freeze({
  USD: 1,
  PEN: 3.4563,
  EUR: 0.92,
  MXN: 17.05,
  JPY: 149.5,
  GBP: 0.79
})

const RATES_POR_BASE = Object.freeze({
  USD: RATES,
  PEN: Object.freeze({
    PEN: 1,
    USD: 0.2893,
    EUR: 0.2662,
    MXN: 4.933,
    JPY: 43.25,
    GBP: 0.2286
  })
})

const API_URL = /^https:\/\/open\.er-api\.com\/v6\/latest\/[A-Z]{3}$/
const formateador = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

function payload (base) {
  return {
    result: 'success',
    base_code: base,
    rates: RATES_POR_BASE[base] || RATES
  }
}

function respuestaJson (cuerpo) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(cuerpo)
  }
}

async function mockApi (page) {
  const mock = {
    total: 0,
    conversionRequests: 0,
    lastBase: null,
    initialDone: false,
    failInitial: false,
    failConversions: false,
    delayConversionsMs: 0
  }

  await page.route(API_URL, async (route) => {
    mock.total += 1
    const base = route.request().url().split('/').pop()

    if (!mock.initialDone) {
      if (mock.failInitial) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ result: 'error', 'error-type': 'server-error' })
        })
        return
      }
      mock.initialDone = true
      await route.fulfill(respuestaJson(payload('USD')))
      return
    }

    mock.conversionRequests += 1
    mock.lastBase = base
    if (mock.failConversions) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ result: 'error', 'error-type': 'server-error' })
      })
      return
    }

    if (mock.delayConversionsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, mock.delayConversionsMs))
    }

    await route.fulfill(respuestaJson(payload(base)))
  })

  return mock
}

async function abrirApp (page) {
  await page.goto('/')
  await expect(page.locator('#selectMoneda option')).toHaveCount(Object.keys(RATES).length)
  await expect(page.locator('#botonCambiar')).toBeEnabled()
}

test.describe('conversión con API simulada', () => {
  test('convierte USD 100 y muestra todas las filas', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    await page.selectOption('#selectMoneda', 'USD')
    await page.fill('#numeroCalcular', '100')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde USD.')
    await expect(page.locator('#estadoApi')).toHaveAttribute('data-error', 'false')
    await expect(page.locator('.elementoMoneda')).toHaveCount(Object.keys(RATES).length)

    const filaPen = page.locator('.elementoMoneda').filter({ hasText: '(PEN)' })
    await expect(filaPen).toContainText(/sol peruano/i)
    await expect(filaPen).toContainText(formateador.format(RATES.PEN * 100))

    const filaUsd = page.locator('.elementoMoneda').filter({ hasText: '(USD)' })
    await expect(filaUsd).toContainText(formateador.format(100))

    expect(mock.conversionRequests).toBe(1)
  })

  test('convierte desde PEN usando /latest/PEN', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    await page.selectOption('#selectMoneda', 'PEN')
    await page.fill('#numeroCalcular', '10')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde PEN.')
    await expect(page.locator('.elementoMoneda')).toHaveCount(Object.keys(RATES_POR_BASE.PEN).length)

    const filaUsd = page.locator('.elementoMoneda').filter({ hasText: '(USD)' })
    await expect(filaUsd).toContainText(formateador.format(RATES_POR_BASE.PEN.USD * 10))
    expect(mock.lastBase).toBe('PEN')
  })

  test('cantidad 0 o vacía muestra error y no consulta la API', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    await page.selectOption('#selectMoneda', 'USD')
    await page.fill('#numeroCalcular', '0')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('Ingresa una cantidad mayor que cero.')
    await expect(page.locator('#estadoApi')).toHaveAttribute('data-error', 'true')
    await expect(page.locator('.elementoMoneda')).toHaveCount(0)

    await page.fill('#numeroCalcular', '')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('Ingresa una cantidad mayor que cero.')
    await expect(page.locator('#estadoApi')).toHaveAttribute('data-error', 'true')
    await expect(page.locator('.elementoMoneda')).toHaveCount(0)

    expect(mock.conversionRequests).toBe(0)
  })

  test('un 500 de la API muestra un error visible y reactiva el botón', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    mock.failConversions = true

    await page.selectOption('#selectMoneda', 'USD')
    await page.fill('#numeroCalcular', '100')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('No se pudo obtener la conversión. Intenta de nuevo.')
    await expect(page.locator('#estadoApi')).toHaveAttribute('data-error', 'true')
    await expect(page.locator('.elementoMoneda')).toHaveCount(0)
    await expect(page.locator('#botonCambiar')).toBeEnabled()
    expect(mock.conversionRequests).toBe(1)
  })

  test('una API lenta muestra estado de carga y bloquea el botón', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    mock.delayConversionsMs = 700

    await page.selectOption('#selectMoneda', 'USD')
    await page.fill('#numeroCalcular', '100')
    await page.click('#botonCambiar')

    await expect(page.locator('#estadoApi')).toHaveText('Convirtiendo…')
    await expect(page.locator('#botonCambiar')).toBeDisabled()
    await expect(page.locator('#selectMoneda')).toBeDisabled()

    await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde USD.', { timeout: 5000 })
    await expect(page.locator('.elementoMoneda')).toHaveCount(Object.keys(RATES).length)
    await expect(page.locator('#botonCambiar')).toBeEnabled()
    await expect(page.locator('#selectMoneda')).toBeEnabled()
  })

  test('doble click dispara una sola conversión', async ({ page }) => {
    const mock = await mockApi(page)
    await abrirApp(page)

    mock.delayConversionsMs = 400

    await page.selectOption('#selectMoneda', 'USD')
    await page.fill('#numeroCalcular', '100')
    await page.locator('#botonCambiar').dblclick()

    await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde USD.', { timeout: 5000 })
    await expect(page.locator('.elementoMoneda')).toHaveCount(Object.keys(RATES).length)
    expect(mock.conversionRequests).toBe(1)
  })

  test('si falla la carga inicial muestra reintentar y se recupera', async ({ page }) => {
    const mock = await mockApi(page)
    mock.failInitial = true

    await page.goto('/')

    await expect(page.locator('#estadoApi')).toHaveText('No se pudieron cargar las monedas. Revisa tu conexión e intenta de nuevo.')
    await expect(page.locator('#estadoApi')).toHaveAttribute('data-error', 'true')
    await expect(page.locator('#botonCambiar')).toBeDisabled()
    await expect(page.locator('#reintentarMonedas')).toBeVisible()

    mock.failInitial = false
    await page.click('#reintentarMonedas')

    await expect(page.locator('#selectMoneda option')).toHaveCount(Object.keys(RATES).length)
    await expect(page.locator('#botonCambiar')).toBeEnabled()
    await expect(page.locator('#reintentarMonedas')).toBeHidden()
  })
})

test.describe('móvil', () => {
  for (const width of [390, 320]) {
    test(`sin overflow horizontal ni errores a ${width}px`, async ({ page }) => {
      const errores = []
      await mockApi(page)

      page.on('console', (mensaje) => {
        if (mensaje.type() === 'error') errores.push(mensaje.text())
      })
      page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))

      await page.setViewportSize({ width, height: 844 })
      await abrirApp(page)

      await page.selectOption('#selectMoneda', 'USD')
      await page.fill('#numeroCalcular', '100')
      await page.click('#botonCambiar')

      await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde USD.')
      await expect(page.locator('.elementoMoneda')).toHaveCount(Object.keys(RATES).length)

      const metricas = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentScroll: document.documentElement.scrollWidth,
        documentClient: document.documentElement.clientWidth,
        bodyScroll: document.body.scrollWidth,
        tarjetas: Array.from(document.querySelectorAll('.elementoMoneda')).map((el) => ({
          scroll: el.scrollWidth,
          client: el.clientWidth
        }))
      }))

      expect(metricas.documentScroll).toBeLessThanOrEqual(metricas.documentClient + 1)
      expect(metricas.bodyScroll).toBeLessThanOrEqual(metricas.documentClient + 1)
      expect(metricas.tarjetas.every((tarjeta) => tarjeta.scroll <= tarjeta.client + 1)).toBe(true)

      const recursos = await page.evaluate(() =>
        performance.getEntriesByType('resource').map((entrada) => new URL(entrada.name).pathname)
      )
      for (const asset of ['/main.css', '/main.js', '/casadecambio-jquery.js']) {
        expect(recursos).toContain(asset)
      }

      expect(await page.evaluate(() => typeof window.jQuery)).toBe('function')
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.bienvenida')).backgroundColor))
        .toBe('rgb(27, 46, 21)')
      expect(errores).toEqual([])
    })
  }
})
