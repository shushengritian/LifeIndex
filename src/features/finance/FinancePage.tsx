import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePwa } from '@/pwa/PwaContext'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import {
  TransactionRepository,
  type SaveTransactionCommand,
} from '@/data/repositories/TransactionRepository'
import {
  buildFinanceMonthCalendar,
  expenseByCategory,
  monthlyTrend,
  moveFinanceMonthSelection,
  summarizeTransactions,
} from '@/features/finance/financeDomain'
import {
  addLocalMonths,
  endOfLocalMonth,
  startOfLocalMonth,
  toLocalDateKey,
} from '@/shared/domain/date'
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
  onCancel: () => void
  onSave: (command: SaveTransactionCommand) => Promise<void>
}

function TransactionForm({
  categories,
  defaultLocalDate,
  transaction,
  onCancel,
  onSave,
}: TransactionFormProps) {
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
  const dirty =
    type !== initialValues.type ||
    amount !== initialValues.amount ||
    categoryId !== initialValues.categoryId ||
    occurredAt !== initialValues.occurredAt ||
    note !== initialValues.note
  useDirtyForm(dirty, saving)

  function cancel() {
    if (saveLock.current) return
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
    if (saveLock.current) {
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
    <form
      className="sheet-form finance-sheet-form"
      onSubmit={(event) => void submit(event)}
      aria-label={transaction ? '编辑交易' : '新增交易'}
      aria-busy={saving}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !confirmDiscard) {
          event.preventDefault()
          cancel()
        }
      }}
    >
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
      {error ? (
        <p className="form-error" id="finance-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="button" className="button-secondary" disabled={saving} onClick={cancel}>
          取消
        </button>
        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
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
  )
}

export function FinanceNewPage() {
  const navigate = useNavigate()
  const { dirtyFormCount, busyFormCount } = usePwa()
  const [exit, setExit] = useState<'saved' | 'cancelled'>()
  const returned = useRef(false)
  useEffect(() => {
    // The editor must unmount and release its write/draft guard before the return navigation.
    // Navigating inside onSave would race that cleanup and be blocked as an in-flight write.
    if (!exit || dirtyFormCount || busyFormCount || returned.current) return
    returned.current = true
    logger.info('finance.quickentry.returned', { operation: 'navigate', reason: exit })
    void navigate('/today', { replace: true, state: { financeSaved: exit === 'saved' } })
  }, [exit, dirtyFormCount, busyFormCount, navigate])
  return <FinancePage initialNew onQuickExit={setExit} />
}

