import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'

async function readStoreRecords(
  page: import('@playwright/test').Page,
  storeName: string,
): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(async (name) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexDB')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const request = database.transaction(name, 'readonly').objectStore(name).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally {
      database.close()
    }
  }, storeName)
}

async function createSyntheticBackupInput(page: import('@playwright/test').Page) {
  const serialized = await page.evaluate(async () => {
    const storeNames = [
      'categories',
      'transactions',
      'habits',
      'habitRecords',
      'focusSessions',
      'settings',
      'actionReceipts',
      'weightEntries',
      'activitySessions',
    ] as const
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexDB')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction([...storeNames], 'readonly')
      const entries = await Promise.all(
        storeNames.map(
          (name) =>
            new Promise<[string, Array<Record<string, unknown>>]>((resolve, reject) => {
              const request = transaction.objectStore(name).getAll()
              request.onsuccess = () => resolve([name, request.result])
              request.onerror = () => reject(request.error)
            }),
        ),
      )
      const data = Object.fromEntries(entries) as Record<
        (typeof storeNames)[number],
        Array<Record<string, unknown>>
      >
      const keyByStore = {
        categories: 'id',
        transactions: 'id',
        habits: 'id',
        habitRecords: 'id',
        focusSessions: 'id',
        settings: 'key',
        actionReceipts: 'actionId',
        weightEntries: 'id',
        activitySessions: 'id',
      } as const
      for (const name of storeNames) {
        const key = keyByStore[name]
        data[name].sort((left, right) => String(left[key]).localeCompare(String(right[key])))
      }
      const exportedAt = new Date().toISOString()
      return JSON.stringify({
        format: 'lifeindex-backup',
        formatVersion: 2,
        appVersion: '2.0.0',
        exportedAt,
        source: {
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          locale: navigator.language || 'zh-CN',
        },
        counts: Object.fromEntries(storeNames.map((name) => [name, data[name].length])),
        data,
      })
    } finally {
      database.close()
    }
  })
  return {
    name: 'lifeindex-backup-2026-09-03-2200.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serialized),
  }
}

test('loads the LifeIndex shell and navigates between primary destinations', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()
  await page.getByRole('link', { name: '习惯', exact: true }).click()
  await expect(page.getByRole('heading', { name: '习惯', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#\/habits$/)
})

test('has no automatically detectable accessibility violations on the shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('creates, persists, edits, and deletes a local transaction', async ({ page }) => {
  await page.goto('/#/finance')
  await expect(page.getByRole('heading', { name: '记账' })).toBeVisible()

  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('12.30')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥12.30')).toBeVisible()

  await page.reload()
  await expect(page.getByText('−¥12.30')).toBeVisible()
  await page.getByRole('button', { name: '编辑' }).click()
  await page.getByLabel('金额（CNY）').fill('20.00')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥20.00')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除' }).click()
  await expect(page.getByText('这个时间范围还没有账目。新增一笔，就从这里开始。')).toBeVisible()
})

