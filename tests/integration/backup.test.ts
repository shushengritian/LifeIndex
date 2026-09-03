import { afterEach, describe, expect, it } from 'vitest'

import { BackupService, MAX_BACKUP_BYTES } from '@/data/backup/BackupService'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import type { LifeIndexBackupV1 } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import {
  buildFocusSession,
  buildHabit,
  buildHabitRecord,
  buildTransaction,
  FIXED_NOW,
} from '../fixtures/builders'

const openedDatabases: LifeIndexDatabase[] = []
const fixedClock: Clock = { now: () => new Date(FIXED_NOW) }
let nextId = 10
const idGenerator: IdGenerator = {
  next: () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
}

function createDatabase(): LifeIndexDatabase {
  const database = new LifeIndexDatabase(`LifeIndexBackupTest-${crypto.randomUUID()}`)
  openedDatabases.push(database)
  return database
}

function createService(database: LifeIndexDatabase): BackupService {
  return new BackupService(database, '0.1.0', fixedClock, idGenerator)
}

async function initializeWithSyntheticData(database: LifeIndexDatabase): Promise<void> {
  await database.initialize(new Date(FIXED_NOW))
  await database.transaction(
    'rw',
    database.transactions,
    database.habits,
    database.habitRecords,
    async () => {
      await database.transactions.add(buildTransaction())
      await database.habits.add(buildHabit())
      await database.habitRecords.add(buildHabitRecord())
    },
  )
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('versioned backup and restore', () => {
  it('round-trips every canonical store through preview-first replacement', async () => {
    const source = createDatabase()
    const target = createDatabase()
    await initializeWithSyntheticData(source)
    await target.initialize(new Date(FIXED_NOW))

    const sourceService = createService(source)
    const targetService = createService(target)
    const sourceBackup = await sourceService.createSnapshot('zh-CN')
    const preview = targetService.inspectText(sourceService.serialize(sourceBackup))
    expect(preview.counts.transactions).toBe(1)
    expect(preview.counts.habitRecords).toBe(1)

    await targetService.restore(preview.token)
    const restoredBackup = await targetService.createSnapshot('zh-CN')
    expect(restoredBackup.data).toEqual(sourceBackup.data)
    expect(restoredBackup.counts).toEqual(sourceBackup.counts)
  })

  it('rejects malformed, oversized, mismatched, and dangling input before any write', async () => {
    const database = createDatabase()
    await initializeWithSyntheticData(database)
    const service = createService(database)
    const before = await service.createSnapshot('zh-CN')

    expect(() => service.inspectText('{')).toThrow(AppError)
    expect(() => service.inspectText('{}', MAX_BACKUP_BYTES + 1)).toThrow(AppError)

    const mismatched = structuredClone(before)
    mismatched.counts.transactions += 1
    expect(() => service.inspectText(JSON.stringify(mismatched))).toThrow(AppError)

    const dangling = structuredClone(before)
    dangling.data.transactions[0]!.categoryId = 'category-finance-expense-missing-v1'
    expect(() => service.inspectText(JSON.stringify(dangling))).toThrow(AppError)

    expect((await service.createSnapshot('zh-CN')).data).toEqual(before.data)
  })

  it.each([
    [
      'a future format version',
      (backup: LifeIndexBackupV1) => {
        ;(backup as unknown as { formatVersion: number }).formatVersion = 2
      },
    ],
    [
      'a duplicate primary key',
      (backup: LifeIndexBackupV1) => {
        // Counts stay internally consistent so this case reaches the uniqueness invariant.
        backup.data.transactions.push(structuredClone(backup.data.transactions[0]!))
        backup.counts.transactions += 1
      },
    ],
    [
      'a duplicate habit and date pair',
      (backup: LifeIndexBackupV1) => {
        backup.data.habitRecords.push(
          buildHabitRecord({ id: '00000000-0000-4000-8000-000000000103' }),
        )
        backup.counts.habitRecords += 1
      },
    ],
    [
      'a dangling action receipt',
      (backup: LifeIndexBackupV1) => {
        backup.data.actionReceipts.push({
          actionId: '00000000-0000-4000-8000-000000000104',
          actionType: 'add-transaction',
          handledAt: FIXED_NOW,
          outcomeEntityId: '00000000-0000-4000-8000-000000000105',
        })
        backup.counts.actionReceipts += 1
      },
    ],
    [
      'more than one active focus session',
      (backup: LifeIndexBackupV1) => {
        const first = buildFocusSession({ id: '00000000-0000-4000-8000-000000000106' })
        const second = buildFocusSession({ id: '00000000-0000-4000-8000-000000000107' })
        // Removing completion fields creates two individually valid active records.
        for (const session of [first, second]) {
          session.status = 'active'
          delete session.endedAt
          delete session.durationSeconds
          delete session.completionKind
        }
        backup.data.focusSessions.push(first, second)
        backup.counts.focusSessions += 2
      },
    ],
  ])('rejects %s without changing current data', async (_label, corrupt) => {
    const database = createDatabase()
    await initializeWithSyntheticData(database)
    const service = createService(database)
    const before = await service.createSnapshot('zh-CN')
    const input = structuredClone(before)
    corrupt(input)

    expect(() => service.inspectText(JSON.stringify(input))).toThrow(AppError)
    expect((await service.createSnapshot('zh-CN')).data).toEqual(before.data)
  })

  it('rolls back all cleared stores when an insertion fails', async () => {
    const source = createDatabase()
    const target = createDatabase()
    await initializeWithSyntheticData(source)
    await target.initialize(new Date(FIXED_NOW))
    const sourceService = createService(source)
    const targetService = createService(target)
    const before = await targetService.createSnapshot('zh-CN')
    const preview = targetService.inspectText(
      sourceService.serialize(await sourceService.createSnapshot('zh-CN')),
    )

    const failCreation = () => {
      throw new Error('synthetic insertion failure')
    }
    target.transactions.hook('creating', failCreation)
    await expect(targetService.restore(preview.token)).rejects.toMatchObject({
      failureClass: 'RestoreWrite',
    })
    target.transactions.hook('creating').unsubscribe(failCreation)

    expect((await targetService.createSnapshot('zh-CN')).data).toEqual(before.data)
  })

  it('migrates the supported V0 shape in memory by adding empty action receipts', async () => {
    const database = createDatabase()
    await database.initialize(new Date(FIXED_NOW))
    const service = createService(database)
    const current = await service.createSnapshot('zh-CN')
    const legacyCounts = {
      categories: current.counts.categories,
      transactions: current.counts.transactions,
      habits: current.counts.habits,
      habitRecords: current.counts.habitRecords,
      focusSessions: current.counts.focusSessions,
      settings: current.counts.settings,
    }
    const legacyData = {
      categories: current.data.categories,
      transactions: current.data.transactions,
      habits: current.data.habits,
      habitRecords: current.data.habitRecords,
      focusSessions: current.data.focusSessions,
      settings: current.data.settings,
    }
    const legacy = {
      ...current,
      formatVersion: 0,
      counts: legacyCounts,
      data: legacyData,
    }

    const preview = service.inspectText(JSON.stringify(legacy))
    expect(preview.formatVersion).toBe(1)
    expect(preview.counts.actionReceipts).toBe(0)
  })

  it('requires a live, one-time preview token before replacement', async () => {
    const database = createDatabase()
    await database.initialize(new Date(FIXED_NOW))
    const service = createService(database)
    const backup = await service.createSnapshot('zh-CN')
    const cancelled = service.inspectText(service.serialize(backup))
    service.cancel(cancelled.token)
    await expect(service.restore(cancelled.token)).rejects.toMatchObject({
      failureClass: 'RestoreToken',
    })

    const accepted = service.inspectText(service.serialize(backup))
    await service.restore(accepted.token)
    await expect(service.restore(accepted.token)).rejects.toMatchObject({
      failureClass: 'RestoreToken',
    })
  })

  it('round-trips a representative 500-record dataset without changing order or totals', async () => {
    const source = createDatabase()
    const target = createDatabase()
    await source.initialize(new Date(FIXED_NOW))
    await target.initialize(new Date(FIXED_NOW))
    const records = Array.from({ length: 500 }, (_, index) =>
      buildTransaction({
        id: `00000000-0000-4000-8000-${String(index + 1000).padStart(12, '0')}`,
        amountMinor: index + 1,
        occurredAt: new Date(new Date(FIXED_NOW).getTime() + index * 1000).toISOString(),
        note: `合成批量记录 ${index + 1}`,
      }),
    )
    await source.transactions.bulkAdd(records)

    const sourceService = createService(source)
    const targetService = createService(target)
    const snapshot = await sourceService.createSnapshot('zh-CN')
    expect(snapshot.counts.transactions).toBe(500)
    const preview = targetService.inspectText(sourceService.serialize(snapshot))
    await targetService.restore(preview.token)

    const restored = await target.transactions.orderBy('id').toArray()
    expect(restored).toHaveLength(500)
    expect(restored[0]?.id).toBe(records[0]?.id)
    expect(restored.at(-1)?.id).toBe(records.at(-1)?.id)
    expect(restored.reduce((sum, record) => sum + record.amountMinor, 0)).toBe(125_250)
  })
})
