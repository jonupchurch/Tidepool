import { type Page, expect, test } from '@playwright/test'

const seedOf = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__?: { seed?: string } }).__TIDEPOOLS__?.seed,
  )

// SC-003 — a known seed jumps to its exact board.
test('a valid seed jumps to that exact board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('cove-0001')
  await page.getByRole('button', { name: /jump/i }).click()

  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: { ready?: boolean } }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  expect(await seedOf(page)).toBe('COVE-0001')
})

// SC-005 — invalid input never loads a board and always explains why.
test('a garbled seed shows a gentle message and loads nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('nonsense')
  await page.getByRole('button', { name: /jump/i }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  // Still on Home — no board, no gameplay chrome.
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
