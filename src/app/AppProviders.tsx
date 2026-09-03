import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { logger } from '@/shared/logging/logger'

interface AppProvidersProps {
  children: ReactNode
  database?: LifeIndexDatabase
}

const defaultDatabase = new LifeIndexDatabase()

export function AppProviders({ children, database = defaultDatabase }: AppProvidersProps) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const services = useMemo(() => ({ database }), [database])

  useEffect(() => {
    let active = true

    void database
      .initialize()
      .then(() => {
        if (!active) return
        logger.info('app.initialization.ready', { operation: 'initialize' })
        setState('ready')
      })
      .catch(() => {
        if (!active) return
        logger.warn('app.initialization.failed', {
          operation: 'initialize',
          failureClass: 'DatabaseInitialization',
        })
        setState('failed')
      })

    // The default database lives for the page lifetime; only stale async state updates are cancelled here.
    return () => {
      active = false
    }
  }, [attempt, database])

  if (state === 'loading') {
    return (
      <main className="startup-state" aria-live="polite">
        <p className="eyebrow">LifeIndex</p>
        <h1>正在打开本地数据</h1>
      </main>
    )
  }

  if (state === 'failed') {
    return (
      <main className="fatal-state" role="alert">
        <p className="eyebrow">LifeIndex</p>
        <h1>无法打开本地数据</h1>
        <p>LifeIndex 没有删除或重建你的数据库。请重试；如果问题持续，请先保留当前站点数据。</p>
        <button
          type="button"
          onClick={() => {
            logger.info('app.initialization.retry', { operation: 'initialize' })
            setState('loading')
            setAttempt((value) => value + 1)
          }}
        >
          重试
        </button>
      </main>
    )
  }

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>
}
