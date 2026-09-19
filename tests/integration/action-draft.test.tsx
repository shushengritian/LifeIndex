import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { ActionPage, ActionResultPage } from '@/app/actions/ActionPage'
import { ActionService } from '@/app/actions/ActionService'
import { AppServicesContext } from '@/app/AppServicesContext'
import { NavigationGuard } from '@/app/NavigationGuard'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { PwaProvider } from '@/pwa/PwaProvider'

const databases: LifeIndexDatabase[] = []
const routers: ReturnType<typeof createMemoryRouter>[] = []
const actionId = '00000000-0000-4000-8000-000000000987'
beforeAll(() => {
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
afterEach(async () => {
  routers.splice(0).forEach((router) => router.dispose())
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function setup(missing = false) {
  const database = new LifeIndexDatabase(`ActionDraft-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize()
  const category = await new CategoryRepository(database).create({
    parentId: 'category-finance-expense-food-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '合成早餐',
    icon: 'food',
    color: 'blue',
  })
  const route = `/action/add-transaction?actionId=${actionId}&amount=12.34&categoryId=${missing ? 'category-finance-expense-missing-v1' : category.id}&occurredAt=2026-09-19T01%3A02%3A33Z`
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
          { path: '/action-result', element: <ActionResultPage /> },
          { path: '/finance', element: <h1>记账结果</h1> },
          { path: '/today', element: <h1>今天结果</h1> },
        ],
      },
    ],
    { initialEntries: [route] },
  )
  routers.push(router)
  render(
    <AppServicesContext.Provider value={{ database }}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </AppServicesContext.Provider>,
  )
  await screen.findByLabelText('金额（CNY）')
  await waitFor(() => expect(screen.getByLabelText('金额（CNY）')).toBeEnabled())
  return { database, category, router, route, user: userEvent.setup() }
}

it('repairs a missing category without losing amount/time, retries atomically and deduplicates the original URL', async () => {
  const { database, category, router, route, user } = await setup(true)
  expect(screen.getByLabelText('金额（CNY）')).toHaveValue('12.34')
  expect(screen.getByRole('button', { name: '确认新增账目' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: '一级分类 餐饮' }))
  await user.click(screen.getByRole('button', { name: '二级分类 合成早餐' }))
  vi.spyOn(database.transactions, 'add').mockRejectedValueOnce(new Error('SyntheticWriteFailure'))
  await user.click(screen.getByRole('button', { name: '确认新增账目' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('输入仍保留')
  expect(await database.actionReceipts.count()).toBe(0)
  await user.click(screen.getByRole('button', { name: '确认新增账目' }))
  await screen.findByRole('heading', { name: '记账结果' })
  expect((await database.transactions.toArray())[0]).toMatchObject({
    amountMinor: 1234,
    categoryId: category.id,
    occurredAt: '2026-09-19T01:02:33.000Z',
  })
  expect(await database.actionReceipts.count()).toBe(1)
  await act(async () => {
    await router.navigate(route)
  })
  await screen.findByRole('heading', { name: '这个快捷动作已经处理过' })
  expect(await database.transactions.count()).toBe(1)
  expect(router.state.location.search).not.toContain('amount')
})

it('guards draft navigation and cancels only after explicit confirmation without writing receipts', async () => {
  const { database, user } = await setup()
  await user.click(screen.getByRole('link', { name: '去今天' }))
  await user.click(await screen.findByRole('button', { name: '留在当前页' }))
  expect(screen.getByLabelText('金额（CNY）')).toHaveValue('12.34')
  await user.click(screen.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '继续核对' }))
  await user.click(screen.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '放弃草稿' }))
  await screen.findByRole('heading', { name: '今天结果' })
  expect(await database.transactions.count()).toBe(0)
  expect(await database.actionReceipts.count()).toBe(0)
})

it('uses corrected amount and the native time control value even before change dispatch', async () => {
  const { database, user } = await setup()
  await user.clear(screen.getByLabelText('金额（CNY）'))
  await user.type(screen.getByLabelText('金额（CNY）'), '45.67')
  const input = screen.getByLabelText('发生时间') as HTMLInputElement
  // Model WebKit committing the input before React receives the final change event.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
    input,
    '2026-09-18T10:20',
  )
  fireEvent.submit(input.closest('form')!)
  await screen.findByRole('heading', { name: '记账结果' })
  expect((await database.transactions.toArray())[0]).toMatchObject({
    amountMinor: 4567,
    occurredAt: new Date('2026-09-18T10:20').toISOString(),
    localDate: '2026-09-18',
  })
})

it('blocks duplicate saves and navigation while a write is pending, then releases on failure', async () => {
  const { user, router } = await setup()
  let reject!: (error: Error) => void
  const execute = vi.spyOn(ActionService.prototype, 'execute').mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      }),
  )
  const button = screen.getByRole('button', { name: '确认新增账目' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(execute).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('金额（CNY）')).toBeDisabled()
  expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
  await user.click(screen.getByRole('link', { name: '去今天' }))
  expect(router.state.location.pathname).toBe('/action/add-transaction')
  await act(async () => reject(new Error('SyntheticPendingFailure')))
  expect(await screen.findByRole('alert')).toHaveTextContent('输入仍保留')
  expect(screen.getByLabelText('金额（CNY）')).toBeEnabled()
})
