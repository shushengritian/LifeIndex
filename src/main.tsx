import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppV4 } from '@/app/v4/AppV4'
import { registerPwa } from '@/pwa/registerPwa'
import { logger } from '@/shared/logging/logger'
import '@/styles/v4-tokens.css'
import '@/styles/v4-base.css'
import '@/styles/v4-shell.css'
import '@/styles/v4-forms.css'
import '@/styles/v4-features.css'
import '@/styles/v4-settings.css'

logger.info('app.bootstrap.started', { appVersion: __APP_VERSION__, operation: 'bootstrap' })

// The new shell has its own presentation and store; historical UI modules are not part of this entry point.
logger.info('app.presentation.policy', {
  operation: 'bootstrap',
  toState: 'v4-independent-local-experience',
})

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
    <AppV4 />
  </StrictMode>,
)

registerPwa()
