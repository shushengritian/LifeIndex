import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = [
  '/today',
  '/health',
  '/health/weight-history',
  '/health/activity-history',
  '/health/habits',
  '/health/cessation',
  '/focus',
  '/focus/history',
  '/finance',
  '/settings',
  '/settings/appearance',
  '/settings/export',
  '/settings/restore',
  '/settings/about',
]

for (const theme of ['light', 'dark'] as const) {
  test(`final ${theme} route accessibility and narrow-screen matrix`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/#/settings/appearance')
    const themeButton = page.getByRole('button', {
      name: theme === 'light' ? '浅色' : '深色',
      exact: true,
    })
    await themeButton.click()
    // Wait for persistence, not only the optimistic root attribute, before changing routes.
    await expect(themeButton).toHaveAttribute('aria-pressed', 'true')
    for (const route of routes) {
      await page.goto(`/#${route}`)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        route,
      ).toBeLessThanOrEqual(0)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, `${theme} ${route}`).toEqual([])
      console.info('accessibility.matrix.checked', { theme, route })
    }
  })
}

test('finance sheet and discard confirmation contain and restore keyboard focus', async ({
  page,
}) => {
  await page.goto('/#/finance')
  const opener = page.getByRole('button', { name: '新增交易' })
  // Keyboard activation gives both engines an explicit return-focus source, unlike touch taps.
  await opener.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog')
  await expect(page.getByLabel('金额（CNY）')).toBeFocused()
  const controls = sheet.locator(
    'button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]',
  )
  await controls.last().focus()
  await page.keyboard.press('Tab')
  await expect(controls.first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(controls.last()).toBeFocused()
  await page.getByLabel('金额（CNY）').fill('12.34')
  const cancel = sheet.getByRole('button', { name: '关闭编辑器', exact: true })
  await cancel.focus()
  await page.keyboard.press('Enter')
  const confirmation = page.getByRole('dialog', { name: '放弃这次输入？' })
  await expect(confirmation.getByRole('button', { name: '继续填写' })).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(confirmation).toHaveCount(0)
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Enter')
  await confirmation.getByRole('button', { name: '放弃输入' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  console.info('accessibility.finance.keyboard.passed', { operation: 'discard' })
})
