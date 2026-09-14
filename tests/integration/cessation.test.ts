import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { databaseSchemaV2 } from '@/data/db/schema'
import { CessationRepository } from '@/data/repositories/CessationRepository'
import { BackupService } from '@/data/backup/BackupService'
import { calculateCounts, validateBackup } from '@/data/backup/schema'
import {
  cessationSummary,
  dayStart,
  fullDayEligible,
  cessationDayStatus,
} from '@/shared/domain/cessation'
import { buildWeightEntry, buildActivitySession } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const now = new Date('2026-09-14T12:00:00Z')
const clock = { now: () => now }
async function fixture() {
  const db = new LifeIndexDatabase(`CessationTest-${crypto.randomUUID()}`)
  databases.push(db)
  await db.initialize()
  const repo = new CessationRepository(db, clock),
    id = crypto.randomUUID()
  await repo.start(id, {
    startAt: '2026-09-02T06:00:00Z',
    timeZone: 'Asia/Shanghai',
    baseline: { dailyCount: 10, packCount: 20, packPriceMinor: 3000, currency: 'CNY' },
  })
  return { db, repo, id, backup: new BackupService(db, '2.1.0', clock) }
}
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})

describe('cessation storage and evidence', () => {
  it('counts coverage without inferring triggers and rejects future audit metadata', async () => {
    const { repo, id, backup } = await fixture()
    await repo.saveEvent(crypto.randomUUID(), id, {
      kind: 'craving',
      outcome: 'still',
      occurredAt: now.toISOString(),
      trigger: 'stress',
    })
    const data = await repo.read()
    const summary = cessationSummary(data.plans[0]!, data.days, data.events, now)
    expect(summary.recordableDays).toBe(13)
    expect(summary.coveredDays).toBe(1)
    expect(summary.triggers.get('stress')).toBe(1)
    const snapshot = await backup.createSnapshot('zh-CN')
    snapshot.data.cessationEvents[0]!.updatedAt = '2027-01-01T00:00:00Z'
    expect(() => validateBackup(snapshot)).toThrow()
  })
  it('keeps one active plan and idempotent creation, rejecting overlapping history', async () => {
    const { db, repo, id } = await fixture()
    await repo.start(id, { startAt: '2026-09-02T06:00:00Z', timeZone: 'Asia/Shanghai' })
    await expect(
      repo.start(crypto.randomUUID(), { startAt: now.toISOString(), timeZone: 'Asia/Shanghai' }),
    ).rejects.toBeDefined()
    expect(await db.cessationPlans.count()).toBe(1)
    await repo.end(id)
    await expect(
      repo.start(crypto.randomUUID(), {
        startAt: '2026-09-13T12:00:00Z',
        timeZone: 'Asia/Shanghai',
      }),
    ).rejects.toBeDefined()
    await repo.start(crypto.randomUUID(), { startAt: now.toISOString(), timeZone: 'Asia/Shanghai' })
    expect(await db.cessationPlans.count()).toBe(2)
  })
  it('cancels a future plan without rewriting its original scheduled time', async () => {
    const { db, repo, id } = await fixture()
    await repo.end(id)
    const future = crypto.randomUUID()
    await repo.start(future, { startAt: '2026-09-20T00:00:00Z', timeZone: 'UTC' })
    await repo.end(future)
    const plan = await db.cessationPlans.get(future)
    expect(plan?.endAt).toBe(plan?.startAt)
  })
  it('does not count today, partial first days or unknown dates as full smoke-free days', async () => {
    const { db, repo, id } = await fixture()
    await repo.confirmDay(id, '2026-09-14', 'snapshot')
    await expect(repo.confirmDay(id, '2026-09-14', 'fullDay')).rejects.toBeDefined()
    await expect(repo.confirmDay(id, '2026-09-02', 'fullDay')).rejects.toBeDefined()
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    const data = await repo.read(),
      plan = data.plans[0]!
    expect(cessationSummary(plan, data.days, data.events, now)).toMatchObject({
      fullDays: 1,
      savedMinor: 1500,
    })
    expect(cessationDayStatus('2026-09-14', data.days, [], '2026-09-15')).toBe('待确认')
    expect(await db.cessationDays.count()).toBe(2)
  })
  it('atomically invalidates same-day confirmation and never recreates it on delete', async () => {
    const { db, repo, id } = await fixture()
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    const event = crypto.randomUUID()
    await repo.saveEvent(event, id, {
      kind: 'smoking',
      count: 1,
      occurredAt: '2026-09-13T09:00:00Z',
    })
    await repo.saveEvent(event, id, {
      kind: 'smoking',
      count: 1,
      occurredAt: '2026-09-13T09:00:00Z',
    })
    expect(await db.cessationDays.count()).toBe(0)
    expect(await db.cessationEvents.count()).toBe(1)
    await expect(repo.confirmDay(id, '2026-09-13', 'fullDay')).rejects.toBeDefined()
    await repo.removeEvent(event)
    expect(await db.cessationDays.count()).toBe(0)
  })
  it('rolls back confirmation removal when event insertion fails', async () => {
    const { db, repo, id } = await fixture()
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    const fail = () => {
      throw new Error('Synthetic write failure')
    }
    db.cessationEvents.hook('creating', fail)
    await expect(
      repo.saveEvent(crypto.randomUUID(), id, {
        kind: 'smoking',
        count: 1,
        occurredAt: '2026-09-13T09:00:00Z',
      }),
    ).rejects.toBeDefined()
    db.cessationEvents.hook('creating').unsubscribe(fail)
    expect(await db.cessationDays.count()).toBe(1)
  })
  it('moves smoking between dates, clears the destination only, and preserves non-smoking domains', async () => {
    const { db, repo, id } = await fixture()
    const event = crypto.randomUUID()
    await repo.saveEvent(event, id, {
      kind: 'smoking',
      count: 2,
      occurredAt: '2026-09-12T09:00:00Z',
    })
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    await repo.saveEvent(
      event,
      id,
      { kind: 'smoking', count: 1, occurredAt: '2026-09-13T09:00:00Z' },
      true,
    )
    await repo.saveEvent(crypto.randomUUID(), id, {
      kind: 'craving',
      outcome: 'still',
      occurredAt: now.toISOString(),
      trigger: 'stress',
    })
    expect(await db.cessationDays.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.focusSessions.count()).toBe(0)
    expect(await db.habitRecords.count()).toBe(0)
  })
  it('rejects invalid counts, future events, and events outside a historical plan', async () => {
    const { repo, id } = await fixture()
    for (const input of [
      { kind: 'smoking' as const, count: 0, occurredAt: now.toISOString() },
      { kind: 'smoking' as const, count: 1, occurredAt: '2026-09-15T12:00:00Z' },
      { kind: 'smoking' as const, count: 1, occurredAt: '2026-09-01T12:00:00Z' },
    ])
      await expect(repo.saveEvent(crypto.randomUUID(), id, input)).rejects.toBeDefined()
  })
  it('round-trips V3 and refuses contradictions before changing any data', async () => {
    const { db, repo, id, backup } = await fixture()
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    await repo.saveEvent(crypto.randomUUID(), id, {
      kind: 'craving',
      outcome: 'relieved',
      occurredAt: now.toISOString(),
    })
    const source = await backup.createSnapshot('zh-CN'),
      preview = backup.inspectText(backup.serialize(source))
    await repo.undoDay(id, '2026-09-13')
    await backup.restore(preview.token)
    expect((await backup.createSnapshot('zh-CN')).data).toEqual(source.data)
    const corrupt = structuredClone(source)
    corrupt.data.cessationEvents[0]!.planId = crypto.randomUUID()
    expect(() => backup.inspectText(JSON.stringify(corrupt))).toThrow()
    expect(await db.cessationDays.count()).toBe(1)
    const duplicate = structuredClone(source)
    duplicate.data.cessationPlans.push({
      ...duplicate.data.cessationPlans[0]!,
      id: crypto.randomUUID(),
    })
    duplicate.counts = calculateCounts(duplicate.data)
    expect(() => validateBackup(duplicate)).toThrow()
  })
  it('migrates real V2 backups with empty cessation stores and rejects future settings in V2', async () => {
    const { backup } = await fixture()
    const source = await backup.createSnapshot('zh-CN')
    const data = Object.fromEntries(
      Object.entries(source.data).filter(([key]) => !key.startsWith('cessation')),
    )
    const legacy = {
      ...source,
      formatVersion: 2,
      data,
      counts: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])),
    }
    const preview = backup.inspectText(JSON.stringify(legacy))
    expect(preview.formatVersion).toBe(3)
    expect(preview.counts.cessationPlans).toBe(0)
    const restored = await backup.restore(preview.token)
    expect(restored.counts.cessationEvents).toBe(0)
    data.settings!.push({
      key: 'cessationHidden',
      value: true,
      updatedAt: now.toISOString(),
    } as never)
    legacy.counts.settings!++
    expect(() => backup.inspectText(JSON.stringify(legacy))).toThrow()
  })
  it('rolls back all twelve stores if restoring a new store fails', async () => {
    const { db, repo, id, backup } = await fixture()
    const source = await backup.createSnapshot('zh-CN')
    const preview = backup.inspectText(backup.serialize(source))
    await repo.confirmDay(id, '2026-09-13', 'fullDay')
    const before = await backup.createSnapshot('zh-CN')
    const fail = () => {
      throw new Error('Injected failure')
    }
    db.cessationPlans.hook('creating', fail)
    await expect(backup.restore(preview.token)).rejects.toBeDefined()
    db.cessationPlans.hook('creating').unsubscribe(fail)
    expect((await backup.createSnapshot('zh-CN')).data).toEqual(before.data)
  })
  it('upgrades a populated V2 database without rewriting its nine stores', async () => {
    const name = `CessationMigration-${crypto.randomUUID()}`,
      old = new Dexie(name)
    old.version(2).stores(databaseSchemaV2)
    await old.open()
    await old.table('weightEntries').add(buildWeightEntry())
    await old.table('activitySessions').add(buildActivitySession())
    const before = await Promise.all(
      old.tables.map(async (table) => ({ name: table.name, rows: await table.toArray() })),
    )
    old.close()
    const db = new LifeIndexDatabase(name)
    databases.push(db)
    await db.open()
    expect(db.verno).toBe(3)
    for (const table of before) expect(await db.table(table.name).toArray()).toEqual(table.rows)
    expect(await db.cessationPlans.count()).toBe(0)
  })
  it('uses real DST boundaries and the fixed plan zone after device-zone changes', async () => {
    expect(
      dayStart('2026-03-09', 'America/New_York') - dayStart('2026-03-08', 'America/New_York'),
    ).toBe(23 * 3600000)
    expect(
      dayStart('2026-11-02', 'America/New_York') - dayStart('2026-11-01', 'America/New_York'),
    ).toBe(25 * 3600000)
    const { repo } = await fixture()
    const data = await repo.read()
    expect(fullDayEligible(data.plans[0]!, '2026-09-03', now)).toBe(true)
    expect(fullDayEligible(data.plans[0]!, '2026-09-02', now)).toBe(false)
  })
})
