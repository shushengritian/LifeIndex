import { readFileSync } from 'node:fs'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readDatabase, saveEntry } from '../v4-e2e/support'
import { createUnavailableOrigin } from '../v4-e2e/unavailable-origin'

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }
function target(info: TestInfo, path = '/today') {
  const url = new URL(String(info.project.use.baseURL))
  url.hash = path
  return url.toString()
}
async function ready(page: Page) {
  await expect(page.locator('[data-lifeindex-version="4"]')).toHaveAttribute(
    'data-app-version',
    version,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme-state', 'ready')
  const expectedBuild = process.env.LIFEINDEX_EXPECTED_BUILD_ID ?? process.env.GITHUB_SHA
  if (expectedBuild)
    await expect(page.locator('[data-lifeindex-version="4"]')).toHaveAttribute(
      'data-app-build',
      expectedBuild,
    )
  await expect(page.locator('#main-content h1')).toBeVisible()
}

test('actual deployed identity, deep routes, base-scoped resources and worker are healthy', async ({
  page,
  request,
}, info) => {
  const base = new URL(String(info.project.use.baseURL))
  const failures: string[] = [],
    errors: string[] = [],
    badResponses: string[] = []
  page.on('requestfailed', (request) => {
    if (!request.url().includes('__lifeindex_connectivity__')) failures.push(request.url())
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('__lifeindex_connectivity__'))
      badResponses.push(response.url())
  })
  page.on('pageerror', (error) => errors.push(error.name))
  expect((await page.goto(target(info)))?.ok()).toBe(true)
  await ready(page)
  await expect(page.locator('[data-ready-region][data-state="ready"]')).toHaveCount(5)
  await page.evaluate(() => document.fonts.ready)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const route of [
    '/health',
    '/focus',
    '/finance',
    '/finance/report',
    '/health/weight',
    '/health/activity',
    '/focus/history',
    '/settings',
    '/settings/categories',
    '/settings/appearance',
    '/settings/backup',
    '/settings/about',
  ]) {
    await page.goto(target(info, route))
    await ready(page)
    await expect(page.getByText('这个页面已经移到新的位置')).toHaveCount(0)
  }
  await page.reload()
  await ready(page)
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifestUrl = new URL(href!, base)
  const response = await request.get(manifestUrl.toString())
  expect(response.ok()).toBe(true)
  const manifest = (await response.json()) as {
    id: string
    scope: string
    start_url: string
    icons: { src: string }[]
  }
  expect(manifest).toMatchObject({
    id: base.pathname,
    scope: base.pathname,
    start_url: base.pathname,
  })
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, manifestUrl).toString())
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/')
    expect((await response.body()).length).toBeGreaterThan(100)
  }
  const font = await request.get(new URL('fonts/Manrope.ttf', base).toString())
  expect(font.ok()).toBe(true)
  expect((await font.body()).length).toBe(164700)
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe(
    base.toString(),
  )
  expect(failures).toEqual([])
  expect(badResponses).toEqual([])
  expect(errors).toEqual([])
  await info.attach('deployed-identity', {
    body: JSON.stringify({ version, base: base.toString(), schema: 1 }),
    contentType: 'application/json',
  })
  console.info('v4.deployed.identity.passed', { version, operation: 'verify' })
})

