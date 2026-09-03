import { createContext, useContext } from 'react'

import type { PwaState } from '@/pwa/pwaStore'

export interface PwaContextValue {
  state: PwaState
  dirtyFormCount: number
  setFormDirty: (token: symbol, dirty: boolean) => void
  applyUpdate: () => Promise<void>
}

export const PwaContext = createContext<PwaContextValue | undefined>(undefined)

export function usePwa(): PwaContextValue {
  const value = useContext(PwaContext)
  if (!value) throw new Error('PWA context is unavailable')
  return value
}
