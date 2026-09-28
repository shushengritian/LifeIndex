import Dexie from 'dexie'
import { afterEach } from 'vitest'
import { createLifeIndexServices } from '@/core/services'
import { V4Database } from '@/core/database'
import type { CommandContext, LifeIndexServices, Snapshot, Stamp } from '@/core/types'

let sequence = 100
export function id(): string {
  sequence++
  return `40000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`
}
export function command(value: { stamp: Stamp } | Stamp, commandId = id()): CommandContext {
  const stamp = 'stamp' in value ? value.stamp : value
  return { commandId, expectedGeneration: stamp.generation, expectedRevision: stamp.revision }
}
export const ref = (data: { id: string; revision: number }) => ({
  id: data.id,
  expectedEntityRevision: data.revision,
})
const open: { services: LifeIndexServices[]; inspector: V4Database; name: string }[] = []
export async function setup() {
  const name = `LifeIndexV4-test-${id()}`
  let now = Date.parse('2026-09-28T12:00:00.000Z'),
    mono = 0
  const clock = { now: () => now, utcOffsetMinutes: () => 480, monotonicNow: () => mono }
  const services = createLifeIndexServices({ databaseName: name, clock, idGenerator: id })
  await services.database.open()
  const inspector = new V4Database(name)
  await inspector.open()
  const state = { services: [services], inspector, name }
  open.push(state)
  return {
    services,
    inspector,
    tick(ms: number) {
      now += ms
      mono += Math.max(0, ms)
    },
    moveWall(ms: number) {
      now += ms
    },
    async peer() {
      const peer = createLifeIndexServices({ databaseName: name, clock, idGenerator: id })
      await peer.database.open()
      state.services.push(peer)
      return peer
    },
    async context(s = services) {
      return command(await s.preferences.getAll())
    },
  }
}
export async function dump(db: V4Database) {
  return db.transaction('r', db.tables, async () =>
    Object.fromEntries(
      await Promise.all(
        db.tables.map(async (table) => [
          table.name,
          (await table.toArray()).sort(
            (a: { id?: string; key?: string }, b: { id?: string; key?: string }) =>
              (a.id ?? a.key ?? '').localeCompare(b.id ?? b.key ?? ''),
          ),
        ]),
      ),
    ),
  )
}
export async function category(
  services: LifeIndexServices,
  scope: 'expense' | 'income' | 'activity' | 'focus',
) {
  const rows = await services.categories.list({ scope, includeArchived: false })
  const first = rows.data[0]
  if (!first) throw new Error('FixtureMissing')
  return first.id
}
export const day = { localDate: '2026-09-28', utcOffsetMinutes: 480 }
export async function weight(
  services: LifeIndexServices,
  grams = 65000,
  date = day.localDate,
): Promise<Snapshot<import('@/core/types').WeightEntry>> {
  return services.weights.create(
    { ...day, localDate: date, weightGrams: grams },
    command(await services.preferences.getAll()),
  )
}
afterEach(async () => {
  for (const value of open.splice(0)) {
    value.services.forEach((service) => service.database.close())
    value.inspector.close()
    await Dexie.delete(value.name)
  }
})
