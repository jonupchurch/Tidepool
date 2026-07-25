import { type Page, expect, test } from '@playwright/test'

interface TestHook {
  ready: boolean
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

test('play a board to completion → creature + "The tide\'s in." panel', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  // Land on Home, then Play into a board.
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()

  const hook = await readHook(page)
  const canvas = page.locator('canvas')

  // Mark every non-given cell to its solution: left-click water, right-click rock.
  for (const [key, state] of Object.entries(hook.solution)) {
    const c = hook.centres[key]
    await canvas.click({
      position: { x: c.x, y: c.y },
      button: state === 'water' ? 'left' : 'right',
    })
  }

  const prog = await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress(),
  )
  expect(prog, 'every non-given cell marked correctly').toMatchObject({
    complete: true,
    correct: prog.total,
  })

  // The calm completion panel appears with all three actions.
  await expect(page.getByRole('heading', { name: /the tide's in/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /next board/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /journal/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^home$/i })).toBeVisible()

  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([])
})
