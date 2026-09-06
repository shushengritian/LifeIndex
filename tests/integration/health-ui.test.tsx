import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HealthPage } from '@/features/health/HealthPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []

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
    // Icon-only shortcuts remain explicit to assistive technology without looking like passive copy.
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
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('68.4 kg')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('45 分钟 · 较强')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('未能保存，本次输入仍保留')
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

    expect(await screen.findByRole('alert')).toHaveTextContent('目标未能清除')
    expect(screen.getByRole('form', { name: '体重目标' })).toBeInTheDocument()
    expect(await database.settings.get('weightTarget')).toMatchObject({
      value: { weightGrams: 65_000 },
    })
  })

  it('renders the four independent Settings groups in the approved order', async () => {
    const user = userEvent.setup()
    await renderPage('settings')
    await screen.findByRole('heading', { name: '分类' })
    const settings = await screen.findByRole('heading', { name: '设置' })
    const page = settings.closest('section')
    expect(page).not.toBeNull()
    const groupNames = within(page!)
      .getAllByRole('heading', { level: 2 })
      .map(({ textContent }) => textContent?.trim())

    expect(groupNames).toEqual(['分类', '外观', '数据与安全', '其他'])
    const categoryRegion = within(page!).getByRole('region', { name: '分类' })
    const categoryName = within(categoryRegion).getByLabelText('分类名称')
    expect(categoryName).not.toBeVisible()
    await user.click(within(categoryRegion).getByText('分类管理', { exact: true }))
    expect(categoryName).toBeVisible()
  })
})
