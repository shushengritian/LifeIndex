import { describe, expect, it } from 'vitest'

import {
  buildFinanceMonthCalendar,
  expenseByCategory,
  monthlyTrend,
  moveFinanceMonthSelection,
  rangeForPeriod,
  summarizeTransactions,
} from '@/features/finance/financeDomain'
import { createSeedCategories } from '@/data/db/seeds'
import { buildTransaction, FIXED_NOW } from '../fixtures/builders'

describe('Finance domain projections', () => {
  it('builds a Monday-first month calendar with exact daily totals and selection', () => {
    const calendar = buildFinanceMonthCalendar('2026-09-03', '2026-09-03', '2026-09-03', [
      buildTransaction({ amountMinor: 1_230 }),
      buildTransaction({
        id: '00000000-0000-4000-8000-000000000099',
        type: 'income',
        categoryId: 'category-finance-income-salary-v1',
        amountMinor: 2_000,
      }),
    ])
    expect(calendar.leadingBlankCount).toBe(1)
    expect(calendar.days).toHaveLength(30)
    expect(calendar.days[2]).toMatchObject({
      selected: true,
      today: true,
      incomeMinor: 2_000,
      expenseMinor: 1_230,
      balanceMinor: 770,
    })
  })

  it('clamps month navigation to the target month', () => {
    expect(moveFinanceMonthSelection('2026-01-31', 1)).toBe('2026-02-28')
    expect(moveFinanceMonthSelection('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('uses Monday-through-Sunday and local month boundaries', () => {
    expect(rangeForPeriod('today', '2026-09-03')).toEqual({
      from: '2026-09-03',
      to: '2026-09-03',
    })
    expect(rangeForPeriod('week', '2026-09-03')).toEqual({
      from: '2026-08-31',
      to: '2026-09-06',
    })
    expect(rangeForPeriod('month', '2026-09-03')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('calculates exact income, expense, balance, and category totals', () => {
    const records = [
      buildTransaction({ amountMinor: 1_001 }),
      buildTransaction({
        id: '00000000-0000-4000-8000-000000000011',
        type: 'income',
        categoryId: 'category-finance-income-salary-v1',
        amountMinor: 5_000,
      }),
    ]
    expect(summarizeTransactions(records)).toEqual({
      incomeMinor: 5_000,
      expenseMinor: 1_001,
      balanceMinor: 3_999,
    })
    expect(expenseByCategory(records, createSeedCategories(FIXED_NOW))).toEqual([
      {
        categoryId: 'category-finance-expense-food-v1',
        name: '餐饮',
        amountMinor: 1_001,
      },
    ])
  })

  it('zero-fills a restrained six-month expense trend', () => {
    const trend = monthlyTrend(
      [
        buildTransaction({ localDate: '2026-04-12' }),
        buildTransaction({
          id: '00000000-0000-4000-8000-000000000012',
          localDate: '2026-09-03',
          amountMinor: 200,
        }),
      ],
      '2026-09-03',
    )
    expect(trend).toHaveLength(6)
    expect(trend[0]).toEqual({ month: '2026-04', expenseMinor: 1_230 })
    expect(trend[5]).toEqual({ month: '2026-09', expenseMinor: 200 })
    expect(trend[1]?.expenseMinor).toBe(0)
  })
})
