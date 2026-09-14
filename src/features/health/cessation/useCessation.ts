import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppServices } from '@/app/AppServicesContext'
import { CessationRepository } from '@/data/repositories/CessationRepository'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'

export function useCessation() {
  const { database } = useAppServices()
  const repository = useMemo(() => new CessationRepository(database), [database])
  const settings = useMemo(() => new SettingsRepository(database), [database])
  const [revision, setRevision] = useState(0)
  const query = useCallback(async () => {
    void revision
    return {
      ...(await repository.read()),
      hidden: (await settings.get('cessationHidden'))?.value === true,
    }
  }, [repository, settings, revision])
  const state = useLiveQueryState(query)
  return {
    repository,
    settings,
    state,
    retry: () => {
      logger.info('cessation.query.retry', { operation: 'retry' })
      setRevision((value) => value + 1)
    },
  }
}

export function useCessationNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Foreground reconciliation covers suspended iOS timers and plan-zone midnight without writes.
    const refresh = () => setNow(new Date())
    const resume = () => {
      refresh()
      logger.info('cessation.clock.resumed', { operation: 'resume' })
    }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [])
  return now
}
