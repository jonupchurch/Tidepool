import { expect, test } from '@playwright/test'

// SC-001 — from a cold open, the player reaches a playable board in ≤2 clicks.
test('cold open → Home → Play reaches a board in one click', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /tidepools/i })).toBeVisible()

  // One click: Play.
  await page.getByRole('button', { name: /^play$/i }).click()

  // The gameplay chrome + board appear.
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: { ready?: boolean } }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
})
