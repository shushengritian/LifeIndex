import { useEffect, useId, useMemo } from 'react'
import { addLocalDays, startOfLocalMonth } from '@/shared/domain/date'
import type { Transaction, TransactionType } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'
import { buildDailyTransactionSeries, formatFinanceReportMoney } from './financeReportDomain'

export interface DailyExpenseChartProps {
  transactions: Transaction[]
  selectedDate: string
  /** Reports supply their month start; omission preserves the ledger's clipped seven-day window. */
  fromDate?: string
  type?: TransactionType
}

export function DailyExpenseChart({
  transactions,
  selectedDate,
  fromDate,
  type = 'expense',
}: DailyExpenseChartProps) {
  const id = useId()
  const label = type === 'income' ? '收入' : '支出'
  const projection = useMemo(() => {
    try {
      // Clip before subtracting, so a ledger at 1000-01-01 never produces a three-digit year key.
      // Report callers still supply their full-month start explicitly.
      const from =
        fromDate ??
        (Number(selectedDate.slice(8)) <= 7
          ? startOfLocalMonth(selectedDate)
          : addLocalDays(selectedDate, -6))
      return {
        status: 'ready' as const,
        data: buildDailyTransactionSeries(transactions, { from, to: selectedDate }, type),
      }
    } catch (error) {
      // An unsafe total is not an empty dataset. Keep the rest of the page usable, without fake points.
      logger.error('finance.dailytrend.projectionfailed', error, {
        operation: 'render',
        failureClass: 'Validation',
      })
      return { status: 'error' as const }
    }
  }, [transactions, selectedDate, fromDate, type])
  const state =
    projection.status === 'error' ? 'error' : projection.data.recordCount > 0 ? 'recorded' : 'empty'
  useEffect(() => {
    logger.info('finance.dailytrend.rendered', {
      operation: 'render',
      actionType: type,
      toState: state,
    })
  }, [state, type])
  if (projection.status === 'error') {
    return (
      <figure className="daily-expense-chart" aria-label={`每日${label}`}>
        <figcaption>每日{label}</figcaption>
        <p className="form-error" role="alert">
          暂时无法计算趋势。金额或日期超出支持范围，请检查账目后重试。
        </p>
      </figure>
    )
  }
  const { days: series, maximumMinor: maximum, range } = projection.data
  const caption = (
    <figcaption>
      <span>每日{label}</span>
      <span>
        {range.from.slice(5)} — {range.to.slice(5)}
      </span>
    </figcaption>
  )
  if (projection.data.recordCount === 0) {
    // No SVG (including its zero baseline) is emitted when this selected range/type has no records.
    return (
      <figure className="daily-expense-chart" aria-label={`每日${label}`}>
        {caption}
        <p className="empty-state">暂无记录，无法形成趋势</p>
      </figure>
    )
  }
  // Anchor to zero; a single day is a point, not an invented historical line.
  const points = series.map((item, index) => ({
    ...item,
    x: series.length === 1 ? 160 : 8 + (index * 304) / (series.length - 1),
    y: 64 - (item.amountMinor / Math.max(maximum, 1)) * 48,
  }))
  const first = points[0]!
  const last = points.at(-1)!
  return (
    <figure className="daily-expense-chart" aria-label={`每日${label}`}>
      {caption}
      <svg viewBox="0 0 320 80" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>
          {series
            .map((item) => `${item.localDate}：${formatFinanceReportMoney(item.amountMinor)}`)
            .join('；')}
        </title>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--accent)" stopOpacity=".2" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[16, 40, 64].map((y) => (
          <line
            key={y}
            x1="8"
            x2="312"
            y1={y}
            y2={y}
            stroke="var(--divider)"
            strokeDasharray="3 5"
          />
        ))}
        {points.length > 1 && (
          <>
            <polygon
              points={`${first.x},64 ${points.map(({ x, y }) => `${x},${y}`).join(' ')} ${last.x},64`}
              fill={`url(#${id}-fill)`}
            />
            <polyline
              points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        <circle
          cx={last.x}
          cy={last.y}
          r="4"
          fill="var(--accent)"
          stroke="var(--surface)"
          strokeWidth="2"
        />
      </svg>
      <div className="daily-expense-axis">
        <span>{Number(first.localDate.slice(-2))} 日</span>
        <span>{maximum ? `最高 ${formatFinanceReportMoney(maximum)}` : '每日合计为 ¥0.00'}</span>
        <span>{Number(last.localDate.slice(-2))} 日</span>
      </div>
      {fromDate && <p className="finance-report-baseline">纵轴从 ¥0.00 起。</p>}
    </figure>
  )
}
