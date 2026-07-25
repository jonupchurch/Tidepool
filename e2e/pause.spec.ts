import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  centres: Record<string, { x: number; y: number }>
  solution: Record<string, 'water' | 'rock'>
  progress: () => { complete: boolean; correct: number; total: number }
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__)
}

// SC-003 — Pause returns to the exact board via Resume; leaving to Home never
// loses the saved board.
test('Pause → Resume returns to the board; Home leaves it saved', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  const before = await readHook(page)

  // Open Pause from the top-bar menu; the board freezes under the scrim.
  await page.getByRole('button', { name: /menu/i }).click()
  await expect(page.getByRole('dialog', { name: /paused/i })).toBeVisible()
  await expect(page.getByText(/your board is saved/i)).toBeVisible()

  // Resume returns to the exact board.
  await page.getByRole('button', { name: /^resume$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const after = await readHook(page)
  expect(after.seed).toBe(before.seed)

  // Reopen Pause → Home leaves the board saved (resume card appears on Home).
  await page.getByRole('button', { name: /menu/i }).click()
  await page.getByRole('button', { name: /^home$/i }).click()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue your pool/i })).toBeVisible()
})
