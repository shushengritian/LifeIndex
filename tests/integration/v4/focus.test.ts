import { expect, it, vi } from 'vitest'
import { createCompletionAttempt } from '@/core/services'
import type { FocusSession } from '@/core/types'
import { command, id, ref, setup } from './helpers'

it('excludes paused time, keeps milliseconds, finalizes one entity and is token idempotent', async () => {
  const h = await setup()
  let session = await h.services.focus.start({ targetDurationMs: 1500000 }, await h.context())
  h.tick(10400)
  session = await h.services.focus.pause(ref(session.data), command(session))
  h.tick(60000)
  session = await h.services.focus.resume(ref(session.data), command(session))
  h.tick(20400)
  if (session.data.status === 'completed') throw new Error('Fixture')
  const attempt = createCompletionAttempt(session.data, h.services.clock.capture(), id())
  const pending = await h.services.focus.prepareCompletion(attempt, command(session))
  expect(pending.data.status).toBe('paused')
  expect(
    (await h.services.focus.getSummary({ from: '2026-09-28', toExclusive: '2026-09-29' })).data
      .count,
  ).toBe(0)
  const token = pending.data.status === 'paused' ? pending.data.pendingCompletion!.token : ''
  const finished = await h.services.focus.finalizeCompletion(
    { id: pending.data.id, token },
    command(pending),
  )
  expect(finished.data.durationMs).toBe(30800)
  expect(
    (await h.services.focus.finalizeCompletion({ id: finished.data.id, token }, command(finished)))
      .data,
  ).toEqual(finished.data)
  expect(await h.inspector.focusSessions.count()).toBe(1)
})
it('survives first and second transaction failures without pretending completion', async () => {
  const h = await setup(),
    session = await h.services.focus.start({ targetDurationMs: 1500000 }, await h.context())
  h.tick(30000)
  if (session.data.status === 'completed') throw new Error('Fixture')
  const attempt = createCompletionAttempt(session.data, h.services.clock.capture(), id()),
    ctx = command(session)
  const original = IDBObjectStore.prototype.put
  let blocked: FocusSession['status'] | null = 'paused'
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (this.name === 'focusSessions' && (value as FocusSession).status === blocked)
      throw new DOMException('SYNTHETIC_FAILURE', 'QuotaExceededError')
    return key === undefined ? original.call(this, value) : original.call(this, value, key)
  })
  await expect(h.services.focus.prepareCompletion(attempt, ctx)).rejects.toMatchObject({
    code: 'WriteFailure',
  })
  expect((await h.services.focus.getCurrent()).data?.status).toBe('running')
  h.tick(50000)
  blocked = 'completed'
  const pending = await h.services.focus.prepareCompletion(attempt, ctx)
  expect(pending.data.status === 'paused' && pending.data.pendingCompletion?.durationMs).toBe(30000)
  const finalContext = command(pending)
  await expect(
    h.services.focus.finalizeCompletion(
      { id: session.data.id, token: attempt.token },
      finalContext,
    ),
  ).rejects.toMatchObject({ code: 'WriteFailure' })
  h.services.database.close()
  await h.services.database.open()
  const recovered = (await h.services.focus.getCurrent()).data
  expect(recovered?.status === 'paused' && recovered.pendingCompletion?.durationMs).toBe(30000)
  spy.mockRestore()
  expect(
    (
      await h.services.focus.finalizeCompletion(
        { id: session.data.id, token: attempt.token },
        finalContext,
      )
    ).data.durationMs,
  ).toBe(30000)
})
it('caps natural end, preserves start date and refuses backwards clocks', async () => {
  const h = await setup()
  h.tick(4 * 3600000 - 60000)
  const session = await h.services.focus.start({ targetDurationMs: 1500000 }, await h.context())
  h.moveWall(-1)
  await expect(h.services.focus.pause(ref(session.data), command(session))).rejects.toMatchObject({
    code: 'ClockChanged',
  })
  h.moveWall(1)
  h.tick(3600000)
  const pending = await h.services.focus.pause(ref(session.data), command(session))
  expect(pending.data.localDate).toBe('2026-09-28')
  expect(pending.data.status === 'paused' && pending.data.pendingCompletion).toMatchObject({
    kind: 'timer',
    durationMs: 1500000,
    endedAt: '2026-09-28T16:24:00.000Z',
  })
})
it('serializes simultaneous starts and pause refresh never accrues offline time', async () => {
  const h = await setup(),
    peer = await h.peer(),
    ctx = await h.context()
  const results = await Promise.allSettled([
    h.services.focus.start({ targetDurationMs: 1500000 }, ctx),
    peer.focus.start({ targetDurationMs: 1500000 }, { ...ctx, commandId: id() }),
  ])
  expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1)
  const active = await h.services.focus.getCurrent()
  h.tick(10000)
  const paused = await h.services.focus.pause(ref(active.data!), command(active))
  h.tick(86400000)
  h.services.database.close()
  await h.services.database.open()
  const restored = (await h.services.focus.getCurrent()).data
  expect(restored?.status === 'paused' && restored.accumulatedMs).toBe(10000)
  await expect(
    h.services.focus.resume({ ...ref(paused.data), expectedEntityRevision: 1 }, command(paused)),
  ).rejects.toMatchObject({ code: 'EntityConflict' })
})
