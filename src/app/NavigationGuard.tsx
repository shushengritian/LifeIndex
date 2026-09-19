import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

import { usePwa } from '@/pwa/PwaContext'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { logger } from '@/shared/logging/logger'

export function NavigationGuard() {
  const { dirtyFormCount, busyFormCount = 0 } = usePwa()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyFormCount > 0 &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    // A pending write never offers discard. Reset the attempt; completion will not auto-navigate.
    if (busyFormCount > 0 || dirtyFormCount === 0) {
      logger.info('ui.navigation.stayed', {
        operation: 'navigate',
        reason: busyFormCount ? 'busy' : 'completed',
      })
      blocker.reset()
    } else {
      logger.info('ui.navigation.blocked', { operation: 'navigate', reason: 'dirty' })
    }
  }, [blocker, busyFormCount, dirtyFormCount])
  if (blocker.state !== 'blocked' || busyFormCount > 0 || dirtyFormCount === 0) return null
  return (
    <ConfirmDialog
      title="离开并放弃输入？"
      description="当前页面有尚未保存的内容。离开后这些输入将丢失，已有记录不会改变。"
      cancelLabel="留在当前页"
      confirmLabel="放弃并离开"
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
    />
  )
}
