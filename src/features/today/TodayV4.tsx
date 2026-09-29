import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFocusRuntime } from '@/app/v4/FocusRuntime'
import { useFlow } from '@/app/v4/Flow'
import { Feedback, Rosette, SectionHeading } from '@/shared/ui/v4/Elements'
import { RecordList } from '@/shared/ui/v4/RecordList'
import { formatClock, formatMoney } from '@/shared/v4/format'
import { HabitAction } from '@/features/habits/v4/HabitAction'
import { ReportLink } from '@/features/finance/v4/ReportNavigation'
import { useReportReturn } from '@/features/finance/v4/useReportReturn'
import { useTodayDate, usePageLog } from './v4/data'

function TodayHabits({ date }: { date: string }) {
  const services = useV4Services(),
    query = useV4Query(useCallback(() => services.today.getHabits(date), [services, date]))
  const result = query.snapshot?.data
  return (
    <section
      className="v4-habit-station"
      data-ready-region="today-habits"
      data-state={query.status}
    >
      <SectionHeading title="今天，慢慢养成">
        {result && query.status === 'ready' && (
          <span>
            {result.scheduledCount
              ? `${result.scheduledCompletedCount}/${result.scheduledCount} 今日`
              : '今天无计划'}
          </span>
        )}
      </SectionHeading>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取习惯" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="习惯暂时读不到" onRetry={query.retry} />
      ) : result && query.snapshot ? (
        <>
          {result.items.filter((item) => item.scheduled).length ? (
            <ul className="v4-habit-list">
              {result.items
                .filter((item) => item.scheduled)
                .slice(0, 2)
                .map(({ habit, check }) => (
                  <HabitAction
                    key={habit.id}
                    habit={habit}
                    completed={!!check}
                    date={date}
                    stamp={query.snapshot!.stamp}
                  />
                ))}
            </ul>
          ) : (
            <p className="v4-habit-empty">今天没有计划中的习惯。留一点空间，或从一件小事开始。</p>
          )}
          <div className="v4-habit-footer">
            <span>
              {result.scheduledCount
                ? `今日 ${result.scheduledCount} 项 · 不必一次全部完成`
                : '按自己的频率重复'}
            </span>
            <Link to="/health/habits" className="text-button">
              查看习惯
            </Link>
          </div>
        </>
      ) : null}
    </section>
  )
}
function FocusEntry() {
  const runtime = useFocusRuntime(),
    session = runtime.session
  const label = runtime.awaitingSave
    ? '待保存 · 时间已停止'
    : session?.status === 'paused'
      ? '已暂停 · 时间不累计'
      : session
        ? '这一刻正在进行'
        : '一次，只做一件事'
  return (
    <section
      className="v4-focus-entry"
      data-ready-region="focus-runtime"
      data-state={runtime.status}
    >
      <h2>给自己一段专注</h2>
      <Rosette className="v4-entry-rosette" />
      {runtime.status === 'failed' ? (
        <Feedback kind="error" title="专注状态暂时读不到" onRetry={() => void runtime.retry()} />
      ) : runtime.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取专注" />
      ) : (
        <>
          <div className="v4-entry-time numeric">
            {formatClock(session ? runtime.remainingSeconds : 1500)}
          </div>
          <p>{label}</p>
          <Link className="v4-tile-link" to="/focus">
            {session ? '回到专注空间' : '进入专注空间'}
            <span aria-hidden="true">↗</span>
          </Link>
        </>
      )}
    </section>
  )
}
function TodayFinance({ date }: { date: string }) {
  const services = useV4Services(),
    query = useV4Query(useCallback(() => services.today.getFinance(date), [services, date])),
    data = query.snapshot?.data
  return (
    <section
      className="v4-finance-entry"
      data-ready-region="today-finance"
      data-state={query.status}
    >
      <h2>今日支出</h2>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取收支" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="收支暂时读不到" onRetry={query.retry} />
      ) : (
        data && (
          <>
            <div className="v4-entry-amount numeric">
              <small>¥</small>
              {formatMoney(data.expenseMinor)}
            </div>
            <p>{data.transactionCount} 笔收支记录</p>
            <ReportLink month={date.slice(0, 7)} focusKey="today-report">
              本月报表 <span aria-hidden="true">↗</span>
            </ReportLink>
          </>
        )
      )}
    </section>
  )
}
export function TodayV4() {
  usePageLog('today')
  const services = useV4Services(),
    date = useTodayDate(),
    flow = useFlow(),
    [search, setSearch] = useSearchParams(),
    timeline = search.get('view') === 'timeline',
    [limit, setLimit] = useState(20)
  const records = useV4Query(
    useCallback(() => services.today.getRecords(date, { limit }), [services, date, limit]),
  )
  const data = records.snapshot?.data
  useReportReturn(records.status === 'ready')
  const day = new Date(`${date}T12:00:00`),
    dateLabel = day.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  return (
    <>
      <header className="v4-today-title">
        <div>
          <h1>
            把今天，
            <br />
            过成自己的。
          </h1>
          <p>{dateLabel}</p>
        </div>
        <div className="v4-date-mark" aria-hidden="true">
          <strong className="numeric">{Number(date.slice(8))}</strong>
          <span>
            {Number(date.slice(5, 7))} 月 ·{' '}
            {day.toLocaleDateString('en', { weekday: 'long' }).toUpperCase()}
          </span>
        </div>
      </header>
      <div className="v4-view-switch" role="group" aria-label="今天的视图">
        <button type="button" aria-pressed={!timeline} onClick={() => setSearch({})}>
          今日概览
        </button>
        <button
          type="button"
          aria-pressed={timeline}
          onClick={() => setSearch({ view: 'timeline' })}
        >
          今日轨迹{records.status === 'ready' && data ? ` ${data.totalCount}` : ''}
        </button>
      </div>
      {!timeline ? (
        <div className="v4-today-grid">
          <div>
            <TodayHabits date={date} />
            <div className="v4-action-panels">
              <FocusEntry />
              <TodayFinance date={date} />
            </div>
          </div>
          <section
            className="v4-today-recent"
            data-ready-region="today-records"
            data-state={records.status}
          >
            <SectionHeading title="刚刚留下的">
              <button
                type="button"
                className="text-button"
                onClick={() => setSearch({ view: 'timeline' })}
              >
                全部轨迹
              </button>
            </SectionHeading>
            {records.status === 'loading' ? (
              <Feedback kind="loading" title="正在读取记录" />
            ) : records.status === 'failed' ? (
              <Feedback kind="error" title="记录暂时读不到" onRetry={records.retry} />
            ) : (
              data && (
                <RecordList
                  items={data.recent}
                  emptyText="这里会留下真实发生的生活。点‘留一笔’，从第一条开始。"
                />
              )
            )}
            <p className="v4-local-note">记录只在本机，随时可以带走</p>
          </section>
        </div>
      ) : (
        <section data-ready-region="today-records" data-state={records.status}>
          <p className="v4-scope-note">{date} · 已保存的生活事实</p>
          {records.status === 'loading' ? (
            <Feedback kind="loading" title="正在读取当天轨迹" />
          ) : records.status === 'failed' ? (
            <Feedback kind="error" title="轨迹暂时读不到" onRetry={records.retry} />
          ) : data ? (
            <>
              {!data.totalCount ? (
                <Feedback kind="empty" title="今天还很宽阔">
                  <button type="button" className="button" onClick={flow.openComposer}>
                    留一笔
                  </button>
                </Feedback>
              ) : (
                <>
                  {data.timed.length > 0 && (
                    <>
                      <SectionHeading title="有时刻的记录" />
                      <RecordList items={data.timed} />
                    </>
                  )}
                  {data.dayOnly.length > 0 && (
                    <>
                      <SectionHeading title="当日记录" />
                      <p className="v4-scope-note">未记录具体时刻，按录入顺序列出</p>
                      <RecordList items={data.dayOnly} />
                    </>
                  )}
                  {data.hasMore && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setLimit((value) => value + 20)}
                    >
                      继续查看当天记录
                    </button>
                  )}
                </>
              )}
            </>
          ) : null}
        </section>
      )}
    </>
  )
}
