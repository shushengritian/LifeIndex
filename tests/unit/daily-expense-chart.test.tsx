import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DailyExpenseChart } from '@/features/finance/DailyExpenseChart'
import { FinanceReport, type FinanceReportProps } from '@/features/finance/FinanceReport'
import { buildTransaction, FIXED_NOW } from '../fixtures/builders'

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
  const { container } = render(
    <DailyExpenseChart
      selectedDate="2026-03-01"
      transactions={[
        buildTransaction({ localDate: '2026-03-01', amountMinor: 123 }),
        buildTransaction({ localDate: '2026-02-28' }),
      ]}
    />,
  )
  expect(screen.getByRole('img')).toHaveAccessibleName('2026-03-01：¥1.23')
  expect(container.querySelector('polyline')).toBeNull()
  expect(container.querySelectorAll('circle')).toHaveLength(1)
  expect(screen.getByText('最高 ¥1.23')).toBeInTheDocument()
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

it('clips the ledger window before subtracting at the lower supported year', () => {
  render(
    <DailyExpenseChart
      selectedDate="1000-01-01"
      transactions={[buildTransaction({ localDate: '1000-01-01', amountMinor: 1 })]}
    />,
  )
  expect(screen.getByRole('img')).toHaveAccessibleName('1000-01-01：¥0.01')
  expect(screen.queryByRole('alert')).toBeNull()
})

