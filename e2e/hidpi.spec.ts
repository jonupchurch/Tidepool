import { expect, test } from '@playwright/test'

// The board is one big canvas, so it has to allocate its pixel buffer in device
// pixels or it renders at 1× and gets upscaled — soft hexes, soft numerals.
// Equally important: scaling the context must not shift where clicks land.
test.use({ deviceScaleFactor: 2 })

interface TestHook {
  ready: boolean
  centres: Record<string, { x: number; y: number }>
  solution: Record<string, 'water' | 'rock'>
  progress: () => { complete: boolean; correct: number; total: number }
}

test('at 2× the canvas buffer is doubled and clicks still land true', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()

  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )

  const size = await page.evaluate(() => {
    const c = document.querySelector('canvas')!
    return { buffer: c.width, css: c.clientWidth, ratio: window.devicePixelRatio }
  })
  expect(size.ratio).toBe(2)
  expect(size.css).toBeGreaterThan(0)
  // The buffer is allocated in device pixels; the CSS box is unchanged.
  expect(size.buffer).toBe(Math.round(size.css * 2))

  // Hit-testing works in CSS pixels either side of the context scale. If the
  // transform were applied in the wrong direction, this click would land on a
  // different hex — or off the board entirely — and mark nothing.
  const hook = await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__,
  )
  const waterKey = Object.keys(hook.solution).find((k) => hook.solution[k] === 'water')!
  const centre = hook.centres[waterKey]

  const canvas = page.locator('canvas')
  await canvas.click({ position: { x: centre.x, y: centre.y } })

  const progress = await page.evaluate(() =>
    (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress(),
  )
  expect(progress.correct).toBe(1)
})
