import { useCallback, useMemo, useState, type FormEvent } from 'react'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import {
  TransactionRepository,
  type SaveTransactionCommand,
} from '@/data/repositories/TransactionRepository'
import {
  expenseByCategory,
  monthlyTrend,
  rangeForPeriod,
  summarizeTransactions,
  type FinancePeriod,
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

const periodLabels: Array<{ value: FinancePeriod; label: string }> = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'history', label: '历史' },
]

function toDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTransactionTime(transaction: Transaction): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(transaction.occurredAt))
}

interface TransactionFormProps {
  categories: Category[]
  transaction?: Transaction
  onCancel: () => void
  onSave: (command: SaveTransactionCommand) => Promise<void>
}

function TransactionForm({ categories, transaction, onCancel, onSave }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(
    transaction ? (transaction.amountMinor / 100).toFixed(2) : '',
  )
  const matchingCategories = categories.filter(
    (category) =>
      category.transactionType === type &&
      (category.archived === 0 || category.id === transaction?.categoryId),
  )
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [occurredAt, setOccurredAt] = useState(
    transaction
      ? toDateTimeLocalInput(new Date(transaction.occurredAt))
      : toDateTimeLocalInput(new Date()),
  )
  const [note, setNote] = useState(transaction?.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const parsedAmount = parseMoneyToMinor(amount)
    const selectedDate = new Date(occurredAt)
    const selectedCategory = matchingCategories.find(({ id }) => id === categoryId)
    if (!parsedAmount.ok || !selectedCategory || Number.isNaN(selectedDate.getTime())) {
      logger.warn('finance.form.validationfailed', {
        operation: transaction ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请填写大于 0 的有效金额、匹配分类和日期时间。')
      return
    }

    setSaving(true)
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
      setError('未能保存，本次输入仍保留。请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="entry-form"
      onSubmit={(event) => void submit(event)}
      aria-label={transaction ? '编辑交易' : '新增交易'}
    >
      <div className="segmented-control" aria-label="交易类型">
        {(['expense', 'income'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={type === value ? 'segment-active' : ''}
            aria-pressed={type === value}
            onClick={() => {
              setType(value)
              setCategoryId('')
            }}
          >
            {value === 'expense' ? '支出' : '收入'}
          </button>
        ))}
      </div>

      <label>
        金额（CNY）
        <input
          autoFocus
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          aria-describedby={error ? 'finance-form-error' : undefined}
        />
      </label>
      <label>
        分类
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">请选择</option>
          {matchingCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? '（已归档）' : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        日期与时间
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </label>
      <label>
        备注（可选）
        <input value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} />
      </label>

      {error ? (
        <p className="form-error" id="finance-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}

export function FinancePage() {
  const { database } = useAppServices()
  const transactions = useMemo(() => new TransactionRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const [period, setPeriod] = useState<FinancePeriod>('month')
  const [formMode, setFormMode] = useState<'closed' | 'new'>('closed')
  const [editing, setEditing] = useState<Transaction | undefined>()
  const [pageError, setPageError] = useState('')
  const today = toLocalDateKey(new Date())
  const range = useMemo(() => rangeForPeriod(period, today), [period, today])
  const trendRange = useMemo(
    () => ({ from: startOfLocalMonth(addLocalMonths(today, -5)), to: endOfLocalMonth(today) }),
    [today],
  )

  const query = useCallback(async () => {
    const [selected, allCategories, trendTransactions] = await Promise.all([
      transactions.list(range),
      categories.list({ domain: 'finance', includeArchived: true }),
      transactions.list(trendRange),
    ])
    return { selected, allCategories, trendTransactions }
  }, [categories, range, transactions, trendRange])
  const state = useLiveQueryState(query)

  async function save(command: SaveTransactionCommand) {
    if (editing) await transactions.update(editing.id, command)
    else await transactions.create(command)
    setEditing(undefined)
    setFormMode('closed')
  }

  async function remove(transaction: Transaction) {
    if (!window.confirm('确认删除这条交易？此操作不会影响其他记录。')) return
    setPageError('')
    try {
      await transactions.remove(transaction.id)
    } catch {
      setPageError('未能删除，现有记录没有被更改。')
    }
  }

  const isFormOpen = formMode === 'new' || editing !== undefined

  return (
    <section className="page" aria-labelledby="finance-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">finance</p>
          <h1 id="finance-title">记账</h1>
        </div>
        {!isFormOpen ? (
          <button
            className="button-primary compact"
            type="button"
            onClick={() => setFormMode('new')}
          >
            新增
          </button>
        ) : null}
      </div>

      {isFormOpen && state.status === 'ready' ? (
        <TransactionForm
          key={editing?.id ?? 'new'}
          categories={state.data.allCategories}
          {...(editing ? { transaction: editing } : {})}
          onCancel={() => {
            setEditing(undefined)
            setFormMode('closed')
          }}
          onSave={save}
        />
      ) : null}

      <div className="period-tabs" aria-label="账目时间范围">
        {periodLabels.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {pageError ? (
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
          transactions={state.data.selected}
          trendTransactions={state.data.trendTransactions}
          categories={state.data.allCategories}
          period={period}
          today={today}
          onEdit={(transaction) => {
            setFormMode('closed')
            setEditing(transaction)
          }}
          onDelete={(transaction) => void remove(transaction)}
        />
      ) : null}
    </section>
  )
}

interface FinanceContentProps {
  transactions: Transaction[]
  trendTransactions: Transaction[]
  categories: Category[]
  period: FinancePeriod
  today: string
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

function FinanceContent({
  transactions,
  trendTransactions,
  categories,
  period,
  today,
  onEdit,
  onDelete,
}: FinanceContentProps) {
  const summary = summarizeTransactions(transactions)
  const categoryNames = new Map(categories.map(({ id, name }) => [id, name]))
  const breakdown = expenseByCategory(transactions, categories)
  const trend = monthlyTrend(trendTransactions, today)
  const trendMaximum = Math.max(...trend.map(({ expenseMinor }) => expenseMinor), 1)

  return (
    <>
      <div className="summary-grid" aria-label="账目汇总">
        <article>
          <span>收入</span>
          <strong>{formatMoney(summary.incomeMinor)}</strong>
        </article>
        <article>
          <span>支出</span>
          <strong>{formatMoney(summary.expenseMinor)}</strong>
        </article>
        <article>
          <span>结余</span>
          <strong>{formatMoney(summary.balanceMinor)}</strong>
        </article>
      </div>

      <section className="content-section" aria-labelledby="transaction-list-title">
        <h2 id="transaction-list-title">记录</h2>
        {transactions.length === 0 ? (
          <p className="empty-state">这个时间范围还没有账目。新增一笔，就从这里开始。</p>
        ) : (
          <ul className="record-list">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <div className="record-main">
                  <span>{categoryNames.get(transaction.categoryId) ?? '已归档分类'}</span>
                  <strong className="numeric">
                    {transaction.type === 'expense' ? '−' : '+'}
                    {formatMoney(transaction.amountMinor)}
                  </strong>
                </div>
                <p>
                  {formatTransactionTime(transaction)}
                  {transaction.note ? ` · ${transaction.note}` : ''}
                </p>
                <div className="row-actions">
                  <button type="button" onClick={() => onEdit(transaction)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => onDelete(transaction)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {period === 'month' ? (
        <>
          <section className="content-section" aria-labelledby="category-breakdown-title">
            <h2 id="category-breakdown-title">本月支出分类</h2>
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
        </>
      ) : null}
    </>
  )
}
