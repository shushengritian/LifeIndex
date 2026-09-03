import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('loads the LifeIndex shell and navigates between primary destinations', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()
  await page.getByRole('link', { name: /习惯/ }).click()
  await expect(page.getByRole('heading', { name: '习惯' })).toBeVisible()
  await expect(page).toHaveURL(/#\/habits$/)
})

test('has no automatically detectable accessibility violations on the shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
