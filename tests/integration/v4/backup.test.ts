import { expect, it, vi } from 'vitest'
import type { BackupDocument } from '@/core/types'
import { command, dump, id, setup, weight } from './helpers'

async function json(blob: Blob): Promise<BackupDocument> {
  const text =
    typeof blob.text === 'function'
      ? await blob.text()
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsText(blob)
        })
  return JSON.parse(text) as BackupDocument
}
const file = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' })
it('round-trips all tables, rejects stale preview and prevents old-generation drafts', async () => {
  const h = await setup(),
    saved = await weight(h.services),
    exported = await h.services.backup.exportSnapshot()
  const preview = await h.services.backup.inspectFile(exported.blob),
    peer = await h.peer()
  await weight(peer, 64000)
  const current = await dump(h.inspector)
  await expect(h.services.backup.restore(preview.token)).rejects.toMatchObject({
    code: 'PreviewStale',
  })
  expect(await dump(h.inspector)).toEqual(current)
  const refreshed = await h.services.backup.inspectFile(exported.blob)
  const restored = await h.services.backup.restore(refreshed.token)
  expect(restored.stamp.generation).not.toBe(saved.stamp.generation)
  expect(await h.inspector.weightEntries.count()).toBe(1)
  await expect(
    h.services.weights.create(
      { localDate: '2026-09-28', utcOffsetMinutes: 480, weightGrams: 63000 },
      command(saved),
    ),
  ).rejects.toMatchObject({ code: 'GenerationConflict' })
  await expect(h.services.backup.restore(refreshed.token)).rejects.toMatchObject({
    code: 'PreviewExpired',
  })
  const after = await json((await h.services.backup.exportSnapshot()).blob)
  expect(after.data).toEqual((await json(exported.blob)).data)
})
it('rolls back a real restore transaction after earlier stores were already cleared and inserted', async () => {
  const h = await setup()
  await weight(h.services, 65000)
  const source = await h.services.backup.exportSnapshot()
  await weight(h.services, 66000)
  const preview = await h.services.backup.inspectFile(source.blob),
    before = await dump(h.inspector)
  const original = IDBObjectStore.prototype.add
  let earlierWrites = 0
  const spy = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (this.name === 'categories') earlierWrites++
    if (this.name === 'weightEntries')
      throw new DOMException('SYNTHETIC_CONTENT_MUST_NOT_LOG', 'QuotaExceededError')
    return key === undefined ? original.call(this, value) : original.call(this, value, key)
  })
  await expect(h.services.backup.restore(preview.token)).rejects.toMatchObject({
    code: 'WriteFailure',
  })
  expect(earlierWrites).toBeGreaterThan(0)
  spy.mockRestore()
  h.services.database.close()
  h.inspector.close()
  await h.inspector.open()
  await h.services.database.open()
  expect(await dump(h.inspector)).toEqual(before)
  await h.services.backup.restore(preview.token)
  expect(await h.inspector.weightEntries.count()).toBe(1)
})
it('fully validates fields, counts, references, strict time precision, preferences, and focus unions before writes', async () => {
  const h = await setup()
  await weight(h.services)
  const original = await json((await h.services.backup.exportSnapshot()).blob),
    before = await dump(h.inspector)
  const corruptions = [
    (value: BackupDocument) => {
      value.formatVersion = 2 as 1
    },
    (value: BackupDocument) => {
      value.counts.weightEntries++
    },
    (value: BackupDocument) => {
      value.data.weightEntries[0]!.weightGrams = 999
    },
    (value: BackupDocument) => {
      Object.assign(value.data.weightEntries[0]!, { measuredAt: value.exportedAt })
    },
    (value: BackupDocument) => {
      value.data.weightEntries[0]!.localDate = '2026-09-29'
    },
    (value: BackupDocument) => {
      value.data.preferences.pop()
      value.counts.preferences--
    },
    (value: BackupDocument) => {
      value.data.categories[0]!.iconKey = 'write' as 'bag'
    },
    (value: BackupDocument) => {
      value.data.categories[0]!.id = 'cat-food'
    },
    (value: BackupDocument) => {
      value.data.weightEntries.push(value.data.weightEntries[0]!)
      value.counts.weightEntries++
    },
  ]
  for (const corrupt of corruptions) {
    const candidate = structuredClone(original)
    corrupt(candidate)
    await expect(h.services.backup.inspectFile(file(candidate))).rejects.toBeDefined()
    expect(await dump(h.inspector)).toEqual(before)
  }
})
it('uses monotonic TTL, and cancelling a preview writes nothing', async () => {
  const h = await setup(),
    exported = await h.services.backup.exportSnapshot()
  const preview = await h.services.backup.inspectFile(exported.blob),
    before = await dump(h.inspector)
  h.tick(15 * 60000)
  h.moveWall(-3600000)
  await expect(h.services.backup.restore(preview.token)).rejects.toMatchObject({
    code: 'PreviewExpired',
  })
  expect(await dump(h.inspector)).toEqual(before)
  h.moveWall(3600000)
  const another = await h.services.backup.inspectFile(exported.blob)
  h.services.backup.cancelPreview(another.token)
  await expect(h.services.backup.restore(another.token)).rejects.toMatchObject({
    code: 'PreviewExpired',
  })
})
it('includes paused pending and running state and never writes imported focus before confirmation', async () => {
  const h = await setup(),
    started = await h.services.focus.start({ targetDurationMs: 1500000 }, await h.context())
  const running = await h.services.backup.exportSnapshot()
  expect((await h.services.backup.inspectFile(running.blob)).sourceFocus.running).toBe(1)
  h.tick(2000)
  const pending = await h.services.focus.prepareCompletion(
    {
      id: started.data.id,
      expectedEntityRevision: 1,
      token: id(),
      requestedAt: new Date(h.services.clock.capture().nowMs).toISOString(),
    },
    command(started),
  )
  const exported = await h.services.backup.exportSnapshot(),
    preview = await h.services.backup.inspectFile(exported.blob)
  expect(preview.sourceFocus.awaitingSave).toBe(1)
  const before = await dump(h.inspector)
  expect((await h.services.focus.getCurrent()).data).toEqual(pending.data)
  expect(await dump(h.inspector)).toEqual(before)
  await h.services.backup.restore(preview.token)
  expect((await h.services.focus.getCurrent()).data).toEqual(pending.data)
})

