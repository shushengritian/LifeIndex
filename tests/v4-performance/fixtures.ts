import type { Page } from '@playwright/test'
import type {
  ActivitySession,
  Category,
  FocusSession,
  Habit,
  HabitCheck,
  Transaction,
  WeightEntry,
} from '../../src/core/types'
import { V4_SCHEMA } from '../../src/core/database'
import { seed, type Dataset } from './protocol'

export type Fixture = ReturnType<typeof createFixture>
const id = (group: number, ordinal: number) =>
  `${group.toString(16).padStart(8, '0')}-0000-4000-8000-${ordinal.toString(16).padStart(12, '0')}`
const categoryId = (ordinal: number) => id(0x30000000, ordinal)
export const storeNames = Object.keys(V4_SCHEMA)

/** Business dates are deterministic offsets from the real browser day; the performance clock stays real. */
export function createFixture(dataset: Dataset, baseDate: string, capturedAt: string) {
  const now = Date.parse(capturedAt)
  const dateBack = (days: number) =>
    new Date(Date.parse(`${baseDate}T12:00:00+08:00`) - days * 86_400_000)
      .toISOString()
      .slice(0, 10)
  const instant = (date: string) => `${date}T04:00:00.000Z`
  const base = (group: number, ordinal: number, at = capturedAt) => ({
    id: id(group, ordinal),
    revision: 1,
    lastCommandId: id(group + 1, ordinal),
    createdAt: at,
    updatedAt: at,
  })
  const day = (localDate: string) => ({
    localDate,
    utcOffsetMinutes: 480,
    timePrecision: 'day' as const,
  })
  const categories: Category[] = []
  for (const [scope, names] of [
    ['expense', ['餐饮', '交通', '购物', '居家', '健康', '娱乐', '其他']],
    ['income', ['工资', '奖金', '其他']],
    ['activity', ['步行', '跑步', '力量', '骑行', '其他']],
    ['focus', ['工作', '学习', '创作', '其他']],
  ] as const) {
    names.forEach((name, sortOrder) =>
      categories.push({
        ...base(0x30000000, categories.length + 1),
        scope,
        name,
        normalizedName: name.normalize('NFKC').toLowerCase(),
        status: 'active',
        sortOrder,
        iconKey: scope === 'expense' || scope === 'income' ? 'finance' : scope,
      }),
    )
  }
  const transactions: Transaction[] = [],
    weightEntries: WeightEntry[] = [],
    activitySessions: ActivitySession[] = [],
    habits: Habit[] = [],
    habitChecks: HabitCheck[] = [],
    focusSessions: FocusSession[] = []
  if (dataset !== 'F0') {
    const large = dataset === 'F3'
    const monthDays = Number(baseDate.slice(-2))
    for (let i = 0; i < (large ? 10_000 : 30); i++) {
      const expense = large ? i % 5 !== 4 : i < 24
      // Each small fixture includes today and yesterday even when the month just changed.
      const days = large ? i % 730 : i < 2 ? i : i % monthDays
      transactions.push({
        ...base(0x40000000, i + 1),
        ...day(dateBack(days)),
        type: expense ? 'expense' : 'income',
        amountMinor: 100 + ((i * seed) % 49_900),
        currency: 'CNY',
        categoryId: categoryId(expense ? (i % 7) + 1 : (i % 3) + 8),
      })
    }
    for (let i = 0; i < (large ? 730 : 30); i++)
      weightEntries.push({
        ...base(0x41000000, i + 1),
        ...day(dateBack(i)),
        weightGrams: 65_000 + ((i * seed) % 3_000),
      })
    for (let i = 0; i < (large ? 500 : 12); i++)
      activitySessions.push({
        ...base(0x42000000, i + 1),
        ...day(dateBack(i)),
        categoryId: categoryId(11 + (i % 5)),
        durationMinutes: 15 + (i % 45),
        intensity: 'moderate',
      })
    for (let i = 0; i < (large ? 24 : 6); i++) {
      const habit = {
        ...base(0x43000000, i + 1),
        name: `合成习惯 ${i + 1}`,
        iconKey: 'leaf' as const,
        scheduleWeekdays: [1, 2, 3, 4, 5, 6, 7] as Habit['scheduleWeekdays'],
        status: 'active' as const,
        scheduleEffectiveFrom: dateBack(large ? 364 : 30),
      }
      habits.push(habit)
      for (let days = 0; days < (large ? 365 : 1); days++) {
        if (days === 0 && i >= (large ? 12 : 2)) continue
        habitChecks.push({
          ...base(0x44000000, i * 365 + days + 1),
          habitId: habit.id,
          ...day(dateBack(days)),
        })
      }
    }
    for (let i = 0; i < (large ? 1_000 : 14); i++) {
      const localDate = dateBack(1 + (i % 730)),
        startedAt = instant(localDate)
      focusSessions.push({
        ...base(0x45000000, i + 1, startedAt),
        localDate,
        utcOffsetMinutes: 480,
        timePrecision: 'instant',
        startedAt,
        title: '合成专注',
        categoryId: categoryId(16 + (i % 4)),
        status: 'completed',
        targetDurationMs: 1_500_000,
        durationMs: 1_500_000,
        endedAt: new Date(Date.parse(startedAt) + 1_500_000).toISOString(),
        updatedAt: new Date(Date.parse(startedAt) + 1_500_000).toISOString(),
        completionKind: 'timer',
        completionToken: id(0x46000000, i + 1),
      })
    }
  }
  const tables = {
    categories,
    transactions,
    weightEntries,
    activitySessions,
    habits,
    habitChecks,
    focusSessions,
    preferences: Object.entries({
      appearance: 'system',
      weightTarget: null,
      lastExportedAt: null,
      localNoticeSeen: false,
    }).map(([key, value]) => ({
      key,
      value,
      revision: 1,
      lastCommandId: id(0x47000000, 1),
      updatedAt: capturedAt,
    })),
    meta: [{ key: 'state', schemaVersion: 1, generation: id(0x48000000, 1), revision: 0 }],
  }
  if (!Number.isFinite(now)) throw new Error('InvalidFixtureClock')
  const todayTransactions = transactions.filter((entry) => entry.localDate === baseDate)
  const todayRecords = [transactions, weightEntries, activitySessions, habitChecks, focusSessions]
    .flat()
    .filter((entry) => entry.localDate === baseDate)
  return {
    tables,
    counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    expected: {
      scheduled: habits.length,
      completed: habitChecks.filter((entry) => entry.localDate === baseDate).length,
      transactionCount: todayTransactions.length,
      expenseMinor: todayTransactions
        .filter((entry) => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amountMinor, 0),
      recentCount: Math.min(3, todayRecords.length),
    },
  }
}

