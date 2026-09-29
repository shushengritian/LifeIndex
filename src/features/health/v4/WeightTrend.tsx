import type { WeightTrend as WeightTrendData } from '@/core/types'
import { Feedback } from '@/shared/ui/v4/Elements'

export function WeightTrend({ data }: { data: WeightTrendData }) {
  const points = data.points,
    first = points[0],
    last = points.at(-1)
  if (!first || !last)
    return (
      <Feedback kind="empty" title="这个范围还没有体重记录">
        从第一条开始，变化会慢慢出现在这里。
      </Feedback>
    )
  if (points.length < 2)
    return (
      <Feedback kind="empty" title="再留下一天，趋势就会出现">
        当前 {first.entry.weightGrams / 1000} kg。所有同日记录都保留在历史中。
      </Feedback>
    )
  const minimum = Math.min(...points.map((point) => point.entry.weightGrams)) - 200,
    maximum = Math.max(...points.map((point) => point.entry.weightGrams)) + 200
  const begin = Date.parse(`${first.localDate}T12:00:00Z`),
    end = Date.parse(`${last.localDate}T12:00:00Z`)
  const x = (date: string) =>
      16 + ((Date.parse(`${date}T12:00:00Z`) - begin) / (end - begin)) * 288,
    y = (value: number) => 130 - ((value - minimum) / (maximum - minimum)) * 108
  // Auto-scaled geometry is accompanied by visible magnitude, so small changes are never implied to be large.
  const difference = (last.entry.weightGrams - first.entry.weightGrams) / 1000
  return (
    <>
      <p className="v4-trend-summary">
        <strong>
          {first.entry.weightGrams / 1000} → {last.entry.weightGrams / 1000} kg
        </strong>
        <span>
          变化 {difference > 0 ? '+' : ''}
          {difference} kg
        </span>
      </p>
      <figure className="v4-weight-chart">
        <svg
          viewBox="0 0 320 150"
          role="img"
          aria-label={`体重趋势，${points.length}个日期，从${first.entry.weightGrams / 1000}到${last.entry.weightGrams / 1000}千克`}
        >
          <path className="v4-chart-grid" d="M16 22H304M16 76H304M16 130H304" />
          <polyline
            points={points
              .map((point) => `${x(point.localDate)},${y(point.entry.weightGrams)}`)
              .join(' ')}
          />
          {points.map((point) => (
            <circle
              key={point.localDate}
              cx={x(point.localDate)}
              cy={y(point.entry.weightGrams)}
              r="3.5"
            />
          ))}
        </svg>
        <figcaption>
          <span>{first.localDate}</span>
          <span>{last.localDate}</span>
        </figcaption>
      </figure>
      <p className="v4-scope-note">
        每自然日取当日最后录入。图线只连接真实记录，全部测量保留在历史。
      </p>
    </>
  )
}
