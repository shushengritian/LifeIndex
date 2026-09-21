import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { AppServicesContext } from '@/app/AppServicesContext'
import { PwaProvider } from '@/pwa/PwaProvider'
import { FocusPage } from '@/features/focus/FocusPage'
import { TodayPage } from '@/features/today/TodayPage'
import { MemoryRouter } from 'react-router-dom'

let database: LifeIndexDatabase
afterEach(async () => {
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})
describe('focus completion recovery', () => {
  it.each(['focus', 'today'])(
    'recovers an expired session on %s without changing its endpoint',
    async (page) => {
      database = new LifeIndexDatabase(`Completion-${crypto.randomUUID()}`)
      await database.initialize()
      const clock = { now: () => new Date(Date.now() - 120_000) }
      const repository = new FocusRepository(database, clock)
      const session = await repository.start({ title: '到点失败测试', plannedDurationSeconds: 60 })
      const reconcile = vi
        .spyOn(FocusRepository.prototype, 'reconcileActive')
        .mockRejectedValueOnce(new Error('Synthetic failure'))
      render(
        <AppServicesContext.Provider value={{ database }}>
          <MemoryRouter>
            <PwaProvider>{page === 'focus' ? <FocusPage /> : <TodayPage />}</PwaProvider>
          </MemoryRouter>
        </AppServicesContext.Provider>,
      )
      expect(await screen.findByRole('alert')).toHaveTextContent('时长已固定')
      expect((await database.focusSessions.get(session.id))?.status).toBe('active')
      if (page === 'focus') {
        expect(screen.queryByRole('button', { name: '放弃本次，不保存' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: '提前结束' })).toBeDisabled()
      }
      await userEvent.click(
        screen.getByRole('button', { name: page === 'focus' ? '重试保存' : '重试保存专注' }),
      )
      await waitFor(async () =>
        expect((await database.focusSessions.get(session.id))?.status).toBe('completed'),
      )
      expect(await database.focusSessions.count()).toBe(1)
      expect(await database.focusSessions.get(session.id)).toMatchObject({
        endedAt: session.expectedEndAt,
        durationSeconds: 60,
        completionKind: 'timer',
      })
      expect(reconcile).toHaveBeenCalledTimes(2)
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    },
  )
})
