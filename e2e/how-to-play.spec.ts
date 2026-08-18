import { expect, test } from '@playwright/test'

// The rail beside the board can be dismissed — and must always be recoverable.
test('the board rail hides and comes back, and the choice sticks', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()

  const rail = page.getByRole('complementary', { name: /how to play/i })
  const tab = page.getByRole('button', { name: /show how to play/i })

  await expect(rail).toBeVisible()
  await expect(tab).toHaveCount(0)

  // Dismiss → the rail goes, a quiet "?" takes its place.
  await page.getByRole('button', { name: /^close$/i }).click()
  await expect(rail).toHaveCount(0)
  await expect(tab).toBeVisible()

  // Dismissal is remembered across a reload (back via Home's resume card).
  await page.reload()
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(tab).toBeVisible()
  await expect(rail).toHaveCount(0)

  // ...and is never a one-way door.
  await tab.click()
  await expect(rail).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(rail).toBeVisible()
})

// The same rules are reachable from the menu, for players on a small screen
// where the rail is hidden entirely.
test('How to play is reachable from Home and explains the clue forms', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /how to play/i }).click()

  await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible()
  await expect(page.getByText(/left-click for water/i)).toBeVisible()
  // `exact` matters now: the edge-runs sentence below also contains "{n}", and
  // a substring match would find both and fail on strict mode.
  await expect(page.getByText('{n}', { exact: true })).toBeVisible()
  await expect(page.getByText('-n-', { exact: true })).toBeVisible()
  await expect(page.getByText(/count the water in that whole line/i)).toBeVisible()
  // 010: the same braces/dashes, explained for row totals too.
  await expect(page.getByText(/one unbroken run/i)).toBeVisible()
  // 018: the parity marks. `exact` again — the sentence below names them too.
  await expect(page.getByText('+', { exact: true })).toBeVisible()
  await expect(page.getByText('|', { exact: true })).toBeVisible()
  await expect(page.getByText(/one stroke for odd, two crossed for even/i)).toBeVisible()

  // It offers a way straight into a board.
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
})
