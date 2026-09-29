import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { useConfirm } from '@/app/v4/Confirmation'
import { useFlow } from '@/app/v4/Flow'
import type { PreferencesSnapshot, Snapshot } from '@/core/types'
import { parseWeightInput } from '@/core/validation'
import { errorMessage } from '@/shared/v4/format'
import { Feedback } from '@/shared/ui/v4/Elements'
import { Modal } from '@/shared/ui/v4/Modal'
import { logger } from '@/shared/logging/logger'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'

function TargetForm({
  snapshot,
  onClose,
  readFailed,
  onRetry,
}: {
  snapshot: Snapshot<PreferencesSnapshot>
  onClose: () => void
  readFailed: boolean
  onRetry: () => void
}) {
  const services = useV4Services(),
    confirm = useConfirm(),
    flow = useFlow(),
    [original] = useState(snapshot),
    [raw, setRaw] = useState(
      original.data.values.weightTarget === null
        ? ''
        : String(original.data.values.weightTarget / 1000),
    ),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    errorNode = useRef<HTMLParagraphElement>(null)
  const initial =
      original.data.values.weightTarget === null
        ? ''
        : String(original.data.values.weightTarget / 1000),
    dirty = raw !== initial,
    guard = useDirtyGuard({ dirty, busy })
  async function close() {
    if (locked.current) return
    if (
      dirty &&
      !(await confirm({
        title: '离开目标设置？',
        description: '尚未保存的目标会被丢弃。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
      }))
    )
      return
    guard.release()
    onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current) return
    setError(null)
    let value: number | null
    try {
      value = raw.trim() ? parseWeightInput(raw.trim()) : null
    } catch (error) {
      setError(errorMessage(error))
      requestAnimationFrame(() => errorNode.current?.focus())
      logger.warn('v4.target.invalid', { failureClass: 'validation' })
      return
    }
    locked.current = true
    setBusy(true)
    logger.info('v4.target.saving')
    try {
      await services.preferences.set(
        {
          key: 'weightTarget',
          value,
          expectedEntityRevision: original.data.revisions.weightTarget,
        },
        retainedIntent(intent, JSON.stringify({ value }), original.stamp),
      )
      intent.current = null
      logger.info('v4.target.saved')
      guard.release()
      onClose()
      flow.notify(value === null ? '目标已移除。' : '目标已保存。')
    } catch (error) {
      setError(errorMessage(error))
      logger.warn('v4.target.failed', { failureClass: 'command' })
      requestAnimationFrame(() => errorNode.current?.focus())
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Modal title="体重目标" onClose={() => void close()} busy={busy}>
      <form onSubmit={(event) => void submit(event)} aria-busy={busy} noValidate>
        <div className="modal-content">
          {readFailed && (
            <Feedback kind="error" title="刷新失败，当前目标草稿已保留" onRetry={onRetry} />
          )}
          {error && (
            <p className="field-error" role="alert" ref={errorNode} tabIndex={-1}>
              {error}
            </p>
          )}
          <label className="field">
            <span>目标体重（kg）</span>
            <input
              data-initial-focus
              inputMode="decimal"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              disabled={busy}
              aria-describedby="weight-target-help"
            />
          </label>
          <p id="weight-target-help" className="v4-scope-note">
            1 至 1000 kg，最多三位小数。留空并保存可移除目标。目标只展示数值距离，不评价身体状态。
          </p>
        </div>
        <footer className="modal-footer">
          <button className="button" type="submit" disabled={busy}>
            {busy ? '正在保存…' : '保存目标'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
export function WeightTargetEditor({ onClose }: { onClose: () => void }) {
  const services = useV4Services(),
    query = useV4Query(useCallback(() => services.preferences.getAll(), [services]))
  // Keep the mounted form and its frozen write stamp through observation failures and retries.
  return query.snapshot ? (
    <TargetForm
      snapshot={query.snapshot}
      onClose={onClose}
      readFailed={query.status === 'failed'}
      onRetry={query.retry}
    />
  ) : query.status === 'loading' ? (
    <Feedback kind="loading" title="正在打开目标设置" />
  ) : query.status === 'failed' ? (
    <Feedback kind="error" title="目标设置暂时读不到" onRetry={query.retry}>
      <button className="text-button" type="button" onClick={onClose}>
        取消
      </button>
    </Feedback>
  ) : null
}
