import { expect, test } from '@playwright/test'
import { enterV4 } from './support'
import { seedRepresentativeData } from './representative-data'

test('bottom navigation opens a different space at its heading after scrolling a long source page', async ({
  page,
  browserName,
}, info) => {
  await enterV4(page)
  await seedRepresentativeData(page)
  await expect(page.locator('[data-ready-region][data-state="ready"]')).toHaveCount(5)
  for (const [name, title] of [
    ['健康', '身体的节奏'],
    ['专注', '专注空间'],
    ['记账', '让每一笔，都有去处。'],
    ['设置', '按你的方式，安放生活。'],
  ] as const) {
    // Wait for real page data before a wheel gesture; a transient lazy fallback must not masquerade as scroll restoration.
    await expect(page.locator('main [data-state="loading"]')).toHaveCount(0)
    if (browserName === 'webkit') {
      // Mobile WebKit exposes no Playwright wheel API. Only scroll setup is scripted; navigation remains a real click.
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      )
    } else {
      await page.evaluate(() => {
        const scope = window as typeof window & { __qaScrollSettled: boolean }
        scope.__qaScrollSettled = false
        document.addEventListener(
          'scrollend',
          () => {
            scope.__qaScrollSettled = true
          },
          { once: true },
        )
      })
      await page.mouse.wheel(0, 10_000)
      await page.waitForFunction(
        () => (window as typeof window & { __qaScrollSettled: boolean }).__qaScrollSettled,
      )
    }
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20)
    const link =
      name === '设置'
        ? page.getByRole('link', { name, exact: true })
        : page
            .getByRole('navigation', { name: '主要导航' })
            .getByRole('link', { name, exact: true })
    await link.click()
    const heading = page.getByRole('heading', { name: title, exact: true })
    await expect(heading).toBeVisible()
    await expect(page.locator('main [data-state="loading"]')).toHaveCount(0)
    await expect
      .configure({ soft: true })
      .poll(async () => (await heading.boundingBox())!.y, {
        message: `${name} must reset cross-space scroll`,
      })
      .toBeGreaterThanOrEqual(0)
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('#main-content')).toBeFocused()
    await page.screenshot({ path: info.outputPath(`navigation-${name}.png`) })
    console.info('v4.qa.navigation.checked', { destination: name })
  }
})
