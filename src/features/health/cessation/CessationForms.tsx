import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CessationEvent, CessationTrigger } from '@/shared/domain/types'
import type { EventInput, PlanInput } from '@/data/repositories/CessationRepository'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { logger } from '@/shared/logging/logger'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

import { triggerNames, dateTimeInput } from './cessationPresentation'
function TriggerSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label>
      诱因（可选）
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">不填写</option>
        {Object.entries(triggerNames).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
function useDraftActions(dirty: boolean, onClose: () => void) {
  const lock = useRef(false)
  const [discard, setDiscard] = useState(false)
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  // Writing is non-discardable; a dirty draft becomes discardable again on failure.
  useDirtyForm(dirty, saving)
  useEffect(() => {
    // Escape follows the same draft/disabling rules as the visible cancel action.
    const escape = (event: KeyboardEvent) => {
      // A top-layer confirmation owns Escape; never let it also discard the underlying form.
      if (event.key !== 'Escape' || lock.current || document.querySelector('dialog[open]')) return
      event.preventDefault()
      if (dirty) {
        setDiscard(true)
        return
      }
      logger.info('cessation.form.cancelled', { operation: 'escape' })
      onClose()
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [dirty, saving, onClose])
  function close() {
    if (lock.current) return
    if (dirty) {
      setDiscard(true)
      logger.info('cessation.form.discardrequested', { operation: 'cancel' })
      return
    }
    logger.info('cessation.form.cancelled', { operation: 'cancel' })
    onClose()
  }
  async function save(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setSaving(true)
    setError('')
    logger.info('cessation.form.savestarted', { operation: 'save' })
    try {
      await action()
      logger.info('cessation.form.saved', { operation: 'save' })
      onClose()
    } catch {
      setError('未能保存，输入已保留。请检查日期、支数和计划范围，或重试。')
      logger.warn('cessation.form.savefailed', {
        operation: 'save',
        failureClass: 'ValidationOrWrite',
      })
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  const confirmation = discard ? (
    <ConfirmDialog
      title="放弃戒烟输入？"
      description="未保存的修改将丢失，已有计划和记录不会改变。"
      confirmLabel="放弃输入"
      cancelLabel="继续填写"
      onCancel={() => setDiscard(false)}
      onConfirm={onClose}
    />
  ) : null
  return { saving, error, close, save, confirmation }
}
export function PlanForm({
  onSave,
  onClose,
}: {
  onSave: (id: string, input: PlanInput) => Promise<void>
  onClose: () => void
}) {
  const [id] = useState(() => crypto.randomUUID()),
    [initial] = useState(() => dateTimeInput(new Date()))
  const [start, setStart] = useState(initial),
    [reason, setReason] = useState(''),
    [daily, setDaily] = useState(''),
    [pack, setPack] = useState(''),
    [price, setPrice] = useState('')
  const draft = useDraftActions(
    start !== initial || Boolean(reason || daily || pack || price),
    onClose,
  )
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Native date pickers may commit their value before React receives the change event.
    // Capture before disabling fields and synchronize state so a failed save retains that value.
    const submittedStart = String(new FormData(event.currentTarget).get('startAt') ?? start)
    setStart(submittedStart)
    logger.info('cessation.plan.inputcaptured', { operation: 'submit' })
    void draft.save(async () => {
      const time = new Date(submittedStart)
      if (Number.isNaN(time.getTime())) throw new Error('Invalid input')
      let baseline: PlanInput['baseline']
      if (daily || pack || price) {
        if (!daily || !pack || !/^\d+(\.\d{1,2})?$/.test(price))
          throw new Error('Incomplete estimate')
        baseline = {
          dailyCount: Number(daily),
          packCount: Number(pack),
          packPriceMinor: Math.round(Number(price) * 100),
          currency: 'CNY',
        }
      }
      await onSave(id, {
        startAt: time.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(baseline ? { baseline } : {}),
      })
    })
  }
  return (
    <form className="sheet-form" aria-label="开始戒烟计划" onSubmit={submit}>
      <fieldset className="draft-form-fields" disabled={draft.saving}>
        <p>只需要一个开始时间。其他内容可以不填。</p>
        <label>
          开始日期与时间
          <input
            autoFocus
            type="datetime-local"
            name="startAt"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <details>
          <summary>原因与节省估算（可选）</summary>
          <label>
            为什么想戒烟
            <input
              maxLength={80}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label>
            原来平均每天（支）
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={daily}
              onChange={(event) => setDaily(event.target.value)}
            />
          </label>
          <label>
            每包支数
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={pack}
              onChange={(event) => setPack(event.target.value)}
            />
          </label>
          <label>
            每包价格（元）
            <input
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <p>仅估算完整无烟日，不生成记账。开始后基线和起点固定。</p>
        </details>
        {draft.error ? (
          <p role="alert" className="form-error">
            {draft.error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" disabled={draft.saving} onClick={draft.close}>
            取消
          </button>
          <button className="button-primary" disabled={draft.saving}>
            {draft.saving ? '保存中…' : '开始计划'}
          </button>
        </div>
      </fieldset>
      {draft.confirmation}
    </form>
  )
}
export function SmokingForm({
  entry,
  onSave,
  onClose,
}: {
  entry?: CessationEvent
  onSave: (id: string, input: EventInput, editing: boolean) => Promise<void>
  onClose: () => void
}) {
  const [id] = useState(() => entry?.id ?? crypto.randomUUID()),
    [initial] = useState(() => ({
      at: dateTimeInput(entry ? new Date(entry.occurredAt) : new Date()),
      count: entry?.kind === 'smoking' ? String(entry.count) : '1',
      trigger: entry?.trigger ?? '',
    }))
  const [at, setAt] = useState(initial.at),
    [count, setCount] = useState(initial.count),
    [trigger, setTrigger] = useState(initial.trigger)
  const draft = useDraftActions(
    at !== initial.at || count !== initial.count || trigger !== initial.trigger,
    onClose,
  )
  return (
    <form
      className="sheet-form"
      aria-label="吸烟记录"
      onSubmit={(event) => {
        event.preventDefault()
        // Use the visible native picker value, not a potentially stale controlled-state snapshot.
        const submittedAt = String(new FormData(event.currentTarget).get('occurredAt') ?? at)
        setAt(submittedAt)
        logger.info('cessation.smoking.inputcaptured', { operation: 'submit' })
        void draft.save(() =>
          onSave(
            id,
            {
              kind: 'smoking',
              count: Number(count),
              occurredAt: new Date(submittedAt).toISOString(),
              ...(trigger ? { trigger: trigger as CessationTrigger } : {}),
            },
            Boolean(entry),
          ),
        )
      }}
    >
      <fieldset className="draft-form-fields" disabled={draft.saving}>
        <p>一次吸烟不会清空过去的努力；保存后会撤销同日无烟确认。</p>
        <label>
          这次吸了几支
          <input
            autoFocus
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </label>
        <label>
          日期与时间
          <input
            type="datetime-local"
            name="occurredAt"
            required
            value={at}
            onChange={(event) => setAt(event.target.value)}
          />
        </label>
        <TriggerSelect value={trigger} onChange={setTrigger} />
        {draft.error ? (
          <p role="alert" className="form-error">
            {draft.error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" disabled={draft.saving} onClick={draft.close}>
            取消
          </button>
          <button className="button-primary" disabled={draft.saving}>
            {draft.saving ? '保存中…' : '保存记录'}
          </button>
        </div>
      </fieldset>
      {draft.confirmation}
    </form>
  )
}
export function CravingForm({
  entry,
  onSave,
  onClose,
}: {
  entry?: CessationEvent
  onSave: (id: string, input: EventInput, editing: boolean) => Promise<void>
  onClose: () => void
}) {
  const [id] = useState(() => entry?.id ?? crypto.randomUUID()),
    [trigger, setTrigger] = useState<string>(entry?.trigger ?? ''),
    [deadline, setDeadline] = useState<number>(),
    [remaining, setRemaining] = useState(180)
  const draft = useDraftActions(trigger !== (entry?.trigger ?? '') || Boolean(deadline), onClose)
  useEffect(() => {
    if (!deadline) return
    // Recalculate from the wall clock after suspension; this is not a Focus session or a cure claim.
    const refresh = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    const timer = window.setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [deadline])
  return (
    <div className="sheet-form">
      <fieldset className="draft-form-fields" disabled={draft.saving}>
        <h3>先给自己一点空间</h3>
        <p className="cessation-rest-time" aria-label="休息剩余时间">
          {String(Math.floor(remaining / 60)).padStart(2, '0')}:
          {String(remaining % 60).padStart(2, '0')}
        </p>
        <p>3 分钟小休息，不是治疗或效果保证。</p>
        <button
          autoFocus
          type="button"
          onClick={() => {
            setDeadline(Date.now() + 180000)
            setRemaining(180)
            logger.info('cessation.rest.started', { operation: 'start' })
          }}
        >
          {deadline ? '重新计时' : '开始 3 分钟'}
        </button>
        <p>舒适地呼吸，喝点水，或换个环境做一点别的事。</p>
        <p className="muted">提示参考 WHO Quick tips；无需等待计时结束即可保存感受或退出。</p>
        <TriggerSelect value={trigger} onChange={setTrigger} />
        <div className="form-actions">
          {(['relieved', 'still'] as const).map((outcome) => (
            <button
              key={outcome}
              type="button"
              className={outcome === 'relieved' ? 'button-primary' : 'button-secondary'}
              disabled={draft.saving}
              onClick={() =>
                void draft.save(() =>
                  onSave(
                    id,
                    {
                      kind: 'craving',
                      outcome,
                      occurredAt: entry?.occurredAt ?? new Date().toISOString(),
                      ...(trigger ? { trigger: trigger as CessationTrigger } : {}),
                    },
                    Boolean(entry),
                  ),
                )
              }
            >
              {outcome === 'relieved' ? '缓解了，保存' : '还想抽，保存'}
            </button>
          ))}
        </div>
        {draft.error ? (
          <p role="alert" className="form-error">
            {draft.error}
          </p>
        ) : null}
        <button type="button" disabled={draft.saving} onClick={draft.close}>
          不保存，返回
        </button>
      </fieldset>
      {draft.confirmation}
    </div>
  )
}

export function ReasonForm({
  initial,
  onSave,
  onClose,
}: {
  initial: string
  onSave: (reason: string) => Promise<void>
  onClose: () => void
}) {
  const [reason, setReason] = useState(initial)
  const draft = useDraftActions(reason !== initial, onClose)
  return (
    <form
      className="sheet-form"
      aria-label="编辑戒烟原因"
      onSubmit={(event) => {
        event.preventDefault()
        void draft.save(() => onSave(reason))
      }}
    >
      <fieldset className="draft-form-fields" disabled={draft.saving}>
        <label>
          为什么想戒烟
          <input
            autoFocus
            maxLength={80}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {draft.error ? (
          <p role="alert" className="form-error">
            {draft.error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" disabled={draft.saving} onClick={draft.close}>
            取消
          </button>
          <button className="button-primary" disabled={draft.saving}>
            保存原因
          </button>
        </div>
      </fieldset>
      {draft.confirmation}
    </form>
  )
}
