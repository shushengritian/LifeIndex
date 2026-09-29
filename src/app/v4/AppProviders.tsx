import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createLifeIndexServices } from '@/core/services'
import type { LifeIndexServices } from '@/core/types'
import { V4ServicesContext, useV4Services } from './Services'
import { useV4Query } from './useQuery'
import { logger } from '@/shared/logging/logger'

const productionServices = createLifeIndexServices()
function AppearanceSync() {
  const services = useV4Services()
  const query = useV4Query(useCallback(() => services.preferences.getAll(), [services]))
  const appearance = query.snapshot?.data.values.appearance ?? 'system'
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = appearance === 'dark' || (appearance === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
        meta.content = dark ? '#221e29' : '#f5f0e8'
      })
      // A fallback theme is visible while loading; only the persisted preference resolves readiness.
      document.documentElement.dataset.themeState = query.status
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance, query.status])
  return null
}
export function AppProvidersV4({
  children,
  services = productionServices,
}: {
  children: ReactNode
  services?: LifeIndexServices
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading'),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    logger.info('app.database.opening', { operation: 'open', schemaVersion: 1 })
    void services.database
      .open()
      .then(() => {
        if (active) {
          setPhase('ready')
          logger.info('app.database.ready', { operation: 'open' })
        }
      })
      .catch(() => {
        if (active) {
          setPhase('failed')
          logger.warn('app.database.failed', {
            operation: 'open',
            failureClass: 'DatabaseInitialization',
          })
        }
      })
    // The stable service instance lives for the page lifetime; StrictMode cleanup only cancels stale render updates.
    return () => {
      active = false
    }
  }, [services, attempt])
  if (phase !== 'ready')
    return (
      <main className="v4-startup">
        <span className="eyebrow">LifeIndex</span>
        <h1>{phase === 'loading' ? '正在打开本机生活' : '暂时无法打开本机记录'}</h1>
        <p>
          {phase === 'loading' ? '你的记录只保存在这台设备。' : '记录没有被删除或重建，请重试。'}
        </p>
        {phase === 'failed' && (
          <button
            className="button"
            type="button"
            onClick={() => {
              setPhase('loading')
              setAttempt((n) => n + 1)
            }}
          >
            重新打开
          </button>
        )}
      </main>
    )
  return (
    <V4ServicesContext.Provider value={services}>
      <AppearanceSync />
      {children}
    </V4ServicesContext.Provider>
  )
}
