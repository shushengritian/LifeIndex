import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { FocusPage } from '@/features/focus/FocusPage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
afterEach(async () => {
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})
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
