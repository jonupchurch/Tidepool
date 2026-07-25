import { type Page, expect, test } from '@playwright/test'

interface LabelHook {
  id: string
  x: number
  y: number
  total: number
}

interface TestHook {
  ready: boolean
  lineLabels: LabelHook[]
  guides: () => string[]
  doneLines: () => string[]
  progress: () => { complete: boolean; correct: number; total: number }
}

async function readHook(page: Page): Promise<TestHook> {
  await page.waitForFunction(
    () => (window as unknown as { __TIDEPOOLS__?: TestHook }).__TIDEPOOLS__?.ready === true,
    undefined,
    { timeout: 15_000 },
  )
  return page.evaluate(() => {
    const h = (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__
    return { ready: h.ready, lineLabels: h.lineLabels } as TestHook
  })
}

const guides = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.guides())

const doneLines = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.doneLines())

async function openTrickyBoard(page: Page): Promise<TestHook> {
  await page.goto('/')
  // Calm boards reduce away every line clue, so pick a tier that keeps them.
  await page.getByRole('button', { name: /^Medium$/ }).click()
  await page.getByRole('button', { name: /^Tricky$/ }).click()
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
  const hook = await readHook(page)
  expect(hook.lineLabels.length, 'a Tricky board shows line totals').toBeGreaterThan(0)
  return hook
}

test('clicking a line total toggles that row\'s guide on, then off', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  const hook = await openTrickyBoard(page)
  const canvas = page.locator('canvas')

  expect(await guides(page)).toEqual([])

  const first = hook.lineLabels[0]
  await canvas.click({ position: { x: first.x, y: first.y } })
  expect(await guides(page), 'first click turns the row guide on').toEqual([first.id])

  await canvas.click({ position: { x: first.x, y: first.y } })
  expect(await guides(page), 'second click turns it off').toEqual([])

  // Guides accumulate: several rows can be lit at once.
  if (hook.lineLabels.length > 1) {
    const second = hook.lineLabels[1]
    await canvas.click({ position: { x: first.x, y: first.y } })
    await canvas.click({ position: { x: second.x, y: second.y } })
    expect(await guides(page)).toEqual([first.id, second.id].sort())
  }

  // A label click must never mark the board.
  const prog = await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress(),
  )
  expect(prog.complete).toBe(false)

  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([])
})

test('right-clicking a line total strikes it off, and back on again', async ({ page }) => {
  const hook = await openTrickyBoard(page)
  const canvas = page.locator('canvas')
  const first = hook.lineLabels[0]

  expect(await doneLines(page)).toEqual([])

  await canvas.click({ position: { x: first.x, y: first.y }, button: 'right' })
  expect(await doneLines(page), 'right-click greys the total out').toEqual([first.id])
  // Striking off is independent of the guide toggle.
  expect(await guides(page)).toEqual([])

  await canvas.click({ position: { x: first.x, y: first.y }, button: 'right' })
  expect(await doneLines(page), 'right-click again restores it').toEqual([])

  // Left and right on the same total drive the two states independently.
  await canvas.click({ position: { x: first.x, y: first.y }, button: 'right' })
  await canvas.click({ position: { x: first.x, y: first.y } })
  expect(await doneLines(page)).toEqual([first.id])
  expect(await guides(page)).toEqual([first.id])

  // And it never places a stone — a right-click on a total is not a board mark.
  const prog = await page.evaluate(
    () => (window as unknown as { __TIDEPOOLS__: TestHook }).__TIDEPOOLS__.progress(),
  )
  expect(prog.complete).toBe(false)
})
