import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { logger } from '@/shared/logging/logger'

export interface HealthHistoryRow {
  id: string
  date: string
  time: string
  title: string
  subtitle: string
  icon: string
  color: string
}

export function HealthHistoryList({
  rows,
  onOpen,
}: {
  rows: HealthHistoryRow[]
  onOpen: (id: string) => void
}) {
  // Repository ordering is retained; a heading begins each contiguous local-calendar date group.
  return (
    <ul className="compact-history health-history-list">
      {rows.map((row, index) => (
        <li key={row.id}>
          {(index === 0 || rows[index - 1]?.date !== row.date) && <h3>{row.date}</h3>}
          <button
            type="button"
            className="health-history-open"
            aria-label={`编辑 ${row.title}`}
            onClick={() => {
              logger.info('health.history.opened', { operation: 'edit' })
              onOpen(row.id)
            }}
          >
            <span className={`category-glyph tone-${row.color}`}>
              <CategoryIcon name={row.icon} />
            </span>
            <span className="health-history-copy">
              <strong>{row.title}</strong>
              <small>
                {row.time} · {row.subtitle}
              </small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
