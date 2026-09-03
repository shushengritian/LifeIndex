import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import {
  TransactionRepository,
  type SaveTransactionCommand,
} from '@/data/repositories/TransactionRepository'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const clock: Clock = { now: () => new Date(FIXED_NOW) }
let idCounter = 30
const ids: IdGenerator = {
  next: () => `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
}

const expenseCommand: SaveTransactionCommand = {
  type: 'expense',
  amountMinor: 1_230,
  categoryId: 'category-finance-expense-food-v1',
  occurredAt: FIXED_NOW,
  localDate: '2026-09-03',
  timezoneOffsetMinutes: -480,
  note: '合成测试交易',
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexTransactionTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  return { database, repository: new TransactionRepository(database, clock, ids) }
}

describe('TransactionRepository', () => {
  it('creates, updates, orders, and deletes records while preserving identity', async () => {
    const { repository } = await setup()
    const first = await repository.create(expenseCommand)
    const second = await repository.create({
      ...expenseCommand,
      occurredAt: '2026-09-03T13:00:00.000Z',
    })
    expect((await repository.list({ from: '2026-09-03', to: '2026-09-03' }))[0]?.id).toBe(second.id)

    const updated = await repository.update(first.id, {
      ...expenseCommand,
      type: 'income',
      amountMinor: 9_999,
      categoryId: 'category-finance-income-salary-v1',
    })
    expect(updated).toMatchObject({ id: first.id, createdAt: first.createdAt, amountMinor: 9_999 })

    await repository.remove(first.id)
    expect(await repository.get(first.id)).toBeUndefined()
  })

  it('rejects a category that does not match the transaction type', async () => {
    const { repository } = await setup()
    await expect(
      repository.create({
        ...expenseCommand,
        categoryId: 'category-finance-income-salary-v1',
      }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })

  it('removes an action receipt atomically with its outcome transaction', async () => {
    const { database, repository } = await setup()
    const transaction = await repository.create(expenseCommand)
    await database.actionReceipts.add({
      actionId: '00000000-0000-4000-8000-000000000099',
      actionType: 'add-transaction',
      handledAt: FIXED_NOW,
      outcomeEntityId: transaction.id,
    })

    await repository.remove(transaction.id)
    expect(await database.actionReceipts.count()).toBe(0)
  })
})
