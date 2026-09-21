import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { FocusPage } from '@/features/focus/FocusPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { usePwa } from '@/pwa/PwaContext'

function GuardProbe() {
  const { dirtyFormCount, busyFormCount } = usePwa()
  return (
    <output aria-label="guard state">
      {dirtyFormCount}:{busyFormCount ?? 0}
    </output>
  )
}

let database: LifeIndexDatabase
afterEach(async () => {
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})

for (const pending of [false, true]) {
  it(`preserves start draft and ${pending ? 'busy' : 'dirty'} guard after a background read failure`, async () => {
    database = new LifeIndexDatabase(`FocusReadFailure-${crypto.randomUUID()}`)
    await database.initialize()
    render(
      <AppServicesContext.Provider value={{ database }}>
        <MemoryRouter>
          <PwaProvider>
            <FocusPage />
            <GuardProbe />
          </PwaProvider>
        </MemoryRouter>
      </AppServicesContext.Provider>,
    )
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('专注标题'), '合成草稿')
    await user.click(screen.getByRole('button', { name: '自定义' }))
    await user.clear(screen.getByLabelText('自定义分钟数'))
    await user.type(screen.getByLabelText('自定义分钟数'), '90')
    let fail!: (error: Error) => void
    if (pending) {
      vi.spyOn(FocusRepository.prototype, 'start').mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            fail = reject
          }),
      )
      await user.click(screen.getByRole('button', { name: '开始专注' }))
    }
    const read = vi
      .spyOn(FocusRepository.prototype, 'listCompleted')
      .mockRejectedValue(new Error('SyntheticRead'))
    // Categories are part of the same real Dexie query: mutate an observed row to trigger refresh.
    await act(async () => {
      await database.categories.update('category-focus-work-v1', { name: '合成刷新' })
    })
    await screen.findByText('专注记录暂时无法读取，数据没有被清空。')
    expect(screen.getByLabelText('专注标题')).toHaveValue('合成草稿')
    expect(screen.getByLabelText('自定义分钟数')).toHaveValue(90)
    expect(screen.getByLabelText('guard state')).toHaveTextContent(pending ? '1:1' : '1:0')
    if (pending) {
      expect(screen.getByRole('button', { name: '正在开始…' })).toBeDisabled()
      await act(async () => fail(new Error('SyntheticWrite')))
      expect(
        await within(screen.getByRole('form', { name: '开始专注' })).findByRole('alert'),
      ).toHaveTextContent('本次输入仍保留')
      expect(screen.getByLabelText('guard state')).toHaveTextContent('1:0')
    }
    read.mockRestore()
    await user.click(screen.getByRole('button', { name: '重试读取' }))
    await waitFor(() =>
      expect(screen.queryByText('专注记录暂时无法读取，数据没有被清空。')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText('专注标题')).toHaveValue('合成草稿')
    await user.click(screen.getByRole('button', { name: '开始专注' }))
    await screen.findByRole('heading', { name: '合成草稿' })
    expect(await database.focusSessions.count()).toBe(1)
  })
}
it('shows long timers, keeps optional fields collapsed, and locks a failed start until retry', async () => {
  database = new LifeIndexDatabase(`FocusStart-${crypto.randomUUID()}`)
  await database.initialize()
  render(
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter>
        <PwaProvider>
          <FocusPage />
        </PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>,
  )
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: '自定义' }))
  // The sole start action belongs to the timer but retains native form submission.
  expect(screen.getByRole('button', { name: '开始专注' }).closest('.focus-stage')).not.toBeNull()
  expect(screen.getByRole('button', { name: '开始专注' }).querySelector('svg')).not.toBeNull()
  await user.clear(screen.getByLabelText('自定义分钟数'))
  await user.type(screen.getByLabelText('自定义分钟数'), '90')
  expect(screen.getByRole('timer')).toHaveTextContent('01:30:00')
  expect(screen.getByText('分类与备注（可选）').closest('details')).not.toHaveAttribute('open')
  await user.click(screen.getByText('分类与备注（可选）'))
  await user.type(screen.getByLabelText('专注标题'), '合成长时专注')
  await user.selectOptions(
    screen.getByLabelText('分类（可选）'),
    screen.getByRole('option', { name: '工作' }),
  )
  let fail!: (error: Error) => void
  const start = vi.spyOn(FocusRepository.prototype, 'start').mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        fail = reject
      }),
  )
  await user.click(screen.getByRole('button', { name: '开始专注' }))
  const form = within(screen.getByRole('form', { name: '开始专注' }))
  expect(form.getByLabelText('专注标题')).toBeDisabled()
  expect(form.getByLabelText('自定义分钟数')).toBeDisabled()
  expect(form.getByLabelText('分类（可选）')).toBeDisabled()
  expect(form.getByRole('button', { name: '25 分钟' })).toBeDisabled()
  await user.click(form.getByRole('button', { name: '正在开始…' }))
  expect(start).toHaveBeenCalledTimes(1)
  await act(async () => fail(new Error('Synthetic failure')))
  expect(await form.findByRole('alert')).toHaveTextContent('本次输入仍保留')
  expect(form.getByLabelText('自定义分钟数')).toHaveValue(90)
  await user.click(form.getByRole('button', { name: '开始专注' }))
  expect(await screen.findByRole('heading', { name: '合成长时专注' })).toBeInTheDocument()
  expect((await database.focusSessions.toArray())[0]?.plannedDurationSeconds).toBe(5400)
  expect(await database.focusSessions.count()).toBe(1)
})
