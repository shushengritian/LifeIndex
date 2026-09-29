import { useCallback, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFlow, type RecordKind } from '@/app/v4/Flow'
import { useConfirm } from '@/app/v4/Confirmation'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { Modal } from '@/shared/ui/v4/Modal'
import { Feedback } from '@/shared/ui/v4/Elements'
import { commandContext, errorMessage, formatCapturedInstant } from '@/shared/v4/format'
import { recordPresentation } from '@/shared/v4/recordPresentation'
import { logger } from '@/shared/logging/logger'
import { readRecord } from './recordData'
import { RecordEditor } from './RecordEditor'

export function RecordRoute() {
  const { kind = '', id = '' } = useParams(),
    services = useV4Services(),
    flow = useFlow(),
    confirm = useConfirm()
  const valid =
    ['transaction', 'weight', 'activity', 'focus', 'habitCheck'].includes(kind) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
  const query = useV4Query(
    useCallback(
      () =>
        valid
          ? readRecord(services, kind as RecordKind, id)
          : Promise.reject(Object.assign(new Error('InvalidRecord'), { code: 'NotFound' })),
      [services, kind, id, valid],
    ),
  )
  const [editing, setEditing] = useState<typeof query.snapshot>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  // Deletion is also a pending write: block router/SW replacement until the transaction resolves.
  const guard = useDirtyGuard({ dirty: false, busy })
  const record = query.snapshot?.data.record
  // The edit session owns its original snapshot. Cross-tab deletion/restore must not unmount a typed draft.
  if (editing)
    return (
      <RecordEditor
        source={editing}
        readFailed={query.status === 'failed'}
        onRetryRead={query.retry}
      />
    )
  async function remove() {
    if (!record || !query.snapshot || lock.current || record.kind === 'habitCheck') return
    if (
      !(await confirm({
        title: '删除这条记录？',
        description: '这条记录将从本机及汇总中移除。此操作不能撤销。',
        confirmLabel: '确认删除',
        cancelLabel: '保留记录',
      }))
    )
      return
    lock.current = true
    setBusy(true)
    setError(null)
    logger.info('records.detail.deleting', { operation: 'remove', entityType: record.kind })
    try {
      const ref = { id: record.entity.id, expectedEntityRevision: record.entity.revision },
        ctx = commandContext(query.snapshot.stamp)
      if (record.kind === 'transaction') await services.transactions.remove(ref, ctx)
      else if (record.kind === 'weight') await services.weights.remove(ref, ctx)
      else if (record.kind === 'activity') await services.activities.remove(ref, ctx)
      else await services.focus.remove(ref, ctx)
      guard.release()
      flow.close()
      flow.notify('记录已删除。')
      logger.info('records.detail.deleted', { operation: 'remove', entityType: record.kind })
    } catch (failure) {
      setError(errorMessage(failure))
      logger.warn('records.detail.failed', { operation: 'remove', failureClass: 'DomainWrite' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const details = record ? recordPresentation(record) : null
  return (
    <Modal
      title={details?.title ?? '记录详情'}
      onClose={() => flow.close()}
      busy={busy}
      closeLabel="关闭"
    >
      <div className="modal-content">
        {error && (
          <p role="alert" className="entry-error">
            {error}
          </p>
        )}
        {query.status === 'loading' ? (
          <Feedback kind="loading" title="正在读取记录" />
        ) : query.status === 'failed' ? (
          <Feedback kind="error" title="这条记录暂时无法读取" onRetry={query.retry} />
        ) : !record || !details ? (
          <Feedback kind="empty" title="记录已经不存在" />
        ) : (
          <>
            <span className="eyebrow">已保存 · 本机记录</span>
            <div className="detail-value numeric">{details.value}</div>
            <dl className="detail-facts">
              <div>
                <dt>日期</dt>
                <dd>
                  {record.entity.localDate}
                  {record.entity.timePrecision === 'day' ? ' · 未记录具体时刻' : ''}
                </dd>
              </div>
              {record.kind === 'focus' && (
                <>
                  <div>
                    <dt>开始</dt>
                    <dd>
                      {formatCapturedInstant(
                        record.entity.startedAt,
                        record.entity.utcOffsetMinutes,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>结束</dt>
                    <dd>
                      {formatCapturedInstant(record.entity.endedAt, record.entity.utcOffsetMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt>归属</dt>
                    <dd>按开始日期计入汇总，跨日不拆分。</dd>
                  </div>
                </>
              )}
              <div>
                <dt>备注</dt>
                <dd>
                  {'note' in record.entity && record.entity.note ? record.entity.note : '没有填写'}
                </dd>
              </div>
            </dl>
            {record.kind === 'habitCheck' ? (
              <Link className="button" to={`/health/habits/${record.habit.id}`}>
                查看习惯计划
              </Link>
            ) : (
              <div className="detail-actions">
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(query.snapshot)}
                >
                  编辑这条记录
                </button>
                <button
                  className="text-button danger-text"
                  type="button"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  删除
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
