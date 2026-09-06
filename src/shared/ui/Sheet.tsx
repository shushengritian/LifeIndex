import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { logger } from '@/shared/logging/logger'

export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  const backdropRef = useRef<HTMLDivElement>(null)
  // Capture focus during render, before an auto-focused sheet field can replace the launcher.
  const [returnFocus] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  useEffect(() => {
    const backdrop = backdropRef.current
    const page = backdrop?.parentElement
    const appShell = backdrop?.closest('.app-shell')
    const main = backdrop?.closest('main')
    // A modal sheet leaves the launcher page mounted; inert removes that dimmed UI from focus and AT.
    const background = [
      ...Array.from(appShell?.children ?? []).filter((element) => element !== main),
      ...Array.from(page?.children ?? []).filter((element) => element !== backdrop),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement)
    const previousInert = background.map((element) => element.inert)
    background.forEach((element) => {
      element.inert = true
    })
    logger.info('ui.sheet.opened', { entityType: 'sheet', operation: 'open' })
    return () => {
      background.forEach((element, index) => {
        element.inert = previousInert[index] ?? false
      })
      // Returning focus keeps keyboard and assistive-technology users at the action they invoked.
      if (returnFocus?.isConnected) returnFocus.focus()
      logger.info('ui.sheet.closed', { entityType: 'sheet', operation: 'close' })
    }
  }, [returnFocus])

  return (
    <div className="sheet-backdrop" ref={backdropRef}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>
  )
}
