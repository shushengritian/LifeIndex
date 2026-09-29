import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

export const stores = [
  'categories',
  'transactions',
  'weightEntries',
  'activitySessions',
  'habits',
  'habitChecks',
  'focusSessions',
  'preferences',
  'meta',
] as const
export type StoreName = (typeof stores)[number]
export type Row = Record<string, unknown>
export type DatabaseSnapshot = Record<StoreName, Row[]>
export type EntryKind = 'expense' | 'weight' | 'activity'

export async function enterV4(page: Page, route = '/today', origin = '') {
  await page.goto(`${origin}/#${route}`)
  // An unavailable V4 is a failed prerequisite, never an implicit skip or evidence from the old UI.
  await expect(
    page.locator('[data-lifeindex-version="4"]'),
    'The served dist must be AppV4',
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '留一笔，选择记录类型', exact: true }).first(),
  ).toBeVisible()
  await expect.poll(async () => (await readDatabase(page)).meta.length).toBe(1)
}

export async function readDatabase(page: Page): Promise<DatabaseSnapshot> {
  return page.evaluate(
    async (storeNames) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('LifeIndexV4')
        // Read helpers must not accidentally create a replacement empty database.
        request.onupgradeneeded = () => request.transaction?.abort()
        request.onerror = () => reject(new Error('V4 database is not initialized'))
        request.onsuccess = () => resolve(request.result)
      })
      try {
        const transaction = database.transaction(storeNames, 'readonly')
        const entries = await Promise.all(
          storeNames.map(
            (name) =>
              new Promise<[string, Record<string, unknown>[]]>((resolve, reject) => {
                const request = transaction.objectStore(name).getAll()
                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve([name, request.result])
              }),
          ),
        )
        return Object.fromEntries(entries) as Record<
          (typeof storeNames)[number],
          Record<string, unknown>[]
        >
      } finally {
        database.close()
      }
    },
    [...stores],
  )
}

export async function localDay(page: Page, delta = 0) {
  return page.evaluate((days) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }, delta)
}

export async function seedHabits(page: Page, count = 1) {
  const day = await localDay(page)
  await page.evaluate(
    async ({ count, day }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('LifeIndexV4')
        request.onupgradeneeded = () => request.transaction?.abort()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      try {
        // Only this test context's new V4 records are seeded. No old database is opened or cleared.
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(['habits', 'meta'], 'readwrite')
          transaction.oncomplete = () => resolve()
          transaction.onabort = () => reject(transaction.error)
          transaction.onerror = () => reject(transaction.error)
          const request = transaction.objectStore('meta').get('state')
          request.onsuccess = () => {
            if (!request.result) {
              transaction.abort()
              return
            }
            const now = new Date().toISOString()
            for (let index = 1; index <= count; index++) {
              const id = `40000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
              transaction.objectStore('habits').put({
                id,
                revision: 1,
                lastCommandId: id,
                createdAt: now,
                updatedAt: now,
                name: `合成习惯${index}`,
                iconKey: 'leaf',
                status: 'active',
                scheduleWeekdays: [1, 2, 3, 4, 5, 6, 7],
                scheduleEffectiveFrom: day,
              })
            }
            transaction
              .objectStore('meta')
              .put({ ...request.result, revision: request.result.revision + 1 })
          }
        })
      } finally {
        database.close()
      }
    },
    { count, day },
  )
  await page.reload()
  await expect(page.getByRole('button', { name: '完成合成习惯1', exact: true })).toBeVisible()
  console.info('v4.qa.fixture.ready', { entityType: 'habit', count })
}

const entryNames = { expense: '记一笔', weight: '记体重', activity: '记运动' } as const
const fieldNames = { expense: /金额/, weight: /体重/, activity: /时长|分钟/ } as const

export function composer(page: Page) {
  return page.getByRole('button', { name: '留一笔，选择记录类型', exact: true }).first()
}

export async function openEntry(page: Page, kind: EntryKind) {
  const trigger = composer(page)
  const rect = await trigger.boundingBox()
  expect(rect).not.toBeNull()
  const viewport = page.viewportSize()!
  expect(rect!.y).toBeGreaterThanOrEqual(0)
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height + 1)
  await trigger.click()
  // Scope to the chooser: domain pages can also expose an identically named inline create action.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: entryNames[kind], exact: true })
    .click()
  const dialog = page.getByRole('dialog').last()
  const field = dialog.getByLabel(fieldNames[kind]).first()
  // This asserts application-delivered focus; neither .focus() nor .fill() is used to create it.
  await expect(field).toBeFocused()
  await expect(field).toBeEditable()
  return { dialog, field }
}

export async function saveEntry(
  page: Page,
  kind: EntryKind,
  value: string,
  options: { note?: string; day?: string } = {},
) {
  const { dialog, field } = await openEntry(page, kind)
  await field.fill(value)
  if (options.day) await dialog.getByLabel(/记录日期/).fill(options.day)
  if (options.note) await dialog.getByLabel(/备注/).fill(options.note)
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(composer(page)).toBeFocused()
  console.info('v4.qa.entry.saved', { entityType: kind })
}

export async function assertTouchTarget(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const points = [
      [0.5, 0.5],
      [0.1, 0.1],
      [0.9, 0.9],
    ]
    return points.every(([x, y]) => {
      const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y)
      return hit === element || (hit !== null && element.contains(hit))
    })
  })
  expect(result, 'Target center and inside edges must not be covered').toBe(true)
}

export async function attachEvidence(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`)
  // Persist the artifact even with the concise line reporter used for targeted independent runs.
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, {
    path,
    contentType: 'image/png',
  })
}
