import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  assertTouchTarget,
  attachEvidence,
  composer,
  enterV4,
  openEntry,
  readDatabase,
  saveEntry,
  seedHabits,
} from './support'
import { seedRepresentativeData } from './representative-data'

async function chooseTheme(page: Page, theme: 'light' | 'dark') {
  await page.goto('/#/settings/appearance')
  await page.getByRole('button', { name: theme === 'light' ? '浅色' : '深色', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

async function audit(page: Page, testInfo: TestInfo, state: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  await testInfo.attach(`${state}-axe`, {
    body: JSON.stringify(result.violations, null, 2),
    contentType: 'application/json',
  })
  // All findings are retained for review; the automated blocking threshold is the frozen serious/critical rule.
  expect
    .soft(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')))
    .toEqual([])
  console.info('v4.qa.accessibility.scanned', { state, findings: result.violations.length })
}

for (const theme of ['light', 'dark'] as const) {
  test(`axe covers routes, editors, detail, errors and secondary confirmation in ${theme}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000)
    await enterV4(page)
    await seedHabits(page, 6)
    await saveEntry(page, 'expense', '15.27')
    await saveEntry(page, 'weight', '63.2')
    await saveEntry(page, 'activity', '32')
    await chooseTheme(page, theme)
    for (const route of [
      '/today',
      '/today?view=timeline',
      '/health',
      '/focus',
      '/focus/history',
      '/finance',
      '/finance?view=calendar',
      '/finance/report',
      '/health/weight',
      '/health/activity',
      '/health/habits',
      '/health/habits/40000000-0000-4000-8000-000000000001',
      '/settings',
      '/settings/categories',
      '/settings/backup',
      '/settings/appearance',
      '/settings/about',
    ]) {
      await page.goto(`/#${route}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('main [data-state="loading"]')).toHaveCount(0)
      await audit(page, testInfo, `${theme}-${route.replaceAll('/', '-')}`)
    }
    await page.goto('/#/today')
    await composer(page).click()
    await audit(page, testInfo, `${theme}-composer`)
    await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
    for (const kind of ['expense', 'weight', 'activity'] as const) {
      const { dialog } = await openEntry(page, kind)
      await audit(page, testInfo, `${theme}-editor-${kind}`)
      await dialog.getByRole('button', { name: '取消', exact: true }).click()
    }
    const { dialog, field } = await openEntry(page, 'weight')
    await field.fill('0')
    await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await audit(page, testInfo, `${theme}-validation-error`)
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await audit(page, testInfo, `${theme}-dirty-confirmation`)
    await page.getByRole('dialog').last().getByRole('button', { name: /放弃/ }).click()
    const transaction = (await readDatabase(page)).transactions[0]
    await page.goto(`/#/records/transaction/${String(transaction.id)}`)
    await expect(page.getByRole('button', { name: /编辑/ }).first()).toBeVisible()
    await audit(page, testInfo, `${theme}-detail`)
    await page.getByRole('button', { name: /删除/ }).first().click()
    await audit(page, testInfo, `${theme}-delete-confirmation`)
  })
}

async function doubleText(page: Page) {
  // Snapshot computed sizes before mutation; each caller reloads first so inherited sizes never compound.
  await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(
        'html, body, main *, nav *, header *, dialog *, button, a',
      ),
    ]
    const snapshots = [...new Set(elements)].map((element) => {
      const style = getComputedStyle(element)
      return {
        element,
        font: Number.parseFloat(style.fontSize),
        line: Number.parseFloat(style.lineHeight),
      }
    })
    for (const { element, font, line } of snapshots) {
      element.style.fontSize = `${font * 2}px`
      if (Number.isFinite(line)) element.style.lineHeight = `${line * 2}px`
    }
  })
}

async function assertNavigationLayout(page: Page) {
  await assertTouchTarget(composer(page))
  const labels = await page
    .getByRole('navigation', { name: '主要导航' })
    .getByRole('link')
    .evaluateAll((links) =>
      links
        .map((link) => {
          const box = link.getBoundingClientRect()
          return { x: box.x, y: box.y, width: box.width, height: box.height }
        })
        .filter((box) => box.width > 0 && box.height > 0),
    )
  expect(labels.length).toBeGreaterThanOrEqual(4)
  expect(labels.every((box) => box.width >= 44 && box.height >= 44)).toBe(true)
  for (let index = 0; index < labels.length; index++) {
    for (const other of labels.slice(index + 1)) {
      const target = labels[index]
      const x =
        Math.min(target.x + target.width, other.x + other.width) - Math.max(target.x, other.x)
      const y =
        Math.min(target.y + target.height, other.y + other.height) - Math.max(target.y, other.y)
      expect(x > 1 && y > 1, 'Navigation hit regions must not overlap').toBe(false)
    }
  }
}

