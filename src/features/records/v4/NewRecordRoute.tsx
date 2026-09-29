import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFlow, type CreateKind, type FlowRouteState } from '@/app/v4/Flow'
import { Modal } from '@/shared/ui/v4/Modal'
import { Feedback } from '@/shared/ui/v4/Elements'
import { RecordEditor } from './RecordEditor'

export function NewRecordRoute() {
  const { kind } = useParams(),
    location = useLocation(),
    services = useV4Services(),
    flow = useFlow()
  const query = useV4Query(
    useCallback(async () => {
      const result = await services.categories.list({ includeArchived: true })
      return { stamp: result.stamp, data: { categories: result.data, record: null } }
    }, [services]),
  )
  if (!kind || !['expense', 'weight', 'activity'].includes(kind))
    return (
      <Modal title="无法打开记录" onClose={() => flow.close()}>
        <Feedback kind="error" title="记录类型无效" />
      </Modal>
    )
  // Once the editor has a snapshot it retains its own draft; observation failure cannot replace it with a loader.
  if (!query.snapshot)
    return (
      <Modal title="正在打开记录" onClose={() => flow.close()}>
        <Feedback
          kind={query.status === 'failed' ? 'error' : 'loading'}
          title={query.status === 'failed' ? '暂时读不到录入所需信息' : '正在读取本机信息'}
          {...(query.status === 'failed' ? { onRetry: query.retry } : {})}
        />
      </Modal>
    )
  const defaultDate = (location.state as FlowRouteState | null)?.defaultDate
  return (
    <RecordEditor
      key={kind}
      source={query.snapshot}
      readFailed={query.status === 'failed'}
      onRetryRead={query.retry}
      createKind={kind as CreateKind}
      {...(defaultDate ? { defaultDate } : {})}
    />
  )
}
