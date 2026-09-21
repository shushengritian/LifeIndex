import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { TransactionRepository } from '@/data/repositories/TransactionRepository'
import { addLocalMonths, endOfLocalMonth, isLocalDateKey } from '@/shared/domain/date'
import type { TransactionType } from '@/shared/domain/types'
import { useCurrentLocalDate } from '@/shared/hooks/useCurrentLocalDate'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { Icon } from '@/shared/ui/Icon'
import { FinanceReport } from './FinanceReport'

export function FinanceReportPage() {
  const [params] = useSearchParams()
  const today = useCurrentLocalDate()
  const monthInput = params.get('month')
  const [monthDate, setMonthDate] = useState(() => {
    // URL inputs select a read-only view only. Invalid or out-of-range calendar keys never reach IndexedDB queries.
    const candidate = `${monthInput ?? ''}-01`
    return isLocalDateKey(candidate) && candidate >= '1000-01-01'
      ? candidate
      : `${today.slice(0, 7)}-01`
  })
  const [type, setType] = useState<TransactionType>('expense')
  const [retry, setRetry] = useState(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    logger.info('finance.report.entered', { operation: 'read' })
  }, [])

  function moveMonth(delta: number) {
    const next = addLocalMonths(monthDate, delta)
    if (!isLocalDateKey(next) || next < '1000-01-01') {
      logger.warn('finance.report.monthblocked', { operation: 'navigate', reason: 'date-boundary' })
      return
    }
    setMonthDate(next)
    logger.info('finance.report.monthchanged', { operation: 'navigate' })
  }

  return (
    <section className="page finance-report-page" aria-labelledby="finance-report-title">
      <div className="finance-report-heading">
        <Link to="/finance" replace className="finance-report-back" aria-label="返回记账">
          <Icon name="back" />
        </Link>
        <h1 id="finance-report-title" tabIndex={-1} ref={titleRef}>
          报表
        </h1>
      </div>
      {/* A keyed query boundary prevents the previous month's totals flashing under the next month's heading. */}
      <ReportData
        key={`${monthDate}:${retry}`}
        monthDate={monthDate}
        today={today}
        type={type}
        onTypeChange={(next) => {
          setType(next)
          logger.info('finance.report.typechanged', { operation: 'select', toState: next })
        }}
        onMonthChange={moveMonth}
        onRetry={() => {
          setRetry((value) => value + 1)
          logger.info('finance.report.retryrequested', { operation: 'read' })
        }}
      />
    </section>
  )
}

function ReportData({
  monthDate,
  today,
  type,
  onTypeChange,
  onMonthChange,
  onRetry,
}: {
  monthDate: string
  today: string
  type: TransactionType
  onTypeChange: (type: TransactionType) => void
  onMonthChange: (delta: number) => void
  onRetry: () => void
}) {
  const { database } = useAppServices()
  const transactions = useMemo(() => new TransactionRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const query = useCallback(async () => {
    logger.info('finance.report.readstarted', { operation: 'read' })
    try {
      const [entries, labels] = await Promise.all([
        transactions.list({ from: monthDate, to: endOfLocalMonth(monthDate) }),
        categories.list({ domain: 'finance', includeArchived: true }),
      ])
      logger.info('finance.report.readcompleted', { operation: 'read' })
      return { entries, labels }
    } catch {
      logger.warn('finance.report.readfailed', { operation: 'read', failureClass: 'DatabaseRead' })
      throw new Error('ReportReadFailed')
    }
  }, [categories, monthDate, transactions])
  const state = useLiveQueryState(query)
  if (state.status === 'loading')
    return (
      <p className="state-message" role="status">
        正在读取本地报表…
      </p>
    )
  if (state.status === 'failed')
    return (
      <div>
        <p role="alert" className="form-error">
          报表暂时无法读取，已有账目没有改变。
        </p>
        <button className="button-secondary" type="button" onClick={onRetry}>
          重试读取
        </button>
      </div>
    )
  return (
    <FinanceReport
      transactions={state.data.entries}
      categories={state.data.labels}
      monthDate={monthDate}
      today={today}
      type={type}
      onTypeChange={onTypeChange}
      onMonthChange={onMonthChange}
    />
  )
}
