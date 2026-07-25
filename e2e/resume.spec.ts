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

const progress = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress())

// SC-002 — leave a board mid-solve, reopen, and the resume card restores the
// exact saved board (the launch → navigate → resume path).
test('leave mid-solve → reopen → resume restores the exact board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()

  const before = await readHook(page)
  const seedBefore = before.seed

  // Mark one water cell, then confirm the autosave persisted it.
  const waterKey = Object.entries(before.solution).find(([, s]) => s === 'water')?.[0]
  expect(waterKey, 'board has at least one water cell').toBeTruthy()
  const c = before.centres[waterKey as string]
  await page.locator('canvas').click({ position: { x: c.x, y: c.y }, button: 'left' })
  await expect.poll(async () => (await progress(page)).correct).toBeGreaterThanOrEqual(1)
  // Wait for the autosave to actually commit to storage before reloading.
  await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: { lastSave: Promise<void> } }).__TIDEPOOLS__.lastSave,
  )

  // Reopen the app (walk away and come back).
  await page.reload()

  // The resume card appears and restores the exact board.
  const card = page.getByRole('button', { name: /continue your pool/i })
  await expect(card).toBeVisible()
  await card.click()

  const after = await readHook(page)
  expect(after.seed, 'same board restored').toBe(seedBefore)
  expect((await progress(page)).correct, 'the mark survived').toBeGreaterThanOrEqual(1)
})

// A finished board is not something to continue: solving one must drop the
// resume record, whether you leave via Home or by closing the app.
test('solve a board → Home offers no resume, and neither does a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()

  const hook = await readHook(page)
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }
  await expect(page.getByRole('heading', { name: /the tide's in/i })).toBeVisible()
  await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: { lastSave: Promise<void> } }).__TIDEPOOLS__.lastSave,
  )

  await page.getByRole('button', { name: /^home$/i }).click()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue your pool/i })).toHaveCount(0)

  // And the cleared record is durable, not just cleared in memory.
  await page.reload()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue your pool/i })).toHaveCount(0)
})
