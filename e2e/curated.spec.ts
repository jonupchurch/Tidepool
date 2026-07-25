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

async function solveBoard(page: Page, hook: TestHook) {
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }
}

// SC-004 — a curated entry loads its exact board; solving records completion +
// earned creature, which persist across a reload.
test('Curated: select → exact board → solve → completion persists', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()

  // The ordered coastline renders.
  await expect(page.getByText('First Cove')).toBeVisible()
  await expect(page.getByText('Quiet Reef')).toBeVisible()

  // Select the first entry → its exact seed loads.
  await page.getByRole('button', { name: /^play$/i }).first().click()
  const hook = await readHook(page)
  expect(hook.seed).toBe('COVE-0001')

  // Solve it → completion panel, then back Home.
  await solveBoard(page, hook)
  await expect(page.getByRole('heading', { name: /the tide's in/i })).toBeVisible()
  await page.getByRole('button', { name: /^home$/i }).click()

  // The curated list now shows it solved (with the earned creature).
  await page.getByRole('button', { name: /curated/i }).click()
  await expect(page.getByText(/solved/i)).toBeVisible()

  // Persists across a reload.
  await page.reload()
  await page.getByRole('button', { name: /curated/i }).click()
  await expect(page.getByText(/solved/i)).toBeVisible()
})
