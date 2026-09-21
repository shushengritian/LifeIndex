import {
  addLocalDays,
  endOfLocalMonth,
  isLocalDateKey,
  startOfLocalMonth,
} from '@/shared/domain/date'
import { sumMoneyMinor } from '@/shared/domain/money'
import type { Category, LocalDateRange, Transaction, TransactionType } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'

const reportMoneyFormatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })

/** Keep the last cent exact even near MAX_SAFE_INTEGER; Number division by 100 can lose that cent. */
export function formatFinanceReportMoney(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    logger.warn('finance.report.moneyformatfailed', {
      operation: 'format',
      failureClass: 'Validation',
    })
    throw new RangeError('Finance report money must be a non-negative safe integer')
  }
  const minor = BigInt(amountMinor)
  const fraction = String(minor % 100n).padStart(2, '0')
  return reportMoneyFormatter
    .formatToParts(minor / 100n)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('')
}

export interface FinanceDailySeries {
  range: LocalDateRange
  type: TransactionType
  recordCount: number
  totalMinor: number
  maximumMinor: number
  days: Array<{ localDate: string; amountMinor: number }>
}

export interface FinanceReportCategory {
  categoryId: string
  name: string
  icon: string
  color: string
  archived: boolean
  missing: boolean
  amountMinor: number
  recordCount: number
  percentage: number
  percentageLabel: string
}

export interface FinanceMonthReport {
  monthRange: LocalDateRange
  trendRange: LocalDateRange
  type: TransactionType
  totalMinor: number
  recordCount: number
  categories: FinanceReportCategory[]
}

function assertRange(range: LocalDateRange, type: TransactionType): void {
  if (
    !isLocalDateKey(range.from) ||
    !isLocalDateKey(range.to) ||
    range.from > range.to ||
    (type !== 'expense' && type !== 'income')
  ) {
    throw new RangeError('Invalid finance report selection')
  }
}

function matchesRange(record: Transaction, range: LocalDateRange, type: TransactionType): boolean {
  return record.type === type && record.localDate >= range.from && record.localDate <= range.to
}

function addAmount(total: number, amount: number): number {
  // Reuse the storage-facing money contract: never round or clamp an unsafe sum into a chart.
  if (amount < 0) throw new RangeError('Finance report amounts must be non-negative')
  return sumMoneyMinor([total, amount])
}

/** Shared projection for the ledger's clipped seven days and the report's monthly trend. */
export function buildDailyTransactionSeries(
  transactions: readonly Transaction[],
  range: LocalDateRange,
  type: TransactionType,
): FinanceDailySeries {
  logger.info('finance.dailyseries.started', { operation: 'project', actionType: type })
  try {
    assertRange(range, type)
    const totals = new Map<string, number>()
    let recordCount = 0
    let totalMinor = 0
    for (const transaction of transactions) {
      if (!matchesRange(transaction, range, type)) continue
      totalMinor = addAmount(totalMinor, transaction.amountMinor)
      totals.set(
        transaction.localDate,
        addAmount(totals.get(transaction.localDate) ?? 0, transaction.amountMinor),
      )
      recordCount += 1
    }

    // Absence is not a measured zero: only an observed range earns zero-filled missing days.
    const days: FinanceDailySeries['days'] = []
    if (recordCount > 0) {
      for (let date = range.from; ; date = addLocalDays(date, 1)) {
        days.push({ localDate: date, amountMinor: totals.get(date) ?? 0 })
        // Stop before advancing the upper supported calendar boundary (9999-12-31).
        if (date === range.to) break
      }
    }
    logger.info('finance.dailyseries.completed', {
      operation: 'project',
      reason: recordCount > 0 ? 'recorded-range' : 'empty-range',
    })
    return {
      range: { ...range },
      type,
      recordCount,
      totalMinor,
      maximumMinor: days.reduce((maximum, day) => Math.max(maximum, day.amountMinor), 0),
      days,
    }
  } catch (error) {
    // Do not attach transactions, dates, category names, or the error message to logs.
    logger.error('finance.dailyseries.failed', error, {
      operation: 'project',
      failureClass: 'Validation',
    })
    throw error
  }
}

