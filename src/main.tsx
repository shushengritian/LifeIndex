import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { registerPwa } from '@/pwa/registerPwa'
import { logger } from '@/shared/logging/logger'
import '@/styles/global.css'

logger.info('app.bootstrap.started', { appVersion: __APP_VERSION__, operation: 'bootstrap' })

const rootElement = document.getElementById('root')

if (!rootElement) {
  const error = new Error('RootElementUnavailable')
  logger.error('app.bootstrap.failed', error, {
    operation: 'bootstrap',
    failureClass: 'RootElementUnavailable',
  })
  throw error
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerPwa()
