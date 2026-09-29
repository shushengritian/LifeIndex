import { usePageLog } from '@/features/today/v4/data'
import { HealthHistoryView } from './v4/HistoryView'
export function ActivityHistoryV4() {
  usePageLog('activity-history')
  return <HealthHistoryView kind="activity" />
}
