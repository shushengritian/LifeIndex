import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { WeightRepository } from '@/data/repositories/WeightRepository'
import { ActivityRepository } from '@/data/repositories/ActivityRepository'
import { HealthPage } from '@/features/health/HealthPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { toLocalDateKey } from '@/shared/domain/date'

let database: LifeIndexDatabase

it.each(['weight', 'activity'] as const)(
  'protects a %s draft during writes and explicit discard',
  async (kind) => {
    database = new LifeIndexDatabase(`HealthDraft-${crypto.randomUUID()}`)
    await database.initialize()
    render(
      <AppServicesContext.Provider value={{ database }}>
        <MemoryRouter>
          <PwaProvider>
            <HealthPage history={kind} />
          </PwaProvider>
        </MemoryRouter>
      </AppServicesContext.Provider>,
    )
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: kind === 'weight' ? '记录体重' : '记录运动' }),
    )
    const form = within(
      await screen.findByRole('form', { name: kind === 'weight' ? '记录体重' : '记录运动' }),
    )
    const field = form.getByLabelText(kind === 'weight' ? '体重（公斤）' : '时长（分钟）')
    await user.clear(field)
    await user.type(field, kind === 'weight' ? '68.5' : '40')
    const saveLabel = kind === 'weight' ? '保存体重' : '保存运动'
    // The toolbar button submits its associated form from outside the scrolling field body.
    expect(screen.getByRole('button', { name: saveLabel }).closest('.sheet-form-body')).toBeNull()
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    await user.click(screen.getByRole('button', { name: '继续填写' }))
    expect(field).toBeEnabled()
    let rejectWrite!: (error: Error) => void
    const write =
      kind === 'weight'
        ? vi.spyOn(WeightRepository.prototype, 'create')
        : vi.spyOn(ActivityRepository.prototype, 'create')
    write.mockImplementationOnce(
      () =>
        new Promise<never>((_, reject) => {
          rejectWrite = reject
        }),
    )
    await user.click(screen.getByRole('button', { name: saveLabel }))
    expect(field).toBeDisabled()
    expect(form.getByLabelText('日期与时间')).toBeDisabled()
    expect(screen.getByRole('button', { name: '关闭编辑器' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: `${saveLabel}，保存中` }))
    expect(write).toHaveBeenCalledTimes(1)
    await act(async () => rejectWrite(new Error('Synthetic failure')))
    expect(await form.findByRole('alert')).toHaveTextContent('本次输入仍保留')
    expect(field).toBeEnabled()
    // Model WebKit committing a native picker value before dispatching its change event.
    const nativeDate = form.getByLabelText('日期与时间') as HTMLInputElement
    nativeDate.value = '2026-09-01T12:34'
    await user.click(screen.getByRole('button', { name: saveLabel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const entries =
      kind === 'weight'
        ? await database.weightEntries.toArray()
        : await database.activitySessions.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.localDate).toBe('2026-09-01')
    expect(write).toHaveBeenCalledTimes(2)
    await user.click(
      screen.getByRole('button', { name: kind === 'weight' ? '记录体重' : '记录运动' }),
    )
    await user.type(screen.getByLabelText('备注（可选）'), '合成未保存内容')
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    await user.click(screen.getByRole('button', { name: '放弃输入' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  },
)
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

it.each(['weight', 'activity'] as const)(
  'retains the %s editor after a background read failure',
  async (kind) => {
    database = new LifeIndexDatabase(`HealthReadDraft-${crypto.randomUUID()}`)
    await database.initialize()
    const now = new Date()
    await new WeightRepository(database).create({
      weightGrams: 68000,
      measuredAt: now.toISOString(),
      localDate: toLocalDateKey(now),
      timezoneOffsetMinutes: now.getTimezoneOffset(),
    })
    await new ActivityRepository(database).create({
      categoryId: 'category-activity-running-v2',
      durationMinutes: 30,
      intensity: 'light',
      occurredAt: now.toISOString(),
      localDate: toLocalDateKey(now),
      timezoneOffsetMinutes: now.getTimezoneOffset(),
    })
    render(
      <AppServicesContext.Provider value={{ database }}>
        <MemoryRouter>
          <PwaProvider>
            <HealthPage history={kind} />
          </PwaProvider>
        </MemoryRouter>
      </AppServicesContext.Provider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^编辑/ }))
    await user.type(screen.getByLabelText('备注（可选）'), '合成草稿')
    const read =
      kind === 'weight'
        ? vi.spyOn(WeightRepository.prototype, 'list')
        : vi.spyOn(ActivityRepository.prototype, 'list')
    read.mockRejectedValue(new Error('Synthetic read failure'))
    // Trigger the observed query using only this test database; the mounted draft must survive.
    await act(async () => {
      if (kind === 'weight')
        await database.weightEntries.toCollection().modify({ note: 'Synthetic refresh' })
      else await database.activitySessions.toCollection().modify({ note: 'Synthetic refresh' })
    })
    await screen.findByText(
      kind === 'weight'
        ? '体重记录暂时无法读取；运动和习惯仍可使用。'
        : '运动记录暂时无法读取；体重和习惯仍可使用。',
    )
    expect(screen.getByLabelText('备注（可选）')).toHaveValue('合成草稿')
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    expect(
      screen.getByRole('dialog', { name: kind === 'weight' ? '放弃体重输入？' : '放弃运动输入？' }),
    ).toBeInTheDocument()
  },
)
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
afterEach(async () => {
  cleanup()
  await database?.delete()
  vi.restoreAllMocks()
})

it.each(['weight', 'activity'] as const)(
  'exposes every %s record and preserves it through a failed deletion',
  async (kind) => {
    database = new LifeIndexDatabase(`HealthHistory-${crypto.randomUUID()}`)
    await database.initialize()
    const weights = new WeightRepository(database)
    const activities = new ActivityRepository(database)
    // R02 requires forty records, including access to the oldest and an erroneous editable future date.
    const historyCount = 40
    for (let index = 0; index < historyCount; index++) {
      const date = new Date()
      date.setDate(date.getDate() - index + 1)
      const base = {
        localDate: toLocalDateKey(date),
        timezoneOffsetMinutes: date.getTimezoneOffset(),
      }
      if (kind === 'weight')
        await weights.create({
          ...base,
          weightGrams: 65000 + index * 100,
          measuredAt: date.toISOString(),
        })
      else
        await activities.create({
          ...base,
          categoryId: 'category-activity-running-v2',
          durationMinutes: 30 + index,
          intensity: 'light',
          occurredAt: date.toISOString(),
        })
    }
    const view = (history?: 'weight' | 'activity') => (
      <AppServicesContext.Provider value={{ database }}>
        <MemoryRouter>
          <PwaProvider>
            <HealthPage {...(history ? { history } : {})} />
          </PwaProvider>
        </MemoryRouter>
      </AppServicesContext.Provider>
    )
    const { rerender } = render(view())
    expect(
      await screen.findByRole('button', {
        name: kind === 'weight' ? '查看体重历史' : '查看运动历史',
      }),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('.compact-history li')).toHaveLength(0)
    rerender(view(kind))
    await waitFor(() =>
      expect(document.querySelectorAll('.compact-history li')).toHaveLength(historyCount),
    )
    expect(screen.queryByRole('heading', { name: '习惯' })).not.toBeInTheDocument()
    const user = userEvent.setup()
    const first = within(document.querySelector('.compact-history li') as HTMLElement)
    await user.click(first.getByRole('button', { name: /^编辑/ }))
    const form = within(
      screen.getByRole('form', { name: kind === 'weight' ? '编辑体重' : '编辑运动' }),
    )
    expect((form.getByLabelText('日期与时间') as HTMLInputElement).value).toContain(
      toLocalDateKey(new Date(Date.now() + 86400000)),
    )
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    const oldestItem = () =>
      within(Array.from(document.querySelectorAll('.compact-history li')).at(-1) as HTMLElement)
    await user.click(oldestItem().getByRole('button', { name: /^编辑/ }))
    const oldestForm = within(
      screen.getByRole('form', { name: kind === 'weight' ? '编辑体重' : '编辑运动' }),
    )
    const oldestDate = new Date()
    oldestDate.setDate(oldestDate.getDate() - historyCount + 2)
    expect((oldestForm.getByLabelText('日期与时间') as HTMLInputElement).value).toContain(
      toLocalDateKey(oldestDate),
    )
    await user.type(oldestForm.getByLabelText('备注（可选）'), '合成最早记录已编辑')
    await user.click(
      screen.getByRole('button', { name: kind === 'weight' ? '保存体重' : '保存运动' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const stored =
      kind === 'weight'
        ? await database.weightEntries.toArray()
        : await database.activitySessions.toArray()
    expect(stored.find((row) => row.note === '合成最早记录已编辑')?.localDate).toBe(
      toLocalDateKey(oldestDate),
    )
    const remove =
      kind === 'weight'
        ? vi.spyOn(WeightRepository.prototype, 'remove')
        : vi.spyOn(ActivityRepository.prototype, 'remove')
    remove.mockRejectedValueOnce(new Error('Synthetic failure'))
    await user.click(oldestItem().getByRole('button', { name: /^编辑/ }))
    await user.click(screen.getByRole('button', { name: '删除记录' }))
    const confirm = within(
      screen.getByRole('dialog', { name: kind === 'weight' ? '删除体重记录？' : '删除运动记录？' }),
    )
    await user.click(confirm.getByRole('button', { name: '删除记录' }))
    expect(await confirm.findByRole('alert')).toHaveTextContent('现有数据没有改变')
    expect(document.querySelectorAll('.compact-history li')).toHaveLength(historyCount)
    await user.click(confirm.getByRole('button', { name: '删除记录' }))
    await waitFor(() =>
      expect(document.querySelectorAll('.compact-history li')).toHaveLength(historyCount - 1),
    )
    expect(remove).toHaveBeenCalledTimes(2)
  },
)