function resolveReportCategory(
  categoryId: string,
  type: TransactionType,
  categories: ReadonlyMap<string, Category>,
): Pick<FinanceReportCategory, 'categoryId' | 'name' | 'icon' | 'color' | 'archived' | 'missing'> {
  const category = categories.get(categoryId)
  const matchesType = (value: Category | undefined): value is Category =>
    value?.domain === 'finance' && value.transactionType === type
  const rootId = matchesType(category) ? (category.parentId ?? category.id) : categoryId
  const root = categories.get(rootId)
  // Exactly one parent lookup mirrors V4's two levels. Missing, cyclic or cross-domain references
  // retain their historical bucket and amount, never recurse or disappear from the total.
  const resolved = matchesType(category) && matchesType(root) && !root.parentId ? root : undefined
  return {
    categoryId: rootId,
    name: resolved?.name ?? '历史分类',
    icon: resolved?.icon ?? 'receipt',
    color: resolved?.color ?? 'blue',
    archived: resolved?.archived === 1,
    missing: !resolved,
  }
}

/** Read-only whole-month totals; only the current month's daily trend stops at the supplied today. */
export function buildFinanceMonthReport(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  monthDate: string,
  today: string,
  type: TransactionType,
): FinanceMonthReport {
  logger.info('finance.report.projectionstarted', { operation: 'project', actionType: type })
  try {
    if (!isLocalDateKey(today)) throw new RangeError('Invalid finance report today')
    const monthRange = { from: startOfLocalMonth(monthDate), to: endOfLocalMonth(monthDate) }
    assertRange(monthRange, type)
    const trendRange = {
      from: monthRange.from,
      to: monthDate.slice(0, 7) === today.slice(0, 7) ? today : monthRange.to,
    }
    const byId = new Map(categories.map((category) => [category.id, category]))
    const groups = new Map<string, FinanceReportCategory>()
    let totalMinor = 0
    let recordCount = 0
    for (const transaction of transactions) {
      if (!matchesRange(transaction, monthRange, type)) continue
      totalMinor = addAmount(totalMinor, transaction.amountMinor)
      recordCount += 1
      const category = resolveReportCategory(transaction.categoryId, type, byId)
      const group = groups.get(category.categoryId) ?? {
        ...category,
        amountMinor: 0,
        recordCount: 0,
        percentage: 0,
        percentageLabel: '0.0%',
      }
      // Each transaction enters one root bucket, including those recorded directly on the root.
      group.amountMinor = addAmount(group.amountMinor, transaction.amountMinor)
      group.recordCount += 1
      groups.set(group.categoryId, group)
    }
    const breakdown = [...groups.values()].sort(
      (left, right) =>
        right.amountMinor - left.amountMinor || left.categoryId.localeCompare(right.categoryId),
    )
    for (const group of breakdown) {
      // Divide before scaling to avoid unsafe integer multiplication; bar length remains unrounded.
      group.percentage = totalMinor > 0 ? (group.amountMinor / totalMinor) * 100 : 0
      group.percentageLabel =
        group.percentage > 0 && group.percentage < 0.1
          ? '不足 0.1%'
          : `${group.percentage.toFixed(1)}%`
    }
    if (breakdown.some((group) => group.missing)) {
      logger.warn('finance.report.referencefallback', {
        operation: 'project',
        reason: 'historical-reference',
      })
    }
    logger.info('finance.report.projectioncompleted', {
      operation: 'project',
      reason: recordCount > 0 ? 'recorded-month' : 'empty-month',
    })
    return { monthRange, trendRange, type, totalMinor, recordCount, categories: breakdown }
  } catch (error) {
    logger.error('finance.report.projectionfailed', error, {
      operation: 'project',
      failureClass: 'Validation',
    })
    throw error
  }
}
