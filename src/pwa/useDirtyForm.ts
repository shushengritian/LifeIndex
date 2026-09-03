import { useEffect, useRef } from 'react'

import { usePwa } from '@/pwa/PwaContext'

export function useDirtyForm(dirty: boolean): void {
  const { setFormDirty } = usePwa()
  const token = useRef(Symbol('dirty-form'))

  useEffect(() => {
    const formToken = token.current
    setFormDirty(formToken, dirty)
    // Unmounting a route or completing a save must release only this form's reload guard.
    return () => setFormDirty(formToken, false)
  }, [dirty, setFormDirty])
}
