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

// T029 (golden path): complete a board in Gameplay → open the Journal from the
// completion panel → a creature's card has flipped from silhouette to found,
// recorded at this board's seed.
test("solve a board → the Journal shows a creature found at this board's seed", async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()

  const hook = await readHook(page)
  const seed = hook.seed
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }

  // The completion panel offers Journal — open it.
  await page.getByRole('button', { name: /journal/i }).click()
  await expect(page.getByRole('heading', { name: /shore journal/i })).toBeVisible()

  // At least one creature is now found, recorded at this board's seed …
  await expect(page.getByText(new RegExp(`first at ${seed}`, 'i')).first()).toBeVisible()
  // … and the "X of Y found" header reflects real progress (not 0).
  await expect(page.getByText(/[1-9]\d* of \d+ found/)).toBeVisible()
})
