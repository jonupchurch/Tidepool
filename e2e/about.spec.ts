import { expect, test } from '@playwright/test'

// About is reachable from Home, states the build, and lets you back out.
test('About shows the version and credits, and returns to Home', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^about$/i }).click()

  await expect(page.getByRole('heading', { name: /^about$/i })).toBeVisible()
  // Matched by shape, not by value: this asserted a literal `1.0.1` and went red
  // the moment the release bumped to 1.1.0, which is a stale test rather than a
  // broken About screen. The claim worth holding is that a version is shown.
  await expect(page.getByText(/version \d+\.\d+\.\d+/i)).toBeVisible()
  await expect(page.getByText(/a game by gravytraining, copyright 2026/i)).toBeVisible()

  await page.getByRole('button', { name: /back to shore/i }).click()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
})
