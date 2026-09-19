import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppServices } from '@/app/AppServicesContext'
import { ActionService } from './ActionService'
import type { ParsedAction } from './actionParser'
import { FinanceCategoryPicker } from '@/features/finance/FinanceCategoryPicker'
import { isCategoryAvailable } from '@/shared/domain/categoryHierarchy'
import { toLocalDateKey } from '@/shared/domain/date'
import { parseMoneyToMinor } from '@/shared/domain/money'
import type { TransactionType } from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { usePwa } from '@/pwa/PwaContext'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { logger } from '@/shared/logging/logger'

type TransactionAction = Extract<ParsedAction, { type: 'add-transaction' }>

function toDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${toLocalDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function TransactionActionEditor({
  action,
  service,
}: {
  action: TransactionAction
  service: ActionService
}) {
  const { database } = useAppServices()
  const navigate = useNavigate()
  const { setFormDirty } = usePwa()
  const guard = useRef(Symbol('shortcut-draft'))
  const lock = useRef(false)
  const released = useRef(false)
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)
  const [handled, setHandled] = useState(false)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const [type, setType] = useState<TransactionType>(action.draft.type)
  const [amount, setAmount] = useState((action.draft.amountMinor / 100).toFixed(2))
  const [categoryId, setCategoryId] = useState(action.draft.categoryId)
  const initialTime = toDateTimeLocalInput(new Date(action.draft.occurredAt))
  const [time, setTime] = useState(initialTime)
  const [note, setNote] = useState(action.draft.note ?? '')
  const query = useCallback(() => database.categories.toArray(), [database])
  const categories = useLiveQueryState(query)

  useEffect(() => {
    const token = guard.current
    setFormDirty(token, !released.current, !released.current && busy)
    return () => setFormDirty(token, false)
  }, [busy, setFormDirty])

  useEffect(() => {
    let active = true
    void service
      .inspect(action, true)
      .then((inspection) => {
        if (!active) return
        if (inspection.status === 'handled') {
          // Release only this draft before replacing its consumed URL; no personal values go into the result route.
          released.current = true
          setFormDirty(guard.current, false)
          setChecked(false)
          setHandled(true)
        } else setChecked(true)
      })
      .catch(() => {
        if (active) setError('暂时无法检查本机账本，草稿仍在。请重试检查。')
      })
    return () => {
      active = false
    }
  }, [action, service, retry, setFormDirty])
  useEffect(() => {
    if (handled) navigate('/action-result?status=handled&type=add-transaction', { replace: true })
  }, [handled, navigate])

  function leave(destination: string) {
    // Publish guard release before navigating so successful save/cancel cannot be blocked by its own draft.
    released.current = true
    flushSync(() => {
      setFormDirty(guard.current, false)
      setBusy(false)
    })
    navigate(destination, { replace: true })
  }
  const available =
    categories.status === 'ready' &&
    categories.data.some(
      (row) =>
        row.id === categoryId &&
        row.domain === 'finance' &&
        row.transactionType === type &&
        isCategoryAvailable(row, categories.data),
    )

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !checked) return
    logger.info('action.draft.savestarted', { operation: 'save', actionType: 'add-transaction' })
    const money = parseMoneyToMinor(amount)
    // Read the live native control; unchanged incoming instants retain seconds and original offset semantics.
    const rawTime = String(new FormData(event.currentTarget).get('occurredAt') ?? '')
    const date = new Date(rawTime)
    if (!money.ok || !rawTime || Number.isNaN(date.getTime()) || !available) {
      setError('请填写有效金额、时间，并选择当前可用的分类。')
      logger.info('action.draft.invalid', { operation: 'validate', actionType: 'add-transaction' })
      return
    }
    lock.current = true
    setBusy(true)
    setFormDirty(guard.current, true, true)
    setError('')
    const corrected: TransactionAction = {
      ...action,
      draft: {
        ...action.draft,
        type,
        amountMinor: money.amountMinor,
        categoryId,
        ...(rawTime === initialTime
          ? {}
          : {
              occurredAt: date.toISOString(),
              localDate: toLocalDateKey(date),
              timezoneOffsetMinutes: date.getTimezoneOffset(),
            }),
        ...(note.trim() ? { note: note.trim().normalize('NFC') } : {}),
      },
    }
    if (!note.trim()) delete corrected.draft.note
    try {
      const result = await service.execute(corrected)
      logger.info('action.draft.saved', { operation: 'save', actionType: 'add-transaction' })
      leave(
        result.status === 'handled'
          ? '/action-result?status=handled&type=add-transaction'
          : result.destination,
      )
    } catch (caught) {
      logger.error('action.draft.failed', caught, {
        operation: 'save',
        actionType: 'add-transaction',
      })
      setError('未能保存，输入仍保留。请核对分类是否可用后重试。')
      setBusy(false)
    } finally {
      lock.current = false
    }
  }

  return (
    <section className="page action-page" aria-labelledby="action-title">
      <h1 id="action-title">新增账目</h1>
      <p className="page-intro">核对金额、时间和分类。只有确认后才会写入当前账本。</p>
      <p className="helper">
        请确认这里是平时使用的账本；Safari 与主屏幕 App
        可能使用不同存储。分类变化后请重新导出快捷记账配置。
      </p>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      {!checked ? (
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            setError('')
            setRetry((value) => value + 1)
          }}
        >
          重试检查
        </button>
      ) : null}
      {categories.status === 'failed' ? (
        <p role="alert">分类读取失败，未写入任何记录。请重新打开页面后重试。</p>
      ) : categories.status === 'loading' ? (
        <p>正在读取分类…</p>
      ) : (
        <form className="entry-form" onSubmit={(event) => void save(event)}>
          <fieldset className="draft-form-fields" disabled={busy || !checked}>
            <label>
              类型
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as TransactionType)
                  setCategoryId('')
                  logger.info('action.draft.typechanged', { operation: 'edit' })
                }}
              >
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
            </label>
            <label>
              金额（CNY）
              <input
                inputMode="decimal"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label>
              发生时间
              <input
                type="datetime-local"
                name="occurredAt"
                required
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
            {!available ? (
              <p className="form-error">原分类不可用或尚未选择，请重新选择。金额和时间已保留。</p>
            ) : null}
            <FinanceCategoryPicker
              categories={categories.data}
              type={type}
              value={available ? categoryId : ''}
              disabled={busy || !checked}
              onChange={setCategoryId}
            />
            <label>
              备注
              <input
                maxLength={280}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </fieldset>
          <div className="form-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={busy}
              onClick={() => setDiscard(true)}
            >
              取消
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={busy || !checked || !available}
            >
              {busy ? '正在保存…' : '确认新增账目'}
            </button>
          </div>
        </form>
      )}
      {discard ? (
        <ConfirmDialog
          title="放弃快捷记账草稿？"
          description="本次输入不会保存，已有账目不会改变。"
          confirmLabel="放弃草稿"
          cancelLabel="继续核对"
          onCancel={() => setDiscard(false)}
          onConfirm={() => {
            logger.info('action.draft.cancelled', { operation: 'cancel' })
            leave('/today')
          }}
        />
      ) : null}
    </section>
  )
}
