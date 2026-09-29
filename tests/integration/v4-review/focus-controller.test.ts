import Dexie from 'dexie'
import { afterEach, expect, it, vi } from 'vitest'
import { FocusController } from '@/app/v4/FocusController'
import { createLifeIndexServices } from '@/core/services'
import { V4Database } from '@/core/database'
import type { FocusSession } from '@/core/types'
import { commandContext } from '@/shared/v4/format'

const cleanup: Array<() => Promise<void>> = []

async function fixture() {
  // Keep IDB scheduling native while advancing both wall and monotonic clocks used by the runtime.
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-09-29T04:00:00.000Z'))
  const name = `LifeIndexV4-independent-review-${crypto.randomUUID()}`
  const services = createLifeIndexServices({ databaseName: name })
  await services.database.open()
  const inspector = new V4Database(name)
  await inspector.open()
  const confirm = vi.fn(async () => true)
  const runtime = new FocusController(services, confirm)
  const disconnect = runtime.connect()
  cleanup.push(async () => {
    disconnect()
    services.database.close()
    inspector.close()
    // This randomized namespace was created only by this test; no application or old user database is opened.
    await Dexie.delete(name)
  })
  await vi.waitFor(() => expect(runtime.getSnapshot().status).toBe('ready'))
  return { services, inspector, runtime, confirm }
}

afterEach(async () => {
  vi.restoreAllMocks()
  for (const dispose of cleanup.splice(0)) await dispose()
  vi.useRealTimers()
})

it('QA-C01: an under-one-second finish keeps running and a later valid finish remains possible', async () => {
  const { runtime, services } = await fixture()
  await runtime.start(25)
  const before = await services.focus.getCurrent()
  await runtime.finish()
  expect(runtime.getSnapshot()).toMatchObject({ awaitingSave: false, busy: false })
  expect(runtime.getSnapshot().error).toContain('一秒')
  expect(runtime.getUnsaved()).toBe(false)
  expect(await services.focus.getCurrent()).toEqual(before)
  await vi.advanceTimersByTimeAsync(1_200)
  await runtime.finish()
  expect((await services.focus.getCurrent()).data).toBeNull()
  const saved = await services.focus.getById(before.data!.id)
  expect(saved.data).toMatchObject({ status: 'completed', durationMs: 1_200 })
  console.info('v4.qa.runtime.verified', { scenario: 'too-short-then-complete' })
})

it('QA-C02: a detected backwards wall clock blocks writes until corrected and explicitly retried', async () => {
  const { runtime, services, confirm } = await fixture()
  await runtime.start(25)
  await vi.advanceTimersByTimeAsync(10_000)
  const before = await services.focus.getCurrent()
  const shown = runtime.getSnapshot().elapsedSeconds
  vi.setSystemTime(Date.now() - 5_000)
  await vi.advanceTimersByTimeAsync(250)
  expect(runtime.getSnapshot().error).toContain('时间发生变化')
  expect(runtime.getSnapshot().elapsedSeconds).toBe(shown)
  await runtime.pause()
  await runtime.finish()
  expect(confirm).not.toHaveBeenCalled()
  expect(await services.focus.getCurrent()).toEqual(before)
  await runtime.retry()
  expect(runtime.getSnapshot().error).toContain('仍未校正')
  vi.setSystemTime(Date.now() + 5_000)
  await runtime.retry()
  await runtime.pause()
  const paused = (await services.focus.getCurrent()).data
  expect(paused).toMatchObject({ status: 'paused', accumulatedMs: 10_250 })
  console.info('v4.qa.runtime.verified', { scenario: 'clock-correction' })
})

it('a real prepare write failure retains the endpoint and exits only after one successful retry', async () => {
  const { runtime, services, inspector } = await fixture()
  await runtime.start(25)
  await vi.advanceTimersByTimeAsync(3_250)
  const before = await services.focus.getCurrent()
  const originalPut = IDBObjectStore.prototype.put
  const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (this.name === 'focusSessions' && (value as FocusSession).status === 'paused') {
      throw new DOMException('Synthetic transaction failure', 'QuotaExceededError')
    }
    return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key)
  })
  await runtime.finish()
  expect(await services.focus.getCurrent()).toEqual(before)
  expect(runtime.getUnsaved()).toBe(true)
  expect(runtime.getSnapshot().awaitingSave).toBe(true)
  const displayed = runtime.getSnapshot().elapsedSeconds
  await vi.advanceTimersByTimeAsync(10_000)
  expect(runtime.getSnapshot().elapsedSeconds).toBe(displayed)
  expect(await inspector.focusSessions.count()).toBe(1)
  fault.mockRestore()
  await runtime.retry()
  const completed = await inspector.focusSessions.toArray()
  expect(completed).toHaveLength(1)
  expect(completed[0]).toMatchObject({ status: 'completed', durationMs: 3_250 })
  expect(runtime.getUnsaved()).toBe(false)
  expect(runtime.getSnapshot().awaitingSave).toBe(false)
  console.info('v4.qa.runtime.verified', { scenario: 'prepare-failure-fixed-endpoint' })
})

for (const action of ['finish', 'discard'] as const) {
  it(`a stale ${action} confirmation cannot mutate a replacement session`, async () => {
    const { runtime, services, confirm, inspector } = await fixture()
    await runtime.start(25)
    await vi.advanceTimersByTimeAsync(2_000)
    let accept!: (value: boolean) => void
    confirm.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          accept = resolve
        }),
    )
    const pending = runtime[action]()
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce())
    const original = await services.focus.getCurrent()
    // Another actor replaces the session while the original modal remains outstanding.
    await services.focus.discard(
      { id: original.data!.id, expectedEntityRevision: original.data!.revision },
      commandContext(original.stamp),
    )
    const empty = await services.focus.getCurrent()
    const replacement = await services.focus.start(
      { targetDurationMs: 60_000 },
      commandContext(empty.stamp),
    )
    await vi.waitFor(() => expect(runtime.getSnapshot().session?.id).toBe(replacement.data.id))
    const before = await inspector.focusSessions.toArray()
    accept(true)
    await pending
    expect(await inspector.focusSessions.toArray()).toEqual(before)
    expect((await services.focus.getCurrent()).data?.id).toBe(replacement.data.id)
    console.info('v4.qa.runtime.verified', { scenario: 'stale-confirmation', action })
  })
}

it('a pending start exposes busy and rejects overlapping state transitions', async () => {
  const { runtime, services, confirm, inspector } = await fixture()
  const actualStart = services.focus.start.bind(services.focus)
  let release!: () => void
  const latch = new Promise<void>((resolve) => {
    release = resolve
  })
  const start = vi.spyOn(services.focus, 'start').mockImplementation(async (...args) => {
    await latch
    return actualStart(...args)
  })
  const first = runtime.start(25)
  await vi.waitFor(() => expect(start).toHaveBeenCalledOnce())
  expect(runtime.getBusy()).toBe(true)
  await runtime.start(15)
  await runtime.pause()
  await runtime.finish()
  await runtime.discard()
  expect(start).toHaveBeenCalledOnce()
  expect(confirm).not.toHaveBeenCalled()
  expect(await inspector.focusSessions.count()).toBe(0)
  release()
  await first
  expect(runtime.getBusy()).toBe(false)
  expect(await inspector.focusSessions.count()).toBe(1)
  console.info('v4.qa.runtime.verified', { scenario: 'busy-command-guard' })
})
