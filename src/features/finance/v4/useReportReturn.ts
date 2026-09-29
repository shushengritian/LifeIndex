import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { logger } from '@/shared/logging/logger'
interface ReturnPoint {
  path: string
  scroll: number
  focusKey: string
}
export function returnPoint(value: unknown): ReturnPoint | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<ReturnPoint>
  return typeof item.path === 'string' &&
    /^\/(today|finance)(\?|$)/.test(item.path) &&
    typeof item.scroll === 'number' &&
    Number.isFinite(item.scroll) &&
    typeof item.focusKey === 'string'
    ? (item as ReturnPoint)
    : null
}
export function useReportReturn(ready: boolean) {
  const location = useLocation(),
    restored = useRef<string | null>(null)
  useEffect(() => {
    const point = returnPoint((location.state as { reportReturn?: unknown } | null)?.reportReturn)
    if (!ready || !point || restored.current === location.key) return
    const frame = requestAnimationFrame(() => {
      restored.current = location.key
      window.scrollTo({ top: point.scroll, behavior: 'instant' })
      document
        .querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(point.focusKey)}"]`)
        ?.focus({ preventScroll: true })
      logger.info('v4.report.returned', { reason: 'context-restored' })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, location.key, location.state])
}
