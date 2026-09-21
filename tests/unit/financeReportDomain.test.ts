import { describe, expect, it, vi } from 'vitest'
import {
  buildDailyTransactionSeries,
  buildFinanceMonthReport,
  formatFinanceReportMoney,
} from '@/features/finance/financeReportDomain'
import type { Category } from '@/shared/domain/types'
import { buildTransaction, FIXED_NOW } from '../fixtures/builders'

function category(id: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    domain: 'finance',
    transactionType: 'expense',
    name: id,
    icon: 'food',
    color: 'blue',
    sortOrder: 0,
    archived: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}

describe('read-only finance month report', () => {
  it('counts each root or child record once and separates income, expense and month boundaries', () => {
    const categories = [
      category('food', { name: '餐饮' }),
      category('lunch', { parentId: 'food' }),
      category('coffee', { parentId: 'food' }),
      category('transport'),
      category('salary', { transactionType: 'income' }),
      category('salary-child', { parentId: 'salary', transactionType: 'income' }),
    ]
    const transactions = [
      buildTransaction({ categoryId: 'food', amountMinor: 101, localDate: '2026-09-01' }),
      buildTransaction({ categoryId: 'lunch', amountMinor: 202 }),
      buildTransaction({ categoryId: 'coffee', amountMinor: 303, localDate: '2026-09-30' }),
      buildTransaction({ categoryId: 'transport', amountMinor: 394 }),
      buildTransaction({ categoryId: 'food', amountMinor: 900, localDate: '2026-08-31' }),
      buildTransaction({ categoryId: 'food', amountMinor: 900, localDate: '2026-10-01' }),
      buildTransaction({ categoryId: 'salary', type: 'income', amountMinor: 12_000 }),
      buildTransaction({ categoryId: 'salary-child', type: 'income', amountMinor: 3_000 }),
    ]
    const before = structuredClone({ transactions, categories })
    const expense = buildFinanceMonthReport(
      transactions,
      categories,
      '2026-09-19',
      '2026-09-20',
      'expense',
    )
    expect(expense).toMatchObject({
      totalMinor: 1_000,
      recordCount: 4,
      monthRange: { from: '2026-09-01', to: '2026-09-30' },
      trendRange: { from: '2026-09-01', to: '2026-09-20' },
    })
    expect(expense.categories).toMatchObject([
      {
        categoryId: 'food',
        name: '餐饮',
        amountMinor: 606,
        recordCount: 3,
        percentageLabel: '60.6%',
      },
      { categoryId: 'transport', amountMinor: 394, recordCount: 1, percentageLabel: '39.4%' },
    ])
    const income = buildFinanceMonthReport(
      transactions,
      categories,
      '2026-09-01',
      '2026-09-20',
      'income',
    )
    expect(income).toMatchObject({ totalMinor: 15_000, recordCount: 2 })
    expect(income.categories).toMatchObject([
      { categoryId: 'salary', amountMinor: 15_000, recordCount: 2, percentage: 100 },
    ])
    expect({ transactions, categories }).toEqual(before)
  })

  it('keeps archived roots, archived children, orphan siblings and missing references in the total', () => {
    const result = buildFinanceMonthReport(
      [
        buildTransaction({ categoryId: 'archived-root', amountMinor: 10 }),
        buildTransaction({ categoryId: 'archived-child', amountMinor: 20 }),
        buildTransaction({ categoryId: 'orphan-one', amountMinor: 30 }),
        buildTransaction({ categoryId: 'orphan-two', amountMinor: 40 }),
        buildTransaction({ categoryId: 'missing', amountMinor: 50 }),
      ],
      [
        category('archived-root', { archived: 1 }),
        category('archived-child', { parentId: 'archived-root', archived: 1 }),
        category('orphan-one', { parentId: 'missing-parent' }),
        category('orphan-two', { parentId: 'missing-parent' }),
      ],
      '2026-09-01',
      '2026-09-20',
      'expense',
    )
    expect(result).toMatchObject({ totalMinor: 150, recordCount: 5 })
    expect(result.categories).toMatchObject([
      {
        categoryId: 'missing-parent',
        name: '历史分类',
        missing: true,
        amountMinor: 70,
        recordCount: 2,
      },
      { categoryId: 'missing', name: '历史分类', missing: true, amountMinor: 50, recordCount: 1 },
      {
        categoryId: 'archived-root',
        archived: true,
        missing: false,
        amountMinor: 30,
        recordCount: 2,
      },
    ])
  })

  it('terminates cyclic, cross-domain and wrong-type references without dropping their records', () => {
    const result = buildFinanceMonthReport(
      [
        buildTransaction({ categoryId: 'cycle', amountMinor: 10 }),
        buildTransaction({ categoryId: 'focus-child', amountMinor: 20 }),
        buildTransaction({ categoryId: 'income-child', amountMinor: 30 }),
      ],
      [
        category('cycle', { parentId: 'cycle' }),
        category('focus-child', { parentId: 'focus-root' }),
        category('focus-root', { domain: 'focus' }),
        category('income-child', { parentId: 'income-root' }),
        category('income-root', { transactionType: 'income' }),
      ],
      '2026-09-01',
      '2026-09-20',
      'expense',
    )
    expect(result.totalMinor).toBe(60)
    expect(result.categories).toHaveLength(3)
    expect(result.categories.every((group) => group.missing)).toBe(true)
  })

  it.each([
    ['2028-02-29', '2028-03-01', '2028-02-29'],
    ['2027-02-10', '2026-09-20', '2027-02-28'],
    ['2026-12-31', '2027-01-01', '2026-12-31'],
    ['2027-01-15', '2027-01-01', '2027-01-01'],
    ['1000-01-19', '2026-09-20', '1000-01-31'],
    ['9999-12-31', '2026-09-20', '9999-12-31'],
  ])('uses local calendar month boundaries for %s with today %s', (month, today, end) => {
    const result = buildFinanceMonthReport([], [], month, today, 'expense')
    expect(result.trendRange).toEqual({ from: month.slice(0, 7) + '-01', to: end })
  })

  it('returns an empty report for an unrecorded month or type without fabricating categories', () => {
    const transactions = [buildTransaction()]
    for (const [month, type] of [
      ['2026-09-01', 'income'],
      ['2026-08-01', 'expense'],
    ] as const) {
      expect(buildFinanceMonthReport(transactions, [], month, '2026-09-20', type)).toMatchObject({
        totalMinor: 0,
        recordCount: 0,
        categories: [],
      })
    }
  })

  it('preserves long names, safe large integers, tiny shares and stable sorting without rounding bar lengths', () => {
    const longName = '长分类名称'.repeat(30)
    const result = buildFinanceMonthReport(
      [
        buildTransaction({ categoryId: 'large', amountMinor: Number.MAX_SAFE_INTEGER - 2 }),
        buildTransaction({ categoryId: 'tiny-b', amountMinor: 1 }),
        buildTransaction({ categoryId: 'tiny-a', amountMinor: 1 }),
      ],
      [category('large', { name: longName }), category('tiny-a'), category('tiny-b')],
      '2026-09-01',
      '2026-09-20',
      'expense',
    )
    expect(result.totalMinor).toBe(Number.MAX_SAFE_INTEGER)
    expect(result.categories[0]?.name).toBe(longName)
    expect(result.categories.map((group) => group.categoryId)).toEqual([
      'large',
      'tiny-a',
      'tiny-b',
    ])
    expect(result.categories[1]?.percentageLabel).toBe('不足 0.1%')
    expect(
      result.categories.every(
        (group) =>
          Number.isFinite(group.percentage) && group.percentage >= 0 && group.percentage <= 100,
      ),
    ).toBe(true)
  })

  it('rejects overflow across separate categories and invalid selections without logging personal data', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const records = [
      buildTransaction({
        categoryId: 'large',
        amountMinor: Number.MAX_SAFE_INTEGER,
        note: 'private-report-note',
      }),
      buildTransaction({ categoryId: 'other', amountMinor: 1 }),
    ]
    expect(() =>
      buildFinanceMonthReport(
        records,
        [category('large', { name: 'private-report-name' })],
        '2026-09-01',
        '2026-09-20',
        'expense',
      ),
    ).toThrow(RangeError)
    expect(() => buildFinanceMonthReport([], [], '2026-02-30', '2026-09-20', 'expense')).toThrow(
      RangeError,
    )
    expect(() => buildFinanceMonthReport([], [], '2026-09-01', 'not-a-date', 'expense')).toThrow(
      RangeError,
    )
    expect(JSON.stringify([info.mock.calls, error.mock.calls])).not.toMatch(
      /private-report|9007199254740991|2026-09-01/,
    )
    expect(error).toHaveBeenCalledWith(
      '[LifeIndex] finance.report.projectionfailed',
      expect.objectContaining({ failureClass: 'Validation', errorName: 'RangeError' }),
    )
  })
})

