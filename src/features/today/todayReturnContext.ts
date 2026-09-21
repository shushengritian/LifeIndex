import { logger } from '@/shared/logging/logger'

interface TodayReturnContext {
  habitId: string
  scrollY: number
}
// Ephemeral navigation state only: never persists business records or survives a reload.
const contexts = new Map<string, TodayReturnContext>()

export function rememberTodayReturn(key: string, habitId: string, scrollY: number) {
  contexts.delete(key)
  contexts.set(key, { habitId, scrollY: Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0 })
  // Bound abandoned navigations; returning normally consumes the entry immediately.
  if (contexts.size > 20) contexts.delete(contexts.keys().next().value!)
  logger.info('today.return.captured', { operation: 'navigate' })
}

export function takeTodayReturn(key: unknown): TodayReturnContext | undefined {
  if (typeof key !== 'string') return undefined
  const context = contexts.get(key)
  contexts.delete(key)
  return context
}
