import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import { PwaContext } from '@/pwa/PwaContext'
import { applyPwaUpdate, getPwaState, subscribeToPwaState } from '@/pwa/pwaStore'

export function PwaProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeToPwaState, getPwaState, getPwaState)
  const [dirtyForms, setDirtyForms] = useState<ReadonlySet<symbol>>(() => new Set())

  const setFormDirty = useCallback((token: symbol, dirty: boolean) => {
    setDirtyForms((current) => {
      const alreadyDirty = current.has(token)
      if (alreadyDirty === dirty) return current

      // Each mounted form owns a token, so concurrent drafts cannot accidentally clear one another.
      const next = new Set(current)
      if (dirty) next.add(token)
      else next.delete(token)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      state,
      dirtyFormCount: dirtyForms.size,
      setFormDirty,
      applyUpdate: applyPwaUpdate,
    }),
    [dirtyForms, setFormDirty, state],
  )

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}
