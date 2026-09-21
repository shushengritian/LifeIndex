import { expect, test } from '@playwright/test'

test('health uses one content entry and phone scrollbar suppression preserves scrolling', async ({
  page,
}) => {
  await page.goto('/#/health')
  const entry = page.getByRole('button', { name: '查看体重历史', exact: true })
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
  await page.getByRole('button', { name: '新增习惯', exact: true }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await entry.click()
  await expect(page.getByRole('heading', { name: '体重历史', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const [route, name, destination] of [
  ['/health/weight-history', '返回健康', '/health'],
  ['/health/activity-history', '返回健康', '/health'],
  ['/focus/history', '返回专注', '/focus'],
  ['/health/habits', '返回健康', '/health'],
]) {
  test(`icon-only header return on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`/#${route}`)
    const back = page.getByRole('link', { name, exact: true })
    await expect(back).toBeVisible()
    await expect(back).toHaveText('')
    const bounds = await back.boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    // The return control must lead the header rather than consume a separate row.
    expect(
      await back.evaluate((element) => element.parentElement?.firstElementChild === element),
    ).toBe(true)
    await back.click()
    await expect(page).toHaveURL(new RegExp(`#${destination}$`))
  })
}

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
