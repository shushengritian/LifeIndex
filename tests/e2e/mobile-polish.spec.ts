import { expect, test } from '@playwright/test'

test('cessation entry is centered and phone scrollbar suppression preserves scrolling', async ({
  page,
}) => {
  await page.goto('/#/health')
  const entry = page
    .getByRole('region', { name: '戒烟', exact: true })
    .getByRole('link', { name: '开始计划' })
  await expect(entry).toBeVisible()
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 600 })
    const metrics = await entry.evaluate((element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      return {
        decoration: style.textDecorationLine,
        height: bounds.height,
        x: Math.abs(text.x + text.width / 2 - bounds.x - bounds.width / 2),
        y: Math.abs(text.y + text.height / 2 - bounds.y - bounds.height / 2),
      }
    })
    expect(metrics.decoration).toBe('none')
    expect(metrics.height).toBeGreaterThanOrEqual(44)
    expect(metrics.x).toBeLessThanOrEqual(1)
    expect(metrics.y).toBeLessThanOrEqual(2)
  }
  const scrollbar = await page.evaluate(() => ({
    touch: matchMedia('(hover: none) and (pointer: coarse)').matches,
    supported: CSS.supports('scrollbar-width', 'none'),
    width: getComputedStyle(document.documentElement).scrollbarWidth,
  }))
  if (scrollbar.supported) expect(scrollbar.width).toBe(scrollbar.touch ? 'none' : 'auto')
  // Verify content remains reachable after hiding only the visual indicator.
  await entry.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await entry.click()
  await expect(page.getByRole('heading', { name: '戒烟', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始计划', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '开始戒烟计划' })).toBeVisible()
})
