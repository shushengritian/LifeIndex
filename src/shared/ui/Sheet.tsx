import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
    const appShell = backdrop?.closest('.app-shell')
    // Nested editors may live inside a Settings section. Isolate siblings at every level,
    // not just the immediate section, so other settings remain outside the modal focus tree.
    const background: HTMLElement[] = []
    let branch: Element | null = backdrop
    while (branch?.parentElement) {
      const parent = branch.parentElement
      background.push(
        ...Array.from(parent.children).filter(
          (element): element is HTMLElement => element !== branch && element instanceof HTMLElement,
        ),
      )
      if (parent === appShell || parent === document.body) break
      branch = parent
    }
    const previousInert = background.map((element) => element.inert)
    background.forEach((element) => {
      element.inert = true
    })
    logger.info('ui.sheet.opened', { entityType: 'sheet', operation: 'open' })
    function trapTab(event: KeyboardEvent) {
      // A native confirmation in the top layer owns focus until it closes.
      if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return
      const controls = Array.from(
        backdrop?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex]',
        ) ?? [],
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[hidden], [inert]') &&
          element.getClientRects().length > 0,
      )
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !last) {
        event.preventDefault()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    backdrop?.addEventListener('keydown', trapTab)
    return () => {
      backdrop?.removeEventListener('keydown', trapTab)
      background.forEach((element, index) => {
        element.inert = previousInert[index] ?? false
      })
      // Returning focus keeps keyboard and assistive-technology users at the action they invoked.
      if (returnFocus?.isConnected) returnFocus.focus()
      else document.querySelector<HTMLElement>('#main-content')?.focus()
      logger.info('ui.sheet.closed', { entityType: 'sheet', operation: 'close' })
    }
  }, [returnFocus])

  // Escape ancestor animation/transform containing blocks so a fixed sheet uses the viewport.
  return createPortal(
    <div className="sheet-backdrop" ref={backdropRef}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  )
}
