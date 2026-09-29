import { Engine, sameInput } from './database'
import { fail } from './errors'
import { rangeDates } from './records'
import type { Habit, HabitCheck, LifeIndexServices } from './types'
import {
  dateAt,
  dateKey,
  integer,
  oneOf,
  requireValue,
  uuid,
  validateHabitInput,
} from './validation'

export function habitsService(engine: Engine): LifeIndexServices['habits'] {
  const { habits: table, habitChecks: checks } = engine.db
  const today = () => {
    const clock = engine.capture()
    return dateAt(clock.nowMs, clock.utcOffsetMinutes)
  }
  return {
    list: () =>
      engine.read(async () =>
        (await table.toArray()).sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        ),
      ),
    getById: (id) => engine.read(() => table.get(uuid(id)).then((row) => row ?? null)),
    getCheckById: (id) => engine.read(() => checks.get(uuid(id)).then((row) => row ?? null)),
    getChecks: (habitId, range) =>
      engine.read(async () => {
        const bounds = rangeDates(range)
        return (await checks.where('habitId').equals(uuid(habitId)).toArray())
          .filter((row) => row.localDate >= bounds.from && row.localDate < bounds.toExclusive)
          .sort((a, b) => a.localDate.localeCompare(b.localDate))
      }),
    create: (raw, ctx) =>
      engine.write('create', ctx, async (meta) => {
        const input = validateHabitInput(raw),
          existing = await table.get(ctx.commandId)
        if (existing) {
          if (existing.lastCommandId !== ctx.commandId || !sameInput(existing, input))
            fail('EntityConflict')
          return { data: existing, changed: false }
        }
        engine.createGuard(meta, ctx)
        const entity: Habit = {
          ...engine.base(ctx),
          ...input,
          status: 'active',
          scheduleEffectiveFrom: today(),
        }
        await table.add(entity)
        return { data: entity, changed: true }
      }),
    update: (ref, raw, ctx) =>
      engine.write('update', ctx, async () => {
        const input = validateHabitInput(raw),
          existing = await table.get(uuid(ref.id))
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) {
          if (!sameInput(existing, input)) fail('EntityConflict')
          return { data: existing, changed: false }
        }
        engine.revision(existing, ref)
        if (sameInput(existing, input)) return { data: existing, changed: false }
        const entity = {
          ...engine.changed(existing, ctx),
          ...input,
          scheduleEffectiveFrom: today(),
        }
        if (input.note === undefined) delete entity.note
        await table.put(entity)
        return { data: entity, changed: true }
      }),
    setStatus: (ref, status, ctx) =>
      engine.write('setStatus', ctx, async () => {
        oneOf(status, ['active', 'paused'])
        const existing = await table.get(uuid(ref.id))
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) return { data: existing, changed: false }
        engine.revision(existing, ref)
        if (existing.status === status) return { data: existing, changed: false }
        const entity = { ...engine.changed(existing, ctx), status, scheduleEffectiveFrom: today() }
        await table.put(entity)
        return { data: entity, changed: true }
      }),
    setCheck: (input, ctx) =>
      engine.write('setCheck', ctx, async () => {
        const id = uuid(input.habitId),
          date = dateKey(input.date)
        requireValue(typeof input.desired === 'boolean')
        integer(input.expectedHabitRevision, 1, Number.MAX_SAFE_INTEGER)
        const habit = await table.get(id)
        if (!habit) fail('NotFound')
        const existing = await checks.where('[habitId+localDate]').equals([id, date]).first()
        if (habit.lastCommandId === ctx.commandId)
          return { data: { habit, check: existing ?? null }, changed: false }
        engine.revision(habit, { id, expectedEntityRevision: input.expectedHabitRevision })
        requireValue(date <= today(), 'localDate')
        if (Boolean(existing) === input.desired)
          return { data: { habit, check: existing ?? null }, changed: false }
        const changedHabit = engine.changed(habit, ctx)
        // Updating the parent revision prevents a completed→undone→old-complete replay from recreating history.
        let check: HabitCheck | null = null
        if (input.desired) {
          const clock = engine.capture(),
            base = {
              ...engine.base(ctx),
              habitId: id,
              localDate: date,
              utcOffsetMinutes: clock.utcOffsetMinutes,
            }
          check =
            date === dateAt(clock.nowMs, clock.utcOffsetMinutes)
              ? {
                  ...base,
                  timePrecision: 'instant',
                  completedAt: new Date(clock.nowMs).toISOString(),
                }
              : { ...base, timePrecision: 'day' }
          await checks.add(check)
        } else if (existing) await checks.delete(existing.id)
        await table.put(changedHabit)
        return { data: { habit: changedHabit, check }, changed: true }
      }),
    remove: (ref, options, ctx) =>
      engine.write<{ id: string; removed: boolean; deletedChecksCount: number }>(
        'remove',
        ctx,
        async () => {
          requireValue(options.deleteChecks === true)
          const habit = await table.get(uuid(ref.id))
          if (!habit)
            return { data: { id: ref.id, removed: false, deletedChecksCount: 0 }, changed: false }
          engine.revision(habit, ref)
          const deletedChecksCount = await checks.where('habitId').equals(ref.id).delete()
          await table.delete(ref.id)
          return { data: { id: ref.id, removed: true, deletedChecksCount }, changed: true }
        },
      ),
  }
}
