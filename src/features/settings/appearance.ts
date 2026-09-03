import type { Appearance } from '@/shared/domain/types'
import { logger } from '@/shared/logging/logger'

export function applyAppearance(appearance: Appearance): void {
  logger.info('appearance.apply.started', { operation: 'apply', toState: appearance })
  if (appearance === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = appearance
  }
  logger.info('appearance.apply.succeeded', { operation: 'apply', toState: appearance })
}
