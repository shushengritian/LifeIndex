import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { Feedback, SectionHeading } from '@/shared/ui/v4/Elements'
import { consistentPair, useTodayDate } from '@/features/today/v4/data'
import { HabitAction } from './HabitAction'

export function HabitCollection() {
  const services = useV4Services(),
    date = useTodayDate(),
    [limit, setLimit] = useState(10)
  const query = useV4Query(
      useCallback(
        () =>
          consistentPair(
            () => services.habits.list(),
            () => services.today.getHabits(date),
          ),
        [services, date],
      ),
    ),
    data = query.snapshot?.data
  return (
    <section className="v4-habit-station">
      <SectionHeading title="你的习惯">
        <Link className="text-button" data-focus-key="habit-create" to="/health/habits/new">
          新建习惯
        </Link>
      </SectionHeading>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取习惯" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="习惯暂时读不到" onRetry={query.retry} />
      ) : data && query.snapshot ? (
        <>
          {data.left.length ? (
            <ul className="v4-habit-list">
              {data.left.slice(0, limit).map((habit) => (
                <HabitAction
                  key={habit.id}
                  habit={habit}
                  date={date}
                  completed={data.right.items.some(
                    (item) => item.habit.id === habit.id && !!item.check,
                  )}
                  stamp={query.snapshot!.stamp}
                  showPlan
                />
              ))}
            </ul>
          ) : (
            <p className="v4-habit-empty">从一件小事开始，按自己的频率重复。</p>
          )}
          {data.left.length > limit && (
            <button
              className="text-button"
              type="button"
              onClick={() => setLimit((value) => value + 10)}
            >
              再看 10 项习惯
            </button>
          )}
          <p className="v4-habit-footnote">
            今日计划 {data.right.scheduledCount} 项，已完成 {data.right.scheduledCompletedCount}{' '}
            项。计划外完成同样留在今日轨迹。
          </p>
        </>
      ) : null}
    </section>
  )
}
