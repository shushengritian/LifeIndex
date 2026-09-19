import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { FocusHistoryPage } from '@/features/focus/FocusPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { usePwa } from '@/pwa/PwaContext'

let database: LifeIndexDatabase
function Counts() {
  const { busyFormCount } = usePwa()
  return <output aria-label="写入保护">{busyFormCount}</output>
}
afterEach(async () => {
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})

describe('focus details write guard', () => {
  it('locks edit/cancel while writing and retains the draft for a successful retry', async () => {
    database = new LifeIndexDatabase(`FocusGuard-${crypto.randomUUID()}`)
    await database.initialize()
    const repository = new FocusRepository(database)
    const session = await repository.start({ title: '测试专注', plannedDurationSeconds: 1500 })
    await repository.finishEarly(session.id, new Date(Date.now() + 60_000).toISOString())
    let rejectWrite!: (error: Error) => void
    const update = vi.spyOn(FocusRepository.prototype, 'updateDetails').mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectWrite = reject
        }),
    )
    render(
      <AppServicesContext.Provider value={{ database }}>
        <PwaProvider>
          <MemoryRouter>
            <FocusHistoryPage />
          </MemoryRouter>
          <Counts />
        </PwaProvider>
      </AppServicesContext.Provider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '编辑' }))
    const form = within(screen.getByRole('form', { name: '编辑专注记录' }))
    await user.clear(form.getByLabelText('专注标题'))
    await user.type(form.getByLabelText('专注标题'), '保留的草稿')
    await user.click(form.getByRole('button', { name: '保存描述' }))
    expect(screen.getByLabelText('写入保护')).toHaveTextContent('1')
    expect(form.getByLabelText('专注标题')).toBeDisabled()
    expect(form.getByRole('button', { name: '取消' })).toBeDisabled()
    await user.click(form.getByRole('button', { name: '保存中…' }))
    expect(update).toHaveBeenCalledTimes(1)
    await act(async () => rejectWrite(new Error('Synthetic write failure')))
    expect(await form.findByRole('alert')).toHaveTextContent('计时时长没有改变')
    expect(form.getByLabelText('专注标题')).toHaveValue('保留的草稿')
    expect(form.getByLabelText('专注标题')).toBeEnabled()
    expect(screen.getByLabelText('写入保护')).toHaveTextContent('0')
    await user.click(form.getByRole('button', { name: '保存描述' }))
    expect(
      await screen.findByText('保留的草稿', { selector: '.record-main span' }),
    ).toBeInTheDocument()
    expect((await database.focusSessions.get(session.id))?.durationSeconds).toBe(60)
  })
})
