import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { FocusHistoryPage, FocusPage } from '@/features/focus/FocusPage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
beforeAll(() => {
  // DOM emulation covers state, not native top-layer focus (checked in the browser).
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
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})

it('retains the open draft when the background history query fails', async () => {
  const { user } = await setup(true)
  await user.click(await screen.findByRole('button', { name: '编辑' }))
  await user.type(screen.getByLabelText('专注标题'), '保留草稿')
  vi.spyOn(FocusRepository.prototype, 'listCompleted').mockRejectedValue(
    new Error('Synthetic read failure'),
  )
  // A real observed-table mutation triggers Dexie refresh without replacing the editor.
  await act(async () => {
    await database.focusSessions.toCollection().modify({ note: 'Synthetic refresh' })
  })
  await screen.findByText('专注记录暂时无法读取，数据没有被清空。')
  expect(screen.getByLabelText('专注标题')).toHaveValue('合成专注保留草稿')
  await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
  expect(screen.getByRole('dialog', { name: '放弃修改？' })).toBeInTheDocument()
})
async function setup(history: boolean) {
  database = new LifeIndexDatabase(`FocusConfirm-${crypto.randomUUID()}`)
  await database.initialize()
  const start = new Date(Date.now() - 60_000)
  const repository = new FocusRepository(database, { now: () => start })
  const session = await repository.start({ title: '合成专注', plannedDurationSeconds: 1500 })
  if (history) await repository.finishEarly(session.id, new Date().toISOString())
  render(
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter>
        <PwaProvider>{history ? <FocusHistoryPage /> : <FocusPage />}</PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>,
  )
  return { session, user: userEvent.setup() }
}

it('requires explicit draft discard and preserves the original time facts', async () => {
  const { session, user } = await setup(true)
  const original = await database.focusSessions.get(session.id)
  await user.click(await screen.findByRole('button', { name: '编辑' }))
  const form = within(screen.getByRole('form', { name: '编辑专注记录' }))
  expect(form.getByText('开始时间')).toBeInTheDocument()
  expect(form.getByText('结束时间')).toBeInTheDocument()
  await user.type(form.getByLabelText('专注标题'), '草稿')
  // Header close follows the same dirty guard as the footer; it never silently drops edits.
  expect(screen.getByRole('dialog', { name: '专注详情' })).toHaveClass('sheet--structured')
  await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
  const confirm = within(screen.getByRole('dialog', { name: '放弃修改？' }))
  await user.click(confirm.getByRole('button', { name: '取消' }))
  expect(form.getByLabelText('专注标题')).toHaveValue('合成专注草稿')
  await user.click(form.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '放弃修改' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(await database.focusSessions.get(session.id)).toEqual(original)
})

it('focuses edit failure without scrolling the underlying page and retains input', async () => {
  const { user } = await setup(true)
  await user.click(await screen.findByRole('button', { name: '编辑' }))
  await user.type(screen.getByLabelText('专注标题'), '草稿')
  vi.spyOn(FocusRepository.prototype, 'updateDetails').mockRejectedValueOnce(
    new Error('SyntheticWrite'),
  )
  const form = screen.getByRole('form', { name: '编辑专注记录' })
  const body = form.querySelector<HTMLDivElement>('.sheet-form-body')!
  body.scrollTop = 120
  await user.click(within(form).getByRole('button', { name: '保存描述' }))
  const error = await within(form).findByRole('alert')
  expect(error).toHaveFocus()
  expect(body.scrollTop).toBe(0)
  expect(screen.getByLabelText('专注标题')).toHaveValue('合成专注草稿')
})

it('retains the record on failed deletion and retries within the confirmation', async () => {
  const { session, user } = await setup(true)
  const remove = vi
    .spyOn(FocusRepository.prototype, 'removeCompleted')
    .mockRejectedValueOnce(new Error('Synthetic failure'))
  await user.click(await screen.findByRole('button', { name: '编辑' }))
  await user.click(screen.getByRole('button', { name: '删除记录' }))
  const confirm = within(screen.getByRole('dialog', { name: '删除专注记录？' }))
  await user.click(confirm.getByRole('button', { name: '删除记录' }))
  expect(await confirm.findByRole('alert')).toHaveTextContent('记录和草稿仍保留')
  expect(await database.focusSessions.get(session.id)).toBeDefined()
  await user.click(confirm.getByRole('button', { name: '删除记录' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await database.focusSessions.count()).toBe(0)
  expect(remove).toHaveBeenCalledTimes(2)
})

it('locks early completion during a write and reuses its endpoint after failure', async () => {
  const { session, user } = await setup(false)
  let fail!: (error: Error) => void
  const finish = vi.spyOn(FocusRepository.prototype, 'finishEarly').mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        fail = reject
      }),
  )
  await user.click(await screen.findByRole('button', { name: '提前结束' }))
  const confirm = within(screen.getByRole('dialog', { name: '提前结束专注？' }))
  await user.click(confirm.getByRole('button', { name: '结束并保存' }))
  expect(confirm.getByRole('button', { name: '返回计时' })).toBeDisabled()
  await user.click(confirm.getByRole('button', { name: '处理中…' }))
  expect(finish).toHaveBeenCalledTimes(1)
  await act(async () => fail(new Error('Synthetic failure')))
  expect(await confirm.findByRole('alert')).toHaveTextContent('操作未能保存')
  await user.click(confirm.getByRole('button', { name: '结束并保存' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(finish.mock.calls[1]?.[1]).toBe(finish.mock.calls[0]?.[1])
  expect((await database.focusSessions.get(session.id))?.endedAt).toBe(finish.mock.calls[0]?.[1])
  expect(await database.focusSessions.count()).toBe(1)
})

it('leaves a session running when cancellation is declined, then cancels explicitly', async () => {
  const { session, user } = await setup(false)
  await user.click(await screen.findByRole('button', { name: '取消本次' }))
  await user.click(screen.getByRole('button', { name: '返回计时' }))
  expect((await database.focusSessions.get(session.id))?.status).toBe('active')
  await user.click(screen.getByRole('button', { name: '取消本次' }))
  await user.click(
    within(screen.getByRole('dialog', { name: '取消本次专注？' })).getByRole('button', {
      name: '取消本次',
    }),
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await database.focusSessions.count()).toBe(0)
})
