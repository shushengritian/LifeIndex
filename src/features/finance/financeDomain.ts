import {
  addLocalDays,
  addLocalMonths,
  endOfLocalMonth,
  parseLocalDateKey,
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

export interface FinanceCalendarDay extends FinanceSummary {
  localDate: string
  day: number
  hasRecords: boolean
  selected: boolean
  today: boolean
}

export interface FinanceMonthCalendar {
  monthStart: string
  monthEnd: string
  leadingBlankCount: number
  days: FinanceCalendarDay[]
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

export function buildFinanceMonthCalendar(
  visibleMonthDate: string,
  selectedDate: string,
  today: string,
  transactions: readonly Transaction[],
): FinanceMonthCalendar {
  const monthStart = startOfLocalMonth(visibleMonthDate)
  const monthEnd = endOfLocalMonth(visibleMonthDate)
  const first = parseLocalDateKey(monthStart)
  if (!first) throw new RangeError('Invalid finance month')
  const recordsByDate = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const records = recordsByDate.get(transaction.localDate) ?? []
    records.push(transaction)
    recordsByDate.set(transaction.localDate, records)
  }

  // Monday-first padding is presentation data; real dates remain stable local calendar keys.
  const leadingBlankCount = (first.getDay() + 6) % 7
  const dayCount = Number(monthEnd.slice(8))
  const days = Array.from({ length: dayCount }, (_, index) => {
    const localDate = `${monthStart.slice(0, 8)}${String(index + 1).padStart(2, '0')}`
    const records = recordsByDate.get(localDate) ?? []
    return {
      localDate,
      day: index + 1,
      hasRecords: records.length > 0,
      selected: localDate === selectedDate,
      today: localDate === today,
      ...summarizeTransactions(records),
    }
  })
  return { monthStart, monthEnd, leadingBlankCount, days }
}

export function moveFinanceMonthSelection(selectedDate: string, amount: number): string {
  const selected = parseLocalDateKey(selectedDate)
  if (!selected || !Number.isInteger(amount)) throw new RangeError('Invalid month selection')
  const targetStart = addLocalMonths(selectedDate, amount)
  const targetLastDay = Number(endOfLocalMonth(targetStart).slice(8))
  const clampedDay = Math.min(selected.getDate(), targetLastDay)
  return `${targetStart.slice(0, 8)}${String(clampedDay).padStart(2, '0')}`
}
