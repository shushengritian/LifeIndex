import { useEffect, useId, useMemo } from 'react'
import { isLocalDateKey } from '@/shared/domain/date'
import type { Category, Transaction, TransactionType } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { Icon } from '@/shared/ui/Icon'
import { DailyExpenseChart } from './DailyExpenseChart'
import { buildFinanceMonthReport, formatFinanceReportMoney } from './financeReportDomain'

export interface FinanceReportProps {
  transactions: Transaction[]
  categories: Category[]
  monthDate: string
  today: string
  type: TransactionType
  onTypeChange: (type: TransactionType) => void
  onMonthChange: (delta: number) => void
}

/** Read-only body: the parent owns queries, loading/errors, route header and ledger return context. */
export function FinanceReport({
  transactions,
  categories,
  monthDate,
  today,
  type,
  onTypeChange,
  onMonthChange,
}: FinanceReportProps) {
  const id = useId()
  const label = type === 'income' ? '收入' : '支出'
  const projection = useMemo(() => {
    try {
      return {
        status: 'ready' as const,
        data: buildFinanceMonthReport(transactions, categories, monthDate, today, type),
      }
    } catch {
      // Arithmetic/selection failure is distinct from a successful empty read. Never show a false zero.
      return { status: 'error' as const }
    }
  }, [transactions, categories, monthDate, today, type])
  const state =
    projection.status === 'error' ? 'error' : projection.data.recordCount > 0 ? 'recorded' : 'empty'
  // Selection chrome remains usable on amount overflow; it does not depend on successful aggregation.
  const month = isLocalDateKey(monthDate) ? `${monthDate.slice(0, 7)}-01` : undefined
  const previousDisabled = !month || month <= '1000-01-01'
  const nextDisabled = !month || month >= '9999-12-01'
  useEffect(() => {
    logger.info('finance.report.rendered', {
      operation: 'render',
      actionType: type,
      toState: state,
    })
  }, [state, type])

  function changeMonth(delta: number) {
    if ((delta < 0 && previousDisabled) || (delta > 0 && nextDisabled)) {
      logger.info('finance.report.monthblocked', {
        operation: 'navigate',
        reason: 'calendar-boundary',
      })
      return
    }
    logger.info('finance.report.monthrequested', {
      operation: 'navigate',
      reason: delta < 0 ? 'previous-month' : 'next-month',
    })
    onMonthChange(delta)
  }

  function changeType(next: TransactionType) {
    // This controlled component never owns a second copy of the parent's selection.
    if (next === type) {
      logger.info('finance.report.typeunchanged', { operation: 'select', actionType: next })
      return
    }
    logger.info('finance.report.typerequested', {
      operation: 'select',
      fromState: type,
      toState: next,
    })
    onTypeChange(next)
  }

  return (
    <div className="finance-report-body">
      <div className="month-navigation finance-report-month" role="group" aria-label="报表月份">
        <button
          type="button"
          aria-label="报表上个月"
          disabled={previousDisabled}
          onClick={() => changeMonth(-1)}
        >
          <Icon name="back" />
        </button>
        <h2>
          {month ? `${Number(month.slice(0, 4))} 年 ${Number(month.slice(5, 7))} 月` : '报表月份'}
        </h2>
        <button
          type="button"
          aria-label="报表下个月"
          disabled={nextDisabled}
          onClick={() => changeMonth(1)}
        >
          <Icon name="next" />
        </button>
      </div>
      <div
        className="segmented-control finance-report-types"
        role="group"
        aria-label="报表收支类型"
      >
        {(['expense', 'income'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={type === value ? 'segment-active' : ''}
            aria-pressed={type === value}
            onClick={() => changeType(value)}
          >
            {value === 'expense' ? '支出' : '收入'}
          </button>
        ))}
      </div>
      {projection.status === 'error' ? (
        <p className="form-error" role="alert">
          暂时无法计算报表。金额或日期超出支持范围，请检查账目后重试。
        </p>
      ) : (
        <>
          <div className="month-summary finance-report-summary" aria-label="报表月汇总">
            <p>
              <span>本月{label}</span>
              <strong>{formatFinanceReportMoney(projection.data.totalMinor)}</strong>
            </p>
            <p>
              <span>记录</span>
              <strong>{projection.data.recordCount} 笔</strong>
            </p>
          </div>
          <section
            className="content-section finance-report-section"
            aria-labelledby={`${id}-categories`}
          >
            <h2 id={`${id}-categories`}>{label}分类</h2>
            <p className="finance-report-hint">按一级分类汇总，包含二级记录</p>
            {projection.data.recordCount === 0 ? (
              <div className="empty-state finance-report-empty">
                <p>本月暂无{label}</p>
                <p>可以切换月份或收支类型。已有记录后，分类分布会显示在这里。</p>
              </div>
            ) : (
              <ul className="finance-report-categories" aria-label={`${label}分类汇总`}>
                {projection.data.categories.map((group) => (
                  <li key={group.categoryId} className="finance-report-category">
                    <div className="finance-report-category-heading">
                      <span className={`category-glyph tone-${group.color}`}>
                        <CategoryIcon name={group.icon} />
                      </span>
                      <span className="finance-report-category-name">
                        {group.name}
                        {group.archived && <small>已归档</small>}
                      </span>
                      <span className="finance-report-category-count">{group.recordCount} 笔</span>
                    </div>
                    <div className="finance-report-values">
                      <strong>{formatFinanceReportMoney(group.amountMinor)}</strong>
                      <span>{group.percentageLabel}</span>
                    </div>
                    {/* The bar is a comparison, not a control. Its text alternative keeps exact money/counts. */}
                    <svg
                      className={`finance-report-bar tone-${group.color}`}
                      viewBox="0 0 100 8"
                      preserveAspectRatio="none"
                      width="100%"
                      height="8"
                      role="img"
                      aria-label={`${group.name}，${formatFinanceReportMoney(group.amountMinor)}，占比 ${group.percentageLabel}，${group.recordCount} 笔`}
                    >
                      <rect width="100" height="8" rx="2" fill="var(--surface)" />
                      <rect width={group.percentage} height="8" rx="2" fill="currentColor" />
                    </svg>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section
            className="content-section finance-report-section"
            aria-labelledby={`${id}-trend`}
          >
            <h2 id={`${id}-trend`}>每日趋势</h2>
            <DailyExpenseChart
              transactions={transactions}
              fromDate={projection.data.trendRange.from}
              selectedDate={projection.data.trendRange.to}
              type={type}
            />
          </section>
        </>
      )}
    </div>
  )
}
