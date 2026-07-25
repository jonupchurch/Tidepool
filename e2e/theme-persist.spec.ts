import { type Page, expect, test } from '@playwright/test'

const themeAttr = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'))

// SC-004 — theme (and mute) toggles persist across restarts.
test('Night theme persists across reload', async ({ page }) => {
  await page.goto('/')

  // Toggle Night from Home (waits past the splash).
  const nightToggle = page.getByRole('button', { name: /night tide/i })
  await expect(nightToggle).toBeVisible()
  await nightToggle.click()
  await expect.poll(() => themeAttr(page)).toBe('night')

  // Reopen — the choice is remembered.
  await page.reload()
  await expect.poll(() => themeAttr(page)).toBe('night')
})
