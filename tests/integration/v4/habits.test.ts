import { expect, it } from 'vitest'
import { command, day, ref, setup } from './helpers'

it('separates planned progress from extra completion and never infers historical absences', async () => {
  const h = await setup()
  const planned = await h.services.habits.create(
    { name: '合成计划', iconKey: 'leaf', scheduleWeekdays: [1] },
    await h.context(),
  )
  const extra = await h.services.habits.create(
    { name: '合成额外', iconKey: 'cup', scheduleWeekdays: [2] },
    await h.context(),
  )
  await h.services.habits.setCheck(
    { habitId: planned.data.id, expectedHabitRevision: 1, date: day.localDate, desired: true },
    await h.context(),
  )
  await h.services.habits.setCheck(
    { habitId: extra.data.id, expectedHabitRevision: 1, date: day.localDate, desired: true },
    await h.context(),
  )
  const today = (await h.services.today.getHabits(day.localDate)).data
  expect(today).toMatchObject({
    scheduledCount: 1,
    scheduledCompletedCount: 1,
    completedCount: 2,
    pendingCount: 0,
  })
  expect((await h.services.today.getRecords(day.localDate)).data.timed).toHaveLength(2)
  const p = await h.services.habits.getById(planned.data.id)
  await h.services.habits.setStatus(ref(p.data!), 'paused', command(p))
  expect((await h.services.today.getHabits(day.localDate)).data).toMatchObject({
    scheduledCount: 0,
    completedCount: 2,
  })
  expect((await h.services.today.getHabits('2026-09-27')).data).toMatchObject({
    scheduledCount: 0,
    completedCount: 0,
  })
})
it('protects parent revision across complete undo replay and simultaneous tabs', async () => {
  const h = await setup(),
    peer = await h.peer()
  const habit = await h.services.habits.create(
    { name: '合成并发', iconKey: 'leaf', scheduleWeekdays: [1, 2, 3] },
    await h.context(),
  )
  const input = {
      habitId: habit.data.id,
      expectedHabitRevision: 1,
      date: day.localDate,
      desired: true,
    },
    ctx = await h.context()
  const results = await Promise.allSettled([
    h.services.habits.setCheck(input, ctx),
    peer.habits.setCheck(input, command(habit)),
  ])
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(await h.inspector.habitChecks.count()).toBe(1)
  const completed = await h.services.habits.getById(habit.data.id)
  await h.services.habits.setCheck(
    { ...input, expectedHabitRevision: completed.data!.revision, desired: false },
    command(completed),
  )
  await expect(h.services.habits.setCheck(input, ctx)).rejects.toMatchObject({
    code: 'EntityConflict',
  })
  expect(await h.inspector.habitChecks.count()).toBe(0)
  expect((await h.services.habits.getById(habit.data.id)).data!.scheduleEffectiveFrom).toBe(
    day.localDate,
  )
})
it('stores explicit past completion without fabricated time and atomically deletes its checks', async () => {
  const h = await setup(),
    habit = await h.services.habits.create(
      { name: '合成补记', iconKey: 'book', scheduleWeekdays: [1] },
      await h.context(),
    )
  const checked = await h.services.habits.setCheck(
    { habitId: habit.data.id, expectedHabitRevision: 1, date: '2025-01-01', desired: true },
    command(habit),
  )
  expect(checked.data.check).toMatchObject({ timePrecision: 'day', localDate: '2025-01-01' })
  expect(checked.data.check).not.toHaveProperty('completedAt')
  await h.services.habits.remove(ref(checked.data.habit), { deleteChecks: true }, command(checked))
  expect(await h.inspector.habits.count()).toBe(0)
  expect(await h.inspector.habitChecks.count()).toBe(0)
})
