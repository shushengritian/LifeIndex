import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { financeDisplayDate, type FinanceQuickExit } from './financeNavigation'
import { usePwa } from '@/pwa/PwaContext'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import {
  TransactionRepository,
  type SaveTransactionCommand,
} from '@/data/repositories/TransactionRepository'
import {
  buildFinanceMonthCalendar,
  moveFinanceMonthSelection,
  summarizeTransactions,
} from '@/features/finance/financeDomain'
import { endOfLocalMonth, startOfLocalMonth, toLocalDateKey } from '@/shared/domain/date'
import { formatMoney, parseMoneyToMinor } from '@/shared/domain/money'
import type { Category, Transaction, TransactionType } from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { Icon } from '@/shared/ui/Icon'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { FinanceCategoryPicker } from './FinanceCategoryPicker'
import { DailyExpenseChart } from './DailyExpenseChart'
import { isCategoryAvailable, categoryDisplayName } from '@/shared/domain/categoryHierarchy'
import { Sheet } from '@/shared/ui/Sheet'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useDirtyForm } from '@/pwa/useDirtyForm'

function toDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dateTimeForSelectedDate(localDate: string): Date {
  const now = new Date()
  const [year, month, day] = localDate.split('-').map(Number)
  return new Date(year!, month! - 1, day!, now.getHours(), now.getMinutes())
}

function formatTransactionTime(transaction: Transaction): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(transaction.occurredAt))
}

function formatMonthTitle(localDate: string): string {
  const [year, month] = localDate.split('-').map(Number)
  return `${year} 年 ${month} 月`
}

function formatSelectedDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year!, month! - 1, day!))
}

function formatCalendarAmount(amountMinor: number): string {
  if (amountMinor === 0) return '¥0'
  const sign = amountMinor > 0 ? '+' : '−'
  return `${sign}${new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(amountMinor) / 100)}`
}

interface TransactionFormProps {
  categories: Category[]
  defaultLocalDate: string
  transaction?: Transaction
  deleting?: boolean
  onDelete?: () => void
  readFailed?: boolean
  onCancel: () => void
  onSave: (command: SaveTransactionCommand) => Promise<void>
}

