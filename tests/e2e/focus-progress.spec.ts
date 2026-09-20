import { expect, test } from '@playwright/test'

for (const theme of ['浅色', '深色']) {
  test(`live elapsed time and separator spacing in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.clock.install()
    await page.goto('/#/settings/appearance')
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('link', { name: '专注', exact: true }).click()
    await page.getByLabel('专注标题').fill('合成计时验证')
    await page.getByRole('button', { name: '开始专注', exact: true }).click()
    await expect(page.getByRole('button', { name: '提前结束' })).toBeVisible()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    await page.clock.runFor(61000)
    await expect(page.locator('.focus-progress-labels')).toContainText(/已专注\s+01:0[12]/)
    await expect(page.getByRole('timer')).toHaveText(/23:5[89]/)
    expect(
      Number(await page.locator('.focus-orbit path[pathLength]').getAttribute('stroke-dashoffset')),
    ).toBeLessThan(97)
    const summary = await page.getByLabel('专注汇总').boundingBox()
    const actions = await page.locator('.active-focus > .form-actions').boundingBox()
    const history = await page.getByRole('link', { name: '查看专注历史' }).boundingBox()
    expect(summary!.y - actions!.y - actions!.height).toBeGreaterThanOrEqual(24)
    expect(history!.y - summary!.y - summary!.height).toBeGreaterThanOrEqual(20)
    await expect(page.getByLabel('专注汇总')).toContainText('0 秒')
    // Leaving and returning reprojects persisted timestamps; it must not restart elapsed time.
    await page.getByRole('link', { name: '健康', exact: true }).click()
    await page.clock.runFor(60000)
    // Dexie schedules subscription delivery with timers; resume before mounting the route again.
    await page.clock.resume()
    await page.getByRole('link', { name: '专注', exact: true }).click()
    await expect(page.locator('.focus-progress-labels')).toContainText(/已专注\s+02:0[0-9]/)
    await page.getByRole('button', { name: '提前结束' }).click()
    await page.getByRole('button', { name: '结束并保存' }).click()
    await expect(page.getByLabel('专注汇总')).toContainText('2 分钟')
    await page.setViewportSize({ width: 320, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
