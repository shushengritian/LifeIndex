import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import { logger } from '@/shared/logging/logger'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement
    // Native top-layer modality isolates an underlying sheet without creating a nested form.
    dialog.showModal()
    cancelRef.current?.focus()
    logger.info('ui.confirm.opened', { operation: 'open' })
    return () => {
      dialog.close()
      // Avoid focus restoration scrolling the page beneath the fixed tab bar on mobile.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
      else if (!document.activeElement || document.activeElement === document.body) {
        // A containing Sheet may already have restored its launcher during the same unmount.
        // Only use the fallback when focus is genuinely lost; never override that valid return.
        document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true })
        logger.info('ui.confirm.focusfallback', { operation: 'close' })
      } else {
        logger.info('ui.confirm.focuspreserved', { operation: 'close' })
      }
      logger.info('ui.confirm.closed', { operation: 'close' })
    }
  }, [])
  function cancel() {
    if (busy) {
      logger.info('ui.confirm.blocked', { reason: 'busy', operation: 'cancel' })
      return
    }
    logger.info('ui.confirm.cancelled', { operation: 'cancel' })
    onCancel()
  }
  return createPortal(
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault()
        cancel()
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button
          ref={cancelRef}
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={cancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="button-secondary text-destructive"
          disabled={busy}
          onClick={() => {
            if (busy) return
            logger.info('ui.confirm.accepted', { operation: 'confirm' })
            onConfirm()
          }}
        >
          {busy ? '处理中…' : confirmLabel}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
