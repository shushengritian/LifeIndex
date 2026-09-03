import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HabitRepository, type SaveHabitCommand } from '@/data/repositories/HabitRepository'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const clock: Clock = { now: () => new Date(FIXED_NOW) }
let idCounter = 50
const ids: IdGenerator = {
  next: () => `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
}
const habitCommand: SaveHabitCommand = {
  name: '合成测试习惯',
  icon: 'check',
  color: 'sage',
  schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
  startLocalDate: '2026-09-01',
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexHabitTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  return { database, repository: new HabitRepository(database, clock, ids) }
}

describe('HabitRepository', () => {
  it('creates, updates, and filters scheduled habits', async () => {
    const { repository } = await setup()
    const habit = await repository.create(habitCommand)
    expect(await repository.listScheduled('2026-09-02')).toContainEqual(habit)
    expect(await repository.listScheduled('2026-09-06')).toEqual([])

    const updated = await repository.update(habit.id, {
      ...habitCommand,
      name: '合成修改习惯',
      schedule: { type: 'daily' },
    })
    expect(updated).toMatchObject({ id: habit.id, name: '合成修改习惯' })
    expect(await repository.listScheduled('2026-09-06')).toContainEqual(updated)
  })

  it('makes repeated check-in and undo transitions idempotent', async () => {
    const { database, repository } = await setup()
    const habit = await repository.create(habitCommand)
    const command = {
      habitId: habit.id,
      localDate: '2026-09-03',
      completedAt: FIXED_NOW,
      timezoneOffsetMinutes: -480,
    }
    const first = await repository.checkIn(command)
    expect(await repository.checkIn(command)).toEqual(first)
    expect(await database.habitRecords.count()).toBe(1)

    await repository.undoCheckIn(habit.id, command.localDate)
    await repository.undoCheckIn(habit.id, command.localDate)
    expect(await database.habitRecords.count()).toBe(0)
  })

  it('pauses future presentation while retaining historical records', async () => {
    const { database, repository } = await setup()
    const habit = await repository.create(habitCommand)
    await repository.checkIn({
      habitId: habit.id,
      localDate: '2026-09-02',
      completedAt: FIXED_NOW,
      timezoneOffsetMinutes: -480,
    })
    const paused = await repository.setStatus(habit.id, 'paused')

    expect(paused.status).toBe('paused')
    expect(await repository.listScheduled('2026-09-03')).toEqual([])
    expect(await database.habitRecords.count()).toBe(1)
    expect((await repository.setStatus(habit.id, 'active')).pausedAt).toBeUndefined()
  })
})
