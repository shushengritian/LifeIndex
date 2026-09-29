import { Engine, sameInput } from './database'
import { deriveFocusDisplay } from './clock'
import { fail } from './errors'
import { pageRows, rangeDates } from './records'
import type {
  CommandContext,
  CompletedFocusSession,
  CompletionAttempt,
  FocusBase,
  FocusSession,
  LifeIndexServices,
  PausedFocusSession,
  RunningFocusSession,
} from './types'
import {
  dateAt,
  integer,
  iso,
  object,
  requireValue,
  safeSum,
  uuid,
  validateFocusDetails,
} from './validation'

function base(session: FocusSession): FocusBase {
  return {
    id: session.id,
    revision: session.revision,
    lastCommandId: session.lastCommandId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    title: session.title,
    ...(session.categoryId === undefined ? {} : { categoryId: session.categoryId }),
    ...(session.note === undefined ? {} : { note: session.note }),
    timePrecision: 'instant',
    startedAt: session.startedAt,
    localDate: session.localDate,
    utcOffsetMinutes: session.utcOffsetMinutes,
    targetDurationMs: session.targetDurationMs,
  }
}
export async function currentFocus(
  engine: Engine,
): Promise<RunningFocusSession | PausedFocusSession | null> {
  const rows = await engine.db.focusSessions.where('status').anyOf(['running', 'paused']).toArray()
  requireValue(rows.length <= 1)
  return (rows[0] as RunningFocusSession | PausedFocusSession | undefined) ?? null
}
export function focusService(engine: Engine): LifeIndexServices['focus'] {
  const table = engine.db.focusSessions
  const get = async (id: string) => {
    const row = await table.get(uuid(id))
    if (!row) fail('NotFound')
    return row
  }
  const notBackwards = (row: FocusSession) => {
    if (engine.clock.now() < Date.parse(row.updatedAt)) fail('ClockChanged')
  }
  const prepare = async (
    session: FocusSession,
    attempt: CompletionAttempt,
    ctx: CommandContext,
  ): Promise<PausedFocusSession | CompletedFocusSession> => {
    uuid(attempt.token)
    iso(attempt.requestedAt)
    if (session.status === 'completed') return session
    if (session.status === 'paused' && session.pendingCompletion) return session
    engine.revision(session, attempt)
    notBackwards(session)
    const requested = Date.parse(attempt.requestedAt)
    requireValue(requested <= engine.clock.now(), 'requestedAt')
    if (requested < Date.parse(session.updatedAt)) fail('ClockChanged')
    const display = deriveFocusDisplay(session, {
      nowMs: requested,
      utcOffsetMinutes: session.utcOffsetMinutes,
    })
    requireValue(display.elapsedMs >= 1000, 'durationMs')
    const timer = display.expired
    const endedAt =
      timer && session.status === 'running'
        ? new Date(
            Date.parse(session.segmentStartedAt) + session.targetDurationMs - session.accumulatedMs,
          ).toISOString()
        : attempt.requestedAt
    // Persist the stop intention separately so a later completion failure cannot resume the timer.
    const pending: PausedFocusSession = {
      ...base(engine.changed(session, ctx)),
      status: 'paused',
      accumulatedMs: display.elapsedMs,
      pausedAt: endedAt,
      pendingCompletion: {
        token: attempt.token,
        kind: timer ? 'timer' : 'early',
        durationMs: display.elapsedMs,
        endedAt,
      },
    }
    await table.put(pending)
    return pending
  }
  const remove =
    (completed: boolean): LifeIndexServices['focus']['remove'] =>
    (ref, ctx) =>
      engine.write<{ id: string; removed: boolean }>(
        completed ? 'remove' : 'discard',
        ctx,
        async () => {
          const session = await table.get(uuid(ref.id))
          if (!session) return { data: { id: ref.id, removed: false }, changed: false }
          engine.revision(session, ref)
          requireValue((session.status === 'completed') === completed)
          await table.delete(ref.id)
          return { data: { id: ref.id, removed: true }, changed: true }
        },
      )
  return {
    getCurrent: () => engine.read(() => currentFocus(engine)),
    getById: (id) => engine.read(() => table.get(uuid(id)).then((row) => row ?? null)),
    list: (query) =>
      engine.read(async () => {
        const range = rangeDates(query)
        const rows = await table
          .where('localDate')
          .between(range.from, range.toExclusive, true, false)
          .toArray()
        return pageRows(
          engine,
          rows.filter((row): row is CompletedFocusSession => row.status === 'completed'),
          query,
        )
      }),
    getSummary: (range) =>
      engine.read(async () => {
        const bounds = rangeDates(range)
        const rows = (
          await table
            .where('localDate')
            .between(bounds.from, bounds.toExclusive, true, false)
            .toArray()
        ).filter((row): row is CompletedFocusSession => row.status === 'completed')
        return { count: rows.length, totalDurationMs: safeSum(rows.map((row) => row.durationMs)) }
      }),
    start: (input, ctx) =>
      engine.write<FocusSession>('start', ctx, async (meta) => {
        object(input, ['targetDurationMs', 'title', 'categoryId'])
        const target = integer(input.targetDurationMs, 60000, 86400000, 'targetDurationMs')
        requireValue(target % 60000 === 0)
        const details = validateFocusDetails({
          title: input.title ?? '自由专注',
          ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
        })
        const existing = await table.get(ctx.commandId)
        if (existing) {
          if (
            existing.lastCommandId !== ctx.commandId ||
            existing.targetDurationMs !== target ||
            existing.title !== details.title ||
            existing.categoryId !== details.categoryId
          )
            fail('EntityConflict')
          return { data: existing, changed: false }
        }
        if (await currentFocus(engine)) fail('Busy')
        engine.createGuard(meta, ctx)
        if (details.categoryId) await engine.category(details.categoryId, 'focus')
        const clock = engine.capture(),
          startedAt = new Date(clock.nowMs).toISOString()
        const session: RunningFocusSession = {
          ...engine.base(ctx),
          ...details,
          createdAt: startedAt,
          updatedAt: startedAt,
          status: 'running',
          timePrecision: 'instant',
          startedAt,
          localDate: dateAt(clock.nowMs, clock.utcOffsetMinutes),
          utcOffsetMinutes: clock.utcOffsetMinutes,
          targetDurationMs: target,
          accumulatedMs: 0,
          segmentStartedAt: startedAt,
        }
        await table.add(session)
        return { data: session, changed: true }
      }),
    pause: (ref, ctx) =>
      engine.write<FocusSession>('pause', ctx, async () => {
        const session = await get(ref.id)
        if (session.lastCommandId === ctx.commandId) return { data: session, changed: false }
        engine.revision(session, ref)
        requireValue(session.status === 'running')
        notBackwards(session)
        const clock = engine.capture(),
          display = deriveFocusDisplay(session, clock)
        if (display.expired)
          return {
            data: await prepare(
              session,
              { ...ref, token: engine.id(), requestedAt: new Date(clock.nowMs).toISOString() },
              ctx,
            ),
            changed: true,
          }
        const paused: PausedFocusSession = {
          ...base(engine.changed(session, ctx)),
          status: 'paused',
          accumulatedMs: display.elapsedMs,
          pausedAt: new Date(clock.nowMs).toISOString(),
        }
        await table.put(paused)
        return { data: paused, changed: true }
      }),
    resume: (ref, ctx) =>
      engine.write<FocusSession>('resume', ctx, async () => {
        const session = await get(ref.id)
        if (session.lastCommandId === ctx.commandId) return { data: session, changed: false }
        engine.revision(session, ref)
        requireValue(session.status === 'paused' && !session.pendingCompletion)
        notBackwards(session)
        const running: RunningFocusSession = {
          ...base(engine.changed(session, ctx)),
          status: 'running',
          accumulatedMs: session.accumulatedMs,
          segmentStartedAt: engine.now(),
        }
        await table.put(running)
        return { data: running, changed: true }
      }),
    prepareCompletion: (attempt, ctx) =>
      engine.write('prepareCompletion', ctx, async () => {
        const session = await get(attempt.id)
        const existingIntent =
          session.status === 'completed' ||
          (session.status === 'paused' && !!session.pendingCompletion)
        return { data: await prepare(session, attempt, ctx), changed: !existingIntent }
      }),
    finalizeCompletion: (input, ctx) =>
      engine.write<CompletedFocusSession>('finalizeCompletion', ctx, async () => {
        uuid(input.token)
        const session = await get(input.id)
        if (session.status === 'completed') {
          if (session.completionToken !== input.token) fail('EntityConflict')
          return { data: session, changed: false }
        }
        requireValue(session.status === 'paused' && session.pendingCompletion)
        const intent = session.pendingCompletion
        if (intent.token !== input.token) fail('EntityConflict')
        notBackwards(session)
        const completed: CompletedFocusSession = {
          ...base(engine.changed(session, ctx)),
          status: 'completed',
          durationMs: intent.durationMs,
          endedAt: intent.endedAt,
          completionKind: intent.kind,
          completionToken: intent.token,
        }
        await table.put(completed)
        return { data: completed, changed: true }
      }),
    discard: remove(false),
    remove: remove(true),
    updateDetails: (ref, raw, ctx) =>
      engine.write<CompletedFocusSession>('updateDetails', ctx, async () => {
        const details = validateFocusDetails(raw),
          session = await get(ref.id)
        requireValue(session.status === 'completed')
        if (session.lastCommandId === ctx.commandId) {
          if (!sameInput(session, details)) fail('EntityConflict')
          return { data: session, changed: false }
        }
        engine.revision(session, ref)
        if (sameInput(session, details)) return { data: session, changed: false }
        if (details.categoryId)
          await engine.category(details.categoryId, 'focus', session.categoryId)
        const changed = { ...engine.changed(session, ctx), ...details }
        if (details.note === undefined) delete changed.note
        if (details.categoryId === undefined) delete changed.categoryId
        await table.put(changed)
        return { data: changed, changed: true }
      }),
  }
}
