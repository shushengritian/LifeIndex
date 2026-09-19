import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FinancePage } from '@/features/finance/FinancePage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
beforeAll(() => {
  // jsdom models the open state; real top-layer focus behavior is verified in the browser.
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
  database = new LifeIndexDatabase(`FinanceConfirmation-${crypto.randomUUID()}`)
  await database.initialize()
  render(
    <AppServicesContext.Provider value={{ database }}>
      <PwaProvider>
        <FinancePage />
      </PwaProvider>
    </AppServicesContext.Provider>,
  )
})
afterEach(async () => {
  await database.delete()
  vi.restoreAllMocks()
})

async function draft() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '新增交易' }))
  await user.type(screen.getByLabelText('金额（CNY）'), '12.50')
  await user.click(screen.getByRole('button', { name: '一级分类 餐饮' }))
  return user
}

describe('Finance application confirmations', () => {
  it('submits the native date control value even before its change event arrives', async () => {
    const user = await draft()
    // Model a native picker that has committed its DOM value but has not emitted change yet.
    const date = screen.getByLabelText('日期与时间') as HTMLInputElement
    date.value = '2025-03-11T08:45'
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByRole('button', { name: '查看记录' })).toBeInTheDocument()
    expect((await database.transactions.toArray())[0]?.localDate).toBe('2025-03-11')
  })
  it('preserves the browsing date until the saved-record link is explicitly used', async () => {
    const user = await draft()
    const original = document.querySelector('[aria-selected="true"]')?.getAttribute('aria-label')
    fireEvent.change(screen.getByLabelText('日期与时间'), { target: { value: '2025-02-10T12:00' } })
    await user.click(screen.getByRole('button', { name: '保存' }))
    const view = await screen.findByRole('button', { name: '查看记录' })
    expect(document.querySelector('[aria-selected="true"]')?.getAttribute('aria-label')).toBe(
      original,
    )
    await user.click(view)
    expect(await screen.findByRole('button', { name: '编辑 餐饮 ¥12.50' })).toBeInTheDocument()
    expect(document.querySelector('[aria-selected="true"]')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2025-02-10'),
    )
    await user.click(screen.getByRole('button', { name: '编辑 餐饮 ¥12.50' }))
    expect(screen.getByLabelText('金额（CNY）')).toHaveValue('12.50')
    expect(screen.getByLabelText('日期与时间')).toHaveValue('2025-02-10T12:00')
  })
  it('keeps dirty input when cancellation is declined, then discards explicitly', async () => {
    const user = await draft()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.getByRole('dialog', { name: '放弃这次输入？' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '继续填写' }))
    expect(screen.getByLabelText('金额（CNY）')).toHaveValue('12.50')
    await user.click(screen.getByRole('button', { name: '取消' }))
    await user.click(screen.getByRole('button', { name: '放弃输入' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await database.transactions.count()).toBe(0)
  })

  it('retains the record on cancelled deletion and failed deletion, then retries', async () => {
    const user = await draft()
    await user.click(screen.getByRole('button', { name: '保存' }))
    await user.click(await screen.findByRole('button', { name: '删除' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }))
    expect(await database.transactions.count()).toBe(1)
    vi.spyOn(database.transactions, 'delete').mockRejectedValueOnce(new Error('SyntheticFailure'))
    await user.click(screen.getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: '删除账目' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('未能删除')
    expect(await database.transactions.count()).toBe(1)
    await user.click(screen.getByRole('button', { name: '删除账目' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await database.transactions.count()).toBe(0)
  })

  it('locks editing and cancellation while a save is pending and retains draft on failure', async () => {
    let rejectWrite!: (reason: Error) => void
    const write = vi.spyOn(database.transactions, 'add').mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectWrite = reject
        }) as never,
    )
    const user = await draft()
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByLabelText('金额（CNY）')).toBeDisabled()
    // Busy starts before asynchronous category validation; wait for the actual write boundary,
    // not user.click completion, before injecting a storage failure on slower CI runners.
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    console.info('[LifeIndex test] Pending finance write reached; injecting synthetic failure')
    rejectWrite(new Error('SyntheticFailure'))
    expect(await screen.findByRole('alert')).toHaveTextContent('本次输入仍保留')
    expect(screen.getByLabelText('金额（CNY）')).toHaveValue('12.50')
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(await database.transactions.count()).toBe(0)
  })
})
