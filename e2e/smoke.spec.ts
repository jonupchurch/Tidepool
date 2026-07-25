import { expect, test } from '@playwright/test'

test('landing shows the Home shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /tidepools/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()
})