test('creates a habit and persists reversible daily check-in', async ({ page }) => {
  await page.goto('/#/habits')
  await expect(page.getByRole('heading', { name: '习惯', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('习惯名称').fill('合成阅读习惯')
  await page.getByRole('button', { name: '保存' }).click()

  const checkIn = page.getByRole('button', { name: /合成阅读习惯.*点按完成/ })
  await expect(checkIn).toBeVisible()
  await checkIn.click()
  await expect(page.getByRole('button', { name: /合成阅读习惯.*已完成/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.reload()
  const completed = page.getByRole('button', { name: /合成阅读习惯.*已完成/ })
  await expect(completed).toBeVisible()
  await completed.click()
  await expect(page.getByRole('button', { name: /合成阅读习惯.*点按完成/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('restores an active focus timer after reload and saves one early finish', async ({ page }) => {
  await page.goto('/#/focus')
  await expect(page.getByRole('heading', { name: '专注' })).toBeVisible()

  await page.getByLabel('专注标题').fill('合成专注会话')
  await page.getByRole('combobox', { name: '分类（可选）' }).selectOption({ label: '工作' })
  await page.getByRole('button', { name: '开始专注' }).click()
  await expect(page.getByRole('heading', { name: '合成专注会话' })).toBeVisible()
  await expect(page.getByText(/^2[45]:[0-5][0-9]$/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: '合成专注会话' })).toBeVisible()
  await page.waitForTimeout(1_100)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '提前结束' }).click()

  const history = page.getByRole('region', { name: '最近记录' })
  await expect(history.getByText('合成专注会话')).toBeVisible()
  await expect(history.getByText(/提前结束/)).toBeVisible()
})

test('keeps Today calm while reflecting cross-feature local changes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()

  await page.getByRole('link', { name: '记一笔' }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('8.80')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await expect(
    page.getByRole('region', { name: '今日账目' }).getByText('¥8.80', { exact: true }),
  ).toBeVisible()

  await page.getByRole('link', { name: '管理习惯' }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('习惯名称').fill('合成今日习惯')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await page.getByRole('button', { name: /合成今日习惯.*点按完成/ }).click()
  await expect(page.getByText('1/1')).toBeVisible()

  await page.getByRole('link', { name: '开始专注' }).click()
  await page.getByLabel('专注标题').fill('合成今日专注')
  await page.getByRole('button', { name: '开始专注' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await expect(
    page.getByRole('region', { name: '今日专注' }).getByText('合成今日专注'),
  ).toBeVisible()
})

test('persists appearance and manages Finance category lifecycle', async ({ page }) => {
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

  await page.getByRole('button', { name: '深色' }).click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('dark')
  await page.reload()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('dark')

  const categoryRegion = page.getByRole('region', { name: '记账分类' })
  await categoryRegion.getByLabel('分类名称').fill('合成旅行')
  await categoryRegion.getByRole('button', { name: '新增分类' }).click()
  let categoryRow = categoryRegion.getByRole('listitem').filter({ hasText: '合成旅行' })
  await expect(categoryRow).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept('合成出行'))
  await categoryRow.getByRole('button', { name: '重命名' }).click()
  categoryRow = categoryRegion.getByRole('listitem').filter({ hasText: '合成出行' })
  await expect(categoryRow).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await categoryRow.getByRole('button', { name: '归档' }).click()
  await categoryRegion.getByText(/已归档分类/).click()
  const archivedRow = categoryRegion.getByRole('listitem').filter({ hasText: '合成出行' })
  await expect(archivedRow).toBeVisible()
  await archivedRow.getByRole('button', { name: '恢复' }).click()

  await page.getByRole('link', { name: /记账/ }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await expect(
    page.getByRole('combobox', { name: '分类' }).getByRole('option', { name: '合成出行' }),
  ).toBeAttached()
})

test('exports, previews, and replaces data from a downloaded backup', async ({
  page,
}, testInfo) => {
  await page.goto('/#/finance')
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('11.11')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()

  await page.getByRole('link', { name: /设置/ }).click()
  const webkitBackup =
    testInfo.project.name === 'mobile-safari' ? await createSyntheticBackupInput(page) : undefined
  const downloadEvent =
    testInfo.project.name === 'chromium' ? page.waitForEvent('download') : undefined
  await page.getByRole('button', { name: '导出完整备份' }).click()
  const download = downloadEvent ? await downloadEvent : undefined
  if (download) {
    expect(download.suggestedFilename()).toMatch(/^lifeindex-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
  }
  const chromiumBackupPath = download ? await download.path() : undefined
  if (download) expect(chromiumBackupPath).toBeTruthy()
  await expect(page.getByText(/备份文件已交给系统/)).toBeVisible()

  await page.getByRole('link', { name: /记账/ }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('22.22')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '交通' })
  await page.getByRole('button', { name: '保存' }).click()

  await page.getByRole('link', { name: /设置/ }).click()
  await page.getByLabel('选择备份文件').setInputFiles(chromiumBackupPath ?? webkitBackup!)
  const preview = page.getByRole('group', { name: '恢复预览' })
  await expect(preview).toContainText('账目1')
  page.once('dialog', (dialog) => dialog.accept())
  await preview.getByRole('button', { name: '确认替换' }).click()
  await expect(page.getByText('恢复完成。全部模块已从这份备份重新读取。')).toBeVisible()

  await page.getByRole('link', { name: /记账/ }).click()
  await expect(page.getByText('−¥11.11')).toBeVisible()
  await expect(page.getByText('−¥22.22')).toHaveCount(0)
})

test('ships base-aware install metadata and complete icon assets', async ({ page }) => {
  await page.goto('/')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/manifest.webmanifest')
  const manifest = await page.evaluate(async (href) => {
    const response = await fetch(href!)
    return response.json() as Promise<{
      name: string
      start_url: string
      scope: string
      display: string
      icons: Array<{ src: string; sizes: string; purpose: string }>
    }>
  }, manifestHref)

  expect(manifest).toMatchObject({
    name: 'LifeIndex',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/apple-touch-icon.png',
  )
  for (const icon of manifest.icons) {
    expect((await page.request.get(`/${icon.src}`)).ok()).toBe(true)
  }

  await page.evaluate(async () => navigator.serviceWorker.ready)
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys()
    const requests = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()))
    return requests.flat().map(({ url }) => url)
  })
  expect(cachedUrls.length).toBeGreaterThan(5)
  for (const cachedUrl of cachedUrls) {
    const url = new URL(cachedUrl)
    expect(url.origin).toBe('http://127.0.0.1:4173')
    expect(url.hash).toBe('')
    expect(url.pathname).toMatch(/^\/(?:index\.html|manifest\.webmanifest|assets\/|icons\/)/)
    expect([...url.searchParams.keys()].every((key) => key === '__WB_REVISION__')).toBe(true)
  }
})

test('previews, commits, and durably deduplicates a transaction URL action', async ({ page }) => {
  const actionId = '00000000-0000-4000-8000-000000000501'
  const actionUrl = `/#/action/add-transaction?actionId=${actionId}&amount=35.10&categoryId=category-finance-expense-food-v1&note=${encodeURIComponent('合成快捷午餐')}`
  await page.goto(actionUrl)

  await expect(page.getByRole('heading', { name: '新增账目' })).toBeVisible()
  await expect(page.getByText('¥35.10')).toBeVisible()
  expect(await readStoreRecords(page, 'transactions')).toHaveLength(0)
  await page.getByRole('button', { name: '确认新增账目' }).click()
  await expect(page).toHaveURL(/#\/finance$/)
  await expect(page.getByText('−¥35.10')).toBeVisible()

  await page.goto(actionUrl)
  await expect(page.getByRole('heading', { name: '这个快捷动作已经处理过' })).toBeVisible()
  await expect(page).toHaveURL(/#\/action-result\?status=handled&type=add-transaction$/)
  expect(page.url()).not.toContain(actionId)
  expect(await readStoreRecords(page, 'transactions')).toHaveLength(1)
})

test('supports habit and focus actions while scrubbing cancel and invalid fragments', async ({
  page,
}) => {
  await page.goto('/#/habits')
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('习惯名称').fill('合成快捷习惯')
  await page.getByRole('button', { name: '保存' }).click()
  const habits = await readStoreRecords(page, 'habits')
  const habit = habits.find(({ name }) => name === '合成快捷习惯')
  expect(habit?.id).toEqual(expect.any(String))

  await page.goto(
    `/#/action/check-habit?actionId=00000000-0000-4000-8000-000000000502&habitId=${String(habit!.id)}`,
  )
  await expect(page.getByRole('heading', { name: '完成习惯' })).toBeVisible()
  await page.getByRole('button', { name: '确认完成习惯' }).click()
  await expect(page.getByRole('button', { name: /合成快捷习惯.*已完成/ })).toBeVisible()

  const focusUrl = `/#/action/start-focus?actionId=00000000-0000-4000-8000-000000000503&title=${encodeURIComponent('合成快捷专注')}&durationMinutes=25&categoryId=category-focus-work-v1`
  await page.goto(focusUrl)
  await expect(page.getByRole('heading', { name: '开始专注' })).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page).toHaveURL(/#\/today$/)
  expect(page.url()).not.toContain('合成快捷专注')
  expect(await readStoreRecords(page, 'focusSessions')).toHaveLength(0)

  await page.goto(focusUrl.replace('000000000503', '000000000504'))
  await page.getByRole('button', { name: '确认开始专注' }).click()
  await expect(page.getByRole('heading', { name: '合成快捷专注' })).toBeVisible()

  await page.goto(
    '/#/action/add-transaction?actionId=00000000-0000-4000-8000-000000000505&amount=1&categoryId=category-finance-expense-food-v1&unknown=private',
  )
  await expect(page.getByRole('heading', { name: '无法识别这个快捷动作' })).toBeVisible()
  expect(page.url()).not.toContain('unknown=private')
})

test('creates and persists local data after the browser goes offline', async ({
  page,
  context,
}) => {
  await page.goto('/#/finance')
  await expect(page.getByRole('heading', { name: '记账' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  try {
    await expect(page.getByText('当前离线 · 本机数据仍可继续使用')).toBeVisible()
    await page.getByRole('button', { name: '新增' }).click()
    await page.getByLabel('金额（CNY）').fill('6.66')
    await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('−¥6.66')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
  await page.reload()
  await expect(page.getByText('−¥6.66')).toBeVisible()
})

test('reloads the cached application shell and persisted data offline in Chromium', async ({
  page,
  context,
}, testInfo) => {
  // WebKit cannot automate offline reload here; ADR-0005 defers the unverified physical check to PV1-03.
  test.skip(testInfo.project.name !== 'chromium', 'Offline WebKit reload is not automatable here')
  await page.goto('/#/finance')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByText('当前离线 · 本机数据仍可继续使用')).toBeVisible()
    await page.getByRole('button', { name: '新增' }).click()
    await page.getByLabel('金额（CNY）').fill('7.77')
    await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('−¥7.77')).toBeVisible()
    await page.reload()
    await expect(page.getByText('−¥7.77')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test('rejects an invalid backup in the UI without changing current records', async ({ page }) => {
  await page.goto('/#/finance')
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('9.99')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥9.99')).toBeVisible()

  await page.getByRole('link', { name: '设置', exact: true }).click()
  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'synthetic-invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"not":"a backup"}'),
  })
  await expect(page.getByRole('alert')).toContainText('当前数据没有改变')
  expect(await readStoreRecords(page, 'transactions')).toHaveLength(1)

  await page.getByRole('link', { name: '记账', exact: true }).click()
  await expect(page.getByText('−¥9.99')).toBeVisible()
})

test('keeps primary routes and entry states free of detectable accessibility violations', async ({
  page,
}) => {
  const routes = [
    ['/#/today', '让今天保持清晰'],
    ['/#/finance', '记账'],
    ['/#/focus', '专注'],
    ['/#/habits', '习惯'],
    ['/#/settings', '设置'],
  ] as const
  for (const [route, heading] of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }

  await page.goto('/#/finance')
  await page.getByRole('button', { name: '新增' }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.goto(
    '/#/action/add-transaction?actionId=00000000-0000-4000-8000-000000000506&amount=8.88&categoryId=category-finance-expense-food-v1',
  )
  await expect(page.getByRole('heading', { name: '新增账目' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.goto('/#/settings')
  await page.getByRole('button', { name: '深色' }).click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('dark')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('fits long representative content and touch controls at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/settings')
  const categoryRegion = page.getByRole('region', { name: '记账分类' })
  await categoryRegion.getByLabel('分类名称').fill('合成很长很长但仍然有效的旅行与家庭生活分类')
  await categoryRegion.getByRole('button', { name: '新增分类' }).click()
  await expect(categoryRegion.getByText('合成很长很长但仍然有效的旅行与家庭生活分类')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const smallControls = await page
    .locator('button, a, input, select, label.file-picker')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          // Opacity-zero native inputs delegate their full target to a visible 44px label.
          return (
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            style.opacity !== '0' &&
            rect.width > 0
          )
        })
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            label: element.getAttribute('aria-label') ?? element.textContent,
            width: rect.width,
            height: rect.height,
          }
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    )
  expect(smallControls).toEqual([])

  const motionDurations = await page.locator('.page').evaluate((element) => {
    const style = getComputedStyle(element)
    const toMilliseconds = (duration: string) =>
      duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000
    // Browsers serialize the same duration in either seconds or milliseconds.
    return {
      animation: toMilliseconds(style.animationDuration),
      transition: toMilliseconds(style.transitionDuration),
    }
  })
  // Reduced-motion preference collapses decorative movement without removing state feedback.
  expect(motionDurations.animation).toBeLessThanOrEqual(0.01)
  expect(motionDurations.transition).toBeLessThanOrEqual(0.01)
})

test('keeps fragment payloads out of requests and privacy-safe runtime logs', async ({ page }) => {
  const requests: string[] = []
  const consoleMessages: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('console', (message) => consoleMessages.push(message.text()))
  const secret = 'SYNTHETIC_PRIVATE_ACTION_VALUE_9f4b'
  const actionId = '00000000-0000-4000-8000-000000000507'
  await page.goto(
    `/#/action/add-transaction?actionId=${actionId}&amount=18.88&categoryId=category-finance-expense-food-v1&note=${secret}`,
  )
  await page.getByRole('button', { name: '确认新增账目' }).click()
  await expect(page.getByText('−¥18.88')).toBeVisible()

  expect(requests.length).toBeGreaterThan(0)
  for (const value of [...requests, ...consoleMessages]) {
    expect(value).not.toContain(secret)
    expect(value).not.toContain(actionId)
  }
})
