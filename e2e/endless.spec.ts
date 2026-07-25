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

const seedOf = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.seed)

test('the Endless picker retargets the stream', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByText(/Large · Deep/)).toBeVisible()
})

test('Next board advances the deterministic Endless stream at the same tier', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click() // default Small / Calm

  const first = await readHook(page)
  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(first.solution)) {
    const c = first.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }

  await expect(page.getByRole('heading', { name: /the tide's in/i })).toBeVisible()
  await page.getByRole('button', { name: /next board/i }).click()

  // A fresh board with a different (deterministic) seed, same size/difficulty.
  await expect.poll(() => seedOf(page)).not.toBe(first.seed)
  await expect(page.getByText(/Small · Calm/)).toBeVisible()
})
