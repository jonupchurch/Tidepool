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
  await expect(page.getByText(/count the water in that whole line/i)).toBeVisible()

  // 019: the two halves are named separately, then composed — the whole point
  // of the restructure. Six forms taught as six glyphs would be a wall.
  await expect(page.getByRole('heading', { name: /how much water/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /how it sits/i })).toBeVisible()
  await expect(page.getByText(/the two combine/i)).toBeVisible()

  // ...and the grid the rule produces contains every form, including the four
  // 019 added. `exact` throughout: these are one-cell strings and a substring
  // match would find `{4}` inside nothing but would find `●●` inside `{●●}` and
  // fail strict mode.
  // Scoped to the table's cells: `●●` and `●` also head the "how much water"
  // list above, and an unscoped exact match would find both and trip strict
  // mode — which is itself the point, since the glyph is meant to appear as a
  // face AND inside every framing of it.
  for (const form of ['4', '{4}', '-4-', '●●', '{●●}', '-●●-', '●', '{●}', '-●-']) {
    await expect(page.getByRole('cell', { name: form, exact: true }), `form ${form}`).toBeVisible()
  }

  // It offers a way straight into a board.
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
})

// The Play button on that screen is a board request like any other, and has to
// carry the player's Endless choices. It did not until 019 — a pre-existing 016
// gap that 018 also missed — so a player could read about `-●-` and be handed a
// board that cannot contain one.
//
// It reads the LAST PLAYED settings, not Home's picker, which is why this plays
// a board first. Home holds its picker in local state and commits it on Play, so
// the tutorial, seed entry and Pause all share the same "whatever is stored"
// rule. That is deliberate, not the gap being fixed here.
test('the Play button on How to play keeps the settings you played with', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Large$/ }).click()
  await page.getByRole('button', { name: /^Deep$/ }).click()
  await page.getByRole('switch', { name: /even & odd/i }).click()
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByText(/· Large · Deep · evenodd/)).toBeVisible()

  await page.getByRole('button', { name: /menu/i }).click()
  await page.getByRole('button', { name: /home|leave/i }).first().click()
  await page.getByRole('button', { name: /how to play/i }).click()
  await page.getByRole('button', { name: /^play$/i }).click()

  await expect(page.getByText(/· Large · Deep · evenodd/)).toBeVisible()
})
