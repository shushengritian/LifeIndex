import { useEffect, useId } from 'react'
import { addLocalDays, startOfLocalMonth } from '@/shared/domain/date'
import { formatMoney } from '@/shared/domain/money'
import type { Transaction } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'

function dailyExpenseSeries(transactions: Transaction[], selectedDate: string) {
  // Match the approved calendar context: at most seven days, clipped to the viewed month.
  const from = [addLocalDays(selectedDate, -6), startOfLocalMonth(selectedDate)].sort().at(-1)!
  const totals = new Map<string, number>()
  for (const transaction of transactions) {
    if (
      transaction.type !== 'expense' ||
      transaction.localDate < from ||
      transaction.localDate > selectedDate
    )
      continue
    totals.set(
      transaction.localDate,
      (totals.get(transaction.localDate) ?? 0) + transaction.amountMinor,
    )
  }
  const result: Array<{ date: string; expenseMinor: number }> = []
  for (let date = from; date <= selectedDate; date = addLocalDays(date, 1)) {
    result.push({ date, expenseMinor: totals.get(date) ?? 0 })
  }
  return result
}

export function DailyExpenseChart({
  transactions,
  selectedDate,
}: {
  transactions: Transaction[]
  selectedDate: string
}) {
  const id = useId()
  const series = dailyExpenseSeries(transactions, selectedDate)
  const maximum = Math.max(...series.map(({ expenseMinor }) => expenseMinor))
  useEffect(() => {
    logger.info('finance.dailytrend.rendered', {
      operation: 'render',
      count: series.length,
      reason: maximum ? 'recorded-expense' : 'no-expense',
    })
  }, [series.length, maximum])
  // Anchor to zero; a single day is a point, not an invented historical line.
  const points = series.map((item, index) => ({
    ...item,
    x: series.length === 1 ? 160 : 8 + (index * 304) / (series.length - 1),
    y: 64 - (item.expenseMinor / Math.max(maximum, 1)) * 48,
  }))
  const first = points[0]!
  const last = points.at(-1)!
  return (
    <figure className="daily-expense-chart" aria-label="每日支出">
      <figcaption>
        <span>每日支出</span>
        <span>
          {first.date.slice(5)} — {last.date.slice(5)}
        </span>
      </figcaption>
      <svg viewBox="0 0 320 80" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>
          {series.map((item) => `${item.date}：${formatMoney(item.expenseMinor)}`).join('；')}
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
        <span>{Number(first.date.slice(-2))} 日</span>
        <span>{maximum ? `最高 ${formatMoney(maximum)}` : '这段时间暂无支出'}</span>
        <span>{Number(last.date.slice(-2))} 日</span>
      </div>
    </figure>
  )
}