export function FinancePage({
  initialNew = false,
  onQuickExit,
}: {
  initialNew?: boolean
  onQuickExit?: (result: 'saved' | 'cancelled') => void
}) {
  const { database } = useAppServices()
  const transactions = useMemo(() => new TransactionRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const today = toLocalDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  // The Today entry opens the existing guarded editor; ordinary calendar navigation stays closed.
  const [formMode, setFormMode] = useState<'closed' | 'new'>(initialNew ? 'new' : 'closed')
  const [editing, setEditing] = useState<Transaction>()
  const [pageError, setPageError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Transaction>()
  const [deleting, setDeleting] = useState(false)
  const deleteLock = useRef(false)
  const [notice, setNotice] = useState('')
  const [savedDate, setSavedDate] = useState<string>()
  useDirtyForm(false, deleting)
  const monthRange = useMemo(
    () => ({ from: startOfLocalMonth(selectedDate), to: endOfLocalMonth(selectedDate) }),
    [selectedDate],
  )
  const trendRange = useMemo(
    () => ({
      from: startOfLocalMonth(addLocalMonths(selectedDate, -5)),
      to: endOfLocalMonth(selectedDate),
    }),
    [selectedDate],
  )
  const query = useCallback(async () => {
    const [monthTransactions, allCategories, trendTransactions] = await Promise.all([
      transactions.list(monthRange),
      categories.list({ domain: 'finance', includeArchived: true }),
      transactions.list(trendRange),
    ])
    return { monthTransactions, allCategories, trendTransactions }
  }, [categories, monthRange, transactions, trendRange])
  const state = useLiveQueryState(query)
  const isFormOpen = formMode === 'new' || editing !== undefined

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
    onQuickExit?.('saved')
  }

  async function remove(transaction: Transaction) {
    if (deleteLock.current) return
    deleteLock.current = true
    setDeleting(true)
    setPageError('')
    try {
      await transactions.remove(transaction.id)
      setDeleteTarget(undefined)
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
    <section className="page finance-page" aria-labelledby="finance-title">
      <div className="page-heading-row">
        <div>
          <h1 id="finance-title">记账</h1>
        </div>
        <button
          className="button-primary compact round-action"
          type="button"
          aria-label="新增交易"
          onClick={() => setFormMode('new')}
        >
          <Icon name="add" />
        </button>
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
        <p className="form-error" role="alert">
          账目暂时无法读取，数据没有被清空。
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <FinanceContent
          monthTransactions={state.data.monthTransactions}
          trendTransactions={state.data.trendTransactions}
          categories={state.data.allCategories}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={selectDate}
          onPreviousMonth={() => moveMonth(-1)}
          onNextMonth={() => moveMonth(1)}
          onEdit={(transaction) => {
            setFormMode('closed')
            setEditing(transaction)
          }}
          onDelete={(transaction) => {
            setPageError('')
            setDeleteTarget(transaction)
            logger.info('finance.delete.requested', { operation: 'delete' })
          }}
        />
      ) : null}
      {isFormOpen && state.status === 'ready' ? (
        <Sheet title={editing ? '编辑账目' : '记一笔'}>
          <TransactionForm
            key={editing?.id ?? `new-${selectedDate}`}
            categories={state.data.allCategories}
            defaultLocalDate={selectedDate}
            {...(editing ? { transaction: editing } : {})}
            onCancel={() => {
              setEditing(undefined)
              setFormMode('closed')
              onQuickExit?.('cancelled')
            }}
            onSave={save}
          />
        </Sheet>
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
  )
}

function FinanceContent({
  monthTransactions,
  trendTransactions,
  categories,
  selectedDate,
  today,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onEdit,
  onDelete,
}: {
  monthTransactions: Transaction[]
  trendTransactions: Transaction[]
  categories: Category[]
  selectedDate: string
  today: string
  onSelectDate: (localDate: string) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}) {
  const calendar = buildFinanceMonthCalendar(selectedDate, selectedDate, today, monthTransactions)
  const monthSummary = summarizeTransactions(monthTransactions)
  const selectedTransactions = monthTransactions.filter(
    ({ localDate }) => localDate === selectedDate,
  )
  const categoryNames = new Map(
    categories.map(({ id }) => [id, categoryDisplayName(id, categories)]),
  )
  const breakdown = expenseByCategory(monthTransactions, categories)
  const trend = monthlyTrend(trendTransactions, selectedDate)
  const trendMaximum = Math.max(...trend.map(({ expenseMinor }) => expenseMinor), 1)
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
            ‹
          </button>
          <h2 id="finance-month-title">{formatMonthTitle(selectedDate)}</h2>
          <button type="button" aria-label="下个月" onClick={onNextMonth}>
            ›
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
                    aria-label={`${day.localDate}${day.hasRecords ? `，净额 ${formatMoney(day.balanceMinor)}` : '，无账目'}`}
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
                <div className="finance-record-actions">
                  <button
                    type="button"
                    className="text-destructive"
                    aria-label="删除"
                    onClick={() => onDelete(transaction)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="finance-reports">
        <summary>查看本月统计</summary>
        <section className="content-section" aria-labelledby="category-breakdown-title">
          <h2 id="category-breakdown-title">支出分类</h2>
          {breakdown.length === 0 ? (
            <p className="empty-state">本月还没有支出。</p>
          ) : (
            <ul className="breakdown-list">
              {breakdown.map((item) => (
                <li key={item.categoryId}>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.amountMinor)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="content-section" aria-labelledby="trend-title">
          <h2 id="trend-title">近六个月支出</h2>
          <ol className="trend-list">
            {trend.map((item) => (
              <li key={item.month}>
                <span>{item.month.slice(5)}月</span>
                <span className="trend-track" aria-hidden="true">
                  <span style={{ width: `${(item.expenseMinor / trendMaximum) * 100}%` }} />
                </span>
                <strong>{formatMoney(item.expenseMinor)}</strong>
              </li>
            ))}
          </ol>
        </section>
      </details>
    </>
  )
}
