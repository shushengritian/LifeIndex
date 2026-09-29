import { type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logger } from '@/shared/logging/logger'
import { returnPoint } from './useReportReturn'

export function ReportLink({
  month,
  focusKey,
  children,
}: {
  month: string
  focusKey: string
  children: ReactNode
}) {
  const location = useLocation(),
    navigate = useNavigate(),
    path = `/finance/report?month=${month}`
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    event.preventDefault()
    // Keep actual click-time scroll, not render-time scroll; the URL itself retains month/day/view filters.
    navigate(path, {
      state: {
        reportSource: {
          path: location.pathname + location.search,
          scroll: window.scrollY,
          focusKey,
        },
      },
    })
    logger.info('v4.report.entered', { reason: 'source-navigation' })
  }
  return (
    <Link to={path} onClick={open} className="text-button" data-focus-key={focusKey}>
      {children}
    </Link>
  )
}
export function ReportBackLink() {
  const location = useLocation(),
    point = returnPoint((location.state as { reportSource?: unknown } | null)?.reportSource)
  return (
    <Link
      className="text-button"
      to={point?.path ?? '/finance'}
      state={point ? { reportReturn: point } : null}
    >
      返回原页面
    </Link>
  )
}
