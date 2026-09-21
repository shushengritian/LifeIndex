import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { NavigationGuard } from '@/app/NavigationGuard'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { TransactionRepository } from '@/data/repositories/TransactionRepository'
import { FinanceRoute } from '@/features/finance/FinancePage'
import { FinanceReportPage } from '@/features/finance/FinanceReportPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { toLocalDateKey } from '@/shared/domain/date'
import { buildTransaction } from '../fixtures/builders'

let database: LifeIndexDatabase
let router: ReturnType<typeof createMemoryRouter>
beforeAll(() => {
  // Model lifecycle only; native top-layer focus is checked with a browser separately.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
beforeEach(async () => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  database = new LifeIndexDatabase(`FinanceReport-${crypto.randomUUID()}`)
  await database.initialize()
})
afterEach(async () => {
  router?.dispose()
  await database.delete()
  vi.restoreAllMocks()
})

function setup(path = '/finance', standalone = false) {
  router = createMemoryRouter(
    standalone
      ? [{ path: '/finance/report', element: <FinanceReportPage /> }]
      : [
          {
            element: (
              <>
                <NavigationGuard />
                <Outlet />
              </>
            ),
            children: [
              {
                path: '/finance',
                element: <FinanceRoute />,
                children: [{ path: 'report', element: <FinanceReportPage /> }],
              },
            ],
          },
        ],
    { initialEntries: [path] },
  )
  render(
    <AppServicesContext.Provider value={{ database }}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </AppServicesContext.Provider>,
  )
}

describe('production read-only finance report routing', () => {
  it('discards the editor Portal after consent to browser-forward report navigation', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: '报表' }))
    await screen.findByRole('heading', { name: '报表' })
    await act(async () => {
      await router.navigate(-1)
    })
    await user.click(await screen.findByRole('button', { name: '新增交易' }))
    await user.type(screen.getByLabelText('金额（CNY）'), '22')
    await act(async () => {
      await router.navigate(1)
    })
    await user.click(await screen.findByRole('button', { name: '留在当前页' }))
    expect(screen.getByLabelText('金额（CNY）')).toHaveValue('22')
    await act(async () => {
      await router.navigate(1)
    })
    await user.click(await screen.findByRole('button', { name: '放弃并离开' }))
    expect(await screen.findByRole('heading', { name: '报表' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '返回记账' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await database.transactions.count()).toBe(0)
  })
  it('inherits the browsed month and restores the parent date/scroll via both return paths without writes', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '上个月' }))
    const calendar = await screen.findByRole('grid')
    const selected = within(calendar)
      .getByRole('gridcell', { selected: true })
      .getAttribute('aria-label')
    const title = document.querySelector('#finance-month-title')?.textContent
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(220)
    await user.click(screen.getByRole('link', { name: '报表' }))
    await screen.findByRole('heading', { name: '报表' })
    expect(screen.queryByRole('heading', { name: '记账' })).not.toBeInTheDocument()
    await within(screen.getByRole('region', { name: '报表' })).findByText('暂无记录，无法形成趋势')
    await user.click(screen.getByRole('link', { name: '返回记账' }))
    await screen.findByRole('heading', { name: '记账' })
    expect(document.querySelector('#finance-month-title')?.textContent).toBe(title)
    expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('aria-label', selected)
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 220, behavior: 'instant' })
    await user.click(screen.getByRole('link', { name: '报表' }))
    await screen.findByRole('heading', { name: '报表' })
    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByRole('heading', { name: '记账' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('aria-label', selected)
    expect(await database.transactions.count()).toBe(0)
  })

  it('shows a recoverable read failure rather than an empty report and does not mutate rows', async () => {
    const date = toLocalDateKey(new Date())
    const record = buildTransaction({ localDate: date })
    await database.transactions.add(record)
    vi.spyOn(TransactionRepository.prototype, 'list').mockRejectedValueOnce(
      new Error('SyntheticReadFailure'),
    )
    setup('/finance/report', true)
    expect(await screen.findByRole('alert')).toHaveTextContent('报表暂时无法读取')
    expect(screen.queryByText('暂无记录，无法形成趋势')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    await screen.findByText('最高 ¥12.30')
    expect(await database.transactions.toArray()).toEqual([record])
  })

  it('rejects an invalid display month and direct-entry return has a usable ledger', async () => {
    const spy = vi.spyOn(TransactionRepository.prototype, 'list')
    setup('/finance/report?month=2026-99')
    await within(screen.getByRole('region', { name: '报表' })).findByText('暂无记录，无法形成趋势')
    expect(spy.mock.calls.every(([range]) => !range.from.includes('-99'))).toBe(true)
    await userEvent.click(screen.getByRole('link', { name: '返回记账' }))
    expect(await screen.findByRole('gridcell', { selected: true })).toHaveAttribute(
      'aria-label',
      expect.stringContaining(toLocalDateKey(new Date())),
    )
  })
})
