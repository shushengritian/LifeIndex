import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Context,
  type CreateKind,
  type RecordKind,
  type ReturnPoint,
  type FlowApi,
  type FlowRouteState,
} from './Flow'
import { Icon } from '@/shared/ui/v4/Icon'
import { Modal } from '@/shared/ui/v4/Modal'
import { logger } from '@/shared/logging/logger'

export function FlowProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const returns = useRef(new Map<string, ReturnPoint>())
  const toRestore = useRef<ReturnPoint | null>(null)
  const [composer, setComposer] = useState<ReturnPoint | null>(null)
  const [notice, setNotice] = useState<{
    message: string
    record?: { kind: RecordKind; id: string }
  } | null>(null)
  const capture = useCallback((): ReturnPoint => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return { location, scrollY: window.scrollY, focusKey: active?.dataset.focusKey ?? null }
  }, [location])
  const open = useCallback(
    (path: string, point: ReturnPoint, defaultDate?: string) => {
      const token = crypto.randomUUID()
      returns.current.set(token, point)
      // Return sessions remain bounded and in memory; drafts and file contents never enter history state.
      if (returns.current.size > 20) returns.current.delete(returns.current.keys().next().value!)
      setComposer(null)
      navigate(path, {
        state: {
          background: point.location,
          returnToken: token,
          ...(defaultDate ? { defaultDate } : {}),
        } satisfies FlowRouteState,
      })
      logger.info('ui.flow.opened', { operation: 'navigate' })
    },
    [navigate],
  )
  const openCreate = useCallback(
    (kind: CreateKind, options?: { defaultDate?: string }) =>
      open(`/new/${kind}`, composer ?? capture(), options?.defaultDate),
    [open, composer, capture],
  )
  const openRecord = useCallback(
    (kind: RecordKind, id: string) => {
      if (!/^[0-9a-f-]{36}$/.test(id)) return
      open(`/records/${kind}/${id}`, capture())
    },
    [open, capture],
  )
  const close = useCallback(
    (fallback = '/today') => {
      const token = (location.state as FlowRouteState | null)?.returnToken
      const point = token ? returns.current.get(token) : undefined
      if (token) returns.current.delete(token)
      if (point) {
        toRestore.current = point
        navigate(point.location.pathname + point.location.search, {
          replace: true,
          state: point.location.state,
        })
      } else navigate(fallback, { replace: true })
      logger.info('ui.flow.returned', {
        operation: 'navigate',
        reason: point ? 'origin' : 'direct-link',
      })
    },
    [location.state, navigate],
  )
  useEffect(() => {
    const point = toRestore.current
    if (!point || location.pathname !== point.location.pathname) return
    toRestore.current = null
    let tries = 0
    let frame = 0
    const restore = () => {
      const target = point.focusKey
        ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(point.focusKey)}"]`)
        : null
      if (!target && ++tries < 45) {
        frame = requestAnimationFrame(restore)
        return
      }
      window.scrollTo({ top: point.scrollY, behavior: 'instant' })
      ;(target ?? document.querySelector<HTMLElement>('#main-content'))?.focus({
        preventScroll: true,
      })
    }
    frame = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])
  const value = useMemo<FlowApi>(
    () => ({
      openComposer: () => {
        setComposer(capture())
        logger.info('ui.composer.opened', { operation: 'open' })
      },
      openCreate,
      openRecord,
      close,
      notify: (message, record) => setNotice({ message, ...(record ? { record } : {}) }),
    }),
    [capture, openCreate, openRecord, close],
  )
  return (
    <Context.Provider value={value}>
      {children}
      {composer && (
        <Modal title="想留下什么？" onClose={() => setComposer(null)}>
          <div className="modal-content">
            <p className="muted">一条就好，随时可以回来。</p>
            <div className="composer-options">
              {(
                [
                  ['expense', '记一笔', 'finance'],
                  ['weight', '记体重', 'weight'],
                  ['activity', '记运动', 'activity'],
                ] as const
              ).map(([kind, label, icon]) => (
                <button
                  className="composer-option"
                  key={kind}
                  type="button"
                  onClick={() => openCreate(kind)}
                >
                  <Icon name={icon} size={28} />
                  <span>{label}</span>
                  <Icon name="arrow" size={18} />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="v4-notice" role="status">
          <span>{notice.message}</span>
          {notice.record && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                // The receipt targets the command's actual entity; it never changes the source date filter.
                if (notice.record) openRecord(notice.record.kind, notice.record.id)
                setNotice(null)
                logger.info('ui.receipt.opened', { operation: 'view-record' })
              }}
            >
              查看记录
            </button>
          )}
          <button
            className="text-button"
            type="button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
          >
            关闭
          </button>
        </div>
      )}
    </Context.Provider>
  )
}
