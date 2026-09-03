/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision?: string; url: string }>
}

// The worker owns only versioned application assets; IndexedDB remains the sole business-data source.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

self.addEventListener('install', () => {
  console.info('[LifeIndex] pwa.worker.installed')
})

self.addEventListener('activate', () => {
  console.info('[LifeIndex] pwa.worker.activated')
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.info('[LifeIndex] pwa.worker.update-approved')
    void self.skipWaiting()
  }
})
