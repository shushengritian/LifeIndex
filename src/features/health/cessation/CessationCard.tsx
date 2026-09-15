import { Link } from 'react-router-dom'
import { cessationSummary } from '@/shared/domain/cessation'
import { logger } from '@/shared/logging/logger'
import { useCessation, useCessationNow } from './useCessation'

export function CessationCard() {
  const { state, retry } = useCessation(),
    now = useCessationNow()
  if (state.status === 'ready' && state.data.hidden) return null
  const plan = state.data?.plans.find((plan) => !plan.endAt)
  const summary =
    plan && state.data
      ? cessationSummary(
          plan,
          state.data.days.filter((day) => day.planId === plan.id),
          state.data.events.filter((event) => event.planId === plan.id),
          now,
        )
      : undefined
  return (
    <section className="health-card cessation-card" aria-label="戒烟">
      <div className="section-heading">
        <h2>戒烟</h2>
        <Link
          className="button-secondary compact"
          to="/health/cessation"
          onClick={() => {
            // This is navigation only: opening the entry never creates a plan or touches records.
            logger.info('cessation.entry.opened', { operation: 'navigate' })
          }}
        >
          {plan ? '查看戒烟' : '开始计划'}
        </Link>
      </div>
      {state.status === 'loading' ? <p className="state-message">正在读取戒烟记录…</p> : null}
      {state.status === 'failed' ? (
        <div role="alert">
          <p>戒烟记录暂时无法读取。</p>
          <button type="button" onClick={retry}>
            重试戒烟记录
          </button>
        </div>
      ) : null}
      {summary && plan ? (
        <>
          <p>
            {Date.parse(plan.startAt) > now.getTime()
              ? '准备开始'
              : summary.lastSmoke
                ? '距最近一次已记录吸烟'
                : '距戒烟开始'}
          </p>
          <strong className="cessation-card-time">
            {Date.parse(plan.startAt) > now.getTime()
              ? new Date(plan.startAt).toLocaleString()
              : `${Math.floor(summary.elapsedHours / 24)} 天 ${summary.elapsedHours % 24} 小时`}
          </strong>
          <p className="muted">根据你的记录计算，不代表医学核验。</p>
        </>
      ) : state.status === 'ready' ? (
        <p className="muted">按需开启，记录自己的节奏。</p>
      ) : null}
    </section>
  )
}
