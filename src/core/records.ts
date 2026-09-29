import type { Table } from 'dexie'
import { Engine, sameInput } from './database'
import { fail } from './errors'
import type {
  CategoryScope,
  CommandContext,
  DateSelection,
  DayFact,
  EntityBase,
  Page,
  PageQuery,
  RecordService,
} from './types'
import { dateAt, dateKey, integer, iso, object, requireValue, uuid } from './validation'

export function rangeDates(query: { from: string; toExclusive: string }) {
  const from = dateKey(query.from),
    toExclusive = dateKey(query.toExclusive)
  requireValue(from < toExclusive, 'range')
  return { from, toExclusive }
}
export function descending(
  a: EntityBase & { localDate: string },
  b: EntityBase & { localDate: string },
): number {
  return (
    b.localDate.localeCompare(a.localDate) ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.id.localeCompare(a.id)
  )
}
export async function pageRows<E extends EntityBase & { localDate: string }>(
  engine: Engine,
  rows: E[],
  query: PageQuery,
): Promise<Page<E>> {
  object(query, ['from', 'toExclusive', 'limit', 'cursor'])
  rangeDates(query)
  const limit = query.limit === undefined ? 50 : integer(query.limit, 1, 100, 'limit')
  const sorted = rows.sort(descending),
    totalCount = sorted.length
  let available = sorted
  if (query.cursor !== undefined) {
    let cursor: unknown
    try {
      cursor = JSON.parse(atob(query.cursor))
    } catch {
      fail('Validation', 'cursor')
    }
    const parsed = object(cursor, ['generation', 'localDate', 'createdAt', 'id'])
    if (parsed.generation !== (await engine.getMeta()).generation) fail('GenerationConflict')
    const marker = {
      localDate: dateKey(parsed.localDate),
      createdAt: iso(parsed.createdAt),
      id: uuid(parsed.id),
    } as E
    available = sorted.filter((row) => descending(row, marker) > 0)
  }
  const items = available.slice(0, limit),
    last = items.at(-1)
  const nextCursor =
    available.length > items.length && last
      ? btoa(
          JSON.stringify({
            generation: (await engine.getMeta()).generation,
            localDate: last.localDate,
            createdAt: last.createdAt,
            id: last.id,
          }),
        )
      : null
  return { items, nextCursor, totalCount }
}
export function createRecordService<E extends DayFact, I extends DateSelection & { note?: string }>(
  engine: Engine,
  table: Table<E, string>,
  validate: (input: unknown) => I,
  enrich: (input: I) => object,
  category?: (input: I) => { id: string; scope: CategoryScope },
): RecordService<E, I> {
  const check = async (input: I, original?: E) => {
    const clock = engine.capture()
    requireValue(input.localDate <= dateAt(clock.nowMs, clock.utcOffsetMinutes), 'localDate')
    if (original?.localDate === input.localDate)
      requireValue(original.utcOffsetMinutes === input.utcOffsetMinutes, 'utcOffsetMinutes')
    if (category) {
      const ref = category(input)
      await engine.category(
        ref.id,
        ref.scope,
        original && 'categoryId' in original ? String(original.categoryId) : undefined,
      )
    }
  }
  return {
    getById: (id) => engine.read(() => table.get(uuid(id)).then((value) => value ?? null)),
    list: (query) =>
      engine.read(async () => {
        const range = rangeDates(query)
        return pageRows(
          engine,
          await table
            .where('localDate')
            .between(range.from, range.toExclusive, true, false)
            .toArray(),
          query,
        )
      }),
    create: (raw, ctx) =>
      engine.write('create', ctx, async (meta) => {
        const input = validate(raw),
          existing = await table.get(ctx.commandId)
        if (existing) {
          if (existing.lastCommandId !== ctx.commandId || !sameInput(existing, input))
            fail('EntityConflict')
          return { data: existing, changed: false }
        }
        // A deleted successful create must not be resurrected by an old request with the same ID.
        engine.createGuard(meta, ctx)
        await check(input)
        const entity = {
          ...engine.base(ctx),
          ...input,
          ...enrich(input),
          timePrecision: 'day',
        } as unknown as E
        await table.add(entity)
        return { data: entity, changed: true }
      }),
    update: (ref, raw, ctx) =>
      engine.write('update', ctx, async () => {
        const input = validate(raw),
          existing = await table.get(uuid(ref.id))
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) {
          if (!sameInput(existing, input)) fail('EntityConflict')
          return { data: existing, changed: false }
        }
        engine.revision(existing, ref)
        await check(input, existing)
        if (sameInput(existing, input)) return { data: existing, changed: false }
        const entity = { ...engine.changed(existing, ctx), ...input, ...enrich(input) }
        if (input.note === undefined) delete entity.note
        await table.put(entity)
        return { data: entity, changed: true }
      }),
    remove: (ref, ctx) =>
      engine.write<{ id: string; removed: boolean }>('remove', ctx, async () => {
        const existing = await table.get(uuid(ref.id))
        if (!existing) return { data: { id: ref.id, removed: false }, changed: false }
        engine.revision(existing, ref)
        await table.delete(ref.id)
        return { data: { id: ref.id, removed: true }, changed: true }
      }),
  }
}
export function commandFor(entity: EntityBase, ctx: CommandContext): boolean {
  return entity.lastCommandId === ctx.commandId
}
