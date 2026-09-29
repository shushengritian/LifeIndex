import { useRef, useState, type FormEvent } from 'react'
import type { Category, CommandContext, DateSelection, RecordView, Snapshot } from '@/core/types'
import {
  captureDateSelection,
  parseMinutesInput,
  parseMoneyInput,
  parseWeightInput,
} from '@/core/validation'
import { useV4Services } from '@/app/v4/Services'
import { useFlow, type CreateKind } from '@/app/v4/Flow'
import { useConfirm } from '@/app/v4/Confirmation'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { Modal } from '@/shared/ui/v4/Modal'
import { commandContext, errorMessage, localDate } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'
import { AmountField, CategoryField } from './Fields'

interface EditorProps {
  source: Snapshot<{ categories: Category[]; record: RecordView | null }>
  createKind?: CreateKind
  defaultDate?: string
  readFailed?: boolean
  onRetryRead?: () => void
}
export function RecordEditor({
  source,
  createKind,
  defaultDate,
  readFailed,
  onRetryRead,
}: EditorProps) {
  const services = useV4Services(),
    flow = useFlow(),
    confirm = useConfirm()
  // Capture exactly once. Live observations must never replace the generation/revision of an open draft.
  const [initial] = useState(source)
  const record = initial.data.record
  const kind = record?.kind ?? (createKind === 'expense' ? 'transaction' : (createKind ?? 'weight'))
  const [type, setType] = useState<'expense' | 'income'>(() =>
    record?.kind === 'transaction' ? record.entity.type : 'expense',
  )
  const [amount, setAmount] = useState(() =>
    record?.kind === 'transaction'
      ? (record.entity.amountMinor / 100).toFixed(2)
      : record?.kind === 'weight'
        ? String(record.entity.weightGrams / 1000)
        : record?.kind === 'activity'
          ? String(record.entity.durationMinutes)
          : '',
  )
  const [date, setDate] = useState<DateSelection>(() =>
    record
      ? { localDate: record.entity.localDate, utcOffsetMinutes: record.entity.utcOffsetMinutes }
      : captureDateSelection(services.clock.capture(), defaultDate),
  )
  const [note, setNote] = useState(() =>
    record && 'note' in record.entity ? (record.entity.note ?? '') : '',
  )
  const [title, setTitle] = useState(() => (record?.kind === 'focus' ? record.entity.title : ''))
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'hard'>(() =>
    record?.kind === 'activity' ? record.entity.intensity : 'moderate',
  )
  const scope = kind === 'transaction' ? type : kind === 'activity' ? 'activity' : 'focus'
  const originalCategoryId =
    record && 'categoryId' in record.entity ? record.entity.categoryId : undefined
  const categories = initial.data.categories.filter(
    (c) => c.scope === scope && (c.status === 'active' || c.id === originalCategoryId),
  )
  const [categoryId, setCategoryId] = useState(
    () => originalCategoryId ?? (kind === 'focus' ? '' : (categories[0]?.id ?? '')),
  )
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [fieldError, setFieldError] = useState<string | undefined>()
  const lock = useRef(false),
    intent = useRef<CommandContext | null>(null),
    errorRef = useRef<HTMLDivElement>(null)
  const guard = useDirtyGuard({ dirty, busy })
  function change(work: () => void) {
    work()
    setDirty(true)
    setError(null)
    setFieldError(undefined)
  }
  async function cancel() {
    if (lock.current) return
    if (
      dirty &&
      !(await confirm({
        title: '放弃还没保存的内容？',
        description: '已保存记录不会改变。继续编辑可保留当前输入。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
      }))
    )
      return
    guard.release()
    flow.close(kind === 'transaction' ? '/finance' : kind === 'focus' ? '/focus' : '/health')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current || kind === 'habitCheck') return
    setError(null)
    setFieldError(undefined)
    let quantity = 0
    try {
      if (kind !== 'focus')
        quantity =
          kind === 'transaction'
            ? parseMoneyInput(amount)
            : kind === 'weight'
              ? parseWeightInput(amount)
              : parseMinutesInput(amount)
    } catch {
      setFieldError(
        kind === 'transaction'
          ? '请输入范围内金额，最多两位小数。'
          : kind === 'weight'
            ? '请输入1–1,000 kg，最多三位小数。'
            : '请输入1–1,440的整数分钟。',
      )
      setError('请检查数值，输入仍保留。')
      queueMicrotask(() => errorRef.current?.focus())
      return
    }
    lock.current = true
    setBusy(true)
    intent.current ??= commandContext(initial.stamp)
    logger.info('records.editor.saving', {
      operation: record ? 'update' : 'create',
      entityType: kind,
    })
    try {
      const ctx = intent.current
      const ref = record
        ? { id: record.entity.id, expectedEntityRevision: record.entity.revision }
        : null
      let savedId: string
      if (kind === 'transaction') {
        const input = { ...date, type, amountMinor: quantity, categoryId, note }
        savedId = (
          ref
            ? await services.transactions.update(ref, input, ctx)
            : await services.transactions.create(input, ctx)
        ).data.id
      } else if (kind === 'weight') {
        const input = { ...date, weightGrams: quantity, note }
        savedId = (
          ref
            ? await services.weights.update(ref, input, ctx)
            : await services.weights.create(input, ctx)
        ).data.id
      } else if (kind === 'activity') {
        const input = { ...date, durationMinutes: quantity, categoryId, intensity, note }
        savedId = (
          ref
            ? await services.activities.update(ref, input, ctx)
            : await services.activities.create(input, ctx)
        ).data.id
      } else {
        if (!ref) return
        savedId = (
          await services.focus.updateDetails(
            ref,
            { title, note, ...(categoryId ? { categoryId } : {}) },
            ctx,
          )
        ).data.id
      }
      if (savedId) {
        guard.release()
        flow.close(
          kind === 'transaction' ? '/finance' : kind === 'focus' ? '/focus/history' : '/health',
        )
        flow.notify(`已保存 · ${date.localDate}`, { kind, id: savedId })
        logger.info('records.editor.saved', {
          operation: record ? 'update' : 'create',
          entityType: kind,
        })
      }
    } catch (failure) {
      setError(errorMessage(failure))
      queueMicrotask(() => errorRef.current?.focus())
      logger.warn('records.editor.failed', {
        operation: 'save',
        entityType: kind,
        failureClass: 'DomainWrite',
      })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const name =
    kind === 'transaction'
      ? '记一笔'
      : kind === 'weight'
        ? '记体重'
        : kind === 'activity'
          ? '记运动'
          : '编辑专注'
  return (
    <Modal
      title={record && kind !== 'focus' ? `编辑${name.slice(1)}记录` : name}
      onClose={() => void cancel()}
      busy={busy}
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="record-editor">
        <div className="modal-content">
          {readFailed && (
            <div role="alert" className="entry-error">
              <p>本机信息暂时更新失败，当前输入已保留。保存时仍会校验记录是否有变化。</p>
              <button type="button" className="text-button" disabled={busy} onClick={onRetryRead}>
                重新读取信息
              </button>
            </div>
          )}
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="entry-error">
              {error}
            </div>
          )}
          {kind === 'transaction' && (
            <div className="type-switch" role="group" aria-label="收支类型">
              {(['expense', 'income'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  disabled={busy}
                  aria-pressed={type === value}
                  onClick={() =>
                    change(() => {
                      setType(value)
                      setCategoryId(
                        initial.data.categories.find(
                          (c) => c.scope === value && c.status === 'active',
                        )?.id ?? '',
                      )
                    })
                  }
                >
                  {value === 'expense' ? '支出' : '收入'}
                </button>
              ))}
            </div>
          )}
          {kind === 'focus' ? (
            <label className="field">
              专注名称
              <input
                data-initial-focus
                name="title"
                value={title}
                maxLength={80}
                disabled={busy}
                onChange={(e) => change(() => setTitle(e.target.value))}
              />
            </label>
          ) : (
            kind !== 'habitCheck' && (
              <AmountField
                kind={kind}
                value={amount}
                onChange={(value) => change(() => setAmount(value))}
                disabled={busy}
                error={fieldError}
              />
            )
          )}
          {kind !== 'weight' && (
            <CategoryField
              categories={categories}
              selected={categoryId}
              onChange={(value) => change(() => setCategoryId(value))}
              disabled={busy}
              optional={kind === 'focus'}
            />
          )}
          {kind === 'activity' && (
            <label className="field">
              强度
              <select
                value={intensity}
                disabled={busy}
                onChange={(event) =>
                  change(() => setIntensity(event.target.value as typeof intensity))
                }
              >
                <option value="light">轻松</option>
                <option value="moderate">适中</option>
                <option value="hard">高强度</option>
              </select>
            </label>
          )}
          {kind !== 'focus' && (
            <label className="field">
              记录日期
              <input
                name="date"
                type="date"
                min="1000-01-01"
                max={localDate(services.clock.capture())}
                value={date.localDate}
                disabled={busy}
                onChange={(event) =>
                  change(() =>
                    setDate({
                      localDate: event.target.value,
                      utcOffsetMinutes: services.clock.capture().utcOffsetMinutes,
                    }),
                  )
                }
              />
              <small>只记录日期，不推测具体发生时刻。</small>
            </label>
          )}
          <label className="field">
            备注<span className="muted">选填</span>
            <textarea
              name="note"
              rows={2}
              maxLength={1000}
              value={note}
              disabled={busy}
              onChange={(event) => change(() => setNote(event.target.value))}
            />
          </label>
        </div>
        <footer className="modal-footer">
          <p>仅保存在本机。失败时会保留输入。</p>
          <button className="button" type="submit" disabled={busy}>
            {busy ? '正在保存…' : record ? '保存修改' : '保存记录'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
