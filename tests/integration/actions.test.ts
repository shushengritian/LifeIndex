import { afterEach, describe, expect, it, vi } from 'vitest'

import { ActionService } from '@/app/actions/ActionService'
import type { ParsedAction } from '@/app/actions/actionParser'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { buildHabit, FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const clock: Clock = { now: () => new Date(FIXED_NOW) }
const entityIds = [
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203',
]

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexActionTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  let idIndex = 0
  const ids: IdGenerator = { next: () => entityIds[idIndex++]! }
  return { database, service: new ActionService(database, clock, ids) }
}

function focusAction(actionId = '00000000-0000-4000-8000-000000000111'): ParsedAction {
  return {
    type: 'start-focus',
    actionId,
    draft: { title: '合成专注', plannedDurationSeconds: 1500 },
  }
}

describe('atomic URL action execution', () => {
  it('rejects a retired action at both service boundaries without writes', async () => {
    const { database, service } = await setup()
    // Deliberately bypass static typing to model a stale external caller.
    const retired = {
      type: 'add-transaction',
      actionId: crypto.randomUUID(),
      draft: {},
    } as unknown as ParsedAction
    await expect(service.inspect(retired)).rejects.toMatchObject({ failureClass: 'Validation' })
    await expect(service.execute(retired)).rejects.toMatchObject({ failureClass: 'Validation' })
    expect(await database.transactions.count()).toBe(0)
    expect(await database.focusSessions.count()).toBe(0)
    expect(await database.actionReceipts.count()).toBe(0)
  })

  it('writes one focus session and one receipt, then deduplicates the same action ID', async () => {
    const { database, service } = await setup()
    const action = focusAction()

    expect(await service.inspect(action)).toMatchObject({
      status: 'ready',
      referenceLabel: '未分类',
    })
    expect(await database.focusSessions.count()).toBe(0)
    await expect(service.execute(action)).resolves.toEqual({
      status: 'created',
      destination: '/focus',
    })
    await expect(service.execute(action)).resolves.toEqual({
      status: 'handled',
      destination: '/focus',
    })
    expect(await database.focusSessions.count()).toBe(1)
    expect(await database.actionReceipts.count()).toBe(1)
  })

  it('checks in a scheduled habit and treats an existing daily record as a safe no-op', async () => {
    const { database, service } = await setup()
    const habit = buildHabit()
    await database.habits.add(habit)
    const first: ParsedAction = {
      type: 'check-habit',
      actionId: '00000000-0000-4000-8000-000000000112',
      habitId: habit.id,
      localDate: '2026-09-03',
    }
    const second: ParsedAction = {
      ...first,
      actionId: '00000000-0000-4000-8000-000000000113',
    }

    await service.execute(first)
    expect(await service.inspect(second)).toMatchObject({
      status: 'ready',
      alreadySatisfied: true,
    })
    await service.execute(second)
    expect(await database.habitRecords.count()).toBe(1)
    expect(await database.actionReceipts.count()).toBe(2)
  })

  it('starts one focus session and rejects a second active session without a receipt', async () => {
    const { database, service } = await setup()
    const first: ParsedAction = {
      type: 'start-focus',
      actionId: '00000000-0000-4000-8000-000000000114',
      draft: {
        title: '合成深度工作',
        plannedDurationSeconds: 1500,
        categoryId: 'category-focus-work-v1',
      },
    }
    const second: ParsedAction = {
      ...first,
      actionId: '00000000-0000-4000-8000-000000000115',
    }

    await service.execute(first)
    await expect(service.execute(second)).rejects.toMatchObject({ failureClass: 'Validation' })
    expect(await database.focusSessions.count()).toBe(1)
    expect(await database.actionReceipts.count()).toBe(1)
  })

  it('rejects stale references and action IDs reused for a different type', async () => {
    const { service } = await setup()
    await expect(
      service.inspect({
        type: 'check-habit',
        actionId: '00000000-0000-4000-8000-000000000116',
        habitId: '00000000-0000-4000-8000-000000000299',
        localDate: '2026-09-03',
      }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })

    const reused = '00000000-0000-4000-8000-000000000117'
    await service.execute(focusAction(reused))
    await expect(
      service.inspect({
        type: 'check-habit',
        actionId: reused,
        habitId: '00000000-0000-4000-8000-000000000299',
        localDate: '2026-09-03',
      }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })

  it('rolls back the business entity if receipt persistence fails', async () => {
    const { database, service } = await setup()
    vi.spyOn(database.actionReceipts, 'add').mockRejectedValueOnce(
      new Error('SyntheticReceiptFailure'),
    )

    await expect(service.execute(focusAction())).rejects.toMatchObject({
      failureClass: 'DatabaseWrite',
    })
    expect(await database.focusSessions.count()).toBe(0)
    expect(await database.actionReceipts.count()).toBe(0)
  })
})
