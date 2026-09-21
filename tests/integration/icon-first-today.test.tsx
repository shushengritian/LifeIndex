import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { TodayPage } from '@/features/today/TodayPage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
let router: ReturnType<typeof createMemoryRouter>
afterEach(async () => {
  cleanup()
  router?.dispose()
  await database?.delete()
})

it('keeps summary reading separate from creation and focus history separate from starting', async () => {
  database = new LifeIndexDatabase(`IconFirstToday-${crypto.randomUUID()}`)
  await database.initialize()
  router = createMemoryRouter(
    [
      { path: '/today', element: <TodayPage /> },
      { path: '/finance', element: <h1>账目列表</h1> },
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
  const summary = await screen.findByRole('link', { name: '查看今日账目' })
  const create = screen.getByRole('link', { name: '记一笔' })
  expect(summary).not.toContainElement(create)
  expect(create).toHaveAttribute('href', '/finance/new')
  expect(await screen.findByRole('link', { name: '查看专注记录' })).toHaveAttribute(
    'href',
    '/focus/history',
  )
  expect(screen.getByRole('link', { name: '开始或继续专注' })).toHaveAttribute('href', '/focus')
  // The arrow is decorative; clicking it follows the content link and never dispatches a write.
  await userEvent.setup().click(summary.querySelector('svg')!)
  expect(router.state.location.pathname).toBe('/finance')
  expect(await database.transactions.count()).toBe(0)
  console.info('test.today.targets.checked', { operation: 'read-without-write' })
})
