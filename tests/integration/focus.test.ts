import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository, type StartFocusCommand } from '@/data/repositories/FocusRepository'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
let currentTime = FIXED_NOW
let idCounter = 70
const clock: Clock = { now: () => new Date(currentTime) }
const ids: IdGenerator = {
  next: () => `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
}
const command: StartFocusCommand = {
  title: '合成深度工作',
  plannedDurationSeconds: 1_500,
  categoryId: 'category-focus-work-v1',
}

beforeEach(() => {
  currentTime = FIXED_NOW
})

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexFocusTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  return { database, repository: new FocusRepository(database, clock, ids) }
}

describe('FocusRepository state machine', () => {
  it('persists one active session and naturally completes at the planned endpoint', async () => {
    const { database, repository } = await setup()
    const started = await repository.start(command)
    expect(started.expectedEndAt).toBe('2026-09-03T12:25:00.000Z')
    expect(await repository.start({ ...command, title: '不会新建' })).toEqual(started)
    expect(await database.focusSessions.where('status').equals('active').count()).toBe(1)

    expect(await repository.reconcileActive('2026-09-03T12:24:59.000Z')).toEqual(started)
    const completed = await repository.reconcileActive('2026-09-03T12:30:00.000Z')
    expect(completed).toMatchObject({
      status: 'completed',
      endedAt: started.expectedEndAt,
      durationSeconds: 1_500,
      completionKind: 'timer',
    })
    expect(await repository.getActive()).toBeUndefined()
  })

  it('finishes early once and preserves measured fields during description edits', async () => {
    const { repository } = await setup()
    const started = await repository.start(command)
    const completed = await repository.finishEarly(started.id, '2026-09-03T12:10:00.000Z')
    expect(completed).toMatchObject({
      status: 'completed',
      durationSeconds: 600,
      completionKind: 'early',
    })
    expect(await repository.finishEarly(started.id, '2026-09-03T12:11:00.000Z')).toBeUndefined()

    const edited = await repository.updateDetails(started.id, {
      title: '合成修改标题',
      categoryId: 'category-focus-study-v1',
    })
    expect(edited).toMatchObject({
      title: '合成修改标题',
      durationSeconds: 600,
      startedAt: started.startedAt,
    })
  })

  it('cancels active and sub-second sessions without history', async () => {
    const { database, repository } = await setup()
    const first = await repository.start(command)
    await repository.cancel(first.id)
    expect(await database.focusSessions.count()).toBe(0)

    const second = await repository.start(command)
    await database.actionReceipts.add({
      actionId: '00000000-0000-4000-8000-000000000079',
      actionType: 'start-focus',
      handledAt: FIXED_NOW,
      outcomeEntityId: second.id,
    })
    expect(await repository.finishEarly(second.id, '2026-09-03T12:00:00.500Z')).toBeUndefined()
    expect(await database.focusSessions.count()).toBe(0)
    expect(await database.actionReceipts.count()).toBe(0)
  })

  it('rejects a Finance category and deletes completed history explicitly', async () => {
    const { database, repository } = await setup()
    await expect(
      repository.start({ ...command, categoryId: 'category-finance-expense-food-v1' }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })

    const started = await repository.start(command)
    await repository.finishEarly(started.id, '2026-09-03T12:01:00.000Z')
    await repository.removeCompleted(started.id)
    expect(await database.focusSessions.count()).toBe(0)
  })
})
