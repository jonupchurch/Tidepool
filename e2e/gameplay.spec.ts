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

const progress = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress())

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

// A square settled correctly is locked: stray clicks can't knock it out.
test('a correctly marked cell cannot be changed by further clicks', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()

  const hook = await readHook(page)
  const canvas = page.locator('canvas')
  const water = Object.entries(hook.solution).find(([, s]) => s === 'water')?.[0]
  const rock = Object.entries(hook.solution).find(([, s]) => s === 'rock')?.[0]
  expect(water && rock, 'board has both a water and a rock cell').toBeTruthy()

  const wc = hook.centres[water as string]
  const rc = hook.centres[rock as string]

  await canvas.click({ position: { x: wc.x, y: wc.y } }) // correct water
  await canvas.click({ position: { x: rc.x, y: rc.y }, button: 'right' }) // correct rock
  const settled = await progress(page)
  expect(settled.correct).toBe(2)

  // Click each again, both buttons: nothing moves.
  for (const c of [wc, rc]) {
    await canvas.click({ position: { x: c.x, y: c.y } })
    await canvas.click({ position: { x: c.x, y: c.y }, button: 'right' })
  }
  expect((await progress(page)).correct, 'settled cells survived 4 more clicks').toBe(2)
  // ...and none of those clicks counted as a mistake.
  await expect(page.getByText(/⚠ 0 errors/)).toBeVisible()
})
