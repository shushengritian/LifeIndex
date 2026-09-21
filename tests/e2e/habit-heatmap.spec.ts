import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const theme of ['浅色', '深色']) {
  test(`habit heatmap inspection is read-only and accessible in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/#/settings/appearance')
    const choice = page.getByRole('button', { name: theme, exact: true })
    await choice.click()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/#/health/habits')
    await page.getByRole('button', { name: '新增习惯', exact: true }).click()
    await page.getByLabel('习惯名称').fill('合成热力图测试')
    await page.getByRole('button', { name: '保存习惯', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: '查看 合成热力图测试 详情' }).click()
    await page.getByRole('button', { name: /合成热力图测试.*点按完成/ }).click()
    await expect(page.getByRole('button', { name: /合成热力图测试.*已完成/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const dialog = page.getByRole('dialog', { name: '习惯统计' })
    const cells = dialog.locator('.heatmap-cell')
    await expect(cells).toHaveCount(98)
    expect(
      await dialog.locator('.habit-heatmap-scroll').evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(0)
    await cells.first().click()
    await expect(dialog.getByRole('status')).toContainText('非计划日')
    await expect(cells.first()).toHaveAttribute('aria-pressed', 'true')
    // Tab/Enter inspection and pointer inspection have identical, read-only semantics.
    await cells.last().focus()
    await page.keyboard.press('Enter')
    await expect(cells.last()).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByText('全部完成').locator('..')).toContainText('1 次')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0)
    const sizes = await cells.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width >= 44 && rect.height >= 44
      }),
    )
    expect(sizes.every(Boolean)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await dialog.getByRole('button', { name: '关闭统计' }).click()
    await page.reload()
    await page.getByRole('button', { name: '查看 合成热力图测试 详情' }).click()
    await expect(page.getByRole('button', { name: /合成热力图测试.*已完成/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    console.info('habit.heatmap.inspection.passed', { theme, count: 98 })
  })
}
