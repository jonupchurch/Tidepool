// even-odd.spec.ts — 018 end to end.
//
// The unit tests prove the engine can build a board carrying `+` / `|` and that
// the selection layer asks for one. These prove the app actually SERVES it and
// the renderer actually draws it — measured through the clue faces the renderer
// produced, not read off the board label, for the same reason 016 counts cells
// rather than trusting a silhouette's name.
import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  cells: number
  clueFaces: string[]
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => {
    const h = (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__
    return { ready: h.ready, seed: h.seed, cells: h.cells, clueFaces: h.clueFaces }
  })
}

/**
 * A fixed seed, deliberately. Which clues reduction can weaken depends on the
 * board, so a random `freshSeed()` would make this flaky about the very thing it
 * checks. CORAL-4417 Large/Deep carries 4 `●●` and 9 `●` — and, usefully for the
 * assertion below, two plain `0` clues, since a count of zero is never allowed
 * to become an even mark.
 */
test('even/odd puts ●● and ● on the stones of a Deep board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('CORAL-4417 Large Deep evenodd')
  await page.getByRole('button', { name: /jump in/i }).click()

  const hook = await readHook(page)
  const even = hook.clueFaces.filter((f) => f === '●●').length
  const odd = hook.clueFaces.filter((f) => f === '●').length

  // Both readings appear, so the board really does distinguish even from odd.
  expect(even).toBeGreaterThan(0)
  expect(odd).toBeGreaterThan(0)
  // ...and they are a minority of the clues, not the whole board.
  expect(even + odd).toBeLessThan(hook.clueFaces.length)
  // No clue face is a bare digit that could be confused with a parity mark.
  expect(hook.clueFaces).not.toContain('O')
  expect(hook.clueFaces).not.toContain('E')
  // A zero is shown as a zero, never dressed up as `●●`. Zero is even, so the
  // mark would be correct and misleading: a player reads "even" as two-four-or-
  // six and would wrongly conclude at least two neighbours are water.
  expect(hook.clueFaces).toContain('0')

  await expect(page.getByText(/CORAL-4417 · Large · Deep · evenodd/)).toBeVisible()
})

test('the same token without `evenodd` is the board that seed always made', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: /enter a seed/i }).fill('CORAL-4417 Large Deep')
  await page.getByRole('button', { name: /jump in/i }).click()

  const hook = await readHook(page)
  expect(hook.clueFaces.filter((f) => f === '●●' || f === '●')).toHaveLength(0)
  await expect(page.getByText(/CORAL-4417 · Large · Deep$/)).toBeVisible()
})

test('even/odd is offered only on Deep tides', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()

  // Calm: the switch is present but disabled, and says why.
  await page.getByRole('button', { name: /^Calm$/ }).click()
  const sw = page.getByRole('switch', { name: /even & odd/i })
  await expect(sw).toBeDisabled()

  // Deep: it can actually be turned on.
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await expect(sw).toBeEnabled()
  await sw.click()
  await expect(sw).toBeChecked()
})

/**
 * Regression: the settings must survive the endless constructors.
 *
 * "Next board" and "New board" are separate constructors from Play, and 016 had
 * to fix exactly this bug for the shore choice. 018 shipped with the same hole
 * for even/odd: finishing a board and advancing served one with no marks at all,
 * while Home went on showing the switch as on.
 */
test('advancing to the next board keeps even/odd on', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await page.getByRole('switch', { name: /even & odd/i }).click()
  await page.getByRole('button', { name: /^play$/i }).click()

  const first = await readHook(page)
  expect(first.clueFaces.filter((f) => f === '●●' || f === '●').length).toBeGreaterThan(0)

  // Solve it via the dev hook, then take the next board.
  await page.evaluate(() => {
    const h = (window as unknown as { __TIDEPOOLS__: { solution: Record<string, string> } })
      .__TIDEPOOLS__
    return h.solution
  })
  await page.getByRole('button', { name: /menu/i }).click()
  await page.getByRole('button', { name: /new board/i }).click()

  const next = await readHook(page)
  expect(next.seed).not.toBe(first.seed)
  expect(
    next.clueFaces.filter((f) => f === '●●' || f === '●').length,
    'the new board dropped the even/odd setting',
  ).toBeGreaterThan(0)
})

test('the even/odd switch is still on when you come back to Home', async ({ page }) => {
  // Regression: `evenOdd` reached the settings *model* but not the persisted
  // record *schema*, so the value was written into a field the record type did
  // not have and vanished on the next read.
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await page.getByRole('switch', { name: /even & odd/i }).click()
  await page.getByRole('button', { name: /^play$/i }).click()
  await readHook(page)

  // Back to Home the long way round, as a player would.
  await page.getByRole('button', { name: /menu/i }).click()
  await page.getByRole('button', { name: /home|leave/i }).first().click()
  await expect(page.getByRole('switch', { name: /even & odd/i })).toBeChecked()

  // And it survives a reload, which is the part the schema controls.
  await page.reload()
  await expect(page.getByRole('switch', { name: /even & odd/i })).toBeChecked()
})
