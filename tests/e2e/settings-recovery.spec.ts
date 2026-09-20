import { expect, test, type Page } from '@playwright/test'

async function expectNavigation(page: Page) {
  const nav = page.getByRole('navigation', { name: '主要导航' })
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link')).toHaveCount(5)
  expect(
    await nav.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const viewport = window.visualViewport
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight)
      return box.top >= 0 && box.bottom <= bottom + 1 && !element.closest('[inert]')
    }),
  ).toBe(true)
}

test('settings callouts, file cancellation and nested dialog return keep navigation usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: '从备份恢复', exact: true })).toBeVisible()
  // Synthetic contextmenu verifies our prevention handler, not the physical iOS callout UI.
  for (const link of [
    page.getByRole('link', { name: '从备份恢复', exact: true }),
    page.getByRole('link', { name: '设置', exact: true }),
  ]) {
    expect(
      await link.evaluate(
        (element) =>
          !element.dispatchEvent(
            new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
          ),
      ),
    ).toBe(true)
  }
  await page.getByRole('link', { name: '从备份恢复', exact: true }).click()
  // Browsers do not automate the OS Files sheet: exercise its empty/cancel event boundary only.
  await page.locator('input[type=file]').setInputFiles([])
  await page.locator('input[type=file]').dispatchEvent('cancel')
  await expectNavigation(page)
  await page.getByRole('link', { name: '设置', exact: true }).click()
  await page.getByText('分类管理', { exact: true }).click()
  await page.getByRole('button', { name: '新增分类', exact: true }).click()
  await page.getByLabel('分类名称', { exact: true }).fill('合成旅行')
  await page.getByRole('button', { name: '旅游住宿', exact: true }).click()
  await page.getByRole('button', { name: '图标 旅游', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: '放弃分类修改？' })
  await confirm.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByLabel('分类名称', { exact: true })).toHaveValue('合成旅行')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await confirm.getByRole('button', { name: '放弃修改', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expectNavigation(page)
  await page.getByRole('link', { name: '记账', exact: true }).click()
  await expect(page.getByRole('button', { name: '新增交易' })).toBeVisible()
  await expectNavigation(page)
})

for (const theme of ['浅色', '深色']) {
  test(`rounded settings feedback in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/settings/appearance')
    const choice = page.getByRole('button', { name: theme, exact: true })
    await choice.click()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await expect(choice).toHaveCSS('border-radius', '14px')
    await page.getByRole('link', { name: '返回设置', exact: true }).click()
    const restore = page.getByRole('link', { name: '从备份恢复', exact: true })
    await restore.focus()
    await expect(restore).toHaveCSS('border-radius', '14px')
    await expect(page.locator('.category-manager-disclosure > summary')).toHaveCSS(
      'border-radius',
      '14px',
    )
    await expectNavigation(page)
  })
}
