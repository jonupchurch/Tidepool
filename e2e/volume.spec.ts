import { type Page, expect, test } from '@playwright/test'

// 015 — the master volume control. The jsdom tests cover the wiring; what needs
// a real browser is the part that comes from the input being *native*: arrow
// keys moving the value, and the level actually reaching the audio graph.

const slider = (page: Page) => page.getByRole('slider', { name: /volume/i })

test('the volume level persists across a reload', async ({ page }) => {
  await page.goto('/')

  const volume = slider(page)
  await expect(volume).toBeVisible()
  await volume.fill('0.3')
  await expect(volume).toHaveValue('0.3')

  await page.reload()
  await expect(slider(page)).toHaveValue('0.3')
})

test('the slider is operable by keyboard alone', async ({ page }) => {
  await page.goto('/')

  const volume = slider(page)
  await expect(volume).toBeVisible()
  await volume.fill('0.5')

  // A native range input gets arrow-key handling for free; this is the check
  // that we did not quietly lose it to custom styling or a wrapper.
  await volume.focus()
  await expect(volume).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveValue('0.55')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(volume).toHaveValue('0.45')

  // Home/End span the range, so "silence" and "full" are one key away.
  await page.keyboard.press('Home')
  await expect(volume).toHaveValue('0')
  await page.keyboard.press('End')
  await expect(volume).toHaveValue('1')
})

test('driving the level on a live board raises no errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  const volume = slider(page)
  await expect(volume).toBeVisible()

  // Clicking Play is also the gesture that permits audio, so from here on the
  // real Web Audio graph exists and every level change touches it. The gain
  // routing itself is asserted in the unit tests, where the nodes are
  // reachable; what this covers is that driving it in a real browser — mid
  // board, against a live context — stays quiet.
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.locator('canvas')).toBeVisible()

  await page.getByRole('button', { name: /menu/i }).click()
  const paused = page.getByRole('dialog', { name: /paused/i }).getByRole('slider', { name: /volume/i })
  for (const level of ['0', '1', '0.45']) {
    await paused.fill(level)
  }
  await expect(paused).toHaveValue('0.45')
  expect(errors).toEqual([])
})

test('the control is reachable from Pause without leaving the board', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.locator('canvas')).toBeVisible()

  // Pause lives behind the top-bar menu.
  await page.getByRole('button', { name: /menu/i }).click()
  const dialog = page.getByRole('dialog', { name: /paused/i })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('slider', { name: /volume/i }).fill('0.25')

  // Resume — the board is still there, and the level came with us.
  await dialog.getByRole('button', { name: /^resume$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('canvas')).toBeVisible()

  await page.getByRole('button', { name: /menu/i }).click()
  await expect(page.getByRole('dialog').getByRole('slider', { name: /volume/i })).toHaveValue('0.25')

  // And the same level is what Home shows — one setting, two surfaces.
  await page.getByRole('button', { name: /^home$/i }).click()
  await expect(slider(page)).toHaveValue('0.25')
})
