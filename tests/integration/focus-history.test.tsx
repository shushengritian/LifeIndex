import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { FocusHistoryPage, FocusPage } from '@/features/focus/FocusPage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase
afterEach(async () => {
  cleanup()
  await database?.delete()
})

it('keeps history off the timer page and filters records and totals together', async () => {
  database = new LifeIndexDatabase(`FocusHistory-${crypto.randomUUID()}`)
  await database.initialize()
  // Fixed local noon avoids crossing midnight while testing calendar-based filters.
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const old = new Date(today)
  old.setMonth(old.getMonth() - 2, 1)
  for (const [title, start, seconds] of [
    ['今天的记录', today, 119],
    ['较早的记录', old, 30],
  ] as const) {
    const repository = new FocusRepository(database, { now: () => start })
    const session = await repository.start({ title, plannedDurationSeconds: 1500 })
    await repository.finishEarly(
      session.id,
      new Date(start.getTime() + seconds * 1000).toISOString(),
    )
  }
  const view = (history: boolean) => (
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter>
        <PwaProvider>{history ? <FocusHistoryPage /> : <FocusPage />}</PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>
  )
  const { rerender } = render(view(false))
  expect(await screen.findByRole('link', { name: '查看专注历史' })).toHaveAttribute(
    'href',
    '/focus/history',
  )
  expect(screen.queryByText('今天的记录')).not.toBeInTheDocument()
  rerender(view(true))
  expect(await screen.findByText('较早的记录')).toBeInTheDocument()
  const user = userEvent.setup()
  const records = within(screen.getByRole('region', { name: '最近记录' }))
  const totals = within(screen.getByRole('region', { name: '分类汇总' }))
  expect(totals.getByText('2 分钟 29 秒')).toBeInTheDocument()
  for (const range of ['今天', '本周', '本月']) {
    await user.click(screen.getByRole('button', { name: range }))
    expect(records.getByText('今天的记录')).toBeInTheDocument()
    expect(records.queryByText('较早的记录')).not.toBeInTheDocument()
    expect(totals.getByText('1 分钟 59 秒')).toBeInTheDocument()
  }
  await user.click(screen.getByRole('button', { name: '全部' }))
  expect(records.getByText('较早的记录')).toBeInTheDocument()
  expect(records.getByText('30 秒')).toBeInTheDocument()
})
