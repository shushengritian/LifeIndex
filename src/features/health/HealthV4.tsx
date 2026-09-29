import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFlow } from '@/app/v4/Flow'
import { PageHeading, SectionHeading, Feedback } from '@/shared/ui/v4/Elements'
import { weekRange } from '@/shared/v4/format'
import { shiftDate, useTodayDate, usePageLog } from '@/features/today/v4/data'
import { HabitCollection } from '@/features/habits/v4/HabitCollection'
import { WeightTrend } from './v4/WeightTrend'
import { WeightTargetEditor } from './v4/WeightTargetEditor'

function WeightSection({ date }: { date: string }) {
  const services = useV4Services(),
    flow = useFlow(),
    [range, setRange] = useState(30),
    [target, setTarget] = useState(false)
  const from = range ? shiftDate(date, 1 - range) : '1000-01-01',
    toExclusive = shiftDate(date, 1)
  const query = useV4Query(
      useCallback(
        () => services.weights.getTrend({ from, toExclusive }),
        [services, from, toExclusive],
      ),
    ),
    data = query.snapshot?.data
  return (
    <section>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取体重" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="体重暂时读不到" onRetry={query.retry} />
      ) : (
        data && (
          <>
            <SectionHeading title="最近体重">
              <button
                className="text-button"
                type="button"
                onClick={() => flow.openCreate('weight')}
                data-focus-key="health-weight-create"
              >
                记体重
              </button>
            </SectionHeading>
            {data.latest ? (
              <>
                <div className="v4-weight-number numeric">
                  {data.latest.weightGrams / 1000}
                  <small>kg</small>
                </div>
                <p className="v4-scope-note">{data.latest.localDate} · 日期记录</p>
              </>
            ) : (
              <Feedback kind="empty" title="还没有体重记录">
                留下一条记录，开始了解自己的变化。
              </Feedback>
            )}
            <div className="v4-target-line">
              <span>
                {data.targetGrams === null
                  ? '暂未设置目标'
                  : `目标 ${data.targetGrams / 1000} kg${data.latest ? ` · 相差 ${Math.abs(data.latest.weightGrams - data.targetGrams) / 1000} kg` : ''}`}
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => setTarget(true)}
                data-focus-key="weight-target"
              >
                设置目标
              </button>
            </div>
            <div className="v4-trend-section">
              <SectionHeading title="体重趋势">
                <Link className="text-button" to="/health/weight">
                  全部记录
                </Link>
              </SectionHeading>
              <div className="v4-range-tabs" role="group" aria-label="体重趋势范围">
                {[30, 90, 0].map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={range === days}
                    onClick={() => setRange(days)}
                  >
                    {days ? `${days} 天` : '全部'}
                  </button>
                ))}
              </div>
              <WeightTrend data={data} />
            </div>
          </>
        )
      )}
      {target && <WeightTargetEditor onClose={() => setTarget(false)} />}
    </section>
  )
}
function ActivitySection({ date }: { date: string }) {
  const services = useV4Services(),
    flow = useFlow(),
    range = weekRange(date),
    query = useV4Query(
      useCallback(
        () => services.activities.getSummary({ from: range.from, toExclusive: range.toExclusive }),
        [services, range.from, range.toExclusive],
      ),
    ),
    data = query.snapshot?.data
  return (
    <section className="v4-activity-panel">
      <SectionHeading title="本周运动">
        <button
          className="text-button"
          type="button"
          data-focus-key="health-activity-create"
          onClick={() => flow.openCreate('activity')}
        >
          记运动
        </button>
      </SectionHeading>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取运动" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="运动暂时读不到" onRetry={query.retry} />
      ) : (
        data && (
          <>
            <div className="v4-activity-number numeric">
              {data.totalMinutes}
              <small>分钟</small>
            </div>
            <p className="v4-scope-note">
              {range.from}—{shiftDate(range.toExclusive, -1)} · {data.count} 次记录
            </p>
          </>
        )
      )}
      <Link className="text-button" to="/health/activity">
        查看运动历史
      </Link>
    </section>
  )
}
export function HealthV4() {
  usePageLog('health')
  const date = useTodayDate()
  return (
    <>
      <PageHeading title="身体的节奏" description="记录变化，也给自己留些耐心。" />
      <div className="v4-two-column">
        <div>
          <WeightSection date={date} />
          <ActivitySection date={date} />
        </div>
        <HabitCollection />
      </div>
    </>
  )
}
