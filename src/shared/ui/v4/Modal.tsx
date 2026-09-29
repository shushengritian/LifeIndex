import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { logger } from '@/shared/logging/logger'

export function Modal({
  title,
  children,
  onClose,
  busy = false,
  closeLabel = '取消',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  closeLabel?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const node = dialog.current
    if (!node) return
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const originKey = origin?.dataset.focusKey
    node.showModal()
    // WebKit may leave focus on body after showModal; every modal has an explicit focus destination.
    const initial =
      node.querySelector<HTMLElement>('[data-initial-focus]') ??
      node.querySelector<HTMLElement>(
        'button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]',
      ) ??
      node
    initial.focus({ preventScroll: true })
    logger.info('ui.modal.opened', { operation: 'open' })
    return () => {
      node.close()
      // Local dialogs use their connected semantic successor; route workflows additionally restore page/scroll in Flow.
      const target = origin?.isConnected
        ? origin
        : originKey
          ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(originKey)}"]`)
          : null
      target?.focus({ preventScroll: true })
      logger.info('ui.modal.closed', { operation: 'close' })
    }
  }, [])
  return (
    <dialog
      className="v4-modal"
      ref={dialog}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const node = event.currentTarget
        // Native dialogs make the page inert, but browser chrome can still receive Tab at an edge.
        // Cycle only within this active layer so a confirmation never leaks focus into its parent.
        const controls = [
          ...node.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex]',
          ),
        ].filter(
          (control) =>
            control.tabIndex >= 0 &&
            !control.matches(':disabled') &&
            !control.closest('[inert]') &&
            control.getClientRects().length > 0 &&
            getComputedStyle(control).visibility !== 'hidden',
        )
        if (!controls.length) {
          event.preventDefault()
          node.focus({ preventScroll: true })
        } else {
          // Explicit advancement also supports Safari configurations that omit buttons from native Tab navigation.
          event.preventDefault()
          const current = controls.indexOf(document.activeElement as HTMLElement)
          const next =
            current < 0
              ? event.shiftKey
                ? controls.length - 1
                : 0
              : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
          controls[next]?.focus({ preventScroll: true })
          logger.info('ui.modal.focus.cycled', {
            operation: 'keyboard',
            reason: event.shiftKey ? 'backward' : 'forward',
          })
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <header className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="text-button" disabled={busy} onClick={onClose}>
          {closeLabel}
        </button>
      </header>
      {children}
    </dialog>
  )
}
