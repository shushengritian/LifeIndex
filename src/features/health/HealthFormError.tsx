import { useEffect, useRef } from 'react'
import { logger } from '@/shared/logging/logger'

/** Focus feedback within the editor without moving the page or its bottom navigation. */
export function HealthFormError({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const error = ref.current
    const body = error?.closest<HTMLElement>('.sheet-form-body')
    if (!error || !body || document.querySelector('dialog[open]')) return
    error.focus({ preventScroll: true })
    // Only the editor body may move; scrollIntoView can also shift iOS's layout viewport.
    const offset = error.getBoundingClientRect().top - body.getBoundingClientRect().top
    body.scrollTop += offset - 8
    logger.info('health.editor.errorfocused', { operation: 'feedback', failureClass: 'Form' })
  }, [message])
  return (
    <p ref={ref} tabIndex={-1} className="form-error" role="alert">
      {message}
    </p>
  )
}
