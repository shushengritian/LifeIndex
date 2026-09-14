import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function startPlan(page: Page, start = '2026-09-02T14:00') {
  await page.clock.install({ time: new Date('2026-09-14T12:00:00Z') })
  await page.goto('/#/health/cessation')
  await page.getByRole('button', { name: '开始计划', exact: true }).click()
  await page.getByLabel('开始日期与时间').fill(start)
  await page.getByRole('form').getByRole('button', { name: '开始计划', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('计划已保存')
}

test('cessation preserves confirmations, handles smoking and craving, and persists across reload', async ({
  page,
}) => {
  await startPlan(page)
  await page.getByRole('button', { name: '2026-09-13 未记录', exact: true }).click()
  await page.getByRole('button', { name: '确认全天未吸烟', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已确认全天')
  await page.getByRole('button', { name: '截至现在未吸烟', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('不代表全天')
  await page.getByRole('button', { name: /^记录吸烟/ }).click()
  await page.getByLabel('这次吸了几支').fill('1')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '截至现在未吸烟', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: '截至现在未吸烟', exact: true })).toBeDisabled()
  await expect(page.getByText('吸烟 1 支', { exact: true })).toBeVisible()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('未自动创建无烟确认')
  await page.getByRole('button', { name: '我想抽烟', exact: true }).click()
  await page.getByLabel('诱因（可选）').selectOption('stress')
  await page.getByRole('button', { name: '开始 3 分钟', exact: true }).click()
  await page.clock.fastForward('03:01')
  await expect(page.getByLabel('休息剩余时间')).toHaveText('00:00')
  await page.getByRole('button', { name: '缓解了，保存', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('没有自动打卡或新增专注')
  await expect(page.getByRole('button', { name: '截至现在未吸烟', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: '返回健康' }).click()
  await expect(page.getByRole('heading', { name: '体重', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '运动', exact: true })).toBeVisible()
})

test('future plans can be cancelled; hiding keeps history and the Health add menu restores access', async ({
  page,
}) => {
  await startPlan(page, '2026-09-20T12:00')
  await expect(page.getByText('准备开始', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '截至现在未吸烟', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '管理戒烟计划' }).click()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '取消未来计划', exact: true }).click()
  await expect(page.getByText('计划已取消', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始新的计划', exact: true }).click()
  await page.getByRole('button', { name: '开始计划', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '管理戒烟计划' }).click()
  await page.getByRole('button', { name: '隐藏健康入口', exact: true }).click()
  await page.getByRole('link', { name: '返回健康' }).click()
  await expect(page.getByRole('region', { name: '戒烟', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '添加健康记录' }).click()
  await page.getByRole('link', { name: '戒烟计划与记录' }).click()
  await page.getByRole('button', { name: '管理戒烟计划' }).click()
  await page.getByRole('button', { name: '恢复健康入口', exact: true }).click()
  await page.getByRole('link', { name: '返回健康' }).click()
  await expect(page.getByRole('region', { name: '戒烟', exact: true })).toBeVisible()
})

test('cessation has 44px dates, equal native controls and accessible light/dark layouts at 320 and 390', async ({
  page,
}) => {
  await startPlan(page)
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const sizes = await page.locator('.cessation-calendar button').evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    )
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(44)
      expect(size.height).toBeGreaterThanOrEqual(44)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '查看日历', exact: true }).click()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '收起日历', exact: true }).click()
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: /^记录吸烟/ }).click()
  const fields = await page
    .locator('.sheet input')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))
  expect(Math.abs(fields[0]! - fields[1]!)).toBeLessThanOrEqual(1)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('link', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '深色', exact: true }).click()
  await page.goto('/#/health/cessation')
  await expect(page.getByRole('heading', { name: '戒烟', exact: true })).toBeVisible()
  // Assert an explicit themed palette as well as contrast: OS-native button colors differ on Linux WebKit.
  const palette = await page
    .getByRole('button', { name: '查看日历', exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return { appearance: style.appearance, background: style.backgroundColor }
    })
  expect(palette.appearance).toBe('none')
  expect(palette.background).not.toBe('rgb(192, 192, 192)')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('offline cessation writes work and official resources never receive local records', async ({
  page,
  context,
}) => {
  await startPlan(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.getByRole('button', { name: '截至现在未吸烟', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '已记录截至现在' })).toBeVisible()
  await page.getByRole('button', { name: '寻求支持', exact: true }).click()
  const resource = page.getByRole('link', { name: 'WHO 官方戒烟提示 ↗', exact: true })
  await expect(resource).toHaveAttribute(
    'href',
    'https://www.who.int/campaigns/world-no-tobacco-day/2021/quitting-toolkit/quick-tips',
  )
  await expect(resource).toHaveAttribute('rel', 'noopener noreferrer')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByRole('button', { name: '更新今日快照', exact: true })).toBeVisible()
})
