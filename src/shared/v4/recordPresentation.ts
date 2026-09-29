import type { RecordView } from '@/core/types'
import type { UiIconKey } from '@/shared/ui/v4/Icon'
import { formatDuration, formatMoney } from './format'

export function recordPresentation(record: RecordView): {
  title: string
  value: string
  icon: UiIconKey
} {
  switch (record.kind) {
    case 'transaction':
      return {
        title: record.category.name,
        value: `${record.entity.type === 'expense' ? '−' : '+'}¥${formatMoney(record.entity.amountMinor)}`,
        icon: record.category.iconKey,
      }
    case 'weight':
      return { title: '体重记录', value: `${record.entity.weightGrams / 1000} kg`, icon: 'weight' }
    case 'activity':
      return {
        title: record.category.name,
        value: `${record.entity.durationMinutes} 分钟`,
        icon: record.category.iconKey,
      }
    case 'focus':
      return {
        title: record.entity.title,
        value: formatDuration(record.entity.durationMs),
        icon: 'focus',
      }
    case 'habitCheck':
      return { title: record.habit.name, value: '已完成', icon: record.habit.iconKey }
  }
}
