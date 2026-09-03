import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import {
  ActionService,
  type ActionInspection,
  type ActionDestination,
} from '@/app/actions/ActionService'
import { parseActionRoute, type ParsedAction } from '@/app/actions/actionParser'
import { formatMoney } from '@/shared/domain/money'
import type { ActionType } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'

type PageState =
  | { status: 'checking' }
  | {
      status: 'ready'
      actionId: string
      inspection: Extract<ActionInspection, { status: 'ready' }>
    }
  | {
      status: 'submitting'
      actionId: string
      inspection: Extract<ActionInspection, { status: 'ready' }>
    }
  | {
      status: 'failed'
      actionId: string
      inspection: Extract<ActionInspection, { status: 'ready' }>
    }

const actionLabels: Record<ActionType, string> = {
  'add-transaction': '新增账目',
  'check-habit': '完成习惯',
  'start-focus': '开始专注',
}

const destinationLabels: Record<ActionType, { to: ActionDestination; label: string }> = {
  'add-transaction': { to: '/finance', label: '前往记账' },
  'check-habit': { to: '/habits', label: '前往习惯' },
  'start-focus': { to: '/focus', label: '前往专注' },
}

export function ActionPage() {
  const { database } = useAppServices()
  const service = useMemo(() => new ActionService(database), [database])
  const { actionType = '' } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const parsed = useMemo(() => parseActionRoute(actionType, search), [actionType, search])
  const [state, setState] = useState<PageState>({ status: 'checking' })

  useEffect(() => {
    if (!parsed.ok) {
      // Replace immediately so malformed or unknown fields do not remain in browser history.
      navigate('/action-result?status=invalid', { replace: true })
      return
    }

    let active = true
    void service
      .inspect(parsed.action)
      .then((inspection) => {
        if (!active) return
        if (inspection.status === 'handled') {
          navigate(`/action-result?status=handled&type=${parsed.action.type}`, { replace: true })
          return
        }
        setState({ status: 'ready', actionId: parsed.action.actionId, inspection })
      })
      .catch(() => {
        if (!active) return
        navigate(`/action-result?status=unavailable&type=${parsed.action.type}`, { replace: true })
      })

    return () => {
      active = false
    }
  }, [navigate, parsed, service])

  if (!parsed.ok || state.status === 'checking' || state.actionId !== parsed.action.actionId) {
    return (
      <section className="page action-page" aria-labelledby="action-loading-title">
        <p className="eyebrow">shortcut</p>
        <h1 id="action-loading-title">正在检查快捷动作</h1>
        <p className="state-message">确认本机引用与处理状态后才会显示预览。</p>
      </section>
    )
  }

  async function execute(action: ParsedAction) {
    if (state.status === 'checking') return
    setState({ status: 'submitting', actionId: action.actionId, inspection: state.inspection })
    try {
      const result = await service.execute(action)
      if (result.status === 'handled') {
        navigate(`/action-result?status=handled&type=${action.type}`, { replace: true })
      } else {
        navigate(result.destination, { replace: true })
      }
    } catch {
      setState({ status: 'failed', actionId: action.actionId, inspection: state.inspection })
    }
  }

  const inspection = state.inspection
  return (
    <section className="page action-page" aria-labelledby="action-title">
      <p className="eyebrow">shortcut preview</p>
      <h1 id="action-title">{actionLabels[parsed.action.type]}</h1>
      <p className="page-intro">请检查以下内容。打开链接本身不会写入任何记录。</p>

      <ActionSummary action={parsed.action} inspection={inspection} />
      {state.status === 'failed' ? (
        <p className="form-error" role="alert">
          动作未能保存，本机数据没有被部分写入。你可以重试或取消。
        </p>
      ) : null}
      <div className="form-actions action-confirmation">
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            logger.info('action.preview.cancelled', {
              operation: 'cancel',
              actionType: parsed.action.type,
            })
            navigate('/today', { replace: true })
          }}
        >
          取消
        </button>
        <button
          type="button"
          className="button-primary"
          disabled={state.status === 'submitting'}
          onClick={() => void execute(parsed.action)}
        >
          {state.status === 'submitting' ? '正在保存…' : `确认${actionLabels[parsed.action.type]}`}
        </button>
      </div>
    </section>
  )
}

function ActionSummary({
  action,
  inspection,
}: {
  action: ParsedAction
  inspection: Extract<ActionInspection, { status: 'ready' }>
}) {
  if (action.type === 'add-transaction') {
    return (
      <dl className="action-summary">
        <SummaryRow label="类型" value={action.draft.type === 'expense' ? '支出' : '收入'} />
        <SummaryRow label="金额" value={formatMoney(action.draft.amountMinor)} />
        <SummaryRow label="分类" value={inspection.referenceLabel} />
        <SummaryRow
          label="时间"
          value={new Intl.DateTimeFormat('zh-CN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(action.draft.occurredAt))}
        />
        {action.draft.note ? <SummaryRow label="备注" value={action.draft.note} /> : null}
      </dl>
    )
  }

  if (action.type === 'check-habit') {
    return (
      <>
        <dl className="action-summary">
          <SummaryRow label="习惯" value={inspection.referenceLabel} />
          <SummaryRow label="日期" value={action.localDate} />
        </dl>
        {inspection.alreadySatisfied ? (
          <p className="action-note">这一天已经完成；确认后不会重复新增签到。</p>
        ) : null}
      </>
    )
  }

  return (
    <dl className="action-summary">
      <SummaryRow label="标题" value={action.draft.title} />
      <SummaryRow label="时长" value={`${action.draft.plannedDurationSeconds / 60} 分钟`} />
      <SummaryRow label="分类" value={inspection.referenceLabel} />
      {action.draft.note ? <SummaryRow label="备注" value={action.draft.note} /> : null}
    </dl>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function ActionResultPage() {
  const { search } = useLocation()
  const parameters = new URLSearchParams(search)
  const rawType = parameters.get('type')
  const type = rawType && Object.hasOwn(destinationLabels, rawType) ? (rawType as ActionType) : null
  const status = parameters.get('status')
  const title =
    status === 'handled'
      ? '这个快捷动作已经处理过'
      : status === 'unavailable'
        ? '这个快捷动作现在不可用'
        : '无法识别这个快捷动作'
  const explanation =
    status === 'handled'
      ? 'LifeIndex 没有再次创建记录。动作地址已从历史中的当前条目移除。'
      : status === 'unavailable'
        ? '引用的分类或习惯不可用，或已有专注正在进行。本机数据没有改变。'
        : '动作类型、字段或编码不符合当前版本。本机数据没有改变。'

  return (
    <section className="page action-page" aria-labelledby="action-result-title">
      <p className="eyebrow">shortcut</p>
      <h1 id="action-result-title">{title}</h1>
      <p className="page-intro">{explanation}</p>
      <Link
        className="settings-link action-result-link"
        to={type ? destinationLabels[type].to : '/today'}
        replace
      >
        {type ? destinationLabels[type].label : '返回今天'}
      </Link>
    </section>
  )
}
