import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'

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
      } as const
      for (const name of storeNames) {
        const key = keyByStore[name]
        data[name].sort((left, right) => String(left[key]).localeCompare(String(right[key])))
      }
      const exportedAt = new Date().toISOString()
      return JSON.stringify({
        format: 'lifeindex-backup',
        formatVersion: 1,
        appVersion: '0.1.0',
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
