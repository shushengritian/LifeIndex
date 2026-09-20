import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ActionPage } from '@/app/actions/ActionPage'
import { ActionService } from '@/app/actions/ActionService'
import { AppServicesContext } from '@/app/AppServicesContext'
import { NavigationGuard } from '@/app/NavigationGuard'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { PwaProvider } from '@/pwa/PwaProvider'
import { buildHabit } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []
const routers: ReturnType<typeof createMemoryRouter>[] = []
afterEach(async () => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup(type: 'start-focus' | 'check-habit') {
  const database = new LifeIndexDatabase(`ActionWrite-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize()
  const habit = buildHabit({ startLocalDate: '2020-01-01' })
  await database.habits.add(habit)
  const query = new URLSearchParams({
    actionId: crypto.randomUUID(),
    ...(type === 'start-focus'
      ? { title: '合成专注', durationMinutes: '25' }
      : { habitId: habit.id }),
  })
  const route = `/action/${type}?${query}`
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <NavigationGuard />
            <Link to="/today">去今天</Link>
            <Outlet />
          </>
        ),
        children: [
          { path: '/action/:actionType', element: <ActionPage /> },
          { path: '/today', element: <h1>今天结果</h1> },
          { path: '/focus', element: <h1>已完成跳转</h1> },
          { path: '/habits', element: <h1>已完成跳转</h1> },
        ],
      },
    ],
    { initialEntries: [route] },
  )
  routers.push(router)
  const view = render(
    <StrictMode>
      <AppServicesContext.Provider value={{ database }}>
        <PwaProvider>
          <RouterProvider router={router} />
        </PwaProvider>
      </AppServicesContext.Provider>
    </StrictMode>,
  )
  const button = await screen.findByRole('button', {
    name: type === 'start-focus' ? '确认开始专注' : '确认完成习惯',
  })
  return { database, router, route, button, view, user: userEvent.setup() }
}

it.each(['start-focus', 'check-habit'] as const)(
  'locks %s cancellation, navigation and duplicate submits until its real transaction completes',
  async (type) => {
    const { database, router, button, user } = await setup(type)
    let release!: () => void
    const original = ActionService.prototype.execute
    const execute = vi
      .spyOn(ActionService.prototype, 'execute')
      .mockImplementationOnce(async function (this: ActionService, action) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return original.call(this, action)
      })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    await user.click(screen.getByRole('link', { name: '去今天' }))
    expect(router.state.location.pathname).toBe(`/action/${type}`)
    expect(await database.actionReceipts.count()).toBe(0)
    await act(async () => release())
    await screen.findByRole('heading', { name: '已完成跳转' })
    expect(await database.actionReceipts.count()).toBe(1)
    expect(
      await (type === 'start-focus' ? database.focusSessions : database.habitRecords).count(),
    ).toBe(1)
    await user.click(screen.getByRole('link', { name: '去今天' }))
    await screen.findByRole('heading', { name: '今天结果' })
  },
)

it.each(['start-focus', 'check-habit'] as const)(
  'releases %s write protection on failure so cancellation does not save',
  async (type) => {
    const { database, button, user } = await setup(type)
    let reject!: (error: Error) => void
    vi.spyOn(ActionService.prototype, 'execute').mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        }),
    )
    fireEvent.click(button)
    await act(async () => reject(new Error('Synthetic write failure')))
    expect(await screen.findByRole('alert')).toHaveTextContent('可以重试或取消')
    expect(button).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '取消' }))
    await screen.findByRole('heading', { name: '今天结果' })
    expect(await database.actionReceipts.count()).toBe(0)
  },
)

it('does not navigate after a pending action is forcibly unmounted', async () => {
  const { database, router, button, view } = await setup('start-focus')
  let release!: () => void
  const original = ActionService.prototype.execute
  vi.spyOn(ActionService.prototype, 'execute').mockImplementationOnce(async function (
    this: ActionService,
    action,
  ) {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return original.call(this, action)
  })
  fireEvent.click(button)
  view.unmount()
  await act(async () => release())
  await waitFor(async () => expect(await database.actionReceipts.count()).toBe(1))
  expect(router.state.location.pathname).toBe('/action/start-focus')
})

it('invalidates a preview when the same actionId is reused with another habit', async () => {
  const { database, router, route } = await setup('check-habit')
  const nextHabit = buildHabit({
    id: crypto.randomUUID(),
    name: '合成第二项习惯',
    startLocalDate: '2020-01-01',
  })
  await database.habits.add(nextHabit)
  let release!: () => void
  const original = ActionService.prototype.inspect
  vi.spyOn(ActionService.prototype, 'inspect').mockImplementationOnce(async function (
    this: ActionService,
    action,
  ) {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return original.call(this, action)
  })
  const params = new URLSearchParams(route.split('?')[1])
  params.set('habitId', nextHabit.id)
  await act(async () => {
    await router.navigate(`/action/check-habit?${params}`)
  })
  expect(screen.getByRole('heading', { name: '正在检查链接操作' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '确认完成习惯' })).not.toBeInTheDocument()
  await act(async () => release())
  await screen.findByText('合成第二项习惯')
  fireEvent.click(screen.getByRole('button', { name: '确认完成习惯' }))
  await screen.findByRole('heading', { name: '已完成跳转' })
  expect((await database.habitRecords.toArray())[0]?.habitId).toBe(nextHabit.id)
})

it('retries after failure without retaining a busy guard or duplicating the receipt', async () => {
  const { database, button } = await setup('start-focus')
  vi.spyOn(ActionService.prototype, 'execute').mockRejectedValueOnce(
    new Error('Synthetic retryable failure'),
  )
  fireEvent.click(button)
  await screen.findByRole('alert')
  fireEvent.click(button)
  await screen.findByRole('heading', { name: '已完成跳转' })
  expect(await database.focusSessions.count()).toBe(1)
  expect(await database.actionReceipts.count()).toBe(1)
})
