import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  lastSave: Promise<void>
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

// T030 (SC-003): a recorded discovery survives a reload — solve a board, wait
// for the journal write to commit, reload, open the Journal from Home, and the
// creature is still found with the same first-found seed.
test('a recorded discovery persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()

  const hook = await readHook(page)
  const seed = hook.seed
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }

  // Wait for the journal/stat writes to actually commit before reloading.
  await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: { lastSave: Promise<void> } }).__TIDEPOOLS__.lastSave,
  )
  await page.reload()

  // From Home, open the Shore journal — the discovery is still there.
  await page.getByRole('button', { name: /shore journal/i }).click()
  await expect(page.getByRole('heading', { name: /shore journal/i })).toBeVisible()
  await expect(page.getByText(new RegExp(`first at ${seed}`, 'i')).first()).toBeVisible()
})
