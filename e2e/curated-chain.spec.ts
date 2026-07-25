import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  centres: Record<string, { x: number; y: number }>
  solution: Record<string, 'water' | 'rock'>
  lastSave: Promise<void>
  progress: () => { complete: boolean; correct: number; total: number }
}

const hook = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__)

async function ready(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 20_000 },
  )
  return hook(page)
}

/** Solve the loaded board by clicking every non-given cell to its solution. */
async function solveBoard(page: Page): Promise<string> {
  const h = await ready(page)
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(h.solution)) {
    const c = h.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }
  await expect(page.getByRole('heading', { name: /the tide's in/i })).toBeVisible()
  await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.lastSave,
  )
  return h.seed
}

// The reported bug: finishing several curated boards back to back via "Next
// board" recorded only the first. The launch entry (and its curatedId) never
// advanced, so every later completion re-recorded the entry you started on —
// and the boards you actually played came from the Endless stream, not the
// curated ladder.
test('three curated boards in a row each record their own completion', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()

  // Start at the first shore and chain forward without returning to the map.
  await page.getByRole('button', { name: /First Cove/i }).click()
  const seeds = [await solveBoard(page)]

  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /next board/i }).click()
    seeds.push(await solveBoard(page))
  }

  // Each board in the chain was a distinct curated board.
  expect(new Set(seeds).size, `chained seeds: ${seeds.join(', ')}`).toBe(3)

  // All three are marked solved on the map.
  await page.getByRole('button', { name: /^home$/i }).click()
  await page.getByRole('button', { name: /curated/i }).click()
  const solved = page.getByRole('button', { name: /, solved/i })
  await expect(solved).toHaveCount(3)

  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([])
})

test('a curated board records its mistakes, and a clean replay clears them', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()
  await page.getByRole('button', { name: /First Cove/i }).click()

  // Fumble one cell, undo it, then solve properly: the run still counts 1 error.
  const h = await ready(page)
  const canvas = page.locator('canvas')
  const rock = Object.entries(h.solution).find(([, s]) => s === 'rock')?.[0]
  expect(rock, 'board has a hidden rock').toBeTruthy()
  const rc = h.centres[rock as string]
  await canvas.click({ position: { x: rc.x, y: rc.y } }) // water on a rock — wrong
  await canvas.click({ position: { x: rc.x, y: rc.y } }) // clear it
  await solveBoard(page)

  await page.getByRole('button', { name: /^home$/i }).click()
  await page.getByRole('button', { name: /curated/i }).click()
  await expect(page.getByRole('button', { name: /First Cove.*1 mistakes/i })).toBeVisible()

  // Replay it without a wrong mark: the record clears.
  await page.getByRole('button', { name: /First Cove/i }).click()
  await solveBoard(page)
  await page.getByRole('button', { name: /^home$/i }).click()
  await page.getByRole('button', { name: /curated/i }).click()
  await expect(page.getByRole('button', { name: /First Cove.*mistakes/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /First Cove.*solved/i })).toBeVisible()
})
