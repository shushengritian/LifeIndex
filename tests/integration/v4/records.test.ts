import { describe, expect, it } from 'vitest'
import { command, ref, setup, weight, day, category, dump } from './helpers'

describe('v4 record transactions and projections', () => {
  it('seeds only structure and never silently recreates a removed default category', async () => {
    const { services, inspector } = await setup()
    const rows = await services.categories.list({ includeArchived: true })
    expect(rows.data).toHaveLength(19)
    expect(await inspector.transactions.count()).toBe(0)
    const first = rows.data[0]!
    await services.categories.removeUnused(ref(first), command(rows))
    services.database.close()
    await services.database.open()
    expect((await services.categories.list({ includeArchived: true })).data).toHaveLength(18)
  })
  it('is idempotent while existing and rejects create retries after deletion by another context', async () => {
    const h = await setup(),
      peer = await h.peer(),
      ctx = await h.context()
    const input = { ...day, weightGrams: 65000 }
    const saved = await h.services.weights.create(input, ctx)
    expect(await h.services.weights.create(input, ctx)).toEqual(saved)
    await peer.weights.remove(ref(saved.data), command(saved))
    await expect(h.services.weights.create(input, ctx)).rejects.toMatchObject({
      code: 'EntityConflict',
    })
    expect(await h.inspector.weightEntries.count()).toBe(0)
  })
  it('rejects stale edits and future days without partial writes', async () => {
    const h = await setup(),
      a = await weight(h.services),
      before = await dump(h.inspector)
    await expect(
      h.services.weights.update(
        ref(a.data),
        { ...day, localDate: '2026-09-29', weightGrams: 62000 },
        command(a),
      ),
    ).rejects.toMatchObject({ code: 'Validation' })
    expect(await dump(h.inspector)).toEqual(before)
    await h.services.weights.update(ref(a.data), { ...day, weightGrams: 64000 }, command(a))
    await expect(
      h.services.weights.update(ref(a.data), { ...day, weightGrams: 63000 }, command(a)),
    ).rejects.toMatchObject({ code: 'EntityConflict' })
  })
  it('keeps same-day history, chooses last entered daily weight, and isolates month ranges', async () => {
    const h = await setup()
    const a = await weight(h.services, 68000)
    h.tick(10)
    const b = await weight(h.services, 67000)
    h.tick(10)
    await weight(h.services, 69000, '2026-09-01')
    await h.services.weights.update(ref(a.data), { ...day, weightGrams: 66000 }, await h.context())
    const trend = await h.services.weights.getTrend({
      from: '2026-09-01',
      toExclusive: '2026-10-01',
    })
    expect(trend.data.latest?.id).toBe(b.data.id)
    expect(trend.data.points.at(-1)?.entry.id).toBe(b.data.id)
    const expense = await category(h.services, 'expense'),
      activity = await category(h.services, 'activity')
    await h.services.transactions.create(
      { ...day, amountMinor: 1299, type: 'expense', categoryId: expense },
      await h.context(),
    )
    await h.services.transactions.create(
      { ...day, localDate: '2026-08-31', amountMinor: 88888, type: 'expense', categoryId: expense },
      await h.context(),
    )
    await h.services.activities.create(
      { ...day, categoryId: activity, durationMinutes: 30, intensity: 'moderate' },
      await h.context(),
    )
    expect((await h.services.transactions.getMonth('2026-09')).data.expenseMinor).toBe(1299)
    const records = (await h.services.today.getRecords(day.localDate)).data
    expect(records.dayOnly).toHaveLength(4)
    expect(records.timed).toHaveLength(0)
    expect(
      records.dayOnly.every(
        (row) => !('occurredAt' in row.entity) && !('measuredAt' in row.entity),
      ),
    ).toBe(true)
  })
  it('archives references, rejects conflicting activation, and permits rename then activation', async () => {
    const h = await setup(),
      rows = await h.services.categories.list({ scope: 'expense', includeArchived: false }),
      original = rows.data[0]!
    await h.services.transactions.create(
      { ...day, amountMinor: 100, type: 'expense', categoryId: original.id },
      await h.context(),
    )
    await expect(
      h.services.categories.removeUnused(ref(original), await h.context()),
    ).rejects.toMatchObject({ code: 'Validation' })
    const archived = await h.services.categories.archive(ref(original), await h.context())
    await h.services.categories.create(
      { scope: 'expense', name: original.name, iconKey: 'bag' },
      await h.context(),
    )
    await expect(
      h.services.categories.activate(ref(archived.data), await h.context()),
    ).rejects.toMatchObject({ code: 'Validation' })
    const renamed = await h.services.categories.update(
      ref(archived.data),
      { scope: 'expense', name: '合成新分类', iconKey: 'bag' },
      await h.context(),
    )
    expect(
      (await h.services.categories.activate(ref(renamed.data), await h.context())).data.status,
    ).toBe('active')
  })
})

