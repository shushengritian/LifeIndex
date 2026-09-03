import { registerSW } from 'virtual:pwa-register'

import { logger } from '@/shared/logging/logger'

export function registerPwa(): void {
  logger.info('pwa.registration.started', { operation: 'register' })

  registerSW({
    immediate: true,
    onOfflineReady() {
      logger.info('pwa.offline.ready', { operation: 'cache' })
    },
    onNeedRefresh() {
      // M6 will connect this waiting state to a guarded, user-confirmed update prompt.
      logger.info('pwa.update.waiting', { operation: 'update' })
    },
    onRegisteredSW() {
      logger.info('pwa.registration.succeeded', { operation: 'register' })
    },
    onRegisterError(error) {
      logger.error('pwa.registration.failed', error, {
        operation: 'register',
        failureClass: 'ServiceWorkerRegistration',
      })
    },
  })
}
