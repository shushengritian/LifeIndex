import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  cessationDayStatus,
  cessationSummary,
  fullDayEligible,
  zonedDateKey,
} from '@/shared/domain/cessation'
import {
  addLocalDays,
  addLocalMonths,
  endOfLocalMonth,
  parseLocalDateKey,
  startOfLocalMonth,
  startOfLocalWeek,
} from '@/shared/domain/date'
import type { CessationEvent, CessationPlan } from '@/shared/domain/types'
import { Sheet } from '@/shared/ui/Sheet'
import { Icon } from '@/shared/ui/Icon'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { logger } from '@/shared/logging/logger'
import { useCessation, useCessationNow } from './useCessation'
import { CravingForm, PlanForm, SmokingForm, ReasonForm } from './CessationForms'
import { triggerNames } from './cessationPresentation'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useDirtyForm } from '@/pwa/useDirtyForm'

type Panel = 'plan' | 'smoking' | 'craving' | 'manage' | 'support' | 'reason'
export function CessationPage() {
  const location = useLocation()
  // Accept only the known Settings origin; arbitrary route-state redirects are not allowed.
  const fromSettings = location.state?.from === 'settings'
  const { repository, settings, state, retry } = useCessation(),
    now = useCessationNow()
  const [panel, setPanel] = useState<Panel>(),
    [editing, setEditing] = useState<CessationEvent>(),
    [planId, setPlanId] = useState<string>(),
    [selected, setSelected] = useState<string>(),
    [month, setMonth] = useState<string>(),
    [limit, setLimit] = useState(30),
    [showCalendar, setShowCalendar] = useState(false)
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const writeLock = useRef(false)
  // Keep the plan identity stable throughout an editor, even if background reads fail.
  const [editorPlan, setEditorPlan] = useState<CessationPlan>()
  const [confirmation, setConfirmation] = useState<{
    title: string
    description: string
    label: string
    action: () => Promise<void>
    success: string
  }>()
  useDirtyForm(false, busy)
  const data = state.data,
    plan =
      data?.plans.find((plan) => plan.id === planId) ??
      data?.plans.find((plan) => !plan.endAt) ??
      data?.plans[0] ??
      (panel ? editorPlan : undefined)
  const days = data?.days.filter((day) => day.planId === plan?.id) ?? [],
    events = data?.events.filter((event) => event.planId === plan?.id) ?? []
  const today = zonedDateKey(
      now,
      plan?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    chosen = selected ?? today,
    currentMonth = month ?? startOfLocalMonth(today)
  const summary = plan ? cessationSummary(plan, days, events, now) : undefined
  const active = Boolean(plan && !plan.endAt && Date.parse(plan.startAt) <= now.getTime()),
    future = Boolean(plan && !plan.endAt && Date.parse(plan.startAt) > now.getTime())
  const status = cessationDayStatus(chosen, days, events, today),
    todayStatus = cessationDayStatus(today, days, events, today)
  const dayEvents = events
    .filter((event) => event.localDate === chosen)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const fullEligible = plan && fullDayEligible(plan, chosen, now)
  const first = startOfLocalWeek(currentMonth),
    last = endOfLocalMonth(currentMonth)
  const cells: string[] = []
  for (let day = first; day <= last; day = addLocalDays(day, 1)) cells.push(day)
  function open(next: Panel) {
    if (writeLock.current) return
    setError('')
    setEditorPlan(plan)
    setPanel(next)
    logger.info('cessation.panel.opened', { operation: next })
  }
  function close() {
    setPanel(undefined)
    setEditing(undefined)
    logger.info('cessation.panel.closed', { operation: 'close' })
  }
  function requestEventDeletion() {
    if (!editing || writeLock.current) return
    // The editor owns this entry, while the page owns confirmation and the serialized delete.
    const eventId = editing.id
    setError('')
    setConfirmation({
      title: '删除戒烟记录？',
      description: '删除后无法撤销，也不会自动恢复无烟确认。',
      label: '删除记录',
      action: async () => {
        await repository.removeEvent(eventId)
        close()
      },
      success: '记录已删除，未自动创建无烟确认。',
    })
    logger.info('cessation.ui.deleterequested', { operation: 'delete' })
  }
  async function mutate(action: () => Promise<void>, success: string) {
    // Mutation commands share a synchronous lock and navigation guard until storage settles.
    if (writeLock.current) return false
    writeLock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    logger.info('cessation.ui.operationstarted', { operation: 'change' })
    try {
      await action()
      setMessage(success)
      logger.info('cessation.ui.operationsaved', { operation: 'change' })
      return true
    } catch {
      setError('操作未完成，原有记录保持不变。请检查日期和计划范围，或重试。')
      logger.warn('cessation.ui.operationfailed', {
        operation: 'change',
        failureClass: 'ValidationOrWrite',
      })
      return false
    } finally {
      writeLock.current = false
      setBusy(false)
    }
  }
  const heading = (
    <div className="page-heading-row">
      <Link
        to={fromSettings ? '/settings' : '/health'}
        className="button-secondary compact"
        onClick={() =>
          logger.info('cessation.source.returned', {
            operation: 'navigate',
            reason: fromSettings ? 'settings' : 'health',
          })
        }
      >
        {fromSettings ? '返回设置' : '返回健康'}
      </Link>
      <h1 id="cessation-title">戒烟</h1>
      <button
        type="button"
        className="icon-action"
        aria-label="管理戒烟计划"
        onClick={() => open('manage')}
      >
        <Icon name="settings" />
      </button>
    </div>
  )
  if (state.status === 'loading' && !panel)
    return (
      <section className="page">
        {heading}
        <p>正在读取戒烟记录…</p>
      </section>
    )
  if (state.status === 'failed' && !panel)
    return (
      <section className="page">
        {heading}
        <p role="alert">戒烟记录暂时无法读取。</p>
        <button onClick={retry} type="button">
          重试戒烟记录
        </button>
      </section>
    )
  return (
    <section className="page cessation-page" aria-labelledby="cessation-title">
      {heading}
      {state.status === 'failed' && panel ? (
        <p role="alert">列表暂时无法刷新，当前输入仍保留。</p>
      ) : null}
      {error && !confirmation ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <p className="cessation-feedback" role="status">
        {message}
      </p>
      {plan && summary ? (
        <>
          <div className="cessation-hero">
            <p>
              {plan.endAt
                ? Date.parse(plan.endAt) === Date.parse(plan.startAt)
                  ? '计划已取消'
                  : '计划已结束'
                : future
                  ? '准备开始'
                  : summary.lastSmoke
                    ? '距最近一次已记录吸烟'
                    : '距戒烟开始'}
            </p>
            <p className="cessation-time">
              {future
                ? new Date(plan.startAt).toLocaleString()
                : `${Math.floor(summary.elapsedHours / 24)} 天 ${summary.elapsedHours % 24} 小时`}
            </p>
            <p className="muted">根据你的记录计算，不代表医学核验。</p>
            <p className="muted">日历时区：{plan.timeZone}</p>
            {plan.reason ? <p className="cessation-reason">{plan.reason}</p> : null}
          </div>
          {active ? (
            <>
              <div className="cessation-actions">
                <button
                  className="button-primary"
                  type="button"
                  disabled={busy || todayStatus === '有吸烟记录'}
                  onClick={() =>
                    void mutate(
                      () => repository.confirmDay(plan.id, today, 'snapshot'),
                      '已记录截至现在未吸烟，不代表全天。',
                    )
                  }
                >
                  <Icon name="check" size={18} />
                  {todayStatus === '截至记录时未吸烟' ? '更新今日快照' : '截至现在未吸烟'}
                </button>
              </div>
              <p className="muted">只记录此刻，不代表全天。</p>
              <div className="cessation-action-pair">
                <button
                  className="button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => open('smoking')}
                >
                  <Icon name="add" size={18} />
                  记录吸烟
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => open('craving')}
                >
                  <CategoryIcon name="leaf" size={18} />
                  记录烟瘾
                </button>
              </div>
            </>
          ) : null}
          <section className="health-card cessation-history" aria-label="戒烟回顾">
            <div className="section-heading">
              <h2>{showCalendar ? '日历回顾' : '最近 7 天'}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCalendar((value) => !value)
                  logger.info('cessation.calendar.toggled', {
                    operation: 'toggle',
                    toState: showCalendar ? 'collapsed' : 'expanded',
                  })
                }}
              >
                {showCalendar ? '收起日历' : '查看日历'}
              </button>
            </div>
            {showCalendar ? (
              <div className="section-heading">
                <button
                  type="button"
                  aria-label="上个月"
                  onClick={() => setMonth(addLocalMonths(currentMonth, -1))}
                >
                  ‹
                </button>
                <h2>{currentMonth.slice(0, 7)}</h2>
                <button
                  type="button"
                  aria-label="下个月"
                  onClick={() => setMonth(addLocalMonths(currentMonth, 1))}
                >
                  ›
                </button>
              </div>
            ) : null}
            <div className="cessation-calendar" aria-label="戒烟日历">
              {showCalendar
                ? ['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                    <span key={day}>{day}</span>
                  ))
                : null}
              {(showCalendar
                ? cells
                : Array.from({ length: 7 }, (_, index) => addLocalDays(today, index - 6))
              ).map((key) => {
                const value = cessationDayStatus(key, days, events, today),
                  symbol =
                    value === '全天未吸烟'
                      ? '✓'
                      : value === '有吸烟记录'
                        ? '·'
                        : value === '未记录'
                          ? '—'
                          : '◐'
                const valid =
                  (!showCalendar || key.startsWith(currentMonth.slice(0, 7))) &&
                  key >= plan.startLocalDate &&
                  key <= today &&
                  (!plan.endLocalDate || key <= plan.endLocalDate)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`${key} ${value}`}
                    aria-pressed={chosen === key}
                    disabled={!valid}
                    onClick={() => {
                      setSelected(key)
                      setLimit(30)
                    }}
                  >
                    <span>{parseLocalDateKey(key)?.getDate()}</span>
                    <span
                      className={
                        value === '全天未吸烟'
                          ? 'cessation-mark confirmed'
                          : value === '有吸烟记录'
                            ? 'cessation-mark smoked'
                            : 'cessation-mark'
                      }
                    >
                      {symbol}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="muted cessation-legend">✓ 全天未吸烟 · 有吸烟 ◐ 快照/待确认 — 未记录</p>
            {!future ? (
              <div className="cessation-stats">
                <div>
                  <strong>{summary.fullDays} 天</strong>
                  <span>已确认完整无烟日</span>
                </div>
                {summary.savedMinor !== undefined && summary.fullDays > 0 ? (
                  <div>
                    <strong>¥{(summary.savedMinor / 100).toFixed(2)}</strong>
                    <span>估算节省 · 仅完整日</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <details>
              <summary>统计口径</summary>
              <p>
                只按已确认完整无烟日估算，不包含未记录、有吸烟记录或今天的快照；不生成记账。已记录{' '}
                {summary.coveredDays} / {summary.recordableDays} 个可记录日期（含部分日）。
              </p>
              {summary.triggers.size > 0 ? (
                <ul aria-label="已选诱因分布">
                  {Array.from(summary.triggers, ([trigger, count]) => (
                    <li key={trigger}>
                      {triggerNames[trigger as keyof typeof triggerNames]}：{count} 次
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无已选诱因，不推测未填写记录。</p>
              )}
            </details>
          </section>
          <section className="health-card" aria-label="日期详情">
            <div className="section-heading">
              <h2>{chosen}</h2>
              <span>{status}</span>
            </div>
            {days.some((day) => day.localDate === chosen) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void mutate(() => repository.undoDay(plan.id, chosen), '确认已撤销。')
                }
              >
                撤销这天的确认
              </button>
            ) : null}
            {status !== '有吸烟记录' && fullEligible ? (
              <button
                className="button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () => repository.confirmDay(plan.id, chosen, 'fullDay'),
                    '已确认全天未吸烟。',
                  )
                }
              >
                确认全天未吸烟
              </button>
            ) : null}
            {!fullEligible && chosen !== today ? (
              <p className="muted">非完整计划日，不计入完整无烟日。</p>
            ) : null}
            {dayEvents.length ? (
              <ul className="cessation-event-list">
                {dayEvents.slice(0, limit).map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="cessation-event-open"
                      disabled={busy}
                      aria-label={`编辑${event.kind === 'smoking' ? '吸烟' : '烟瘾'}记录`}
                      onClick={() => {
                        setEditing(event)
                        open(event.kind === 'smoking' ? 'smoking' : 'craving')
                        logger.info('cessation.event.opened', {
                          operation: 'edit',
                          entityType: event.kind,
                        })
                      }}
                    >
                      <span
                        className={`category-glyph tone-${event.kind === 'smoking' ? 'amber' : 'sage'}`}
                      >
                        <CategoryIcon name={event.kind === 'smoking' ? 'activity' : 'leaf'} />
                      </span>
                      <div>
                        <strong>
                          {event.kind === 'smoking'
                            ? `吸烟 ${event.count} 支`
                            : event.outcome === 'relieved'
                              ? '烟瘾 · 缓解了'
                              : '烟瘾 · 还想抽'}
                        </strong>
                        <p>
                          {new Intl.DateTimeFormat('zh-CN', {
                            timeZone: plan.timeZone,
                            timeStyle: 'short',
                          }).format(new Date(event.occurredAt))}
                          {event.trigger ? ` · ${triggerNames[event.trigger]}` : ''}
                        </p>
                      </div>
                      <Icon name="next" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">这天没有烟瘾或吸烟事件。未记录不等于无烟。</p>
            )}
            {dayEvents.length > limit ? (
              <button type="button" onClick={() => setLimit((value) => value + 30)}>
                显示更多记录
              </button>
            ) : null}
          </section>
        </>
      ) : (
        <section className="cessation-empty-state">
          <span className="category-glyph tone-sage">
            <CategoryIcon name="leaf" size={28} />
          </span>
          <h2>从这一刻开始</h2>
          <p>记录自己的节奏。需要帮助时，随时回来。</p>
          <button type="button" className="button-primary" onClick={() => open('plan')}>
            <Icon name="add" size={18} />
            开始计划
          </button>
        </section>
      )}
      {plan?.endAt && !data?.plans.some((plan) => !plan.endAt) ? (
        <button type="button" className="button-primary" onClick={() => open('plan')}>
          开始新的计划
        </button>
      ) : null}
      <button
        type="button"
        className="button-secondary cessation-support"
        onClick={() => open('support')}
      >
        寻求支持
      </button>
      {panel ? (
        <>
          {panel === 'plan' ? (
            <PlanForm
              onClose={close}
              onSave={async (id, input) => {
                await repository.start(id, input)
                setPlanId(id)
                setSelected(undefined)
                setMonth(undefined)
                setMessage('计划已保存。')
              }}
            />
          ) : null}
          {panel === 'smoking' && plan ? (
            <SmokingForm
              blocked={busy || Boolean(confirmation)}
              {...(editing ? { onDelete: requestEventDeletion } : {})}
              {...(editing ? { entry: editing } : {})}
              onClose={close}
              onSave={async (id, input, edit) => {
                await repository.saveEvent(id, plan.id, input, edit)
                setSelected(zonedDateKey(new Date(input.occurredAt), plan.timeZone))
                setMessage('已记录，之前的努力仍保留；同日确认已撤销。')
              }}
            />
          ) : null}
          {panel === 'craving' && plan ? (
            <CravingForm
              blocked={busy || Boolean(confirmation)}
              {...(editing ? { onDelete: requestEventDeletion } : {})}
              {...(editing ? { entry: editing } : {})}
              onClose={close}
              onSave={async (id, input, edit) => {
                await repository.saveEvent(id, plan.id, input, edit)
                setMessage('感受已保存，没有自动打卡或新增专注。')
              }}
            />
          ) : null}
          {panel === 'manage' ? (
            <Sheet title="计划管理" busy={busy} onClose={close}>
              <div className="sheet-form">
                {error ? (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                ) : null}
                {plan ? (
                  <button type="button" onClick={() => open('reason')}>
                    编辑戒烟原因
                  </button>
                ) : null}
                <p>隐藏不删除数据，结束不清空历史。</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(async () => {
                      await settings.put({
                        key: 'cessationHidden',
                        value: !data?.hidden,
                        updatedAt: new Date().toISOString(),
                      })
                      close()
                    }, '入口显示已更新。')
                  }
                >
                  {data?.hidden ? '恢复健康入口' : '隐藏健康入口'}
                </button>
                {plan && !plan.endAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setConfirmation({
                        title: future ? '取消未来计划？' : '结束本次计划？',
                        description: '历史记录仍保留。结束后不可在本计划新增吸烟或烟瘾事件。',
                        label: future ? '确认取消计划' : '确认结束',
                        action: async () => {
                          await repository.end(plan.id)
                          close()
                        },
                        success: '计划已结束，历史仍保留。',
                      })
                      logger.info('cessation.ui.endrequested', { operation: 'end' })
                    }}
                  >
                    {future ? '取消未来计划' : '结束本次计划'}
                  </button>
                ) : null}
                <h3>全部计划</h3>
                {data?.plans.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setPlanId(item.id)
                      setSelected(item.startLocalDate)
                      setMonth(startOfLocalMonth(item.startLocalDate))
                      setShowCalendar(true)
                      close()
                    }}
                  >
                    {item.startLocalDate} · {item.endAt ? '已结束' : '未结束'}
                  </button>
                ))}
                <button type="button" onClick={close}>
                  关闭
                </button>
              </div>
            </Sheet>
          ) : null}
          {panel === 'support' ? (
            <Sheet title="寻求支持" onClose={close}>
              <div className="sheet-form">
                <h3>不用独自面对</h3>
                <p>在微信搜索“中国戒烟平台”，查看戒烟门诊、热线及相关资源。</p>
                <p>
                  LifeIndex
                  提供自我记录与一般支持，不替代专业诊疗。戒烟困难或不适持续时，请向专业人员寻求帮助。
                </p>
                <a
                  className="button-secondary"
                  href="https://www.who.int/campaigns/world-no-tobacco-day/2021/quitting-toolkit/quick-tips"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (!window.confirm('将打开 WHO 官方网页，需要网络，不携带个人记录。继续？'))
                      event.preventDefault()
                    else logger.info('cessation.support.opened', { operation: 'external' })
                  }}
                >
                  WHO 官方戒烟提示 ↗
                </a>
                <p className="muted">外部网页需要网络；本地记录仍可离线使用。</p>
                <button type="button" onClick={close}>
                  关闭
                </button>
              </div>
            </Sheet>
          ) : null}
          {panel === 'reason' && plan ? (
            <ReasonForm
              initial={plan.reason ?? ''}
              onClose={close}
              onSave={(reason) => repository.updateReason(plan.id, reason)}
            />
          ) : null}
        </>
      ) : null}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.label}
          busy={busy}
          error={error}
          onCancel={() => {
            if (!writeLock.current) {
              setConfirmation(undefined)
              setError('')
            }
          }}
          onConfirm={() => {
            void mutate(confirmation.action, confirmation.success).then((saved) => {
              if (saved) setConfirmation(undefined)
            })
          }}
        />
      )}
    </section>
  )
}
