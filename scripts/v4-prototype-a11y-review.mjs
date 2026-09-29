import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'

// Inspect the real prototype DOM in an isolated browser; scans are author evidence, not a conformance certification.
const browser = await chromium.launch()
const results = []
const output = 'docs/design/v4/prototype-r4/screens'
try {
  for (const theme of ['light', 'dark']) {
    // axe opens an internal page, so it requires an explicit context instead of Playwright's single-page convenience API.
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:4187/prototype-r4/?controls=surface&theme=${theme}&review=0`)
    const scan = async (state) => {
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      results.push({
        theme,
        state,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      })
      console.info('prototype.accessibility.scanned', {
        theme,
        state,
        violations: result.violations.length,
      })
    }
    for (const route of ['today', 'health', 'focus', 'finance', 'settings']) {
      await page.locator(`[data-page="${route}"]:visible`).first().click()
      await scan(route)
    }
    await page.locator('[data-page=categories]:visible').click()
    await scan('categories')
    await page.locator('[data-page=settings]:visible').first().click()
    await page.locator('[data-restore]').click()
    await scan('restore-file')
    await page.getByRole('button', { name: '取消', exact: true }).click()
    for (const kind of ['finance', 'weight', 'activity']) {
      await page.locator('[data-compose]:visible').first().click()
      if (kind === 'finance') await scan('composer')
      await page.locator(`[data-entry="${kind}"]:visible`).click()
      await scan(`editor-${kind}`)
      await page.getByRole('button', { name: '取消', exact: true }).click()
    }
    await context.close()
  }
  await mkdir(output, { recursive: true })
  await writeFile(
    `${output}/a11y-observations.json`,
    JSON.stringify(
      { scope: 'R4 prototype author scan; full production acceptance pending', results },
      null,
      2,
    ) + '\n',
  )
  const blockers = results
    .flatMap((r) => r.violations)
    .filter((v) => ['serious', 'critical'].includes(v.impact))
  console.info('prototype.accessibility.completed', {
    states: results.length,
    blockers: blockers.length,
  })
  if (blockers.length) process.exitCode = 1
} finally {
  await browser.close()
}
