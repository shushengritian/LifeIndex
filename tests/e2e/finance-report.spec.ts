import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const theme of ['浅色', '深色']) {
  test(`read-only report preserves calendar context in ${theme}`, async ({ page }) => {
    console.info('finance.report.browser.started', { theme, operation: 'read' })
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/#/settings/appearance')
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('link', { name: '记账', exact: true }).click()
    await page.getByRole('button', { name: '新增交易' }).click()
    await page.getByLabel('金额（CNY）').fill('12.34')
    await page.getByRole('button', { name: '一级分类 餐饮', exact: true }).click()
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Closing the editor precedes the live calendar requery; capture only the committed aggregate.
    await expect(page.getByRole('gridcell', { selected: true })).toHaveAttribute(
      'aria-label',
      /12\.34/,
    )
    const selectedDate = await page
      .getByRole('gridcell', { selected: true })
      .getAttribute('aria-label')
    await page.getByRole('link', { name: '报表', exact: true }).click()
    await expect(page.getByRole('heading', { name: '报表', exact: true })).toBeVisible()
    await expect(page.getByLabel('报表月汇总')).toContainText('¥12.34')
    await expect(page.getByRole('list', { name: '支出分类汇总' })).toContainText('100.0%')
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Read-only switches must never create rows; a month with no records has no synthetic zero trend.
    await page.getByRole('button', { name: '收入', exact: true }).click()
    await expect(page.getByText('暂无记录，无法形成趋势', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '报表上个月' }).click()
    await expect(page.getByText('暂无记录，无法形成趋势', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: '返回记账' }).click()
    await expect(page.getByRole('gridcell', { selected: true })).toHaveAttribute(
      'aria-label',
      selectedDate!,
    )
    await expect(page.getByLabel('本月账目汇总')).toContainText('¥12.34')
    await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible()
    console.info('finance.report.browser.completed', { theme, operation: 'read' })
  })
}
