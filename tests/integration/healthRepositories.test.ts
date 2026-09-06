import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { ActivityRepository } from '@/data/repositories/ActivityRepository'
import { WeightRepository } from '@/data/repositories/WeightRepository'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { buildActivitySession, buildWeightEntry, FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const clock: Clock = { now: () => new Date(FIXED_NOW) }
let nextId = 200
const ids: IdGenerator = {
  next: () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexHealthTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  return {
    database,
    weights: new WeightRepository(database, clock, ids),
    activities: new ActivityRepository(database, clock, ids),
  }
}

describe('Health repositories', () => {
  it('creates, updates, orders, and deletes bounded weight entries', async () => {
    const { weights } = await setup()
    const first = await weights.create({
      weightGrams: 68_400,
      measuredAt: '2026-09-02T12:00:00.000Z',
      localDate: '2026-09-02',
      timezoneOffsetMinutes: -480,
    })
    const second = await weights.create({
      weightGrams: 68_100,
      measuredAt: FIXED_NOW,
      localDate: '2026-09-03',
      timezoneOffsetMinutes: -480,
      note: '合成说明',
    })

    expect(await weights.latest()).toEqual(second)
    expect(await weights.list({ from: '2026-09-01', to: '2026-09-30' })).toEqual([second, first])
    const updated = await weights.update(second.id, { ...second, weightGrams: 68_000 })
    expect(updated.weightGrams).toBe(68_000)
    await weights.remove(first.id)
    expect(await weights.get(first.id)).toBeUndefined()
  })

  it.each([19_999, 500_001, 68_400.5])('rejects invalid weight %s', async (weightGrams) => {
    const { weights } = await setup()
    const candidate = buildWeightEntry({ weightGrams })
    await expect(
      weights.create({
        weightGrams: candidate.weightGrams,
        measuredAt: candidate.measuredAt,
        localDate: candidate.localDate,
        timezoneOffsetMinutes: candidate.timezoneOffsetMinutes,
      }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })

  it('validates Activity references and preserves an archived historical type on edit', async () => {
    const { database, activities } = await setup()
    const candidate = buildActivitySession()
    const created = await activities.create({
      categoryId: candidate.categoryId,
      durationMinutes: candidate.durationMinutes,
      intensity: candidate.intensity,
      occurredAt: candidate.occurredAt,
      localDate: candidate.localDate,
      timezoneOffsetMinutes: candidate.timezoneOffsetMinutes,
    })
    await database.categories.update(created.categoryId, { archived: 1 })

    const updated = await activities.update(created.id, {
      ...created,
      durationMinutes: 40,
    })
    expect(updated.durationMinutes).toBe(40)
    await expect(
      activities.create({ ...candidate, categoryId: created.categoryId }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
    await expect(
      activities.create({ ...candidate, categoryId: 'category-focus-study-v1' }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })

  it.each([
    { durationMinutes: 0, intensity: 'light' as const },
    { durationMinutes: 1_441, intensity: 'hard' as const },
    { durationMinutes: 30.5, intensity: 'moderate' as const },
  ])('rejects invalid Activity bounds %#', async ({ durationMinutes, intensity }) => {
    const { activities } = await setup()
    const candidate = buildActivitySession({ durationMinutes, intensity })
    await expect(activities.create(candidate)).rejects.toMatchObject({ failureClass: 'Validation' })
  })
})
