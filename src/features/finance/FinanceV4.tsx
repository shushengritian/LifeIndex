import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFlow } from '@/app/v4/Flow'
import { PageHeading, SectionHeading, Feedback } from '@/shared/ui/v4/Elements'
import { formatMoney, monthRange } from '@/shared/v4/format'
import {
  calendarDays,
  shiftDate,
  useTodayDate,
  validMonth,
  usePageLog,
} from '@/features/today/v4/data'
import { RecordPageSection } from './v4/RecordPageSection'
import { MonthPicker } from './v4/MonthPicker'
import { ReportLink } from './v4/ReportNavigation'
import { useReportReturn } from './v4/useReportReturn'

export function FinanceV4() {
  usePageLog('finance')
  const services = useV4Services(),
    today = useTodayDate(),
    flow = useFlow(),
    [search, setSearch] = useSearchParams(),
    month = validMonth(search.get('month')) ? search.get('month')! : today.slice(0, 7),
    calendar = search.get('view') === 'calendar'
  const candidate = search.get('day'),
    days = calendarDays(month).filter((value): value is string => !!value),
    day =
      candidate && days.includes(candidate)
        ? candidate
        : month === today.slice(0, 7)
          ? today
          : `${month}-01`
  const query = useV4Query(
      useCallback(() => services.transactions.getMonth(month), [services, month]),
    ),
    data = query.snapshot?.data
  useReportReturn(query.status === 'ready')
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(search)
    Object.entries(values).forEach(([key, value]) => next.set(key, value))
    next.delete('cursor')
    setSearch(next)
  }
  return (
    <>
      <PageHeading
        title="让每一笔，都有去处。"
        description={`${month.replace('-', ' 年 ')} 月`}
        action={
          <ReportLink month={month} focusKey="finance-report">
            月报表
          </ReportLink>
        }
      />
      <MonthPicker
        month={month}
        onChange={(value) => change({ month: value, day: `${value}-01` })}
      />
      <div className="v4-two-column">
        <div>
          {query.status === 'loading' ? (
            <Feedback kind="loading" title="正在读取本月收支" />
          ) : query.status === 'failed' ? (
            <Feedback kind="error" title="本月收支暂时读不到" onRetry={query.retry} />
          ) : (
            data && (
              <section className="v4-finance-stage">
                <h2>本月支出</h2>
                <div className="v4-finance-number numeric">
                  <small>¥</small>
                  {formatMoney(data.expenseMinor)}
                </div>
                <div className="v4-finance-meta">
                  <div>
                    <span>本月收入</span>
                    <strong>¥ {formatMoney(data.incomeMinor)}</strong>
                  </div>
                  <div>
                    <span>收支结余</span>
                    <strong>¥ {formatMoney(data.netMinor)}</strong>
                  </div>
                </div>
              </section>
            )
          )}
          <div className="v4-view-switch" role="group" aria-label="记账视图">
            <button type="button" aria-pressed={!calendar} onClick={() => change({ view: 'list' })}>
              本月流水
            </button>
            <button
              type="button"
              aria-pressed={calendar}
              onClick={() => change({ view: 'calendar' })}
            >
              按日查看
            </button>
          </div>
          {calendar && (
            <div className="v4-calendar" aria-label={`${month}记账日期`}>
              {['一', '二', '三', '四', '五', '六', '日'].map((value) => (
                <span key={value} aria-hidden="true">
                  {value}
                </span>
              ))}
              {calendarDays(month).map((value, index) =>
                value ? (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === day}
                    aria-label={`${value}${data?.days.some((item) => item.date === value && item.count > 0) ? '，有收支记录' : ''}`}
                    onClick={() => change({ day: value })}
                  >
                    {Number(value.slice(8))}
                    {data?.days.some((item) => item.date === value && item.count > 0) && (
                      <i aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <i key={`blank-${index}`} />
                ),
              )}
            </div>
          )}
        </div>
        <section>
          <SectionHeading title={calendar ? `${day} 流水` : '本月流水'}>
            <button
              type="button"
              className="text-button"
              data-focus-key="finance-create"
              disabled={calendar && day > today}
              onClick={() =>
                flow.openCreate('expense', calendar ? { defaultDate: day } : undefined)
              }
            >
              记一笔
            </button>
          </SectionHeading>
          {calendar && day > today && (
            <p className="v4-scope-note">可以查看这个日期，不能提前记录尚未发生的收支。</p>
          )}
          <RecordPageSection
            key={`${month}-${calendar ? day : 'list'}`}
            kind="transaction"
            range={calendar ? { from: day, toExclusive: shiftDate(day, 1) } : monthRange(month)}
          />
        </section>
      </div>
    </>
  )
}
