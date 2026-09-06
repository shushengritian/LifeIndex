import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { createSeedCategories, createSeedSettings } from '@/data/db/seeds'
import { databaseSchemaV1, databaseStoreNames } from '@/data/db/schema'
import {
  buildFocusSession,
  buildHabit,
  buildHabitRecord,
  buildTransaction,
  FIXED_NOW,
} from '../fixtures/builders'

const openedDatabases: LifeIndexDatabase[] = []

function createDatabase(): LifeIndexDatabase {
  const database = new LifeIndexDatabase(`LifeIndexTest-${crypto.randomUUID()}`)
  openedDatabases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('LifeIndex database v2', () => {
  it('creates the nine stores and inserts stable defaults once', async () => {
    const database = createDatabase()
    await database.initialize(new Date(FIXED_NOW))

    expect(database.tables.map(({ name }) => name).sort()).toEqual([...databaseStoreNames].sort())
    expect(await database.categories.count()).toBe(21)
    expect(await database.settings.count()).toBe(3)

    const original = await database.categories.get('category-finance-expense-food-v1')
    await database.initialize(new Date('2027-01-01T00:00:00.000Z'))
    expect(await database.categories.count()).toBe(21)
    expect(await database.settings.count()).toBe(3)
    expect(await database.categories.get('category-finance-expense-food-v1')).toEqual(original)
  })

  it('enforces one habit completion for each habit and local date', async () => {
    const database = createDatabase()
    await database.initialize(new Date(FIXED_NOW))
    await database.habits.add(buildHabit())
    await database.habitRecords.add(buildHabitRecord())

    await expect(
      database.habitRecords.add(buildHabitRecord({ id: '00000000-0000-4000-8000-000000000004' })),
    ).rejects.toBeDefined()
    expect(await database.habitRecords.count()).toBe(1)
  })

  it('upgrades a populated V1 database without changing any shipped record', async () => {
    const name = `LifeIndexMigrationTest-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores(databaseSchemaV1)
    await legacy.open()
    const timestamp = FIXED_NOW
    const categories = createSeedCategories(timestamp).filter(({ domain }) => domain !== 'activity')
    const settings = createSeedSettings(timestamp)
    const transaction = buildTransaction()
    const habit = buildHabit()
    const habitRecord = buildHabitRecord()
    const focusSession = buildFocusSession()
    const receipt = {
      actionId: '00000000-0000-4000-8000-000000000090',
      actionType: 'add-transaction',
      handledAt: timestamp,
      outcomeEntityId: transaction.id,
    }
    await legacy.transaction('rw', legacy.tables, async () => {
      await legacy.table('categories').bulkAdd(categories)
      await legacy.table('settings').bulkAdd(settings)
      await legacy.table('transactions').add(transaction)
      await legacy.table('habits').add(habit)
      await legacy.table('habitRecords').add(habitRecord)
      await legacy.table('focusSessions').add(focusSession)
      await legacy.table('actionReceipts').add(receipt)
    })
    legacy.close()

    const database = new LifeIndexDatabase(name)
    openedDatabases.push(database)
    await database.initialize(new Date(FIXED_NOW))

    // V2 adds stores and public Activity seeds; every V1 row remains logically identical.
    expect(database.verno).toBe(2)
    expect(await database.transactions.get(transaction.id)).toEqual(transaction)
    expect(await database.habits.get(habit.id)).toEqual(habit)
    expect(await database.habitRecords.get(habitRecord.id)).toEqual(habitRecord)
    expect(await database.focusSessions.get(focusSession.id)).toEqual(focusSession)
    expect(await database.actionReceipts.get(receipt.actionId)).toEqual(receipt)
    expect(
      (await database.categories.toArray())
        .filter(({ domain }) => domain !== 'activity')
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual([...categories].sort((left, right) => left.id.localeCompare(right.id)))
    expect(await database.settings.toArray()).toEqual(settings)
    expect(await database.categories.where('domain').equals('activity').count()).toBe(6)
    expect(await database.weightEntries.count()).toBe(0)
    expect(await database.activitySessions.count()).toBe(0)
  })
})
