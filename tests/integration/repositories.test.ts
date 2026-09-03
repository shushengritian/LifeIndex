import { afterEach, describe, expect, it } from 'vitest'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import type { Setting } from '@/shared/domain/types'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const clock: Clock = { now: () => new Date(FIXED_NOW) }
const ids: IdGenerator = { next: () => '00000000-0000-4000-8000-000000000020' }

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup() {
  const database = new LifeIndexDatabase(`LifeIndexRepositoryTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  return {
    database,
    categories: new CategoryRepository(database, clock, ids),
    settings: new SettingsRepository(database),
  }
}

describe('foundational repositories', () => {
  it('creates, lists, and idempotently archives a validated category', async () => {
    const { categories } = await setup()
    const created = await categories.create({
      domain: 'focus',
      name: '合成深度工作',
      icon: 'work',
      color: 'blue',
    })

    expect((await categories.list({ domain: 'focus' })).at(-1)).toEqual(created)
    const archived = await categories.archive(created.id)
    expect(archived.archived).toBe(1)
    expect(await categories.archive(created.id)).toEqual(archived)
    expect(await categories.list({ domain: 'focus' })).not.toContainEqual(archived)
    expect(await categories.list({ domain: 'focus', includeArchived: true })).toContainEqual(
      archived,
    )
  })

  it('rejects a category whose domain and transaction type disagree', async () => {
    const { categories } = await setup()

    await expect(
      categories.create({
        domain: 'focus',
        transactionType: 'expense',
        name: '合成无效分类',
        icon: 'work',
        color: 'sage',
      }),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })

  it('round-trips typed settings and rejects invalid persisted values', async () => {
    const { settings } = await setup()
    const appearance: Setting = {
      key: 'appearance',
      value: 'dark',
      updatedAt: FIXED_NOW,
    }
    await settings.put(appearance)
    expect(await settings.get('appearance')).toEqual(appearance)

    await expect(
      settings.put({
        key: 'currency',
        value: { code: 'USD' },
        updatedAt: FIXED_NOW,
      } as unknown as Setting),
    ).rejects.toMatchObject({ failureClass: 'Validation' })
  })
})
