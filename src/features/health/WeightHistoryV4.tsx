import { usePageLog } from '@/features/today/v4/data'
import { HealthHistoryView } from './v4/HistoryView'
export function WeightHistoryV4() {
  usePageLog('weight-history')
  return <HealthHistoryView kind="weight" />
}
