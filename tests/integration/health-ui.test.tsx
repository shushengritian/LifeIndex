import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HealthPage } from '@/features/health/HealthPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []

beforeAll(() => {
  // jsdom checks confirmation state; native top-layer behavior is a separate browser check.
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
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

async function renderPage(page: 'health' | 'settings') {
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  const database = new LifeIndexDatabase(`LifeIndexHealthUiTest-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize(new Date(FIXED_NOW))
  render(
    <MemoryRouter>
      <AppServicesContext.Provider value={{ database }}>
        <PwaProvider>{page === 'health' ? <HealthPage /> : <SettingsPage />}</PwaProvider>
      </AppServicesContext.Provider>
    </MemoryRouter>,
  )
  return database
}

describe('V2 Health user interface', () => {
  it('records weight and Activity through the combined Health add menu', async () => {
    const database = await renderPage('health')
    const user = userEvent.setup()

    const addHealth = screen.getByRole('button', { name: '添加健康记录' })
    const addWeight = screen.getByRole('button', { name: '记录体重' })
    const addActivity = screen.getByRole('button', { name: '记录运动' })
    // Icon-only entries remain explicit to assistive technology without looking like passive copy.
    expect(addHealth.querySelector('svg')).not.toBeNull()
    expect(addWeight.querySelector('svg')).not.toBeNull()
    expect(addActivity.querySelector('svg')).not.toBeNull()
    expect(addWeight).toHaveTextContent('')
    expect(addActivity).toHaveTextContent('')

    await user.click(addHealth)
    await user.click(
      within(screen.getByRole('dialog', { name: '添加健康记录' })).getByRole('button', {
        name: /记录体重/,
      }),
    )
    await user.type(screen.getByLabelText('体重（公斤）'), '68.4')
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    expect(
      await screen.findByText('68.4', { selector: '.weight-overview strong' }),
    ).toBeInTheDocument()
    expect(await database.weightEntries.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: '添加健康记录' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '添加健康记录' })).getByRole('button', {
        name: /记录运动/,
      }),
    )
    await user.selectOptions(screen.getByLabelText('运动类型'), 'category-activity-running-v2')
    await user.clear(screen.getByLabelText('时长（分钟）'))
    await user.type(screen.getByLabelText('时长（分钟）'), '45')
    await user.click(screen.getByRole('button', { name: '较强' }))
    await user.click(screen.getByRole('button', { name: '保存运动' }))

    expect(await screen.findByText('45 分钟')).toBeInTheDocument()
    expect(await database.activitySessions.count()).toBe(1)
    expect(await database.activitySessions.toCollection().first()).toMatchObject({
      categoryId: 'category-activity-running-v2',
      durationMinutes: 45,
      intensity: 'hard',
    })
  })

  it('keeps a weight draft visible when IndexedDB rejects the write', async () => {
    const database = await renderPage('health')
    vi.spyOn(database.weightEntries, 'add').mockRejectedValueOnce(
      new Error('SyntheticDatabaseWriteFailure'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '添加健康记录' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '添加健康记录' })).getByRole('button', {
        name: /记录体重/,
      }),
    )
    const weight = screen.getByLabelText('体重（公斤）')
    await user.type(weight, '72.3')
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('未能保存，本次输入仍保留')
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(weight).toHaveValue('72.3')
    expect(await database.weightEntries.count()).toBe(0)
  })

  it('keeps the existing target and sheet open when target clearing fails', async () => {
    const database = await renderPage('health')
    const timestamp = new Date(FIXED_NOW).toISOString()
    await database.settings.put({
      key: 'weightTarget',
      value: { weightGrams: 65_000 },
      updatedAt: timestamp,
    })
    vi.spyOn(database.settings, 'delete').mockRejectedValueOnce(
      new Error('SyntheticDatabaseDeleteFailure'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /65\.0 kg/ }))
    await user.click(screen.getByRole('button', { name: '清除目标' }))
    await user.click(screen.getByRole('button', { name: '确认清除' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('目标未能清除')
    expect(screen.getByRole('form', { name: '体重目标' })).toBeInTheDocument()
    expect(await database.settings.get('weightTarget')).toMatchObject({
      value: { weightGrams: 65_000 },
    })
    await user.click(screen.getByRole('button', { name: '确认清除' }))
    expect(await screen.findByRole('button', { name: /未设置/ })).toBeInTheDocument()
    expect(await database.settings.get('weightTarget')).toBeUndefined()
  })

  it('keeps the existing weight target when changed input is explicitly discarded', async () => {
    const database = await renderPage('health')
    await database.settings.put({
      key: 'weightTarget',
      value: { weightGrams: 65000 },
      updatedAt: new Date().toISOString(),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /65\.0 kg/ }))
    await user.clear(screen.getByLabelText('目标（公斤）'))
    await user.type(screen.getByLabelText('目标（公斤）'), '64')
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    await user.click(screen.getByRole('button', { name: '继续编辑' }))
    expect(screen.getByLabelText('目标（公斤）')).toHaveValue('64')
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    await user.click(screen.getByRole('button', { name: '放弃修改' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await database.settings.get('weightTarget'))?.value).toEqual({ weightGrams: 65000 })
  })

  it('renders the four independent Settings groups in the approved order', async () => {
    const user = userEvent.setup()
    const database = await renderPage('settings')
    await screen.findByRole('heading', { name: '分类' })
    const settings = await screen.findByRole('heading', { name: '设置' })
    const page = settings.closest('section')
    expect(page).not.toBeNull()
    const groupNames = within(page!)
      .getAllByRole('heading', { level: 2 })
      .map(({ textContent }) => textContent?.trim())

    expect(groupNames).toEqual(['分类', '外观', '数据与安全', '其他'])
    const categoryRegion = within(page!).getByRole('region', { name: '分类' })
    expect(within(categoryRegion).queryByLabelText('分类名称')).not.toBeInTheDocument()
    await user.click(within(categoryRegion).getByText('分类管理', { exact: true }))
    await user.click(within(categoryRegion).getByRole('button', { name: '餐饮' }))
    await user.click(within(categoryRegion).getByRole('button', { name: '新增二级分类' }))
    await user.type(screen.getByLabelText('分类名称'), '早餐测试')
    // Child creation is name-only; inherited styling keeps the existing V4 contract valid.
    expect(screen.queryByRole('group', { name: '图标颜色' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '图标 水果' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('button', { name: '早餐测试' })).toBeVisible()
    const child = await database.categories
      .where('parentId')
      .equals('category-finance-expense-food-v1')
      .first()
    const parent = await database.categories.get('category-finance-expense-food-v1')
    expect(child).toMatchObject({ name: '早餐测试', icon: parent?.icon, color: parent?.color })
    expect(screen.getByRole('button', { name: '早餐测试' }).querySelector('svg')).toBeNull()
  })
})
