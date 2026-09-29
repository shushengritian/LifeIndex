import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { usePwa } from '@/pwa/PwaContext'

export function useDirtyGuard({ dirty, busy = false }: { dirty: boolean; busy?: boolean }) {
  const { setFormDirty } = usePwa()
  const token = useRef(Symbol('v4-draft'))
  const released = useRef(false)
  useEffect(() => {
    if (!dirty && !busy) released.current = false
    if (!released.current) setFormDirty(token.current, dirty || busy, busy)
  }, [dirty, busy, setFormDirty])
  useEffect(() => {
    const value = token.current
    return () => setFormDirty(value, false)
  }, [setFormDirty])
  return {
    release() {
      // Release before navigation in the same event; the router must not block a successfully saved draft.
      released.current = true
      flushSync(() => setFormDirty(token.current, false))
    },
  }
}
