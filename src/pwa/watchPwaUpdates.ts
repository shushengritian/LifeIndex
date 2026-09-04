import { logger } from '@/shared/logging/logger'

type UpdateRegistration = Pick<ServiceWorkerRegistration, 'update' | 'installing' | 'waiting'>

export function watchPwaUpdates(registration: UpdateRegistration): () => void {
  let checking = false
  let lastSuccessfulCheck: number | undefined
  const minimumIntervalMs = 60_000

  async function check(reason: 'foreground' | 'online'): Promise<void> {
    logger.info('pwa.updatecheck.requested', { operation: 'check-update', reason })
    const skipReason =
      document.visibilityState !== 'visible'
        ? 'Hidden'
        : !navigator.onLine
          ? 'Offline'
          : checking || registration.installing || registration.waiting
            ? 'UpdatePending'
            : lastSuccessfulCheck !== undefined &&
                Date.now() - lastSuccessfulCheck < minimumIntervalMs
              ? 'RecentCheck'
              : undefined

    if (skipReason) {
      // Returning to the app can fire several events; do not duplicate work or disturb a waiting update.
      logger.info('pwa.updatecheck.skipped', { operation: 'check-update', reason: skipReason })
      return
    }

    checking = true
    logger.info('pwa.updatecheck.started', { operation: 'check-update', reason })
    try {
      // This only discovers/downloads a worker. Activation and reload still require the existing dirty-form-safe prompt.
      await registration.update()
      lastSuccessfulCheck = Date.now()
      logger.info('pwa.updatecheck.completed', { operation: 'check-update' })
    } catch (error) {
      // A connectivity or host failure must leave the current app usable and allow the next event to retry.
      logger.error('pwa.updatecheck.failed', error, {
        operation: 'check-update',
        failureClass: 'UpdateDiscovery',
      })
    } finally {
      checking = false
    }
  }

  const onForeground = () => void check('foreground')
  const onOnline = () => void check('online')
  document.addEventListener('visibilitychange', onForeground)
  window.addEventListener('online', onOnline)
  logger.info('pwa.updatecheck.watching', { operation: 'check-update' })

  return () => {
    document.removeEventListener('visibilitychange', onForeground)
    window.removeEventListener('online', onOnline)
    logger.info('pwa.updatecheck.stopped', { operation: 'check-update' })
  }
}