it.each(
  [
    [],
    [buildTransaction({ localDate: '2026-09-08', type: 'income' })],
    [buildTransaction({ localDate: '2026-09-01' }), buildTransaction({ localDate: '2026-09-09' })],
  ].map((transactions) => ({ transactions })),
)(
  'does not emit any SVG points, line or baseline for an empty selected expense range (%#)',
  ({ transactions }) => {
    const { container } = render(
      <DailyExpenseChart selectedDate="2026-09-08" transactions={transactions} />,
    )
    expect(screen.getByText('暂无记录，无法形成趋势')).toBeInTheDocument()
    expect(screen.getByText('09-02 — 09-08')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg, circle, polyline, polygon')).toBeNull()
  },
)

it('shares the series with report income, restores populated data on prop change, and preserves observed zeros', () => {
  const transactions = [
    buildTransaction({ type: 'income', localDate: '2026-09-02', amountMinor: 1_000 }),
  ]
  const { rerender } = render(
    <DailyExpenseChart
      transactions={transactions}
      fromDate="2026-09-01"
      selectedDate="2026-09-20"
      type="expense"
    />,
  )
  expect(screen.queryByRole('img')).toBeNull()
  rerender(
    <DailyExpenseChart
      transactions={transactions}
      fromDate="2026-09-01"
      selectedDate="2026-09-20"
      type="income"
    />,
  )
  expect(screen.getByRole('figure', { name: '每日收入' })).toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveAccessibleName(/2026-09-02：¥10.00/)
  expect(screen.getByRole('img')).toHaveAccessibleName(/2026-09-20：¥0.00/)
  rerender(
    <DailyExpenseChart
      transactions={[buildTransaction({ amountMinor: 0 })]}
      selectedDate="2026-09-03"
    />,
  )
  expect(screen.getByRole('img')).toBeInTheDocument()
  expect(screen.getByText('每日合计为 ¥0.00')).toBeInTheDocument()
})

it('shows an explicit projection error for overflow instead of crashing or claiming there are no records', () => {
  const { container } = render(
    <DailyExpenseChart
      selectedDate="2026-09-03"
      transactions={[
        buildTransaction({ amountMinor: Number.MAX_SAFE_INTEGER }),
        buildTransaction({ amountMinor: 1 }),
      ]}
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('金额或日期超出支持范围')
  expect(screen.queryByText('暂无记录，无法形成趋势')).toBeNull()
  expect(container.querySelector('svg')).toBeNull()
})

describe('FinanceReport prop-only composition', () => {
  function props(overrides: Partial<FinanceReportProps> = {}): FinanceReportProps {
    return {
      transactions: [],
      categories: [],
      monthDate: '2026-09-19',
      today: '2026-09-20',
      type: 'expense',
      onTypeChange: vi.fn(),
      onMonthChange: vi.fn(),
      ...overrides,
    }
  }

  it('keeps all switches usable in the empty state and delegates changes without owning a route or selection', () => {
    const input = props()
    const { container, rerender } = render(<FinanceReport {...input} />)
    expect(screen.getByText('本月暂无支出')).toBeInTheDocument()
    expect(screen.getByText('暂无记录，无法形成趋势')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('.finance-report-bar')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '报表上个月' }))
    fireEvent.click(screen.getByRole('button', { name: '报表下个月' }))
    fireEvent.click(screen.getByRole('button', { name: '收入' }))
    fireEvent.click(screen.getByRole('button', { name: '支出' }))
    expect(input.onMonthChange).toHaveBeenNthCalledWith(1, -1)
    expect(input.onMonthChange).toHaveBeenNthCalledWith(2, 1)
    expect(input.onTypeChange).toHaveBeenCalledExactlyOnceWith('income')
    expect(screen.getByRole('button', { name: '支出' })).toHaveAttribute('aria-pressed', 'true')
    rerender(<FinanceReport {...input} type="income" monthDate="2026-08-01" />)
    expect(screen.getByRole('heading', { name: '2026 年 8 月' })).toBeInTheDocument()
    expect(screen.getByText('本月暂无收入')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收入' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders exact category bar alternatives and counts, retains long names and archived roots, and clips the current trend to today', () => {
    const name = '合成旅行分类'.repeat(10)
    const input = props({
      transactions: [
        buildTransaction({ categoryId: 'trip', amountMinor: 10_000, localDate: '2026-09-01' }),
        buildTransaction({ categoryId: 'hotel', amountMinor: 5_000, localDate: '2026-09-30' }),
      ],
      categories: [
        {
          id: 'trip',
          domain: 'finance',
          transactionType: 'expense',
          name,
          icon: 'suitcase',
          color: 'blue',
          sortOrder: 0,
          archived: 1,
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        },
        {
          id: 'hotel',
          parentId: 'trip',
          domain: 'finance',
          transactionType: 'expense',
          name: '住宿',
          icon: 'hotel',
          color: 'blue',
          sortOrder: 1,
          archived: 0,
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        },
      ],
    })
    const { container } = render(<FinanceReport {...input} />)
    const categoryList = screen.getByRole('list', { name: '支出分类汇总' })
    expect(within(categoryList).getAllByRole('listitem')).toHaveLength(1)
    expect(categoryList).toHaveTextContent(name)
    expect(categoryList).toHaveTextContent('已归档')
    expect(within(categoryList).getByRole('img')).toHaveAccessibleName(
      `${name}，¥150.00，占比 100.0%，2 笔`,
    )
    expect(container.querySelector('.finance-report-bar rect:last-child')).toHaveAttribute(
      'width',
      '100',
    )
    const dailyChart = within(screen.getByRole('figure', { name: '每日支出' })).getByRole('img')
    expect(dailyChart).toHaveAccessibleName(/2026-09-01：¥100.00/)
    expect(dailyChart).toHaveAccessibleName(/2026-09-20：¥0.00/)
    expect(dailyChart).not.toHaveAccessibleName(/2026-09-21|2026-09-30/)
  })

  it('keeps a whole-month total with future entries while the observed-to-today trend is empty', () => {
    render(
      <FinanceReport
        {...props({ transactions: [buildTransaction({ localDate: '2026-09-30' })] })}
      />,
    )
    expect(screen.getByLabelText('报表月汇总')).toHaveTextContent('¥12.30')
    expect(screen.getByText('暂无记录，无法形成趋势')).toBeInTheDocument()
    expect(within(screen.getByRole('figure', { name: '每日支出' })).queryByRole('img')).toBeNull()
  })

  it('keeps controls available on unsafe aggregate errors and renders fresh data after recovery', () => {
    const input = props({
      transactions: [
        buildTransaction({ amountMinor: Number.MAX_SAFE_INTEGER }),
        buildTransaction({ amountMinor: 1 }),
      ],
    })
    const { rerender, container } = render(<FinanceReport {...input} />)
    expect(screen.getByRole('alert')).toHaveTextContent('暂时无法计算报表')
    expect(screen.queryByLabelText('报表月汇总')).toBeNull()
    expect(container.querySelector('.finance-report-bar')).toBeNull()
    expect(screen.getByRole('button', { name: '报表上个月' })).toBeEnabled()
    rerender(<FinanceReport {...input} transactions={[buildTransaction()]} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('报表月汇总')).toHaveTextContent('¥12.30')
  })

  it('disables only the exhausted month direction at supported calendar boundaries', () => {
    const input = props({ monthDate: '1000-01-19' })
    const { rerender } = render(<FinanceReport {...input} />)
    expect(screen.getByRole('button', { name: '报表上个月' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '报表下个月' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '报表上个月' }))
    expect(input.onMonthChange).not.toHaveBeenCalled()
    rerender(
      <FinanceReport
        {...input}
        monthDate="9999-12-31"
        transactions={[
          buildTransaction({ localDate: '9999-12-31', amountMinor: Number.MAX_SAFE_INTEGER }),
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: '报表上个月' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '报表下个月' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '报表下个月' }))
    expect(input.onMonthChange).not.toHaveBeenCalled()
    const daily = within(screen.getByRole('figure', { name: '每日支出' })).getByRole('img')
    expect(daily).toHaveAccessibleName(/9999-12-31：¥90,071,992,547,409.91/)
    expect(screen.getByLabelText('报表月汇总')).toHaveTextContent('¥90,071,992,547,409.91')
  })
})
