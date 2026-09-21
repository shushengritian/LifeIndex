import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CessationRepository } from '@/data/repositories/CessationRepository'
import { HealthPage } from '@/features/health/HealthPage'
import { CessationPage } from '@/features/health/cessation/CessationPage'
import { CravingForm } from '@/features/health/cessation/CessationForms'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase | undefined
afterEach(async () => {
  cleanup()
  await database?.delete()
  database = undefined
  vi.restoreAllMocks()
})

async function renderHealth(activePlan = false) {
  database = new LifeIndexDatabase(`IconFirstHealth-${crypto.randomUUID()}`)
  await database.initialize()
  if (activePlan)
    await new CessationRepository(database).start(crypto.randomUUID(), {
      startAt: new Date(Date.now() - 3600000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  render(
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter initialEntries={['/health']}>
        <PwaProvider>
          <Routes>
            <Route path="/health" element={<HealthPage />} />
            <Route path="/health/weight-history" element={<HealthPage history="weight" />} />
            <Route path="/health/cessation" element={<CessationPage />} />
          </Routes>
        </PwaProvider>
      </MemoryRouter>
    </AppServicesContext.Provider>,
  )
}

it('opens the empty weight history from content without creating a record or drawing samples', async () => {
  await renderHealth()
  const user = userEvent.setup()
  const region = screen.getByRole('region', { name: '体重' })
  const content = await within(region).findByRole('button', { name: '查看体重历史' })
  expect(content.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  expect(content.querySelector('.weight-trend-chart')).toBeNull()
  expect(
    within(region).getByRole('button', { name: '记录体重' }).closest('.section-heading'),
  ).not.toContainElement(content)
  await user.click(content)
  expect(await screen.findByRole('heading', { name: '体重历史' })).toBeInTheDocument()
  expect(await database!.weightEntries.count()).toBe(0)
})

it('opens plan creation in one content click without a nested action or implicit write', async () => {
  await renderHealth()
  const entry = await screen.findByRole('button', { name: '创建戒烟计划' })
  expect(entry.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  expect(screen.queryByRole('button', { name: '记录戒烟事件' })).toBeNull()
  await userEvent.click(entry)
  const dialog = await screen.findByRole('dialog', { name: '开始戒烟计划' })
  const save = within(dialog).getByRole('button', { name: '保存戒烟计划' }) as HTMLButtonElement
  expect(save.form).toBe(within(dialog).getByRole('form', { name: '开始戒烟计划' }))
  expect(save.closest('.sheet-header')).not.toBeNull()
  expect(await database!.cessationPlans.count()).toBe(0)
})

it('separates plan inspection from event creation and keeps all three explicit choices', async () => {
  await renderHealth(true)
  const user = userEvent.setup()
  const region = await screen.findByRole('region', { name: '戒烟' })
  const view = await within(region).findByRole('button', { name: '查看戒烟计划' })
  const add = within(region).getByRole('button', { name: '记录戒烟事件' })
  expect(view.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  expect(add.closest('.section-heading')).not.toContainElement(view)
  await user.click(add)
  const chooser = await screen.findByRole('dialog', { name: '记录戒烟事件' })
  for (const name of ['截至现在未吸烟', '记录吸烟', '记录烟瘾']) {
    expect(within(chooser).getByRole('button', { name })).toBeEnabled()
  }
  expect(await database!.cessationEvents.count()).toBe(0)
  expect(await database!.cessationDays.count()).toBe(0)
})

it.each(['缓解了', '还想抽'])(
  'saves the selected craving outcome %s through the guarded header form',
  async (label) => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('Synthetic write failure'))
      .mockResolvedValue(undefined)
    const close = vi.fn()
    render(
      <PwaProvider>
        <CravingForm onSave={onSave} onClose={close} />
      </PwaProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: label }))
    await user.click(screen.getByRole('button', { name: '保存烟瘾记录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留')
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '保存烟瘾记录' }))
    expect(onSave.mock.calls[0]![0]).toBe(onSave.mock.calls[1]![0])
    expect(onSave.mock.calls[1]![1]).toMatchObject({
      kind: 'craving',
      outcome: label === '缓解了' ? 'relieved' : 'still',
    })
    expect(close).toHaveBeenCalledOnce()
  },
)
