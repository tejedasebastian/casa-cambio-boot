import { defineConfig, devices } from '@playwright/test'

const LIVE_URL = process.env.LIVE_URL || 'https://tejedasebastian.github.io/casa-cambio-boot/'

export default defineConfig({
  testDir: './e2e/live',
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  expect: {
    timeout: 30000
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-live', open: 'never' }]
  ],
  use: {
    baseURL: LIVE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'live-smoke',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
