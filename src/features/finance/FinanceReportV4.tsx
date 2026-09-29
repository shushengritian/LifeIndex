import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { PageHeading, SectionHeading, Feedback } from '@/shared/ui/v4/Elements'
import { formatMoney, monthRange } from '@/shared/v4/format'
import { useTodayDate, validMonth, usePageLog } from '@/features/today/v4/data'
import { MonthPicker } from './v4/MonthPicker'
import { RecordPageSection } from './v4/RecordPageSection'
import { ReportBackLink } from './v4/ReportNavigation'

export function FinanceReportV4() {
  usePageLog('finance-report')
  const location = useLocation(),
    services = useV4Services(),
    today = useTodayDate(),
    [search, setSearch] = useSearchParams(),
    month = validMonth(search.get('month')) ? search.get('month')! : today.slice(0, 7),
    query = useV4Query(useCallback(() => services.transactions.getMonth(month), [services, month])),
    data = query.snapshot?.data
  return (
    <>
      <PageHeading
        title="收支回看"
        description="数字有去处，生活有轮廓。"
        action={<ReportBackLink />}
      />
      <MonthPicker
        month={month}
        onChange={(value) => {
          const params = new URLSearchParams(search)
          params.set('month', value)
          params.delete('cursor')
          setSearch(params, { state: location.state })
        }}
      />
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在整理本月报表" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="报表暂时读不到" onRetry={query.retry} />
      ) : (
        data && (
          <div className="v4-two-column">
            <div>
              <section className="v4-finance-stage">
                <h2>{month} 支出</h2>
                <div className="v4-finance-number numeric">
                  <small>¥</small>
                  {formatMoney(data.expenseMinor)}
                </div>
                <div className="v4-finance-meta">
                  <div>
                    <span>收入</span>
                    <strong>¥ {formatMoney(data.incomeMinor)}</strong>
                  </div>
                  <div>
                    <span>结余</span>
                    <strong>¥ {formatMoney(data.netMinor)}</strong>
                  </div>
                </div>
              </section>
              <SectionHeading title="支出去向" />
              {data.categories.filter((item) => item.type === 'expense').length ? (
                <ul className="v4-category-report">
                  {data.categories
                    .filter((item) => item.type === 'expense')
                    .sort((a, b) => b.amountMinor - a.amountMinor)
                    .map((item) => (
                      <li key={item.category.id}>
                        <strong>{item.category.name}</strong>
                        <span>
                          ¥ {formatMoney(item.amountMinor)} · {item.count} 笔
                        </span>
                        <div aria-hidden="true">
                          <i
                            style={{
                              width: `${data.expenseMinor ? (item.amountMinor / data.expenseMinor) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <Feedback kind="empty" title="这个月还没有支出">
                  记录之后，这里会展示真实去向。
                </Feedback>
              )}
            </div>
            <section>
              <SectionHeading title="对应流水" />
              <RecordPageSection key={month} kind="transaction" range={monthRange(month)} />
            </section>
          </div>
        )
      )}
    </>
  )
}
