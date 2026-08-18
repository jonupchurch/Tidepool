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

// 023 — the round trip that was broken for ~99% of Endless boards. `freshSeed`
// emits base 36 (`TIDE-H4SD`) and the parser took digits only, so the game
// printed a seed its own seed box then refused. Driven through the UI rather
// than asserted on the parser, because the promise is a player-facing one: the
// seed on the board you are playing takes you back to that board.
test("a board's own seed jumps back to that board", async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: { ready?: boolean } }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  const served = await seedOf(page)
  expect(served, 'no seed on the served board').toBeTruthy()

  // Back to Home and type it in, exactly as it was printed.
  await page.getByRole('button', { name: /menu/i }).click()
  await page.getByRole('button', { name: /home|leave|shore/i }).first().click()
  const box = page.getByRole('textbox', { name: /enter a seed/i })
  await expect(box).toBeVisible()
  // The board is really gone before we ask for it back. Without this the test
  // passes on a REJECTED seed: the dev hook keeps the last board's values, so
  // `seedOf` would still answer with the seed we just read. Checked by putting
  // the digits-only pattern back and watching this fail.
  await expect(page.locator('canvas')).toHaveCount(0)

  await box.fill(served as string)
  await page.getByRole('button', { name: /jump/i }).click()

  // The refusal this bug produced was a visible one — assert its absence
  // directly rather than inferring it from what loaded.
  await expect(page.getByRole('alert'), `the seed box refused “${served}”`).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(1)

  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: { ready?: boolean } }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  expect(await seedOf(page), 'the seed it printed did not reopen its board').toBe(served)
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
