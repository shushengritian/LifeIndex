import { expect, test } from '@playwright/test'

for (const theme of ['浅色', '深色']) {
  test(`read and write targets stay separated in ${theme}`, async ({ page }) => {
    // Measure settled layout, not different frames of the page-entry transform.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/settings/appearance')
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('link', { name: '今天', exact: true }).click()
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 568 })
      const add = page.getByRole('link', { name: '记一笔', exact: true })
      const read = page.getByRole('link', { name: '查看今日账目', exact: true })
      await expect(add).toBeVisible()
      // Read all related rectangles in one frame; smooth scroll can move the viewport between separate calls.
      const { a, r, h } = await page
        .getByRole('region', { name: '今日账目' })
        .evaluate((section) => ({
          a: section.querySelector('a[aria-label="记一笔"]')!.getBoundingClientRect().toJSON(),
          r: section
            .querySelector('a[aria-label="查看今日账目"]')!
            .getBoundingClientRect()
            .toJSON(),
          h: section.querySelector('h2')!.getBoundingClientRect().toJSON(),
        }))
      expect(a.width).toBeGreaterThanOrEqual(44)
      expect(a.height).toBeGreaterThanOrEqual(44)
      expect(r.height).toBeGreaterThanOrEqual(64)
      expect(r.y - a.y - a.height).toBeGreaterThanOrEqual(16)
      expect(Math.abs(h.y + h.height / 2 - a.y - a.height / 2)).toBeLessThan(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      // Verify the indicator is hidden, not the scrolling surface or navigation.
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth),
      ).toBe('none')
      await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible()
      if (width === 390) {
        await read.scrollIntoViewIfNeeded()
        await page.screenshot({ path: test.info().outputPath(`today-${theme}.png`) })
      }
    }
    await page.getByRole('link', { name: '查看今日账目', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('link', { name: '报表', exact: true })).toBeVisible()
    expect(await page.locator('.finance-heading-actions a').count()).toBe(0)
    await page.getByRole('button', { name: '新增交易' }).click()
    const save = page.getByRole('button', { name: '保存', exact: true })
    await expect(save).toBeVisible()
    const closeBox = (await page.getByRole('button', { name: '关闭编辑器' }).boundingBox())!
    const saveBox = (await save.boundingBox())!
    expect(Math.abs(closeBox.y - saveBox.y)).toBeLessThan(1)
    expect(saveBox.x - closeBox.x - closeBox.width).toBeGreaterThan(80)
    await page.screenshot({ path: test.info().outputPath(`editor-${theme}.png`) })
    await page.getByRole('button', { name: '关闭编辑器', exact: true }).click()
    await page.getByRole('link', { name: '健康', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    const weight = page.getByRole('region', { name: '体重', exact: true })
    await expect(weight.getByRole('button', { name: '查看体重历史', exact: true })).toBeVisible()
    const gap = await weight.evaluate((section) => {
      const add = section.querySelector('[aria-label="记录体重"]')!.getBoundingClientRect()
      const read = section.querySelector('[aria-label="查看体重历史"]')!.getBoundingClientRect()
      return read.top - add.bottom
    })
    expect(gap).toBeGreaterThanOrEqual(16)
    await page.screenshot({ path: test.info().outputPath(`health-${theme}.png`) })
    await weight.getByRole('button', { name: '查看体重历史', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('link', { name: '返回健康', exact: true }).click()
    await weight.getByRole('button', { name: '记录体重', exact: true }).click()
    await expect(page.getByRole('button', { name: '保存体重', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '关闭编辑器', exact: true }).click()
    await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible()
    console.info('test.iconfirst.layout.checked', { theme, count: 3 })
  })
}
