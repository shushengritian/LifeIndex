import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { databaseSchemaV3 } from '@/data/db/schema'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { TransactionRepository } from '@/data/repositories/TransactionRepository'
import { BackupService } from '@/data/backup/BackupService'
import { validateBackup } from '@/data/backup/schema'
import { expenseByCategory } from '@/features/finance/financeDomain'
import { createSeedCategories, createSeedSettings } from '@/data/db/seeds'
import type { BackupData } from '@/shared/domain/types'
import {
  buildTransaction,
  buildHabit,
  buildHabitRecord,
  buildFocusSession,
  buildWeightEntry,
  buildActivitySession,
  FIXED_NOW,
} from '../fixtures/builders'

const opened: LifeIndexDatabase[] = []
const rootId = 'category-finance-expense-food-v1'
async function setup() {
  const db = new LifeIndexDatabase(`Hierarchy-${crypto.randomUUID()}`)
  opened.push(db)
  await db.initialize()
  const categories = new CategoryRepository(db)
  const child = await categories.create({
    domain: 'finance',
    transactionType: 'expense',
    parentId: rootId,
    name: '早餐',
    icon: 'utensils',
    color: 'blue',
  })
  return { db, categories, child }
}
afterEach(async () => {
  await Promise.all(opened.splice(0).map((db) => db.delete()))
})

describe('two-level category integrity', () => {
  it('preserves all V3 rows on index-only upgrade', async () => {
    const name = `LegacyHierarchy-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(3).stores(databaseSchemaV3)
    await legacy.open()
    // Populate every shipped store: comparing empty tables cannot prove data preservation.
    const planId = '00000000-0000-4000-8000-000000000080'
    const common = { createdAt: FIXED_NOW, updatedAt: FIXED_NOW }
    const data: BackupData = {
      categories: createSeedCategories(FIXED_NOW),
      settings: createSeedSettings(FIXED_NOW),
      transactions: [buildTransaction()],
      habits: [buildHabit()],
      habitRecords: [buildHabitRecord()],
      focusSessions: [buildFocusSession()],
      weightEntries: [buildWeightEntry()],
      activitySessions: [buildActivitySession()],
      actionReceipts: [
        {
          actionId: '00000000-0000-4000-8000-000000000090',
          actionType: 'add-transaction',
          handledAt: FIXED_NOW,
          outcomeEntityId: buildTransaction().id,
        },
      ],
      cessationPlans: [
        {
          ...common,
          id: planId,
          startAt: FIXED_NOW,
          startLocalDate: '2026-09-03',
          timeZone: 'Asia/Shanghai',
        },
      ],
      cessationDays: [
        {
          ...common,
          id: '00000000-0000-4000-8000-000000000081',
          planId,
          localDate: '2026-09-03',
          kind: 'snapshot',
          reportedAt: FIXED_NOW,
        },
      ],
      cessationEvents: [
        {
          ...common,
          id: '00000000-0000-4000-8000-000000000082',
          planId,
          localDate: '2026-09-03',
          occurredAt: FIXED_NOW,
          kind: 'craving',
          outcome: 'relieved',
        },
      ],
    }
    await legacy.transaction('rw', legacy.tables, async () => {
      for (const [store, rows] of Object.entries(data)) await legacy.table(store).bulkAdd(rows)
    })
    console.info('migration.v3.fixture.ready', { count: legacy.tables.length })
    const before = await Promise.all(
      legacy.tables.map(async (table) => ({ name: table.name, rows: await table.toArray() })),
    )
    legacy.close()
    const db = new LifeIndexDatabase(name)
    opened.push(db)
    // Exercise the actual startup path as well as the index upgrade; seeding must stay idempotent.
    await db.initialize(new Date(FIXED_NOW))
    expect(db.verno).toBe(4)
    expect(db.categories.schema.indexes.some(({ name }) => name === 'parentId')).toBe(true)
    for (const table of before) {
      expect(table.rows.length).toBeGreaterThan(0)
      expect(await db.table(table.name).toArray()).toEqual(table.rows)
    }
    console.info('migration.v4.preservation.passed', { count: before.length })
  })

  it('rejects third levels, missing parents and cross-type parents atomically', async () => {
    const { db, categories, child } = await setup()
    const before = await db.categories.count()
    for (const parentId of [child.id, crypto.randomUUID(), 'category-finance-income-salary-v1']) {
      await expect(
        categories.create({
          domain: 'finance',
          transactionType: 'expense',
          parentId,
          name: '无效',
          icon: 'other',
          color: 'blue',
        }),
      ).rejects.toThrow()
    }
    expect(await db.categories.count()).toBe(before)
    await expect(categories.reorder([rootId, child.id])).rejects.toThrow()
  })

  it('inherits parent archival without rewriting children and retains historical references', async () => {
    const { db, categories, child } = await setup()
    const transactions = new TransactionRepository(db)
    const command = buildTransaction({ categoryId: child.id })
    const saved = await transactions.create(command)
    await categories.archive(rootId)
    expect((await db.categories.get(child.id))?.archived).toBe(0)
    expect(await categories.list({ domain: 'finance' })).not.toContainEqual(child)
    await expect(transactions.create(command)).rejects.toThrow()
    await expect(transactions.update(saved.id, command)).resolves.toMatchObject({
      categoryId: child.id,
    })
    await categories.archive(child.id)
    await categories.setArchived(rootId, false)
    expect((await db.categories.get(child.id))?.archived).toBe(1)
  })

  it('round-trips V4, refuses disguised legacy hierarchy and rejects dangling references', async () => {
    const { db, child } = await setup()
    const backup = new BackupService(db, 'test')
    const snapshot = await backup.createSnapshot()
    expect(snapshot.formatVersion).toBe(4)
    const preview = backup.inspectText(JSON.stringify(snapshot))
    await backup.restore(preview.token)
    expect(await db.categories.get(child.id)).toEqual(child)
    expect(() => validateBackup({ ...snapshot, formatVersion: 3 })).toThrow()
    const broken = structuredClone(snapshot)
    broken.data.categories.find(({ id }) => id === child.id)!.parentId = crypto.randomUUID()
    expect(() => backup.inspectText(JSON.stringify(broken))).toThrow()
    expect(await db.categories.get(child.id)).toEqual(child)
    const rootsOnly = structuredClone(snapshot)
    rootsOnly.data.categories = rootsOnly.data.categories.filter(({ parentId }) => !parentId)
    rootsOnly.counts.categories = rootsOnly.data.categories.length
    expect(validateBackup({ ...rootsOnly, formatVersion: 3 }).data).toEqual(rootsOnly.data)
  })

  it('aggregates root and child amounts once each', async () => {
    const { db, child } = await setup()
    const result = expenseByCategory(
      [
        buildTransaction({ amountMinor: 100 }),
        buildTransaction({
          id: crypto.randomUUID(),
          categoryId: child.id,
          amountMinor: 200,
          occurredAt: FIXED_NOW,
        }),
      ],
      await db.categories.toArray(),
    )
    expect(result).toEqual([{ categoryId: rootId, name: '餐饮', amountMinor: 300 }])
  })
})
