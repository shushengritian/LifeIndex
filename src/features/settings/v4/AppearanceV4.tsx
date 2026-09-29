import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { PageHeading, Feedback } from '@/shared/ui/v4/Elements'
import { commandContext, errorMessage } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'

export function AppearanceV4() {
  const services = useV4Services(),
    query = useV4Query(useCallback(() => services.preferences.getAll(), [services]))
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    lock = useRef(false)
  useDirtyGuard({ dirty: false, busy })
  async function select(value: 'system' | 'light' | 'dark') {
    if (lock.current || !query.snapshot) return
    lock.current = true
    setBusy(true)
    setError(null)
    logger.info('settings.appearance.saving', { operation: 'set' })
    try {
      await services.preferences.set(
        {
          key: 'appearance',
          value,
          expectedEntityRevision: query.snapshot.data.revisions.appearance,
        },
        commandContext(query.snapshot.stamp),
      )
      logger.info('settings.appearance.saved', { operation: 'set' })
    } catch (failure) {
      setError(errorMessage(failure))
      logger.warn('settings.appearance.failed', { operation: 'set', failureClass: 'DomainWrite' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        title="选择此刻的明暗"
        description="每一种外观，都保留相同的清晰与秩序。"
        action={
          <Link to="/settings" className="text-button">
            返回设置
          </Link>
        }
      />
      {error && (
        <p className="entry-error" role="alert">
          {error}
        </p>
      )}
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取外观偏好" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="暂时读不到外观设置" onRetry={query.retry} />
      ) : (
        <div className="appearance-options" role="group" aria-label="外观主题">
          {(
            [
              ['system', '跟随系统'],
              ['light', '浅色'],
              ['dark', '深色'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={query.snapshot?.data.values.appearance === value}
              disabled={busy}
              onClick={() => void select(value)}
            >
              <span className={`theme-sample theme-sample--${value}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
