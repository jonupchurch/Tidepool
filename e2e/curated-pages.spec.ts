import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
  seed: string
  centres: Record<string, { x: number; y: number }>
  solution: Record<string, 'water' | 'rock'>
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__)
}

// 013 US2/SC-003 — the second page has to be reachable, obvious, and returnable
// from. A page nobody can find is worse than no second page.
test('the coastline pages forward to page two and back again', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()

  await expect(page.getByText(/page 1 of 2/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /previous page/i })).toBeDisabled()

  await page.getByRole('button', { name: /next page/i }).click()
  await expect(page.getByText(/page 2 of 2/i)).toBeVisible()
  // Assert on a tile, not the <section>: the group wrappers hold absolutely
  // positioned children and so have no box of their own, which Playwright
  // rightly reports as not visible.
  await expect(page.getByRole('button', { name: /Outer Ring/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /First Cove/i })).toHaveCount(0)

  await page.getByRole('button', { name: /previous page/i }).click()
  await expect(page.getByText(/page 1 of 2/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /First Cove/i })).toBeVisible()
})

// The pager must be operable without a mouse.
test('the pager is reachable and operable by keyboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()

  const next = page.getByRole('button', { name: /next page/i })
  await next.focus()
  await expect(next).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/page 2 of 2/i)).toBeVisible()
})

// SC-004 — a page-two board carrying the new mechanics actually plays.
test('a shaped page-two board loads and can be solved', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /curated/i }).click()
  await page.getByRole('button', { name: /next page/i }).click()

  // The Atoll's first board — a silhouette with a hole in the middle.
  await page.getByRole('button', { name: /Outer Ring/i }).click()

  const hook = await readHook(page)
  expect(Object.keys(hook.solution).length).toBeGreaterThan(0)

  const canvas = page.locator('canvas')
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({ position: { x: c.x, y: c.y }, button: state === 'water' ? 'left' : 'right' })
  }
  await expect(page.getByText(/the tide's in/i)).toBeVisible()
})