it('clears optional notes, rejects changed-payload create replay, and does not bump revisions for a no-op', async () => {
  const h = await setup(),
    ctx = await h.context(),
    input = { ...day, weightGrams: 65000, note: 'SYNTHETIC_NOTE' }
  const saved = await h.services.weights.create(input, ctx)
  await expect(
    h.services.weights.create({ ...day, weightGrams: 65000 }, ctx),
  ).rejects.toMatchObject({ code: 'EntityConflict' })
  const unchanged = await h.services.weights.update(ref(saved.data), input, command(saved))
  expect(unchanged.stamp).toEqual(saved.stamp)
  const cleared = await h.services.weights.update(
    ref(saved.data),
    { ...day, weightGrams: 65000 },
    command(saved),
  )
  expect(cleared.data).not.toHaveProperty('note')
})
it('observes committed query snapshots and stops delivery after unsubscribe', async () => {
  const { vi } = await import('vitest')
  const h = await setup(),
    received: number[] = [],
    errors: unknown[] = []
  const stop = h.services.observe(
    () => h.services.weights.list({ from: '2026-09-01', toExclusive: '2026-10-01' }),
    {
      next: (snapshot) => received.push(snapshot.data.totalCount),
      error: (error) => errors.push(error),
    },
  )
  await vi.waitFor(() => expect(received).toContain(0))
  await weight(h.services)
  await vi.waitFor(() => expect(received).toContain(1))
  const peer = await h.peer()
  await weight(peer, 64000)
  await vi.waitFor(() => expect(received).toContain(2))
  stop()
  const count = received.length
  await weight(h.services, 66000)
  await new Promise((resolve) => setTimeout(resolve, 25))
  expect(received).toHaveLength(count)
  expect(errors).toEqual([])
})
it('paginates equal-date facts stably and rejects a cursor from a restored generation', async () => {
  const h = await setup()
  for (let index = 0; index < 5; index++) {
    h.tick(1)
    await weight(h.services, 65000 + index)
  }
  const first = await h.services.weights.list({
    from: '2026-09-01',
    toExclusive: '2026-10-01',
    limit: 2,
  })
  const second = await h.services.weights.list({
    from: '2026-09-01',
    toExclusive: '2026-10-01',
    limit: 2,
    cursor: first.data.nextCursor!,
  })
  expect(new Set([...first.data.items, ...second.data.items].map((row) => row.id)).size).toBe(4)
  expect(first.data.totalCount).toBe(5)
  const source = await h.services.backup.exportSnapshot(),
    preview = await h.services.backup.inspectFile(source.blob)
  await h.services.backup.restore(preview.token)
  await expect(
    h.services.weights.list({
      from: '2026-09-01',
      toExclusive: '2026-10-01',
      cursor: first.data.nextCursor!,
    }),
  ).rejects.toMatchObject({ code: 'GenerationConflict' })
})
it('rejects future export preferences and preserves other fields', async () => {
  const h = await setup(),
    preferences = await h.services.preferences.getAll(),
    before = await dump(h.inspector)
  await expect(
    h.services.preferences.set(
      {
        key: 'lastExportedAt',
        value: '2026-09-29T12:00:00.000Z',
        expectedEntityRevision: preferences.data.revisions.lastExportedAt,
      },
      command(preferences),
    ),
  ).rejects.toMatchObject({ code: 'Validation' })
  expect(await dump(h.inspector)).toEqual(before)
})

it('opens before subscribing and never starts initialization inside a read-only live query', async () => {
  const { vi } = await import('vitest')
  const h = await setup(),
    values: number[] = [],
    errors: unknown[] = []
  h.services.database.close()
  const stop = h.services.observe(() => h.services.today.getFinance(day.localDate), {
    next: (snapshot) => values.push(snapshot.data.transactionCount),
    error: (error) => errors.push(error),
  })
  try {
    await vi.waitFor(() => expect(values).toEqual([0]))
    expect(errors).toEqual([])
  } finally {
    stop()
  }
})
