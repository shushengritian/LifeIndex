import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  signal?: AbortSignal
}
type Confirm = (options: ConfirmOptions) => Promise<boolean>
export const ConfirmationContext = createContext<Confirm | null>(null)
export function useConfirm(): Confirm {
  const value = useContext(ConfirmationContext)
  if (!value) throw new Error('ConfirmationUnavailable')
  return value
}
