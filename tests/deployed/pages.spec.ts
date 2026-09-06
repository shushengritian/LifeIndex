import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type TestInfo } from '@playwright/test'

const { version: expectedVersion } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }

function baseUrl(testInfo: TestInfo): URL {
  return new URL(String(testInfo.project.use.baseURL))
}

function routeUrl(testInfo: TestInfo, route: string): string {
  const target = baseUrl(testInfo)
  target.hash = route
  return target.toString()
}

test('serves base-scoped routes, assets, manifest, and worker without runtime errors', async ({
  page,
  request,
}, testInfo) => {
  const failedRequests: string[] = []
  const pageErrors: string[] = []
  page.on('requestfailed', (failed) => failedRequests.push(failed.url()))
  page.on('pageerror', (error) => pageErrors.push(error.name))

  const response = await page.goto(baseUrl(testInfo).toString())
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { name: '今天' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  for (const destination of ['记账', '专注', '健康', '设置']) {
    await page.getByRole('link', { name: destination, exact: true }).click()
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible()
  }
  // A healthy old cached release is not proof that the checked-out candidate was deployed.
  await expect(page.getByLabel(`应用版本 ${expectedVersion}`, { exact: true })).toBeVisible()
  expect(await page.locator('.settings-section h2').allTextContents()).toEqual([
    '分类',
    '外观',
    '数据与安全',
    '其他',
  ])
  const databaseMetadata = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexDB')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return { version: database.version, stores: Array.from(database.objectStoreNames).sort() }
    } finally {
      database.close()
    }
  })
  expect(databaseMetadata).toEqual({
    // Dexie reserves one decimal digit for its schema versions, so logical V2 is stored as native IndexedDB version 20.
    version: 20,
    stores: [
      'actionReceipts',
      'activitySessions',
      'categories',
      'focusSessions',
      'habitRecords',
      'habits',
      'settings',
      'transactions',
      'weightEntries',
    ],
  })
  await page.goto(routeUrl(testInfo, '/not-a-real-route'))
  await expect(page.getByRole('heading', { name: '今天' })).toBeVisible()

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifestUrl = new URL(manifestHref!, baseUrl(testInfo))
  const manifestResponse = await request.get(manifestUrl.toString())
  expect(manifestResponse.ok()).toBe(true)
  const manifest = (await manifestResponse.json()) as {
    id: string
    start_url: string
    scope: string
    icons: Array<{ src: string }>
  }
  const expectedBasePath = baseUrl(testInfo).pathname
  expect(manifest).toMatchObject({
    id: expectedBasePath,
    start_url: expectedBasePath,
    scope: expectedBasePath,
  })
  for (const icon of manifest.icons) {
    expect((await request.get(new URL(icon.src, manifestUrl).toString())).ok()).toBe(true)
  }

  const workerScope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(workerScope).toBe(baseUrl(testInfo).toString())
  const connectivityPath = new URL('__lifeindex_connectivity__', baseUrl(testInfo)).pathname
  // The body-free probe is allowed to fail: that failure is the intended offline signal.
  const unexpectedFailures = failedRequests.filter(
    (requestUrl) => new URL(requestUrl).pathname !== connectivityPath,
  )
  expect(unexpectedFailures).toEqual([])
  expect(pageErrors).toEqual([])
})

test('persists synthetic Health records locally on the deployed candidate', async ({
  page,
}, testInfo) => {
  const requests: string[] = []
  const privateMarker = 'SYNTHETIC_DEPLOYED_HEALTH_MARKER_84be'
  page.on('request', (request) => requests.push(request.url()))
  await page.goto(routeUrl(testInfo, '/health'))
  await expect(page.getByRole('heading', { name: '健康' })).toBeVisible()

  await page.getByRole('button', { name: '添加健康记录' }).click()
  await page.getByRole('button', { name: /记录体重/ }).click()
  await page.getByLabel('体重（公斤）').fill('67.8')
  await page.getByLabel('备注（可选）').fill(privateMarker)
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('button', { name: '添加健康记录' }).click()
  await page.getByRole('button', { name: /记录运动/ }).click()
  await page.getByLabel('运动类型').selectOption({ label: '步行' })
  await page.getByLabel('时长（分钟）').fill('20')
  await page.getByRole('button', { name: '保存' }).click()

  await page.reload()
  await expect(page.locator('.weight-overview strong')).toHaveText('67.8')
  await expect(page.getByText('20 分钟 · 适中', { exact: true })).toBeVisible()
  for (const value of requests) {
    expect(value).not.toContain(privateMarker)
  }
})

test('keeps synthetic records local and durable across an online reload', async ({
  page,
}, testInfo) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto(routeUrl(testInfo, '/finance'))
  await expect(page.getByText('这一天还没有账目。点按右上角即可记一笔。')).toBeVisible()

  await page.getByRole('button', { name: '新增交易' }).click()
  await page.getByLabel('金额（CNY）').fill('3.21')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥3.21')).toBeVisible()
  await page.reload()
  await expect(page.getByText('−¥3.21')).toBeVisible()

  // Static-host requests stay within the configured Pages base and never carry the local amount.
  for (const value of requests) {
    const requestUrl = new URL(value)
    expect(requestUrl.origin).toBe(baseUrl(testInfo).origin)
    expect(requestUrl.pathname.startsWith(baseUrl(testInfo).pathname)).toBe(true)
    expect(value).not.toContain('3.21')
  }
})

test('keeps action fragments out of the deployed network boundary', async ({ page }, testInfo) => {
  const requests: string[] = []
  const actionId = '00000000-0000-4000-8000-000000000801'
  const privateMarker = 'SYNTHETIC_DEPLOYED_PRIVATE_MARKER_52dd'
  page.on('request', (request) => requests.push(request.url()))

  await page.goto(
    routeUrl(
      testInfo,
      `/action/add-transaction?actionId=${actionId}&amount=8.01&categoryId=category-finance-expense-food-v1&note=${privateMarker}`,
    ),
  )
  await expect(page.getByRole('heading', { name: '新增账目' })).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page).toHaveURL(/#\/today$/)

  for (const value of requests) {
    expect(value).not.toContain(actionId)
    expect(value).not.toContain(privateMarker)
  }
})

test('mutates and preserves local data after the deployed app goes offline', async ({
  page,
  context,
}, testInfo) => {
  await page.goto(routeUrl(testInfo, '/finance'))
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  try {
    await expect(page.getByText('当前离线 · 本机数据仍可继续使用')).toBeVisible()
    await page.getByRole('button', { name: '新增交易' }).click()
    await page.getByLabel('金额（CNY）').fill('6.54')
    await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('−¥6.54')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
  await page.reload()
  await expect(page.getByText('−¥6.54')).toBeVisible()
})

test('reloads the deployed cached shell offline in Chromium', async ({
  page,
  context,
}, testInfo) => {
  // WebKit cannot automate offline reload here; ADR-0005 defers PV1-03 without counting this skip as a pass.
  test.skip(
    testInfo.project.name !== 'deployed-chromium',
    'Offline WebKit reload is not automatable here',
  )
  await page.goto(routeUrl(testInfo, '/today'))
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByText('当前离线 · 本机数据仍可继续使用')).toBeVisible()
    await expect(page.getByRole('heading', { name: '今天' })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
