import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { DailyExpenseChart } from '@/features/finance/DailyExpenseChart'
import { buildTransaction } from '../fixtures/builders'

afterEach(cleanup)

it('sums only in-range expenses in integer minor units and fills unrecorded days with zero', () => {
  render(
    <DailyExpenseChart
      selectedDate="2026-09-08"
      transactions={[
        buildTransaction({ localDate: '2026-09-02', amountMinor: 123 }),
        buildTransaction({ localDate: '2026-09-02', amountMinor: 234 }),
        buildTransaction({ localDate: '2026-09-02', type: 'income', amountMinor: 999 }),
        buildTransaction({ localDate: '2026-09-01', amountMinor: 800 }),
        buildTransaction({ localDate: '2026-09-09', amountMinor: 800 }),
      ]}
    />,
  )
  const chart = screen.getByRole('img')
  expect(chart).toHaveAccessibleName(/2026-09-02：¥3.57/)
  expect(chart).toHaveAccessibleName(/2026-09-08：¥0.00/)
  expect(chart).not.toHaveAccessibleName(/2026-09-01|2026-09-09|9.99/)
  expect(screen.getByText('最高 ¥3.57')).toBeInTheDocument()
})

it('clips to month start and renders a single point instead of inventing earlier days', () => {
  const { container } = render(<DailyExpenseChart selectedDate="2026-03-01" transactions={[]} />)
  expect(screen.getByRole('img')).toHaveAccessibleName('2026-03-01：¥0.00')
  expect(container.querySelector('polyline')).toBeNull()
  expect(container.querySelectorAll('circle')).toHaveLength(1)
  expect(screen.getByText('这段时间暂无支出')).toBeInTheDocument()
})

it('keeps leap-day windows and large values finite', () => {
  const { container } = render(
    <DailyExpenseChart
      selectedDate="2028-02-29"
      transactions={[buildTransaction({ localDate: '2028-02-29', amountMinor: 999999999 })]}
    />,
  )
  expect(screen.getByRole('img')).toHaveAccessibleName(/2028-02-23/)
  expect(screen.getByRole('img')).toHaveAccessibleName(/2028-02-29/)
  expect(container.querySelector('polyline')?.getAttribute('points')).not.toMatch(/NaN|Infinity/)
})
