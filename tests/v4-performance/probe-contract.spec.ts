import { test, expect } from '@playwright/test'
import { installProbe } from './probe'
import { createFixture } from './fixtures'
import { regions } from './protocol'

const documentBody = `<!doctype html><html data-theme-state="ready"><style>
button,a {display:inline-block;width:60px;height:50px;border:0;border-radius:50%;background:green}
section {min-height:20px}
</style><body data-lifeindex-version="4"><main data-ready-region="shell" data-state="ready">
<nav data-v4-dock><button data-focus-key="compose:mobile">Compose</button><a>Today</a><a>Health</a><a>Focus</a><a>Finance</a></nav>
<div aria-label="今天的视图"><button>Overview</button><button>Timeline</button></div>
<button class="v4-settings">Settings</button>
<section data-ready-region="today-habits" data-state="ready"></section>
<section data-ready-region="today-finance" data-state="ready">0笔收支记录 0.00</section>
<section data-ready-region="focus-runtime" data-state="ready"><span class="v4-entry-time">25:00</span></section>
<section data-ready-region="today-records" data-state="ready"></section></main></body></html>`

for (const obscured of [false, true]) {
  test(`rounded controls ${obscured ? 'reject a real overlay' : 'remain reachable'}`, async ({
    page,
  }) => {
    // An isolated synthetic DOM distinguishes curved hit boundaries from an actual covering layer.
    console.info('[LifeIndex performance] probe.contract.started', { obscured })
    await page.setContent(documentBody)
    if (obscured)
      await page.evaluate(() => {
        const rect = document.querySelector('button')!.getBoundingClientRect()
        const overlay = document.createElement('div')
        Object.assign(overlay.style, {
          position: 'fixed',
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: '10',
        })
        document.body.append(overlay)
      })
    const fixture = createFixture('F0', '2026-09-29', '2026-09-29T02:00:00.000Z')
    await page.evaluate(installProbe, {
      editor: 'expense' as const,
      expected: fixture.expected,
      regionNames: regions,
    })
    await page.waitForFunction(() => 'compose' in window.__v4Performance.readyChecks)
    if (obscured) {
      // Three frames allow a false ready publication to surface without a wall-clock timeout.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
          ),
      )
      expect(await page.evaluate(() => window.__v4Performance.ready)).toBeNull()
      expect(await page.evaluate(() => window.__v4Performance.readyChecks.compose)).toBe(false)
    } else await page.waitForFunction(() => window.__v4Performance.ready !== null)
    console.info('[LifeIndex performance] probe.contract.completed', { obscured })
  })
}

test('font requested after window load records its actual completion', async ({ page }) => {
  console.info('[LifeIndex performance] probe.font-contract.started')
  await page.route('https://fixture.invalid/font.ttf', (route) =>
    route.fulfill({
      path: 'public/fonts/Manrope.ttf',
      contentType: 'font/ttf',
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
  await page.setContent(documentBody)
  const fixture = createFixture('F0', '2026-09-29', '2026-09-29T02:00:00.000Z')
  await page.evaluate(installProbe, {
    editor: 'expense' as const,
    expected: fixture.expected,
    regionNames: regions,
  })
  // The test starts with no requested fonts, recreating lazy text arriving after the initial load event.
  await page.evaluate(() => window.dispatchEvent(new Event('load')))
  await page.waitForFunction(() => window.__v4Performance.fontCompletions.length === 1)
  const initial = await page.evaluate(() => window.__v4Performance.fontsReady!)
  await page.addStyleTag({
    content: `@font-face { font-family: Delayed; src: url('https://fixture.invalid/font.ttf'); font-display: swap } body,button,a {font-family: Delayed}`,
  })
  await page.waitForFunction(() =>
    window.__v4Performance.fontCompletions.some((entry) => entry.source === 'loading-done'),
  )
  expect(await page.evaluate(() => window.__v4Performance.fontsReady!)).toBeGreaterThan(initial)
  console.info('[LifeIndex performance] probe.font-contract.completed')
})
