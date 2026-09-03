import {
  addLocalDays,
  addLocalMonths,
  endOfLocalMonth,
  startOfLocalMonth,
  startOfLocalWeek,
} from '@/shared/domain/date'
import { sumMoneyMinor } from '@/shared/domain/money'
import type { Category, LocalDateRange, Transaction } from '@/shared/domain/types'

export type FinancePeriod = 'today' | 'week' | 'month' | 'history'

export interface FinanceSummary {
  incomeMinor: number
  expenseMinor: number
  balanceMinor: number
}

export function rangeForPeriod(period: FinancePeriod, today: string): LocalDateRange {
  if (period === 'today') return { from: today, to: today }
  if (period === 'week') {
    const from = startOfLocalWeek(today)
    return { from, to: addLocalDays(from, 6) }
  }
  if (period === 'month') return { from: startOfLocalMonth(today), to: endOfLocalMonth(today) }
  return { from: '1000-01-01', to: '9999-12-31' }
}

export function summarizeTransactions(transactions: readonly Transaction[]): FinanceSummary {
  const incomeMinor = sumMoneyMinor(
    transactions.filter(({ type }) => type === 'income').map(({ amountMinor }) => amountMinor),
  )
  const expenseMinor = sumMoneyMinor(
    transactions.filter(({ type }) => type === 'expense').map(({ amountMinor }) => amountMinor),
  )
  const balanceMinor = incomeMinor - expenseMinor
  if (!Number.isSafeInteger(balanceMinor)) throw new RangeError('Finance balance is unsafe')
  return { incomeMinor, expenseMinor, balanceMinor }
}

export function expenseByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): Array<{ categoryId: string; name: string; amountMinor: number }> {
  const categoryNames = new Map(categories.map(({ id, name }) => [id, name]))
  const totals = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    totals.set(
      transaction.categoryId,
      sumMoneyMinor([totals.get(transaction.categoryId) ?? 0, transaction.amountMinor]),
    )
  }
  return [...totals.entries()]
    .map(([categoryId, amountMinor]) => ({
      categoryId,
      name: categoryNames.get(categoryId) ?? '已归档分类',
      amountMinor,
    }))
    .sort((left, right) => right.amountMinor - left.amountMinor)
}

export function monthlyTrend(
  transactions: readonly Transaction[],
  endingMonthDate: string,
): Array<{ month: string; expenseMinor: number }> {
  const monthKeys = Array.from({ length: 6 }, (_, index) =>
    addLocalMonths(endingMonthDate, index - 5).slice(0, 7),
  )
  return monthKeys.map((month) => ({
    month,
    expenseMinor: sumMoneyMinor(
      transactions
        .filter(({ type, localDate }) => type === 'expense' && localDate.startsWith(month))
        .map(({ amountMinor }) => amountMinor),
    ),
  }))
}
