import { useNavigate } from 'react-router-dom'
import { cessationSummary } from '@/shared/domain/cessation'
import { logger } from '@/shared/logging/logger'
import { useCessation, useCessationNow } from './useCessation'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { Icon } from '@/shared/ui/Icon'
import '../health.css'

export function CessationCard() {
  const navigate = useNavigate()
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
  function open(intent?: 'plan' | 'events') {
    // Route state selects an editor only; no record is created before explicit form submission.
    logger.info('cessation.entry.opened', { operation: 'navigate', reason: intent ?? 'detail' })
    void navigate('/health/cessation', { state: intent ? { healthIntent: intent } : null })
  }
  if (state.status === 'ready' && !plan) {
    return (
      <button
        type="button"
        className="health-card content-entry health-cessation-create"
        aria-label="创建戒烟计划"
        onClick={() => open('plan')}
      >
        <span className="category-glyph tone-sage">
          <CategoryIcon name="heart" />
        </span>
        <span className="content-entry-copy">
          <strong>戒烟</strong>
          <span>按需开启，记录自己的节奏。</span>
        </span>
        <Icon name="next" size={24} />
      </button>
    )
  }
  return (
    <section className="health-card cessation-card" aria-label="戒烟">
      <div className="section-heading">
        <h2 className="health-section-label">
          <span className="category-glyph tone-sage">
            <CategoryIcon name="heart" />
          </span>
          戒烟
        </h2>
        {state.status === 'ready' && plan ? (
          <button
            type="button"
            className="icon-action"
            aria-label="记录戒烟事件"
            disabled={Date.parse(plan.startAt) > now.getTime()}
            onClick={() => open('events')}
          >
            <Icon name="add" size={24} />
          </button>
        ) : null}
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
        <button
          type="button"
          className="content-entry health-summary-entry"
          aria-label="查看戒烟计划"
          onClick={() => open()}
        >
          <span className="content-entry-copy">
            <span>
              {Date.parse(plan.startAt) > now.getTime()
                ? '准备开始'
                : summary.lastSmoke
                  ? '距最近一次已记录吸烟'
                  : '距戒烟开始'}
            </span>
            <strong className="cessation-card-time">
              {Date.parse(plan.startAt) > now.getTime()
                ? new Date(plan.startAt).toLocaleString()
                : `${Math.floor(summary.elapsedHours / 24)} 天 ${summary.elapsedHours % 24} 小时`}
            </strong>
            <span className="muted">根据你的记录计算，不代表医学核验。</span>
          </span>
          <Icon name="next" size={24} />
        </button>
      ) : state.status === 'ready' ? (
        <p className="muted">按需开启，记录自己的节奏。</p>
      ) : null}
    </section>
  )
}
