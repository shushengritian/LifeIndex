import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { usePwa } from '@/pwa/PwaContext'
import { useConfirm } from './Confirmation'
import { logger } from '@/shared/logging/logger'

export function NavigationGuardV4() {
  const { dirtyFormCount, busyFormCount = 0 } = usePwa()
  const confirm = useConfirm()
  const prompting = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyFormCount > 0 &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (busyFormCount || !dirtyFormCount) {
      blocker.reset()
      return
    }
    if (prompting.current) return
    prompting.current = true
    logger.info('ui.navigation.blocked', { operation: 'navigate', reason: 'dirty' })
    void confirm({
      title: '放弃还没保存的内容？',
      description: '已保存的记录不受影响。继续编辑可保留当前输入。',
      cancelLabel: '继续编辑',
      confirmLabel: '放弃修改',
    }).then((accepted) => {
      prompting.current = false
      if (accepted) blocker.proceed()
      else blocker.reset()
    })
  }, [blocker, busyFormCount, dirtyFormCount, confirm])
  return null
}
