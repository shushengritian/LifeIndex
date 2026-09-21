import { expect, test } from '@playwright/test'

test('cessation uses one content entry and phone scrollbar suppression preserves scrolling', async ({
  page,
}) => {
  await page.goto('/#/health')
  const entry = page.getByRole('button', { name: '创建戒烟计划', exact: true })
  await expect(entry).toBeVisible()
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 600 })
    const metrics = await entry.evaluate((element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return {
        height: bounds.height,
        gap: parseFloat(style.gap),
        nestedActions: element.querySelectorAll('button, a, [tabindex]').length,
        decorativeArrow: element.querySelector(':scope > svg')?.getAttribute('aria-hidden'),
      }
    })
    expect(metrics.height).toBeGreaterThanOrEqual(64)
    expect(metrics.gap).toBeGreaterThanOrEqual(16)
    expect(metrics.nestedActions).toBe(0)
    expect(metrics.decorativeArrow).toBe('true')
  }
  const scrollbar = await page.evaluate(() => ({
    supported: CSS.supports('scrollbar-width', 'none'),
    width: getComputedStyle(document.documentElement).scrollbarWidth,
  }))
  if (scrollbar.supported) expect(scrollbar.width).toBe('none')
  // Verify content remains reachable after hiding only the visual indicator.
  await entry.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await entry.click()
  await expect(page.getByRole('heading', { name: '戒烟', exact: true })).toBeVisible()
  // One content click opens the guarded creation form; entering never writes a plan.
  await expect(page.getByRole('dialog', { name: '开始戒烟计划' })).toBeVisible()
})

test('nested finance editor hides indicators without blocking access to its fields', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/#/finance')
  await page.getByRole('button', { name: '新增交易', exact: true }).click()
  const body = page.locator('.sheet-form-body')
  await expect(body).toBeVisible()
  // Exercise the actual overflow container, not just the outer sheet selector.
  const metrics = await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    return {
      supported: CSS.supports('scrollbar-width', 'none'),
      indicator: getComputedStyle(element).scrollbarWidth,
      overflow: getComputedStyle(element).overflowY,
      offset: element.scrollTop,
    }
  })
  if (metrics.supported) expect(metrics.indicator).toBe('none')
  expect(metrics.overflow).toBe('auto')
  expect(metrics.offset).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭编辑器', exact: true }).click()
  await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible()
})
