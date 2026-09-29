import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmationContext, type ConfirmOptions } from './Confirmation'
import { Modal } from '@/shared/ui/v4/Modal'
import { logger } from '@/shared/logging/logger'

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const pending = useRef<((result: boolean) => void) | null>(null)
  const finish = useCallback((result: boolean) => {
    const resolve = pending.current
    pending.current = null
    setOptions(null)
    resolve?.(result)
    logger.info('ui.confirmation.resolved', {
      operation: 'confirm',
      reason: result ? 'accepted' : 'cancelled',
    })
  }, [])
  const confirm = useCallback<(options: ConfirmOptions) => Promise<boolean>>(
    (value) => {
      // A second command cannot replace a confirmation the user is still considering.
      if (pending.current) return Promise.resolve(false)
      logger.info('ui.confirmation.opened', { operation: 'confirm' })
      setOptions(value)
      return new Promise((resolve) => {
        const abort = () => finish(false)
        value.signal?.addEventListener('abort', abort, { once: true })
        pending.current = (result) => {
          value.signal?.removeEventListener('abort', abort)
          resolve(result)
        }
        if (value.signal?.aborted) finish(false)
      })
    },
    [finish],
  )
  useEffect(
    () => () => {
      pending.current?.(false)
    },
    [],
  )
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title}
          onClose={() => finish(false)}
          closeLabel={options.cancelLabel ?? '取消'}
        >
          <div className="modal-content">
            <p>{options.description}</p>
            <div className="confirmation-actions">
              <button
                className="button secondary"
                type="button"
                data-initial-focus
                onClick={() => finish(false)}
              >
                {options.cancelLabel ?? '取消'}
              </button>
              <button className="button danger" type="button" onClick={() => finish(true)}>
                {options.confirmLabel ?? '确认'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmationContext.Provider>
  )
}
