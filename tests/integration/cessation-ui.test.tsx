import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CessationRepository } from '@/data/repositories/CessationRepository'
import { CessationPage } from '@/features/health/cessation/CessationPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { SmokingForm } from '@/features/health/cessation/CessationForms'

let database: LifeIndexDatabase

it('locks smoking editor exits and detail deletion while saving, then retains failure input', async () => {
  let rejectWrite!: (reason: Error) => void
  const save = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        rejectWrite = reject
      }),
  )
  const close = vi.fn(),
    remove = vi.fn(),
    user = userEvent.setup()
  render(
    <PwaProvider>
      <SmokingForm onSave={save} onClose={close} onDelete={remove} />
    </PwaProvider>,
  )
  await user.click(screen.getByRole('button', { name: '保存吸烟记录' }))
  expect(screen.getByRole('button', { name: '关闭编辑器' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '删除记录' })).toBeDisabled()
  expect(
    screen.getByRole('button', { name: '保存吸烟记录，保存中' }).closest('.sheet-form-body'),
  ).toBeNull()
  await user.keyboard('{Escape}')
  expect(close).not.toHaveBeenCalled()
  await act(async () => rejectWrite(new Error('Synthetic write failure')))
  expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留')
  expect(screen.getByRole('alert')).toHaveFocus()
  expect(screen.getByRole('button', { name: '关闭编辑器' })).toBeEnabled()
  expect(screen.getByLabelText('这次吸了几支')).toHaveValue(1)
  expect(remove).not.toHaveBeenCalled()
})

it('retains a failed smoking draft and retries with the same operation ID', async () => {
  const user = userEvent.setup(),
    onClose = vi.fn()
  const onSave = vi
    .fn()
    .mockRejectedValueOnce(new Error('Injected failure'))
    .mockResolvedValue(undefined)
  render(
    <PwaProvider>
      <SmokingForm onSave={onSave} onClose={onClose} />
    </PwaProvider>,
  )
  await user.clear(screen.getByLabelText('这次吸了几支'))
  await user.type(screen.getByLabelText('这次吸了几支'), '3')
  await user.click(screen.getByRole('button', { name: '保存吸烟记录' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留')
  expect(screen.getByLabelText('这次吸了几支')).toHaveValue(3)
  expect(onClose).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '保存吸烟记录' }))
  expect(onSave.mock.calls[0]![0]).toBe(onSave.mock.calls[1]![0])
  expect(onClose).toHaveBeenCalledOnce()
})

it('Escape asks before discarding a changed smoking draft', async () => {
  const user = userEvent.setup(),
    onClose = vi.fn()
  render(
    <PwaProvider>
      <SmokingForm onSave={vi.fn()} onClose={onClose} />
    </PwaProvider>,
  )
  await user.clear(screen.getByLabelText('这次吸了几支'))
  await user.type(screen.getByLabelText('这次吸了几支'), '2')
  await user.keyboard('{Escape}')
  expect(onClose).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '继续填写' }))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: '放弃输入' }))
  expect(onClose).toHaveBeenCalledOnce()
})
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
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})

it.each(['delete', 'end'] as const)(
  'keeps cessation data on failed %s and retries through confirmation',
  async (operation) => {
    database = new LifeIndexDatabase(`CessationUi-${crypto.randomUUID()}`)
    await database.initialize()
    const repository = new CessationRepository(database),
      id = crypto.randomUUID(),
      eventId = crypto.randomUUID()
    await repository.start(id, {
      startAt: new Date(Date.now() - 3600000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    await repository.saveEvent(eventId, id, {
      kind: 'smoking',
      count: 1,
      occurredAt: new Date().toISOString(),
    })
    render(
      <AppServicesContext.Provider value={{ database }}>
        <MemoryRouter>
          <PwaProvider>
            <CessationPage />
          </PwaProvider>
        </MemoryRouter>
      </AppServicesContext.Provider>,
    )
    const user = userEvent.setup()
    const mutation =
      operation === 'delete'
        ? vi.spyOn(CessationRepository.prototype, 'removeEvent')
        : vi.spyOn(CessationRepository.prototype, 'end')
    mutation.mockRejectedValueOnce(new Error('Synthetic failure'))
    if (operation === 'delete') {
      await user.click(await screen.findByRole('button', { name: '编辑吸烟记录' }))
      await user.click(screen.getByRole('button', { name: '删除记录' }))
    } else {
      await screen.findByRole('button', { name: '记录戒烟事件' })
      await user.click(screen.getByRole('button', { name: '管理戒烟计划' }))
      await user.click(screen.getByRole('button', { name: '结束本次计划' }))
    }
    const confirm = within(
      screen.getByRole('dialog', {
        name: operation === 'delete' ? '删除戒烟记录？' : '结束本次计划？',
      }),
    )
    await user.click(
      confirm.getByRole('button', { name: operation === 'delete' ? '删除记录' : '确认结束' }),
    )
    expect(await confirm.findByRole('alert')).toHaveTextContent('原有记录保持不变')
    expect(await database.cessationEvents.count()).toBe(1)
    expect((await database.cessationPlans.get(id))?.endAt).toBeUndefined()
    await user.click(
      confirm.getByRole('button', { name: operation === 'delete' ? '删除记录' : '确认结束' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mutation).toHaveBeenCalledTimes(2)
    expect(await database.cessationEvents.count()).toBe(operation === 'delete' ? 0 : 1)
    if (operation === 'end') expect((await database.cessationPlans.get(id))?.endAt).toBeDefined()
  },
)