test('three real entry types persist and receipt opens the saved fact without changing origin', async ({
  page,
}, info) => {
  const network: string[] = [],
    logs: string[] = [],
    marker = 'SYNTHETIC_V4_DEPLOYMENT_PRIVATE_SENTINEL'
  page.on('request', (request) => network.push(request.url() + (request.postData() ?? '')))
  page.on('console', (message) => logs.push(message.text()))
  await page.goto(target(info, '/health'))
  await ready(page)
  const origin = page.url()
  await saveEntry(page, 'expense', '3.21', { note: marker })
  await saveEntry(page, 'weight', '67.125')
  await saveEntry(page, 'activity', '21')
  await page.getByRole('button', { name: '查看记录', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(/21\s*分钟/)
  await expect(page.getByRole('dialog')).toContainText('未记录具体时刻')
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page).toHaveURL(origin)
  await page.reload()
  await ready(page)
  const data = await readDatabase(page)
  expect(data.transactions).toHaveLength(1)
  expect(data.transactions[0]).toMatchObject({
    amountMinor: 321,
    note: marker,
    timePrecision: 'day',
  })
  expect(data.weightEntries).toHaveLength(1)
  expect(data.weightEntries[0]).toMatchObject({ weightGrams: 67125, timePrecision: 'day' })
  expect(data.activitySessions).toHaveLength(1)
  expect(data.activitySessions[0]).toMatchObject({ durationMinutes: 21, timePrecision: 'day' })
  const base = new URL(String(info.project.use.baseURL))
  for (const value of network) {
    expect(value).not.toContain(marker)
    const url = new URL(value)
    expect(url.origin).toBe(base.origin)
    expect(url.pathname.startsWith(base.pathname)).toBe(true)
  }
  expect(logs.join('\n')).not.toContain(marker)
  console.info('v4.deployed.persistence.passed', { count: 3 })
})

test('deployed focus start, pause, resume and completion save exactly one session', async ({
  page,
}, info) => {
  await page.clock.install()
  await page.goto(target(info, '/focus'))
  await ready(page)
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(2500)
  await page.getByRole('button', { name: '暂停一下', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('paused')
  await page.getByRole('button', { name: '继续专注', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(2500)
  await page.getByRole('button', { name: '结束', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '结束并保存', exact: true }).click()
  await expect
    .poll(async () => (await readDatabase(page)).focusSessions[0]?.status)
    .toBe('completed')
  await page.reload()
  await ready(page)
  const sessions = (await readDatabase(page)).focusSessions
  expect(sessions).toHaveLength(1)
  expect(sessions[0]?.durationMs).toBeGreaterThanOrEqual(5000)
  console.info('v4.deployed.focus.passed', { count: 1 })
})

test('offline deployed shell, unseen lazy route, local write and backup remain usable', async ({
  page,
  context,
  browserName,
}, info) => {
  const published = new URL(String(info.project.use.baseURL))
  // Only WebKit's offline case changes origin: the installed bytes come from the exact published URL, but its SW is local.
  const proxy =
    browserName === 'webkit' ? await createUnavailableOrigin(published.toString()) : null
  const effective = new URL(published.toString())
  if (proxy) {
    const replacement = new URL(proxy.origin)
    effective.protocol = replacement.protocol
    effective.host = replacement.host
  }
  const route = (path = '/today') => {
    const url = new URL(effective)
    url.hash = path
    return url.toString()
  }
  try {
    await page.goto(route())
    await ready(page)
    await page.evaluate(async () => navigator.serviceWorker.ready)
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    if (proxy) proxy.disconnect()
    else await context.setOffline(true)
    const unavailable = await page.evaluate(
      async (base) =>
        fetch(new URL('__qa_uncached_probe__', base), { cache: 'no-store' }).then(
          () => false,
          () => true,
        ),
      effective.toString(),
    )
    expect(unavailable).toBe(true)
    await page.reload()
    await ready(page)
    await expect(page.getByText('已离线 · 已保存的本机记录仍可使用。')).toBeVisible()
    await saveEntry(page, 'expense', '6.54')
    await page.goto(route('/settings/backup'))
    await ready(page)
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出备份', exact: true }).click()
    const download = await downloadEvent
    expect(await download.failure()).toBeNull()
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      format: string
      data: { transactions: { amountMinor: number }[] }
    }
    expect(backup.format).toBe('lifeindex-v4-backup')
    expect(backup.data.transactions).toHaveLength(1)
    expect(backup.data.transactions[0]?.amountMinor).toBe(654)
    await page.reload()
    await ready(page)
    expect((await readDatabase(page)).transactions[0]?.amountMinor).toBe(654)
    if (proxy) expect(proxy.refused).toBeGreaterThan(0)
    await info.attach('offline-origin-and-transport', {
      body: JSON.stringify({
        browserName,
        published: published.toString(),
        effective: effective.toString(),
        method: proxy
          ? 'published bytes through local proxy; TCP refusal; not published HTTPS-origin offline proof'
          : 'actual target origin; browser offline emulation',
        unavailable,
        refusedRequests: proxy?.refused ?? null,
      }),
      contentType: 'application/json',
    })
    console.info('v4.deployed.offline.passed', {
      operation: 'reload-write-export',
      originType: proxy ? 'local-proxy-of-published-bytes' : 'actual-target',
    })
  } finally {
    await context.setOffline(false)
    await proxy?.close()
  }
})
