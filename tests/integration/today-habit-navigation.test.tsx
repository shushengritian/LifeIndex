import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HabitRepository } from '@/data/repositories/HabitRepository'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { TodayPage } from '@/features/today/TodayPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { toLocalDateKey } from '@/shared/domain/date'

let database: LifeIndexDatabase
let router: ReturnType<typeof createMemoryRouter>
afterEach(async () => {
  cleanup()
  router?.dispose()
  await database?.delete()
  vi.restoreAllMocks()
})
async function setup() {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(360)
  database = new LifeIndexDatabase(`TodayHabit-${crypto.randomUUID()}`)
  await database.initialize()
  await new HabitRepository(database).create({
    name: '合成阅读',
    icon: 'check',
    color: 'sage',
    schedule: { type: 'daily' },
    startLocalDate: toLocalDateKey(new Date()),
  })
  router = createMemoryRouter(
    [
      { path: '/today', element: <TodayPage /> },
      { path: '/health/habits', element: <HabitsPage /> },
    ],
    { initialEntries: ['/today'] },
  )
  render(
    <AppServicesContext.Provider value={{ database }}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </AppServicesContext.Provider>,
  )
  return userEvent.setup()
}

it('opens details without checking in and closes back to Today', async () => {
  const user = await setup()
  await user.click(await screen.findByRole('link', { name: '合成阅读' }))
  expect(await screen.findByRole('dialog', { name: '习惯统计' })).toBeInTheDocument()
  expect(await database.habitRecords.count()).toBe(0)
  await user.click(screen.getByRole('button', { name: '关闭统计' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/today'))
  expect(await screen.findByRole('button', { name: '合成阅读 · 点按完成' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await waitFor(() => expect(screen.getByRole('link', { name: '合成阅读' })).toHaveFocus())
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 360, behavior: 'instant' })
})

it('restores the trigger after browser Back and does not restore again on check-in', async () => {
  const user = await setup()
  await user.click(await screen.findByRole('link', { name: '合成阅读' }))
  await screen.findByRole('dialog', { name: '习惯统计' })
  await act(async () => {
    await router.navigate(-1)
  })
  await waitFor(() => expect(screen.getByRole('link', { name: '合成阅读' })).toHaveFocus())
  const restoredCount = vi.mocked(window.scrollTo).mock.calls.length
  await user.click(screen.getByRole('button', { name: '合成阅读 · 点按完成' }))
  await screen.findByRole('button', { name: '合成阅读 · 已完成，点按撤销' })
  expect(vi.mocked(window.scrollTo).mock.calls.length).toBe(restoredCount)
})

it('returns focus to the section when the original habit is no longer scheduled', async () => {
  const user = await setup()
  await user.click(await screen.findByRole('link', { name: '合成阅读' }))
  await screen.findByRole('dialog', { name: '习惯统计' })
  const habit = (await database.habits.toArray())[0]!
  await act(async () => {
    await new HabitRepository(database).setStatus(habit.id, 'paused')
  })
  await user.click(screen.getByRole('button', { name: '关闭统计' }))
  await waitFor(() => expect(screen.getByRole('heading', { name: '健康习惯' })).toHaveFocus())
  expect(screen.queryByRole('link', { name: '合成阅读' })).not.toBeInTheDocument()
})

it('keeps failed check-in unchanged and retries with the independent action', async () => {
  const user = await setup()
  vi.spyOn(HabitRepository.prototype, 'checkIn').mockRejectedValueOnce(
    new Error('Synthetic failure'),
  )
  const action = await screen.findByRole('button', { name: '合成阅读 · 点按完成' })
  await user.click(action)
  expect(await screen.findByRole('alert')).toHaveTextContent('签到状态未能更新')
  expect(await database.habitRecords.count()).toBe(0)
  await user.click(action)
  expect(
    await screen.findByRole('button', { name: '合成阅读 · 已完成，点按撤销' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(router.state.location.pathname).toBe('/today')
  expect(await database.habitRecords.count()).toBe(1)
})
