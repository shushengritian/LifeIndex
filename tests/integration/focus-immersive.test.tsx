import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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

async function setup(elapsed: number) {
  database = new LifeIndexDatabase(`Immersive-${crypto.randomUUID()}`)
  await database.initialize()
  const repository = new FocusRepository(database, { now: () => new Date(Date.now() - elapsed) })
  const session = await repository.start({ title: '合成专注', plannedDurationSeconds: 1500 })
  render(
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter>
        <PwaProvider>
          <FocusPage />
        </PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>,
  )
  await screen.findByRole('heading', { name: '合成专注' })
  return { session, user: userEvent.setup() }
}

it('collapses and reenters without a database write or changing the timing authority', async () => {
  const { session, user } = await setup(750000)
  const before = await database.focusSessions.get(session.id)
  const reconcile = vi.spyOn(FocusRepository.prototype, 'reconcileActive')
  expect(document.querySelectorAll('.focus-orbit circle')).toHaveLength(2)
  const progress = document.querySelector('.focus-orbit circle[pathLength]')!
  expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(50, 0)
  expect(document.querySelector('.focus-track')).not.toHaveAttribute('stroke-dasharray')
  expect(screen.queryByLabelText('专注汇总')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '收起计时，继续运行' }))
  expect(screen.getByLabelText('专注汇总')).toHaveTextContent('0 秒')
  expect(screen.getByRole('button', { name: '返回正在进行的专注' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: '返回正在进行的专注' }))
  expect(screen.getByRole('button', { name: '收起计时，继续运行' })).toHaveFocus()
  expect(await database.focusSessions.get(session.id)).toEqual(before)
  expect(reconcile).not.toHaveBeenCalled()
})

it('keeps automatic completion and retry alive while collapsed', async () => {
  const { session, user } = await setup(0)
  expect(document.querySelector('.focus-orbit circle[pathLength]')).toHaveAttribute(
    'stroke-dashoffset',
    '100',
  )
  await user.click(screen.getByRole('button', { name: '收起计时，继续运行' }))
  const endpoint = new Date(Date.now() - 1000).toISOString()
  vi.spyOn(FocusRepository.prototype, 'reconcileActive').mockRejectedValueOnce(
    new Error('Synthetic write'),
  )
  // Expire the persisted row to exercise real Dexie subscription and reconciliation, not a display counter.
  await act(async () => {
    await database.focusSessions.update(session.id, { expectedEndAt: endpoint })
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('时长已固定')
  await user.click(screen.getByRole('button', { name: '返回正在进行的专注' }))
  expect(document.querySelector('.focus-orbit circle[pathLength]')).toHaveAttribute(
    'stroke-dashoffset',
    '0',
  )
  expect(document.querySelector('.focus-track')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '重试保存' }))
  await waitFor(async () =>
    expect((await database.focusSessions.get(session.id))?.status).toBe('completed'),
  )
  expect((await database.focusSessions.get(session.id))?.endedAt).toBe(endpoint)
  await screen.findByRole('button', { name: '开始专注' })
  expect(document.querySelector('.focus-immersive')).not.toBeInTheDocument()
})
