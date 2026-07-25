import { expect, test } from '@playwright/test'

test('landing mounts the gameplay board', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
})