describe('shared daily transaction series', () => {
  const range = { from: '2026-09-01', to: '2026-09-03' }

  it('stops at the last four-digit calendar day before adding another day', () => {
    const result = buildDailyTransactionSeries(
      [buildTransaction({ localDate: '9999-12-31', amountMinor: 1 })],
      { from: '9999-12-01', to: '9999-12-31' },
      'expense',
    )
    expect(result.days).toHaveLength(31)
    expect(result.days.at(-1)).toEqual({ localDate: '9999-12-31', amountMinor: 1 })
  })

  it('sums matching minor units and fills missing days only when this range and type has records', () => {
    const transactions = [
      buildTransaction({ amountMinor: 101, localDate: '2026-09-01' }),
      buildTransaction({ amountMinor: 202, localDate: '2026-09-01' }),
      buildTransaction({ amountMinor: 50, type: 'income', localDate: '2026-09-03' }),
      buildTransaction({ amountMinor: 999, localDate: '2026-08-31' }),
      buildTransaction({ amountMinor: 999, localDate: '2026-09-04' }),
    ]
    expect(buildDailyTransactionSeries(transactions, range, 'expense')).toMatchObject({
      recordCount: 2,
      totalMinor: 303,
      maximumMinor: 303,
      days: [
        { localDate: '2026-09-01', amountMinor: 303 },
        { localDate: '2026-09-02', amountMinor: 0 },
        { localDate: '2026-09-03', amountMinor: 0 },
      ],
    })
    expect(buildDailyTransactionSeries(transactions, range, 'income')).toMatchObject({
      recordCount: 1,
      totalMinor: 50,
      days: [
        { localDate: '2026-09-01', amountMinor: 0 },
        { localDate: '2026-09-02', amountMinor: 0 },
        { localDate: '2026-09-03', amountMinor: 50 },
      ],
    })
    expect(
      buildDailyTransactionSeries(transactions, { from: '2026-09-02', to: '2026-09-02' }, 'expense')
        .days,
    ).toEqual([])
  })

  it('keeps an observed zero distinct from an entirely missing type', () => {
    const transactions = [buildTransaction({ amountMinor: 0 })]
    expect(buildDailyTransactionSeries(transactions, range, 'expense')).toMatchObject({
      recordCount: 1,
      totalMinor: 0,
    })
    expect(buildDailyTransactionSeries(transactions, range, 'expense').days).toHaveLength(3)
    expect(buildDailyTransactionSeries(transactions, range, 'income')).toMatchObject({
      recordCount: 0,
      days: [],
    })
  })

  it('includes leap day and local DST calendar days without using occurredAt UTC dates', () => {
    expect(
      buildDailyTransactionSeries(
        [buildTransaction({ localDate: '2028-02-29' })],
        { from: '2028-02-28', to: '2028-03-01' },
        'expense',
      ).days.map((day) => day.localDate),
    ).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'])
    expect(
      buildDailyTransactionSeries(
        [buildTransaction({ localDate: '2026-03-08' })],
        { from: '2026-03-07', to: '2026-03-09' },
        'expense',
      ).days,
    ).toHaveLength(3)
  })

  it.each([Number.MAX_SAFE_INTEGER + 1, 1.2, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'rejects unsafe input %s instead of drawing a misleading series',
    (amountMinor) => {
      expect(() =>
        buildDailyTransactionSeries([buildTransaction({ amountMinor })], range, 'expense'),
      ).toThrow(RangeError)
    },
  )

  it('rejects unsafe totals across days as well as on the same day', () => {
    for (const date of ['2026-09-01', '2026-09-02']) {
      expect(() =>
        buildDailyTransactionSeries(
          [
            buildTransaction({ amountMinor: Number.MAX_SAFE_INTEGER, localDate: '2026-09-01' }),
            buildTransaction({ amountMinor: 1, localDate: date }),
          ],
          range,
          'expense',
        ),
      ).toThrow(RangeError)
    }
    expect(() =>
      buildDailyTransactionSeries([], { from: range.to, to: range.from }, 'expense'),
    ).toThrow(RangeError)
  })
})

describe('exact report currency display', () => {
  it.each([
    [0, '¥0.00'],
    [123, '¥1.23'],
    [Number.MAX_SAFE_INTEGER, '¥90,071,992,547,409.91'],
  ] as const)('formats %s minor units without dropping cents', (amount, expected) => {
    expect(formatFinanceReportMoney(amount)).toBe(expected)
  })

  it('rejects unsafe or negative values instead of formatting rounded data', () => {
    expect(() => formatFinanceReportMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
    expect(() => formatFinanceReportMoney(-1)).toThrow(RangeError)
  })
})
