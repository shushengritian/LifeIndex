import { expect, test } from '@playwright/test'

for (const kind of ['weight', 'activity'] as const) {
  test(`${kind} history retains context after editing the oldest of forty records`, async ({
    page,
  }) => {
    await page.goto('/#/health')
    await expect(page.getByRole('heading', { name: '健康', exact: true })).toBeVisible()
    // Seed only this test's isolated browser database; never touch a user's saved ledger.
    await page.evaluate(async (recordKind) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('LifeIndexDB')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        await new Promise<void>((resolve, reject) => {
          const store = recordKind === 'weight' ? 'weightEntries' : 'activitySessions'
          const transaction = database.transaction(store, 'readwrite')
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
          for (let index = 0; index < 40; index++) {
            const timestamp = new Date(Date.UTC(2026, 7, 1 + index, 4)).toISOString()
            const common = {
              id: crypto.randomUUID(),
              localDate: timestamp.slice(0, 10),
              timezoneOffsetMinutes: -480,
              createdAt: timestamp,
              updatedAt: timestamp,
            }
            transaction.objectStore(store).put(
              recordKind === 'weight'
                ? { ...common, measuredAt: timestamp, weightGrams: 65000 + index * 100 }
                : {
                    ...common,
                    occurredAt: timestamp,
                    categoryId: 'category-activity-running-v2',
                    durationMinutes: 30 + index,
                    intensity: 'light',
                  },
            )
          }
        })
      } finally {
        database.close()
      }
    }, kind)
    await page.goto(`/#/health/${kind}-history`)
    // Raw fixture writes do not emit Dexie's same-page live-query notifications.
    await page.reload()
    const rows = page.locator('.health-history-open')
    await expect(rows).toHaveCount(40)
    const oldest = rows.last()
    await oldest.scrollIntoViewIfNeeded()
    const position = await page.evaluate(() => window.scrollY)
    expect(position).toBeGreaterThan(1000)
    console.info('health.history.scroll-test.open', { kind, count: 40 })
    await oldest.click()
    await page.getByLabel('备注（可选）').fill('合成长列表回归')
    await page
      .getByRole('button', { name: kind === 'weight' ? '保存体重' : '保存运动', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Returning from a sheet must preserve the list, not just the saved database row.
    await expect(oldest).toBeInViewport()
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - position))
      .toBeLessThan(5)
    await oldest.click()
    await expect(page.getByLabel('备注（可选）')).toHaveValue('合成长列表回归')
    await page.getByRole('button', { name: '关闭编辑器', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(oldest).toBeInViewport()
    await expect(rows).toHaveCount(40)
    console.info('health.history.scroll-test.passed', { kind, count: 40 })
  })
}
