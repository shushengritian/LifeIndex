import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { PwaContext } from '@/pwa/PwaContext'
import { applyPwaUpdate, getPwaState, subscribeToPwaState } from '@/pwa/pwaStore'
import { logger } from '@/shared/logging/logger'

export function PwaProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeToPwaState, getPwaState, getPwaState)
  const guards = useRef(new Map<symbol, boolean>())
  const [counts, setCounts] = useState({ dirty: 0, busy: 0 })

  const setFormDirty = useCallback((token: symbol, dirty: boolean, busy = false) => {
    // One token owns both its discardable draft and non-discardable pending write.
    const current = guards.current
    if (current.has(token) === dirty && (!dirty || current.get(token) === busy)) return
    if (dirty) current.set(token, busy)
    else current.delete(token)
    setCounts({ dirty: current.size, busy: [...current.values()].filter(Boolean).length })
    logger.info('ui.draft.guardchanged', { operation: 'guard', count: current.size })
  }, [])

  useEffect(() => {
    if (!counts.dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!guards.current.size) return
      event.preventDefault()
      event.returnValue = ''
      logger.info('ui.draft.unloadblocked', { operation: 'unload' })
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [counts.dirty])

  const applyUpdate = useCallback(async () => {
    // Enforce at the command boundary as well as the disabled banner button.
    if (guards.current.size) {
      logger.warn('pwa.update.draftblocked', { operation: 'update', count: guards.current.size })
      return
    }
    await applyPwaUpdate()
  }, [])

  const value = useMemo(
    () => ({
      state,
      dirtyFormCount: counts.dirty,
      busyFormCount: counts.busy,
      setFormDirty,
      applyUpdate,
    }),
    [counts, setFormDirty, state, applyUpdate],
  )

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}
