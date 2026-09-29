import { readdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'

const samples: { fcpMs: number; readyMs: number; editorMs: number }[] = []
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

// Independent contexts keep all seven first-launch samples cold and free of personal records.
for (let sample = 0; sample < 7; sample++) {
  test(`cold first launch and expense editor sample ${sample + 1}`, async ({ page, context }) => {
    console.info('performance.sample.started', { sample, operation: 'cold-load' })
    const session = await context.newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto('/#/today')
    const entry = page.getByRole('link', { name: '记一笔', exact: true })
    await expect(entry).toBeVisible()
    await expect(page.getByRole('link', { name: '查看今日账目', exact: true })).toContainText(
      '尚无记录',
    )
    const initial = await page.evaluate(() => ({
      readyMs: performance.now(),
      fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1,
    }))
    // Include locating, scrolling, rendering and focus delivery in the observed input latency.
    const started = await page.evaluate(() => performance.now())
    await entry.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const editorMs = await page.evaluate(
      (start) =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() => resolve(performance.now() - start)),
        ),
      started,
    )
    expect(initial.fcpMs).toBeGreaterThan(0)
    samples.push({ ...initial, editorMs })
    console.info('performance.sample.completed', { sample, operation: 'measured' })
    if (sample === 0) await page.screenshot({ path: test.info().outputPath('expense-editor.png') })
  })
}

test.describe('representative layout with offline shell ready', () => {
  // Normal-state screenshots must not gain height from the deliberately blocked-worker timing setup.
  test.use({ serviceWorkers: 'allow' })
  test('representative today layout uses only isolated synthetic records', async ({ page }) => {
    await page.goto('/#/today')
    await expect(page.getByRole('link', { name: '记一笔', exact: true })).toBeVisible()
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    // This fixture intentionally makes the habit list long enough to expose displaced quick actions.
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('LifeIndexDB')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        const now = new Date()
        const stamp = now.toISOString()
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(['habits', 'transactions'], 'readwrite')
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
          for (let index = 0; index < 6; index++) {
            transaction.objectStore('habits').put({
              id: crypto.randomUUID(),
              name: `合成习惯 ${index + 1}`,
              icon: 'check',
              color: 'sage',
              schedule: { type: 'daily' },
              startLocalDate: date,
              status: 'active',
              createdAt: stamp,
              updatedAt: stamp,
            })
          }
          for (let index = 0; index < 30; index++) {
            transaction.objectStore('transactions').put({
              id: crypto.randomUUID(),
              type: 'expense',
              amountMinor: 1230,
              currency: 'CNY',
              categoryId: 'category-finance-expense-food-v1',
              occurredAt: stamp,
              localDate: date,
              timezoneOffsetMinutes: now.getTimezoneOffset(),
              createdAt: stamp,
              updatedAt: stamp,
            })
          }
        })
      } finally {
        database.close()
      }
    })
    await page.reload()
    await expect(page.getByText('离线功能暂未就绪；联网后刷新可重试', { exact: true })).toHaveCount(
      0,
    )
    await expect(page.getByRole('button', { name: '合成习惯 1 · 点按完成' })).toBeVisible()
    const layout = await page.evaluate(() => {
      const add = document.querySelector('a[aria-label="记一笔"]')!.getBoundingClientRect()
      const navigation = document
        .querySelector('nav[aria-label="主要导航"]')!
        .getBoundingClientRect()
      return {
        viewport: { width: innerWidth, height: innerHeight },
        expenseTop: add.top,
        expenseVisibleWithoutScroll: add.bottom <= navigation.top,
        documentHeight: document.documentElement.scrollHeight,
      }
    })
    await page.screenshot({ path: test.info().outputPath('today-six-habits.png'), fullPage: true })
    await test.info().attach('representative-layout', {
      body: JSON.stringify(layout, null, 2),
      contentType: 'application/json',
    })
    console.info('performance.layout.measured', { operation: 'layout', ...layout })
  })
})

test('report reproducible startup and compressed asset measurements', async ({
  browser,
}, testInfo) => {
  expect(samples).toHaveLength(7)
  const names = await readdir('dist/assets')
  const assets = await Promise.all(
    names
      .filter((name) => /\.(js|css)$/.test(name))
      .map(async (name) => ({
        name,
        gzipBytes: gzipSync(await readFile(`dist/assets/${name}`)).length,
      })),
  )
  const result = {
    browserVersion: browser.version(),
    contract:
      'Chromium iPhone 13 viewport; CPU 4x; localhost; no network throttling; new context per sample; worker blocked; empty database',
    samples,
    median: {
      fcpMs: median(samples.map((item) => item.fcpMs)),
      readyMs: median(samples.map((item) => item.readyMs)),
      editorMs: median(samples.map((item) => item.editorMs)),
    },
    assets,
    totalJavaScriptGzipBytes: assets
      .filter((asset) => asset.name.endsWith('.js'))
      .reduce((sum, asset) => sum + asset.gzipBytes, 0),
    totalCssGzipBytes: assets
      .filter((asset) => asset.name.endsWith('.css'))
      .reduce((sum, asset) => sum + asset.gzipBytes, 0),
  }
  const reportPath = testInfo.outputPath('experience-profile.json')
  await writeFile(reportPath, JSON.stringify(result, null, 2))
  await testInfo.attach('experience-profile', { path: reportPath, contentType: 'application/json' })
  console.info('performance.profile.completed', result)
  // Frozen before production UI work: visual improvements may not silently expand these ceilings.
  expect(result.median.fcpMs).toBeLessThanOrEqual(400)
  expect(result.median.readyMs).toBeLessThanOrEqual(1400)
  expect(result.median.editorMs).toBeLessThanOrEqual(350)
  expect(result.totalJavaScriptGzipBytes).toBeLessThanOrEqual(250 * 1024)
  expect(result.totalCssGzipBytes).toBeLessThanOrEqual(16 * 1024)
})
