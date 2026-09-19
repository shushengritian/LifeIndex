import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HabitRepository } from '@/data/repositories/HabitRepository'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { toLocalDateKey } from '@/shared/domain/date'

let database: LifeIndexDatabase
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

it('keeps the home compact and shows real progress with failure-safe pause and resume', async () => {
  database = new LifeIndexDatabase(`HabitUi-${crypto.randomUUID()}`)
  await database.initialize()
  const repo = new HabitRepository(database)
  const habit = await repo.create({
    name: '合成阅读',
    icon: 'book',
    color: 'blue',
    schedule: { type: 'daily' },
    startLocalDate: toLocalDateKey(new Date()),
  })
  const view = (embedded: boolean) => (
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter>
        <PwaProvider>
          <HabitsPage embedded={embedded} />
        </PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>
  )
  const { rerender } = render(view(true))
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /合成阅读.*点按完成/ }))
  expect(await screen.findByRole('button', { name: /合成阅读.*已完成/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(screen.queryByRole('heading', { name: '全部习惯' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: '管理习惯与统计' })).toHaveAttribute(
    'href',
    '/health/habits',
  )
  rerender(view(false))
  await user.click(await screen.findByRole('button', { name: '查看 合成阅读 详情' }))
  const stats = within(screen.getByRole('dialog', { name: '习惯统计' }))
  expect(stats.getByRole('heading', { name: '合成阅读 · 统计' })).toBeInTheDocument()
  expect(stats.getByLabelText('合成阅读 近 14 周热力图').children).toHaveLength(98)
  expect(stats.getByText('全部完成').parentElement).toHaveTextContent('1 次')
  const cells = within(stats.getByLabelText('合成阅读 近 14 周热力图')).getAllByRole('button')
  expect(cells).toHaveLength(98)
  await user.click(cells[0]!)
  expect(cells[0]).toHaveAttribute('aria-pressed', 'true')
  expect(stats.getByRole('status')).toHaveTextContent('非计划日')
  // Inspecting history is read-only: neither earlier dates nor future cells create completions.
  expect(await database.habitRecords.count()).toBe(1)
  await user.click(stats.getByRole('button', { name: `${toLocalDateKey(new Date())} 已完成` }))
  expect(stats.getByRole('status')).toHaveTextContent('已完成')
  expect(await database.habitRecords.count()).toBe(1)
  await user.click(stats.getByRole('button', { name: '关闭统计' }))
  await user.click(screen.getByRole('button', { name: '查看 合成阅读 详情' }))
  vi.spyOn(HabitRepository.prototype, 'setStatus').mockRejectedValueOnce(
    new Error('Synthetic failure'),
  )
  await user.click(screen.getByRole('button', { name: '暂停' }))
  await user.click(screen.getByRole('button', { name: '确认暂停' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('历史记录没有被删除')
  expect((await database.habits.get(habit.id))?.status).toBe('active')
  await user.click(screen.getByRole('button', { name: '确认暂停' }))
  await user.click(await screen.findByRole('button', { name: '恢复' }))
  await user.click(screen.getByRole('button', { name: '确认恢复' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: '恢复习惯？' })).not.toBeInTheDocument(),
  )
  expect((await database.habits.get(habit.id))?.status).toBe('active')
  expect(await database.habitRecords.count()).toBe(1)
  await user.click(screen.getByRole('button', { name: '编辑' }))
  await user.type(screen.getByLabelText('习惯名称'), '未保存')
  await user.click(screen.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '继续填写' }))
  expect(screen.getByLabelText('习惯名称')).toHaveValue('合成阅读未保存')
  await user.click(screen.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '放弃修改' }))
  expect((await database.habits.get(habit.id))?.name).toBe('合成阅读')
})