for (const width of [320, 390, 430, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`layout and 200% text at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      test.setTimeout(240_000)
      const height = { 320: 568, 390: 664, 430: 932, 768: 1024, 1440: 900 }[width]!
      await page.setViewportSize({ width, height })
      await enterV4(page)
      const ids = await seedRepresentativeData(page)
      await chooseTheme(page, theme)
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      const routes = [
        '/today',
        '/today?view=timeline',
        '/health',
        '/focus',
        '/focus/history',
        '/finance',
        '/finance?view=calendar',
        '/finance/report',
        '/health/weight',
        '/health/activity',
        '/health/habits',
        `/health/habits/${ids.habit}`,
        '/settings',
        '/settings/categories',
        '/settings/backup',
        '/settings/appearance',
        '/settings/about',
      ]
      for (const [index, route] of routes.entries()) {
        await page.goto(`/#${route}`)
        // Hash navigation retains the shell; reload resets the 200% stress before every independent page.
        await page.reload()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.locator('main [data-state="loading"]')).toHaveCount(0)
        await page.evaluate(() => document.fonts.ready)
        expect.soft(await overflow(), `${route} default text`).toBeLessThanOrEqual(1)
        await assertNavigationLayout(page)
        await attachEvidence(page, testInfo, `${theme}-${width}-${index}-default`)
        await doubleText(page)
        if ((await overflow()) > 1) {
          const offenders = await page.locator('main *').evaluateAll((nodes) =>
            nodes
              .filter((node) => node.getBoundingClientRect().right > innerWidth + 1)
              .map((node) => ({
                tag: node.tagName,
                class: node.className,
                text: node.textContent?.slice(0, 70),
                right: node.getBoundingClientRect().right,
              })),
          )
          await testInfo.attach(`overflow-${index}`, {
            body: JSON.stringify({ route, offenders }),
            contentType: 'application/json',
          })
          console.info('v4.qa.layout.overflow', { route, offenders })
        }
        expect.soft(await overflow(), `${route} 200% text`).toBeLessThanOrEqual(1)
        await assertNavigationLayout(page)
        await attachEvidence(page, testInfo, `${theme}-${width}-${index}-text200`)
      }
      for (const [kind, id] of [
        ['transaction', ids.transaction],
        ['weight', ids.weight],
        ['activity', ids.activity],
        ['focus', ids.focus],
      ] as const) {
        await page.goto(`/#/records/${kind}/${id}`)
        await page.reload()
        const detail = page.getByRole('dialog')
        await expect(detail.locator('.detail-value')).toBeVisible()
        await doubleText(page)
        expect.soft(await overflow(), `${kind} detail root`).toBeLessThanOrEqual(1)
        expect
          .soft(
            await detail.evaluate((node) => node.scrollWidth - node.clientWidth),
            `${kind} detail 200%`,
          )
          .toBeLessThanOrEqual(1)
        await attachEvidence(page, testInfo, `${theme}-${width}-detail-${kind}-text200`)
        await detail.getByRole('button', { name: '关闭', exact: true }).click()
      }
      for (const kind of ['expense', 'weight', 'activity'] as const) {
        await page.goto('/#/today')
        await page.reload()
        const { dialog, field } = await openEntry(page, kind)
        await field.fill(kind === 'expense' ? '99999999.99' : kind === 'weight' ? '1000' : '1440')
        await dialog.getByLabel(/备注/).fill('合成长备注'.repeat(200))
        await attachEvidence(page, testInfo, `${theme}-${width}-editor-${kind}-default`)
        await doubleText(page)
        expect.soft(await overflow(), `${kind} editor root`).toBeLessThanOrEqual(1)
        expect
          .soft(
            await dialog.evaluate((node) => node.scrollWidth - node.clientWidth),
            `${kind} editor 200%`,
          )
          .toBeLessThanOrEqual(1)
        await attachEvidence(page, testInfo, `${theme}-${width}-editor-${kind}-text200`)
        await dialog.getByRole('button', { name: '取消', exact: true }).click()
        await page.getByRole('dialog').last().getByRole('button', { name: /放弃/ }).click()
      }
    })
  }
}

test('keyboard stays inside the active dialog and cancellation restores the global trigger', async ({
  page,
}) => {
  await enterV4(page)
  await composer(page).press('Enter')
  const chooser = page.getByRole('dialog')
  await expect(chooser).toBeVisible()
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press(key)
      const focus = await chooser.evaluate((element) => ({
        within: element.contains(document.activeElement),
        activeTag: document.activeElement?.tagName,
        activeName:
          document.activeElement?.getAttribute('aria-label') ??
          document.activeElement?.textContent?.trim().slice(0, 80),
      }))
      expect(focus, `${key} ${index + 1}: ${JSON.stringify(focus)}`).toMatchObject({
        within: true,
      })
    }
  }
  await page.keyboard.press('Escape')
  await expect(chooser).toHaveCount(0)
  await expect(composer(page)).toBeFocused()
})
