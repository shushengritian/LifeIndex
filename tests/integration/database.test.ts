import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { databaseStoreNames } from '@/data/db/schema'
import { buildHabit, buildHabitRecord, FIXED_NOW } from '../fixtures/builders'

const openedDatabases: LifeIndexDatabase[] = []

function createDatabase(): LifeIndexDatabase {
  const database = new LifeIndexDatabase(`LifeIndexTest-${crypto.randomUUID()}`)
  openedDatabases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('LifeIndex database v1', () => {
  it('creates the seven stores and inserts stable defaults once', async () => {
    const database = createDatabase()
    await database.initialize(new Date(FIXED_NOW))

    expect(database.tables.map(({ name }) => name).sort()).toEqual([...databaseStoreNames].sort())
    expect(await database.categories.count()).toBe(15)
    expect(await database.settings.count()).toBe(3)

    const original = await database.categories.get('category-finance-expense-food-v1')
    await database.initialize(new Date('2027-01-01T00:00:00.000Z'))
    expect(await database.categories.count()).toBe(15)
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
})
