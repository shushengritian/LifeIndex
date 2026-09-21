import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { HealthPage } from '@/features/health/HealthPage'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase | undefined
afterEach(async () => {
  cleanup()
  await database?.delete()
  database = undefined
  vi.restoreAllMocks()
})

async function renderHealth() {
  database = new LifeIndexDatabase(`IconFirstHealth-${crypto.randomUUID()}`)
  await database.initialize()
  render(
    <AppServicesContext.Provider value={{ database }}>
      <MemoryRouter initialEntries={['/health']}>
        <PwaProvider>
          <Routes>
            <Route path="/health" element={<HealthPage />} />
            <Route path="/health/weight-history" element={<HealthPage history="weight" />} />
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
  const back = screen.getByRole('link', { name: '返回健康' })
  expect(back).toHaveTextContent('')
  expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  expect(back.closest('.page-heading-row')).not.toBeNull()
  await user.click(back)
  expect(await screen.findByRole('heading', { name: '健康' })).toBeInTheDocument()
  expect(await database!.weightEntries.count()).toBe(0)
})