function TransactionForm({
  categories,
  defaultLocalDate,
  transaction,
  deleting = false,
  onDelete,
  readFailed = false,
  onCancel,
  onSave,
}: TransactionFormProps) {
  const formId = useId()
  const [initialValues] = useState(() => ({
    type: transaction?.type ?? ('expense' as TransactionType),
    amount: transaction ? (transaction.amountMinor / 100).toFixed(2) : '',
    categoryId: transaction?.categoryId ?? '',
    occurredAt: transaction
      ? toDateTimeLocalInput(new Date(transaction.occurredAt))
      : toDateTimeLocalInput(dateTimeForSelectedDate(defaultLocalDate)),
    note: transaction?.note ?? '',
  }))
  const [type, setType] = useState<TransactionType>(initialValues.type)
  const [amount, setAmount] = useState(initialValues.amount)
  const matchingCategories = categories.filter(
    (category) =>
      category.transactionType === type &&
      (isCategoryAvailable(category, categories) || category.id === transaction?.categoryId),
  )
  const [categoryId, setCategoryId] = useState(initialValues.categoryId)
  const [occurredAt, setOccurredAt] = useState(initialValues.occurredAt)
  const [note, setNote] = useState(initialValues.note)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const busy = saving || deleting
  const dirty =
    type !== initialValues.type ||
    amount !== initialValues.amount ||
    categoryId !== initialValues.categoryId ||
    occurredAt !== initialValues.occurredAt ||
    note !== initialValues.note
  useDirtyForm(dirty, busy)
  useEffect(() => {
    if (!error) return
    // Keep the recovery message in the scrollable body; never scroll the page or the fixed action bar.
    errorRef.current?.focus({ preventScroll: true })
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    logger.info('finance.form.errorpresented', { operation: 'render', reason: 'input-retained' })
  }, [error])

  function cancel() {
    if (saveLock.current || deleting) {
      logger.info('finance.form.exitblocked', { operation: 'close', reason: 'busy' })
      return
    }
    logger.info('finance.form.exitrequested', {
      reason: dirty ? 'dirty' : 'clean',
      operation: 'close',
    })
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Synchronous guard protects against two submissions before React renders disabled controls.
    if (saveLock.current || deleting) {
      logger.info('finance.form.submitblocked', { reason: 'busy', operation: 'save' })
      return
    }
    setError('')
    const parsedAmount = parseMoneyToMinor(amount)
    // Native date pickers can defer change until blur; submit the current control value, not stale state.
    const selectedDate = new Date(
      String(new FormData(event.currentTarget).get('occurredAt') ?? occurredAt),
    )
    const selectedCategory = matchingCategories.find(({ id }) => id === categoryId)
    if (!parsedAmount.ok || !selectedCategory || Number.isNaN(selectedDate.getTime())) {
      logger.warn('finance.form.validationfailed', {
        operation: transaction ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请填写大于 0 的有效金额、匹配分类和日期时间。')
      return
    }

    saveLock.current = true
    setSaving(true)
    logger.info('finance.form.savestarted', { operation: transaction ? 'update' : 'create' })
    try {
      await onSave({
        type,
        amountMinor: parsedAmount.amountMinor,
        categoryId: selectedCategory.id,
        occurredAt: selectedDate.toISOString(),
        localDate: toLocalDateKey(selectedDate),
        timezoneOffsetMinutes: selectedDate.getTimezoneOffset(),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    } catch {
      logger.warn('finance.form.savefailed', { operation: 'save', failureClass: 'DatabaseWrite' })
      setError('未能保存，本次输入仍保留。请重试。')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  return (
    <Sheet
      title={transaction ? '编辑账目' : '记一笔'}
      onClose={cancel}
      busy={busy}
      structured
      headerAction={
        <button
          type="submit"
          form={formId}
          className="icon-action button-primary"
          disabled={busy}
          aria-label={saving ? '保存中…' : '保存'}
          title="保存账目"
        >
          <Icon name="check" />
        </button>
      }
    >
      <form
        id={formId}
        className="sheet-form sheet-form--structured finance-sheet-form"
        onSubmit={(event) => void submit(event)}
        aria-label={transaction ? '编辑交易' : '新增交易'}
        aria-busy={busy}
      >
        <div className="sheet-form-body" ref={bodyRef}>
          {readFailed ? (
            <p className="form-error" role="alert">
              列表暂时无法刷新，当前输入仍保留。
            </p>
          ) : null}
          {error ? (
            <p
              className="form-error"
              id="finance-form-error"
              role="alert"
              tabIndex={-1}
              ref={errorRef}
            >
              {error}
            </p>
          ) : null}
          <fieldset className="sheet-form-fields" disabled={busy}>
            <div className="segmented-control" aria-label="交易类型">
              {(['expense', 'income'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={type === value ? 'segment-active' : ''}
                  aria-pressed={type === value}
                  disabled={saving}
                  onClick={() => {
                    setType(value)
                    setCategoryId('')
                    logger.info('finance.form.typechanged', { operation: 'select', toState: value })
                  }}
                >
                  {value === 'expense' ? '支出' : '收入'}
                </button>
              ))}
            </div>
            <label className="finance-amount-input">
              金额（CNY）
              <input
                autoFocus
                disabled={saving}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                aria-describedby={error ? 'finance-form-error' : undefined}
              />
            </label>
            <FinanceCategoryPicker
              categories={categories}
              type={type}
              value={categoryId}
              originalId={transaction?.categoryId}
              disabled={saving}
              onChange={setCategoryId}
            />
            <label>
              日期与时间
              <input
                type="datetime-local"
                name="occurredAt"
                disabled={saving}
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                onInput={(event) => setOccurredAt(event.currentTarget.value)}
              />
            </label>
            <label>
              备注（可选）
              <input
                disabled={saving}
                value={note}
                maxLength={280}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {transaction && onDelete ? (
              <button
                type="button"
                className="finance-detail-delete text-destructive"
                onClick={onDelete}
                aria-label="删除账目"
                title="删除账目"
              >
                <Icon name="trash" size={18} />
              </button>
            ) : null}
          </fieldset>
        </div>
        {confirmDiscard ? (
          <ConfirmDialog
            title="放弃这次输入？"
            description="尚未保存的内容将丢失，已有账目不会改变。"
            confirmLabel="放弃输入"
            cancelLabel="继续填写"
            onCancel={() => setConfirmDiscard(false)}
            onConfirm={onCancel}
          />
        ) : null}
      </form>
    </Sheet>
  )
}

export function FinanceNewPage() {
  const navigate = useNavigate()
  const { dirtyFormCount, busyFormCount } = usePwa()
  const [exit, setExit] = useState<FinanceQuickExit>()
  const returned = useRef(false)
  useEffect(() => {
    // The editor must unmount and release its write/draft guard before the return navigation.
    // Navigating inside onSave would race that cleanup and be blocked as an in-flight write.
    if (!exit || dirtyFormCount || busyFormCount || returned.current) return
    returned.current = true
    logger.info('finance.quickentry.returned', { operation: 'navigate', reason: exit.status })
    void navigate('/today', {
      replace: true,
      state: {
        financeSaved: exit.status === 'saved',
        ...(exit.status === 'saved' ? { financeSavedDate: exit.localDate } : {}),
      },
    })
  }, [exit, dirtyFormCount, busyFormCount, navigate])
  return <FinancePage initialNew onQuickExit={setExit} />
}

export function FinancePage({
  initialNew = false,
  onQuickExit,
  report,
}: {
  initialNew?: boolean
  onQuickExit?: (result: FinanceQuickExit) => void
  report?: ReactNode
}) {
  const { database } = useAppServices()
  const transactions = useMemo(() => new TransactionRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const today = toLocalDateKey(new Date())
  const location = useLocation()
  // Only an explicit view-record navigation supplies this initial calendar context.
  const [selectedDate, setSelectedDate] = useState(
    () => financeDisplayDate(location.state?.financeViewDate) ?? today,
  )
  // The Today entry opens the existing guarded editor; ordinary calendar navigation stays closed.
  const [formMode, setFormMode] = useState<'closed' | 'new'>('closed')
  const [editorCategories, setEditorCategories] = useState<Category[]>()
  const quickInitialized = useRef(false)
  const [editing, setEditing] = useState<Transaction>()
  const [pageError, setPageError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Transaction>()
  const [deleting, setDeleting] = useState(false)
  const deleteLock = useRef(false)
  const [notice, setNotice] = useState('')
  const [savedDate, setSavedDate] = useState<string>()
  const [readRetry, setReadRetry] = useState(0)
  const reportLinkRef = useRef<HTMLAnchorElement>(null)
  const returnScroll = useRef(0)
  const wasReportOpen = useRef(false)
  const reportOpen = Boolean(report)
  useLayoutEffect(() => {
    // The hidden parent remains mounted while its report is open; POP and the in-app back link share this return path.
    if (reportOpen) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      wasReportOpen.current = true
    } else if (wasReportOpen.current) {
      window.scrollTo({ top: returnScroll.current, behavior: 'instant' })
      reportLinkRef.current?.focus({ preventScroll: true })
      wasReportOpen.current = false
      logger.info('finance.report.contextrestored', { operation: 'navigate' })
    }
  }, [reportOpen])
  useDirtyForm(false, deleting)
  const monthRange = useMemo(
    () => ({ from: startOfLocalMonth(selectedDate), to: endOfLocalMonth(selectedDate) }),
    [selectedDate],
  )
  const query = useCallback(async () => {
    // Retry changes subscription identity after a failed live query; it does not write any records.
    void readRetry
    const [monthTransactions, allCategories] = await Promise.all([
      transactions.list(monthRange),
      categories.list({ domain: 'finance', includeArchived: true }),
    ])
    return { monthTransactions, allCategories }
  }, [categories, monthRange, transactions, readRetry])
  const state = useLiveQueryState(query)
  const isFormOpen = formMode === 'new' || editing !== undefined
  useEffect(() => {
    if (!initialNew || quickInitialized.current || state.status !== 'ready') return
    quickInitialized.current = true
    // Quick entry waits for the initial category read once; an open draft then owns its snapshot independently of live-query failures.
    setEditorCategories(state.data.allCategories)
    setFormMode('new')
    logger.info('finance.quickentry.opened', { operation: 'create' })
  }, [initialNew, state])
  useEffect(() => {
    if (!reportOpen || !isFormOpen) return
    // NavigationGuard has already obtained discard consent (or rejected a busy write).
    // Only browsing state survives entry to a child route; a body Portal must not survive inside a hidden parent.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize local editor cleanup with the committed child navigation
    setFormMode('closed')
    setEditing(undefined)
    setEditorCategories(undefined)
    setDeleteTarget(undefined)
    logger.info('finance.form.navigationdiscarded', { operation: 'close', reason: 'report-entry' })
  }, [reportOpen, isFormOpen])

  async function save(command: SaveTransactionCommand) {
    if (editing) await transactions.update(editing.id, command)
    else await transactions.create(command)
    // Saving elsewhere must not silently move the calendar the user was browsing.
    setSavedDate(command.localDate !== selectedDate ? command.localDate : undefined)
    setEditing(undefined)
    setFormMode('closed')
    setNotice(command.localDate !== selectedDate ? '账目已保存到其他日期' : '账目已保存')
    logger.info('finance.form.saved', { operation: 'save' })
    // Only the dedicated Today entry returns to its source; calendar editing remains in place.
    onQuickExit?.({ status: 'saved', localDate: command.localDate })
  }

  async function remove(transaction: Transaction) {
    if (deleteLock.current) return
    deleteLock.current = true
    setDeleting(true)
    setPageError('')
    try {
      await transactions.remove(transaction.id)
      setDeleteTarget(undefined)
      setEditing(undefined)
      setNotice('账目已删除')
      logger.info('finance.delete.completed', { operation: 'delete' })
    } catch {
      logger.warn('finance.delete.failed', { operation: 'delete', failureClass: 'DatabaseWrite' })
      setPageError('未能删除，现有记录没有被更改。')
    } finally {
      deleteLock.current = false
      setDeleting(false)
    }
  }

  function moveMonth(amount: number) {
    const next = moveFinanceMonthSelection(selectedDate, amount)
    logger.info('finance.calendar.monthchanged', { operation: 'navigate' })
    setSelectedDate(next)
  }

  function selectDate(localDate: string) {
    // The selected date is private, so the transition is logged without the value itself.
    logger.info('finance.calendar.dayselected', { operation: 'select' })
    setSelectedDate(localDate)
  }

  return (
    <>
      <section className="page finance-page" aria-labelledby="finance-title" hidden={reportOpen}>
        <div className="page-heading-row">
          <div>
            <h1 id="finance-title">记账</h1>
          </div>
          <div className="finance-heading-actions">
            <button
              className="button-primary compact round-action"
              type="button"
              aria-label="新增交易"
              disabled={state.status !== 'ready'}
              onClick={() => {
                if (state.status !== 'ready') return
                setEditorCategories(state.data.allCategories)
                setFormMode('new')
                logger.info('finance.form.opened', { operation: 'create' })
              }}
            >
              <Icon name="add" />
            </button>
          </div>
        </div>
        <p className="finance-feedback" role="status">
          {notice}
        </p>
        {savedDate ? (
          <button
            type="button"
            className="finance-saved-link"
            onClick={() => {
              logger.info('finance.savedrecord.viewed', { operation: 'navigate' })
              setSelectedDate(savedDate)
              setSavedDate(undefined)
              setNotice('已显示保存日期的账目')
            }}
          >
            查看记录
          </button>
        ) : null}
        {pageError && !deleteTarget ? (
          <p className="form-error" role="alert">
            {pageError}
          </p>
        ) : null}
        {state.status === 'loading' ? <p className="state-message">正在读取本地账目…</p> : null}
        {state.status === 'failed' ? (
          <div>
            <p className="form-error" role="alert">
              账目暂时无法读取，数据没有被清空。
            </p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setReadRetry((value) => value + 1)
                logger.info('finance.list.retryrequested', { operation: 'read' })
              }}
            >
              重试读取
            </button>
          </div>
        ) : null}
        {state.status === 'ready' ? (
          <FinanceContent
            monthTransactions={state.data.monthTransactions}
            categories={state.data.allCategories}
            selectedDate={selectedDate}
            reportEntry={
              !initialNew ? (
                <Link
                  to={`/finance/report?month=${selectedDate.slice(0, 7)}`}
                  className="content-entry finance-report-entry"
                  aria-label="报表"
                  ref={reportLinkRef}
                  onClick={() => {
                    returnScroll.current = window.scrollY
                    logger.info('finance.report.opened', { operation: 'navigate' })
                  }}
                >
                  <Icon name="chart" />
                  <span className="content-entry-copy">
                    <strong>收支报表</strong>
                    <small>分类分布 · 消费趋势</small>
                  </span>
                  <Icon name="next" />
                </Link>
              ) : null
            }
            today={today}
            onSelectDate={selectDate}
            onPreviousMonth={() => moveMonth(-1)}
            onNextMonth={() => moveMonth(1)}
            onEdit={(transaction) => {
              setEditorCategories(state.data.allCategories)
              setFormMode('closed')
              setEditing(transaction)
              logger.info('finance.form.opened', { operation: 'update' })
            }}
          />
        ) : null}
        {isFormOpen && editorCategories && !reportOpen ? (
          <TransactionForm
            key={editing?.id ?? `new-${selectedDate}`}
            categories={editorCategories}
            readFailed={state.status === 'failed'}
            defaultLocalDate={selectedDate}
            {...(editing ? { transaction: editing } : {})}
            deleting={deleting}
            onDelete={() => {
              if (!editing) return
              setPageError('')
              setDeleteTarget(editing)
              logger.info('finance.delete.requested', { operation: 'delete' })
            }}
            onCancel={() => {
              setEditing(undefined)
              setFormMode('closed')
              onQuickExit?.({ status: 'cancelled' })
            }}
            onSave={save}
          />
        ) : null}
        {deleteTarget ? (
          <ConfirmDialog
            title="删除这条账目？"
            description="删除后无法撤销，其他记录不会改变。"
            confirmLabel="删除账目"
            busy={deleting}
            error={pageError}
            onCancel={() => {
              setDeleteTarget(undefined)
              setPageError('')
            }}
            onConfirm={() => void remove(deleteTarget)}
          />
        ) : null}
      </section>
      {report}
    </>
  )
}

/** Keep the ledger as a mounted parent so report navigation never rebuilds its browsing context. */
export function FinanceRoute() {
  return <FinancePage report={useOutlet()} />
}

function FinanceContent({
  monthTransactions,
  categories,
  selectedDate,
  today,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onEdit,
  reportEntry,
}: {
  monthTransactions: Transaction[]
  categories: Category[]
  selectedDate: string
  today: string
  onSelectDate: (localDate: string) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  onEdit: (transaction: Transaction) => void
  reportEntry: ReactNode
}) {
  const calendar = buildFinanceMonthCalendar(selectedDate, selectedDate, today, monthTransactions)
  const monthSummary = summarizeTransactions(monthTransactions)
  const selectedTransactions = monthTransactions.filter(
    ({ localDate }) => localDate === selectedDate,
  )
  const categoryNames = new Map(
    categories.map(({ id }) => [id, categoryDisplayName(id, categories)]),
  )
  const calendarSlotCount = Math.ceil((calendar.leadingBlankCount + calendar.days.length) / 7) * 7
  // The visual CSS grid is grouped into semantic seven-cell rows for screen-reader navigation.
  const calendarRows = Array.from({ length: calendarSlotCount / 7 }, (_, rowIndex) =>
    Array.from({ length: 7 }, (_, columnIndex) => {
      const dayIndex = rowIndex * 7 + columnIndex - calendar.leadingBlankCount
      return dayIndex >= 0 ? calendar.days[dayIndex] : undefined
    }),
  )

  return (
    <>
      <section className="finance-calendar-card" aria-labelledby="finance-month-title">
        <div className="month-navigation">
          <button type="button" aria-label="上个月" onClick={onPreviousMonth}>
            <Icon name="back" />
          </button>
          <h2 id="finance-month-title">{formatMonthTitle(selectedDate)}</h2>
          <button type="button" aria-label="下个月" onClick={onNextMonth}>
            <Icon name="next" />
          </button>
        </div>
        <div
          className="finance-calendar"
          role="grid"
          aria-label={`${formatMonthTitle(selectedDate)}账目日历`}
        >
          <div className="finance-calendar-row" role="row">
            {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
              <span className="finance-weekday" role="columnheader" key={label}>
                {label}
              </span>
            ))}
          </div>
          {calendarRows.map((row, rowIndex) => (
            <div className="finance-calendar-row" role="row" key={`week-${rowIndex}`}>
              {row.map((day, columnIndex) =>
                day ? (
                  <button
                    key={day.localDate}
                    type="button"
                    role="gridcell"
                    aria-selected={day.selected}
                    aria-label={`${day.localDate}${day.hasRecords ? `，净额 ${formatMoney(day.balanceMinor)}，支出 ${formatMoney(day.expenseMinor)}，收入 ${formatMoney(day.incomeMinor)}` : '，无账目'}`}
                    className={`${day.selected ? 'selected' : ''}${day.today ? ' today' : ''}`}
                    onClick={() => onSelectDate(day.localDate)}
                  >
                    <span>{day.day}</span>
                    {day.hasRecords ? (
                      <small className={day.balanceMinor >= 0 ? 'income' : 'expense'}>
                        {formatCalendarAmount(day.balanceMinor)}
                      </small>
                    ) : null}
                  </button>
                ) : (
                  <span
                    role="gridcell"
                    aria-hidden="true"
                    key={`blank-${rowIndex}-${columnIndex}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="month-summary" aria-label="本月账目汇总">
        <p>
          <span>本月结余</span>
          <strong>{formatMoney(monthSummary.balanceMinor)}</strong>
        </p>
        <p>
          <span>支出</span>
          <strong>{formatMoney(monthSummary.expenseMinor)}</strong>
        </p>
        <p>
          <span>收入</span>
          <strong>{formatMoney(monthSummary.incomeMinor)}</strong>
        </p>
      </div>

      {/* Read navigation is separate from the header's write target; the arrow has no independent action. */}
      {reportEntry}
      <DailyExpenseChart transactions={monthTransactions} selectedDate={selectedDate} />

      <section className="content-section selected-ledger" aria-labelledby="transaction-list-title">
        <div className="section-heading">
          <h2 id="transaction-list-title">{formatSelectedDate(selectedDate)}</h2>
          <span>{selectedTransactions.length} 笔</span>
        </div>
        {selectedTransactions.length === 0 ? (
          <p className="empty-state">这一天还没有账目。点按右上角即可记一笔。</p>
        ) : (
          <ul className="finance-records">
            {selectedTransactions.map((transaction) => (
              <li key={transaction.id}>
                <button
                  type="button"
                  className="finance-record-open"
                  onClick={() => onEdit(transaction)}
                  aria-label={`编辑 ${categoryNames.get(transaction.categoryId) ?? '账目'} ${formatMoney(transaction.amountMinor)}`}
                >
                  <span className={`finance-record-symbol transaction-${transaction.type}`}>
                    <CategoryIcon
                      name={
                        categories.find(({ id }) => id === transaction.categoryId)?.icon ?? 'other'
                      }
                    />
                  </span>
                  <span className="finance-record-copy">
                    <strong>{categoryNames.get(transaction.categoryId) ?? '已归档分类'}</strong>
                    <span>
                      {formatTransactionTime(transaction)}
                      {transaction.note ? ` · ${transaction.note}` : ''}
                    </span>
                  </span>
                  <strong className={`numeric transaction-${transaction.type}`}>
                    {transaction.type === 'expense' ? '−' : '+'}
                    {formatMoney(transaction.amountMinor)}
                  </strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
