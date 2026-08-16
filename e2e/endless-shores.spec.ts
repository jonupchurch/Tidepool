// endless-shores.spec.ts — 016 end to end. The unit tests prove the selection
// layer computes the right request; these prove the app actually SERVES that
// board, which is the part that has quietly not happened before.
//
// Measured, not asserted by label: a silhouette shows up as a cell count that
// differs from the hexagon's, and an annotation shows up as a line label the
// renderer marked `{n}` / `-n-`.
import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  shape: string
  cells: number
  lineLabels: { id: string; total: number; connectivity: 'connected' | 'split' | null }[]
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => {
    const h = (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__
    return { ready: h.ready, seed: h.seed, shape: h.shape, cells: h.cells, lineLabels: h.lineLabels }
  })
}

/** Cells in a filled hexagon of each tier — the baseline a silhouette cuts into. */
const FULL_HEX = { Small: 37, Medium: 91, Large: 169 }

test('an Endless board can be played on a named silhouette', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await page.getByRole('button', { name: /^Atoll$/ }).click()
  await page.getByRole('button', { name: /^play$/i }).click()

  const hook = await readHook(page)
  expect(hook.shape).toBe('atoll')
  // The lagoon really is open: an atoll is a band, not a filled hexagon.
  expect(hook.cells).toBeLessThan(FULL_HEX.Large)
  expect(hook.cells).toBeGreaterThan(12)
  await expect(page.getByText(/Large · Deep · Atoll/)).toBeVisible()
})

test('the hexagon is still the default — no shore unless one is asked for', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^play$/i }).click()

  const hook = await readHook(page)
  expect(hook.shape).toBe('hex')
  expect(hook.cells).toBe(FULL_HEX.Large)
})

/**
 * A fixed seed, not the Play button: annotations are sparse by nature — the
 * generator yields 0-3 per Deep board and reduction drops any the board solves
 * without — so a random `freshSeed()` would make this test flaky about the very
 * thing it exists to check. KELP-0027 carries three, of both kinds.
 */
test('Edge hints put {n} and -n- on the row totals of a Deep board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('KELP-0027 Large Deep hints')
  await page.getByRole('button', { name: /jump in/i }).click()

  const hook = await readHook(page)
  const annotated = hook.lineLabels.filter((l) => l.connectivity !== null)
  expect(annotated.length).toBe(3)
  // Both readings appear, so the board really does distinguish one unbroken run
  // of water from more than one.
  expect(new Set(annotated.map((l) => l.connectivity))).toEqual(new Set(['connected', 'split']))
  await expect(page.getByText(/KELP-0027 · Large · Deep · hints/)).toBeVisible()
})

test('the same token without `hints` is the board that seed always made', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('KELP-0027 Large Deep')
  await page.getByRole('button', { name: /jump in/i }).click()

  const hook = await readHook(page)
  expect(hook.lineLabels.filter((l) => l.connectivity !== null)).toHaveLength(0)
  await expect(page.getByText(/KELP-0027 · Large · Deep$/)).toBeVisible()
})

test('a pasted board label reproduces the shore it names', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('KELP-0027 · Large · Deep · Wedge')
  await page.getByRole('button', { name: /jump in/i }).click()

  const hook = await readHook(page)
  expect(hook.shape).toBe('wedge')
  expect(hook.cells).toBeLessThan(FULL_HEX.Large)
})

test('Shore stays offered but inert on Small, where nothing fits', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Small$/ }).click()
  await expect(page.getByRole('button', { name: /^Open water$/ })).toBeDisabled()
  await expect(page.getByText(/Medium or Large/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Atoll$/ })).toHaveCount(0)
})
