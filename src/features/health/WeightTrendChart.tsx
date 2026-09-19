import { useEffect, useId } from 'react'
import { addLocalDays } from '@/shared/domain/date'
import type { WeightEntry } from '@/shared/domain/types'
import { formatWeightGrams } from './healthDomain'
import { logger } from '@/shared/logging/logger'

export function WeightTrendChart({ entries, today }: { entries: WeightEntry[]; today: string }) {
  const id = useId()
  const from = addLocalDays(today, -29)
  // One point is the last measurement of a local day; do not synthesize missing days or future values.
  const days = new Map<string, WeightEntry>()
  for (const entry of entries) {
    if (entry.localDate < from || entry.localDate > today) continue
    const previous = days.get(entry.localDate)
    if (!previous || previous.measuredAt < entry.measuredAt) days.set(entry.localDate, entry)
  }
  const samples = [...days.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
  useEffect(() => {
    logger.info('health.trend.rendered', {
      operation: 'render',
      count: samples.length,
      reason: samples.length > 1 ? 'series' : 'insufficient-points',
    })
  }, [samples.length])
  if (!samples.length)
    return <p className="empty-state">近 30 天暂无体重记录，可在完整历史中查看更早记录。</p>
  const values = samples.map(({ weightGrams }) => weightGrams)
  // A minimum half-kilogram margin avoids visually magnifying tiny fluctuations.
  const low = Math.min(...values) - 500
  const high = Math.max(...values) + 500
  const start = Date.parse(`${from}T00:00:00Z`)
  const points = samples.map((entry) => ({
    ...entry,
    x: 42 + ((Date.parse(`${entry.localDate}T00:00:00Z`) - start) / 86400000 / 29) * 270,
    y: 100 - ((entry.weightGrams - low) / (high - low)) * 80,
  }))
  return (
    <figure className="weight-trend-chart">
      <svg viewBox="0 0 330 124" role="img" aria-labelledby={id}>
        <title id={id}>近 30 天体重趋势，{samples.length} 天有记录，单位公斤；空缺日期不补值</title>
        {[low, (low + high) / 2, high].map((value) => {
          const y = 100 - ((value - low) / (high - low)) * 80
          return (
            <g key={value}>
              <line x1="42" y1={y} x2="312" y2={y} stroke="var(--divider)" />
              <text x="1" y={y + 4} fill="var(--muted)" fontSize="10">
                {formatWeightGrams(Math.round(value))}
              </text>
            </g>
          )
        })}
        {points.length > 1 && (
          <polyline
            points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((point) => (
          <circle
            key={point.localDate}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth="1.5"
          >
            <title>
              {point.localDate}：{formatWeightGrams(point.weightGrams)} 公斤
            </title>
          </circle>
        ))}
      </svg>
      <figcaption>
        <span>{from.slice(5)}</span>
        <span>每日末次 · 连线仅示趋势</span>
        <span>{today.slice(5)}</span>
      </figcaption>
    </figure>
  )
}
