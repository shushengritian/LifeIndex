import { createContext, useContext } from 'react'
import type { Location } from 'react-router-dom'

export type CreateKind = 'expense' | 'weight' | 'activity'
export type RecordKind = 'transaction' | 'weight' | 'activity' | 'focus' | 'habitCheck'
export interface ReturnPoint {
  location: Location
  scrollY: number
  focusKey: string | null
}
export interface FlowRouteState {
  background?: Location
  returnToken?: string
  defaultDate?: string
}
export interface FlowApi {
  openComposer(): void
  openCreate(kind: CreateKind, options?: { defaultDate?: string }): void
  openRecord(kind: RecordKind, id: string): void
  close(fallback?: string): void
  notify(message: string, record?: { kind: RecordKind; id: string }): void
}
export const Context = createContext<FlowApi | null>(null)
export function useFlow(): FlowApi {
  const flow = useContext(Context)
  if (!flow) throw new Error('FlowUnavailable')
  return flow
}
