import { registerSW } from 'virtual:pwa-register'

import {
  markPwaOfflineReady,
  markPwaRegistrationFailed,
  markPwaUpdateReady,
  setPwaOnline,
  setPwaUpdateHandler,
} from '@/pwa/pwaStore'
import { logger } from '@/shared/logging/logger'
import { watchPwaUpdates } from '@/pwa/watchPwaUpdates'

export function registerPwa(): void {
  logger.info('pwa.registration.started', { operation: 'register' })

  async function verifyConnectivity(): Promise<void> {
    if (!navigator.onLine) {
      setPwaOnline(false)
      return
    }
    try {
      // HEAD is intentionally outside Workbox's GET precache route, so a cached shell cannot impersonate network reachability.
      await fetch(`${import.meta.env.BASE_URL}__lifeindex_connectivity__`, {
        method: 'HEAD',
        cache: 'no-store',
      })
      setPwaOnline(true)
    } catch {
      setPwaOnline(false)
    }
  }

  window.addEventListener('online', () => void verifyConnectivity())
  window.addEventListener('offline', () => setPwaOnline(false))
  void verifyConnectivity()

  let approvedReload: (() => void) | undefined
  const updateServiceWorker = registerSW({
    // Workbox's isUpdate is fixed on registration and may be false for a first-visit A→B update.
    // Only a UI-approved update may reload; another tab activating a worker must not discard drafts.
    onNeedReload() {
      approvedReload?.()
    },
    immediate: true,
    onOfflineReady() {
      logger.info('pwa.offline.ready', { operation: 'cache' })
      markPwaOfflineReady()
    },
    onNeedRefresh() {
      logger.info('pwa.update.waiting', { operation: 'update' })
      markPwaUpdateReady()
    },
    onRegisteredSW(_workerUrl, registration) {
      logger.info('pwa.registration.succeeded', { operation: 'register' })
      // Returning visitors already controlled by an active worker are offline-ready without a new install event.
      if (registration?.active) markPwaOfflineReady()
      // Home Screen apps may stay mounted for days; foreground/reconnect events must also discover new releases.
      if (registration) watchPwaUpdates(registration)
    },
    onRegisterError(error) {
      logger.error('pwa.registration.failed', error, {
        operation: 'register',
        failureClass: 'ServiceWorkerRegistration',
      })
      markPwaRegistrationFailed()
    },
  })

  // Registration and UI stay decoupled; only this opaque callback crosses the boundary.
  setPwaUpdateHandler(
    () =>
      new Promise<void>((resolve, reject) => {
        const previous = navigator.serviceWorker.controller
        let settled = false
        const cleanup = () => {
          window.clearTimeout(timeout)
          navigator.serviceWorker.removeEventListener('controllerchange', changed)
          approvedReload = undefined
        }
        const changed = () => {
          if (
            settled ||
            !navigator.serviceWorker.controller ||
            navigator.serviceWorker.controller === previous
          )
            return
          settled = true
          cleanup()
          logger.info('pwa.update.activated', { operation: 'reload' })
          resolve()
          window.location.reload()
        }
        const failed = () => {
          if (settled) return
          settled = true
          cleanup()
          logger.warn('pwa.update.activation.failed', { failureClass: 'WorkerActivation' })
          reject(new Error('新版本未能及时接管，请稍后重试。'))
        }
        // Listen before SKIP_WAITING, including first-install sessions that the plugin does not reload.
        const timeout = window.setTimeout(failed, 30_000)
        approvedReload = changed
        navigator.serviceWorker.addEventListener('controllerchange', changed)
        logger.info('pwa.update.activation.requested', { operation: 'update' })
        void updateServiceWorker(true).catch(failed)
      }),
  )
}
