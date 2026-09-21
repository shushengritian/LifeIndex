import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FinanceNewPage, FinancePage } from '@/features/finance/FinancePage'
import { TodayPage } from '@/features/today/TodayPage'
import { financeDisplayDate } from '@/features/finance/financeNavigation'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
let router: ReturnType<typeof createMemoryRouter>
afterEach(async () => {
  cleanup()
  router?.dispose()
  await database?.delete()
})

it('returns an other-day save to Today and views that date only after explicit navigation', async () => {
  database = new LifeIndexDatabase(`TodayReceipt-${crypto.randomUUID()}`)
  await database.initialize()
  router = createMemoryRouter(
    [
      { path: '/finance/new', element: <FinanceNewPage /> },
      { path: '/today', element: <TodayPage /> },
      { path: '/finance', element: <FinancePage /> },
    ],
    { initialEntries: ['/finance/new'] },
  )
  render(
    <AppServicesContext.Provider value={{ database }}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </AppServicesContext.Provider>,
  )
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('金额（CNY）'), '12.34')
  await user.click(screen.getByRole('button', { name: '一级分类 餐饮' }))
  fireEvent.change(screen.getByLabelText('日期与时间'), { target: { value: '2025-02-12T12:30' } })
  await user.click(screen.getByRole('button', { name: /^保存$/ }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/today'))
  // Router state can update before React commits Today; assert the rendered receipt after that commit.
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2025-02-12'))
  expect(await database.transactions.count()).toBe(1)
  await user.click(screen.getByRole('link', { name: '查看记录' }))
  expect(await screen.findByRole('gridcell', { name: /2025-02-12/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // Viewing a receipt must never replay the transaction write.
  expect(await database.transactions.count()).toBe(1)
})

it('rejects malformed or impossible display dates', () => {
  for (const value of [null, {}, '2025-02-30', '0000-01-01', '2025-2-12', 'javascript:alert(1)']) {
    expect(financeDisplayDate(value)).toBeUndefined()
  }
  expect(financeDisplayDate('2024-02-29')).toBe('2024-02-29')
})
