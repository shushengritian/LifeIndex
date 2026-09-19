import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusRepository } from '@/data/repositories/FocusRepository'
import type { FocusSession } from '@/shared/domain/types'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { logger } from '@/shared/logging/logger'

/** Ticks update presentation only; the repository commits the original expected endpoint. */
export function useFocusCompletion(
  repository: FocusRepository,
  active: FocusSession | undefined,
  suspended = false,
) {
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<{ id: string; message: string }>()
  const inFlight = useRef(false)
  const attempted = useRef<string | undefined>(undefined)
  const id = active?.id
  const endpoint = active?.expectedEndAt
  useDirtyForm(false, busy)

  const complete = useCallback(async () => {
    // A confirmed manual operation owns the endpoint until retry or explicit abandonment.
    if (
      suspended ||
      !id ||
      !endpoint ||
      Date.now() < new Date(endpoint).getTime() ||
      inFlight.current
    )
      return
    inFlight.current = true
    attempted.current = id
    setBusy(true)
    setFailure(undefined)
    logger.info('focus.completion.started', { operation: 'reconcile' })
    try {
      await repository.reconcileActive(new Date().toISOString())
      logger.info('focus.completion.saved', { operation: 'reconcile' })
    } catch {
      // Do not retry every second: retain the persisted active row and let the user retry explicitly.
      setFailure({ id, message: '计时已结束，但记录未能保存。时长已固定，请重试保存。' })
      logger.warn('focus.completion.failed', { operation: 'reconcile', failureClass: 'Write' })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }, [repository, id, endpoint, suspended])

  useEffect(() => {
    if (!id || !endpoint) return
    const refresh = () => {
      setNow(Date.now())
      if (Date.now() >= new Date(endpoint).getTime() && attempted.current !== id) void complete()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    const interval = window.setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [id, endpoint, complete])

  return { now, busy, error: failure && failure.id === id ? failure.message : '', retry: complete }
}
