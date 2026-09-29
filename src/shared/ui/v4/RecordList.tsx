import type { RecordView } from '@/core/types'
import { useFlow } from '@/app/v4/Flow'
import { recordPresentation } from '@/shared/v4/recordPresentation'
import { Icon } from './Icon'

export function RecordList({
  items,
  emptyText = '还没有记录，从一件小事开始。',
}: {
  items: RecordView[]
  emptyText?: string
}) {
  const flow = useFlow()
  if (!items.length) return <p className="empty-copy">{emptyText}</p>
  return (
    <ul className="v4-record-list">
      {items.map((record) => {
        const presentation = recordPresentation(record)
        const entity = record.entity
        let date = `${entity.localDate} · 日期记录`
        if (
          record.kind === 'focus' ||
          (record.kind === 'habitCheck' && record.entity.timePrecision === 'instant')
        ) {
          const instant =
            record.kind === 'focus' ? record.entity.startedAt : record.entity.completedAt!
          // An instant is rendered in its captured offset, never silently reassigned to the viewing device's timezone.
          date = `${entity.localDate} ${new Date(Date.parse(instant) + entity.utcOffsetMinutes * 60_000).toISOString().slice(11, 16)}`
        }
        return (
          <li key={`${record.kind}:${entity.id}`}>
            <button
              type="button"
              className="record-row"
              data-focus-key={`record:${record.kind}:${entity.id}`}
              onClick={() => flow.openRecord(record.kind, entity.id)}
            >
              <span className="record-sign">
                <Icon name={presentation.icon} />
              </span>
              <span className="record-copy">
                <strong>{presentation.title}</strong>
                <small>{date}</small>
              </span>
              <span className="record-value numeric">{presentation.value}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
