import type { Page } from '@playwright/test'
import { seedHabits } from './support'

export async function seedRepresentativeData(page: Page) {
  await seedHabits(page, 12)
  const ids = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexV4')
      request.onupgradeneeded = () => request.transaction?.abort()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<{
        habit: string
        transaction: string
        weight: string
        activity: string
        focus: string
      }>((resolve, reject) => {
        const tx = db.transaction(
          [
            'categories',
            'habits',
            'transactions',
            'weightEntries',
            'activitySessions',
            'focusSessions',
            'meta',
          ],
          'readwrite',
        )
        const chosen = {
          habit: '40000000-0000-4000-8000-000000000003',
          transaction: '',
          weight: '',
          activity: '',
          focus: '',
        }
        tx.oncomplete = () => resolve(chosen)
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => reject(tx.error)
        const categories = tx.objectStore('categories').getAll()
        categories.onsuccess = () => {
          const rows = categories.result as { id: string; scope: string }[]
          const category = (scope: string) => rows.find((row) => row.scope === scope)!.id
          const now = Date.now(),
            note = '合成长内容边界'.repeat(150).slice(0, 1000)
          const day = (date: Date) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const base = () => {
            const id = crypto.randomUUID()
            return {
              id,
              revision: 1,
              lastCommandId: id,
              createdAt: new Date(now).toISOString(),
              updatedAt: new Date(now).toISOString(),
            }
          }
          // All records satisfy the public V4 schema; extremes and long notes challenge layout without fake display totals.
          for (let index = 0; index < 30; index++) {
            const date = new Date(now)
            date.setDate(date.getDate() - index)
            const facts = {
              timePrecision: 'day',
              localDate: day(date),
              utcOffsetMinutes: -date.getTimezoneOffset(),
              note,
            }
            const transaction = {
              ...base(),
              ...facts,
              type: 'expense',
              currency: 'CNY',
              amountMinor: index === 0 ? 9999999999 : 1234,
              categoryId: category('expense'),
            }
            const weight = {
              ...base(),
              ...facts,
              weightGrams: index === 0 ? 1000000 : 63000 + index,
            }
            const activity = {
              ...base(),
              ...facts,
              durationMinutes: index === 0 ? 1440 : 25,
              intensity: 'moderate',
              categoryId: category('activity'),
            }
            tx.objectStore('transactions').add(transaction)
            tx.objectStore('weightEntries').add(weight)
            tx.objectStore('activitySessions').add(activity)
            if (!index) {
              chosen.transaction = transaction.id
              chosen.weight = weight.id
              chosen.activity = activity.id
            }
          }
          const started = new Date(now - 120000)
          const focus = {
            ...base(),
            title: '合成长专注标题'.repeat(12).slice(0, 80),
            note,
            categoryId: category('focus'),
            createdAt: started.toISOString(),
            startedAt: started.toISOString(),
            timePrecision: 'instant',
            localDate: day(started),
            utcOffsetMinutes: -started.getTimezoneOffset(),
            targetDurationMs: 1500000,
            status: 'completed',
            durationMs: 120000,
            endedAt: new Date(now).toISOString(),
            completionKind: 'early',
            completionToken: crypto.randomUUID(),
          }
          chosen.focus = focus.id
          tx.objectStore('focusSessions').add(focus)
          const habit = tx.objectStore('habits').get(chosen.habit)
          habit.onsuccess = () =>
            tx
              .objectStore('habits')
              .put({ ...habit.result, name: '合成长习惯名称'.repeat(6).slice(0, 40), note })
          const meta = tx.objectStore('meta').get('state')
          meta.onsuccess = () =>
            tx.objectStore('meta').put({ ...meta.result, revision: meta.result.revision + 1 })
        }
      })
    } finally {
      db.close()
    }
  })
  await page.reload()
  console.info('v4.qa.fixture.ready', { dataset: 'long-content-and-limits', recordsPerDomain: 30 })
  return ids
}