it('serializes restore with another context write and exports one complete generation', async () => {
  const h = await setup(),
    peer = await h.peer()
  await weight(h.services, 65000)
  const source = await h.services.backup.exportSnapshot(),
    preview = await h.services.backup.inspectFile(source.blob),
    old = await h.context(peer)
  const results = await Promise.allSettled([
    h.services.backup.restore(preview.token),
    peer.weights.create(
      { localDate: '2026-09-28', utcOffsetMinutes: 480, weightGrams: 63000 },
      old,
    ),
    peer.backup.exportSnapshot(),
  ])
  expect(results.slice(0, 2).filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  const exported = results[2]
  expect(exported?.status).toBe('fulfilled')
  if (exported?.status === 'fulfilled' && 'blob' in exported.value) {
    const document = await json(exported.value.blob)
    expect(document.counts.weightEntries).toBe(document.data.weightEntries.length)
    expect([1, 2]).toContain(document.data.weightEntries.length)
  }
})
it('rejects oversized files before reading and never exposes synthetic failure content in logs', async () => {
  const h = await setup(),
    before = await dump(h.inspector)
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const blob = new Blob([new Uint8Array(50 * 1024 * 1024 + 1)])
  await expect(h.services.backup.inspectFile(blob)).rejects.toMatchObject({ code: 'Validation' })
  await expect(
    h.services.backup.inspectFile(file({ secret: 'SYNTHETIC_PRIVATE_BACKUP' })),
  ).rejects.toMatchObject({ code: 'Validation' })
  expect(JSON.stringify(spy.mock.calls)).not.toContain('SYNTHETIC_PRIVATE_BACKUP')
  expect(await dump(h.inspector)).toEqual(before)
})
it('rejects focus union pollution, broken references and duplicate active sessions', async () => {
  const h = await setup()
  await h.services.focus.start({ targetDurationMs: 1500000 }, await h.context())
  const original = await json((await h.services.backup.exportSnapshot()).blob),
    before = await dump(h.inspector)
  const corruptions = [
    (value: BackupDocument) => {
      Object.assign(value.data.focusSessions[0]!, { endedAt: value.exportedAt })
    },
    (value: BackupDocument) => {
      value.data.focusSessions[0]!.categoryId = id()
    },
    (value: BackupDocument) => {
      value.data.focusSessions.push({ ...value.data.focusSessions[0]!, id: id() })
      value.counts.focusSessions++
    },
    (value: BackupDocument) => {
      value.data.focusSessions[0]!.timePrecision = 'day' as 'instant'
    },
  ]
  for (const corrupt of corruptions) {
    const candidate = structuredClone(original)
    corrupt(candidate)
    await expect(h.services.backup.inspectFile(file(candidate))).rejects.toBeDefined()
    expect(await dump(h.inspector)).toEqual(before)
  }
})
