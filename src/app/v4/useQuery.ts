import { useEffect, useState } from 'react'
import type { DomainError, Snapshot } from '@/core/types'
import { useV4Services } from './Services'
import { logger } from '@/shared/logging/logger'

export interface QueryState<T> {
  status: 'loading' | 'ready' | 'failed'
  snapshot: Snapshot<T> | undefined
  error: DomainError | undefined
}

export function useV4Query<T>(query: () => Promise<Snapshot<T>>) {
  const services = useV4Services()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<QueryState<T> & { source?: typeof query }>({
    status: 'loading',
    snapshot: undefined,
    error: undefined,
  })
  useEffect(() => {
    let active = true
    // Each region owns its observation. A failed query never fabricates an empty successful result.
    const unsubscribe = services.observe(query, {
      next(snapshot) {
        if (active) setState({ status: 'ready', snapshot, error: undefined, source: query })
      },
      error(error) {
        if (!active) return
        logger.warn('ui.query.failed', { operation: 'read', failureClass: 'DomainRead' })
        setState((previous) => ({
          snapshot: previous.source === query ? previous.snapshot : undefined,
          status: 'failed',
          error,
          source: query,
        }))
      },
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [services, query, attempt])
  // Do not flash a different record/month while a newly selected query is still loading.
  const visible =
    state.source === query
      ? state
      : { status: 'loading' as const, snapshot: undefined, error: undefined }
  return {
    ...visible,
    retry() {
      logger.info('ui.query.retried', { operation: 'read' })
      setState((previous) => ({ ...previous, status: 'loading', error: undefined }))
      setAttempt((value) => value + 1)
    },
  }
}
