import { test, expect } from '@playwright/test'

test('landing renders the wordmark', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /tidepools/i })).toBeVisible()
})
