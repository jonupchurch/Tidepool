import { expect, test } from '@playwright/test'

// About is reachable from Home, states the build, and lets you back out.
test('About shows the version and credits, and returns to Home', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^about$/i }).click()

  await expect(page.getByRole('heading', { name: /^about$/i })).toBeVisible()
  await expect(page.getByText(/version 1\.0\.1/i)).toBeVisible()
  await expect(page.getByText(/a game by gravytraining, copyright 2026/i)).toBeVisible()

  await page.getByRole('button', { name: /back to shore/i }).click()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
})
