import { test, expect } from '@playwright/test'

const LIVE_URL = process.env.LIVE_URL || 'https://tejedasebastian.github.io/casa-cambio-boot/'

test('@live smoke: USD 100 se convierte a PEN con la API real', async ({ page }) => {
  const errores = []
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(mensaje.text())
  })
  page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))

  await page.goto(LIVE_URL)

  await expect(page.locator('#selectMoneda option').nth(1)).toBeAttached({ timeout: 30000 })
  await expect(page.locator('#botonCambiar')).toBeEnabled()
  await expect(page.locator('#estadoApi')).toContainText('Monedas cargadas')

  await page.selectOption('#selectMoneda', 'USD')
  await page.fill('#numeroCalcular', '100')
  await page.click('#botonCambiar')

  await expect(page.locator('#estadoApi')).toHaveText('Conversión actualizada desde USD.', { timeout: 30000 })

  const filaPen = page.locator('.elementoMoneda').filter({ hasText: '(PEN)' })
  await expect(filaPen).toBeVisible()
  await expect(filaPen).toContainText(/\(PEN\):\s*[\d.,]+/)

  expect(errores).toEqual([])
})