/** Native setup uses the production schema only in a routed empty document, never an app navigation. */
export async function seedFixture(page: Page, fixture: Fixture) {
  await page.evaluate(
    ({ schema, tables }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('LifeIndexV4', 10)
        request.onupgradeneeded = () => {
          for (const [name, spec] of Object.entries(schema)) {
            const [primary, ...indices] = spec.split(',')
            const store = request.result.createObjectStore(name, { keyPath: primary })
            for (const definition of indices) {
              const unique = definition.startsWith('&')
              const indexName = unique ? definition.slice(1) : definition
              const keyPath = indexName.startsWith('[')
                ? indexName.slice(1, -1).split('+')
                : indexName
              store.createIndex(indexName, keyPath, { unique })
            }
          }
        }
        request.onerror = () => reject(new Error('FixtureOpenFailed'))
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(Object.keys(tables), 'readwrite')
          for (const [store, records] of Object.entries(tables))
            for (const record of records) tx.objectStore(store).add(record)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onabort = () => {
            db.close()
            reject(new Error('FixtureTransactionFailed'))
          }
        }
      }),
    { schema: V4_SCHEMA, tables: fixture.tables },
  )
}

/** Hashes remain inside the test report; no record values, notes, titles or backup bodies are logged. */
export async function databaseDigest(page: Page) {
  return page.evaluate(
    (stores) =>
      new Promise<{ digest: string; counts: Record<string, number> }>((resolve, reject) => {
        const opening = indexedDB.open('LifeIndexV4')
        opening.onupgradeneeded = () => opening.transaction!.abort()
        opening.onerror = () => reject(new Error('DatabaseReadFailed'))
        opening.onsuccess = () => {
          const db = opening.result,
            tx = db.transaction(stores, 'readonly'),
            values: Record<string, unknown[]> = {}
          for (const store of stores) {
            const request = tx.objectStore(store).getAll()
            request.onsuccess = () => (values[store] = request.result)
          }
          tx.onabort = () => {
            db.close()
            reject(new Error('DatabaseReadFailed'))
          }
          tx.oncomplete = () => {
            db.close()
            const canonical = JSON.stringify(stores.map((name) => [name, values[name]]))
            void crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)).then((hash) =>
              resolve({
                digest: [...new Uint8Array(hash)]
                  .map((byte) => byte.toString(16).padStart(2, '0'))
                  .join(''),
                counts: Object.fromEntries(stores.map((name) => [name, values[name].length])),
              }),
            )
          }
        }
      }),
    storeNames,
  )
}
