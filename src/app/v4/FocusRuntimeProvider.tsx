import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useV4Services } from './Services'
import { useConfirm } from './Confirmation'
import { useDirtyGuard } from './useDirtyGuard'
import { FocusController } from './FocusController'
import { Context } from './FocusRuntime'

function FocusGuard({ controller }: { controller: FocusController }) {
  const dirty = useSyncExternalStore(
    controller.subscribe,
    controller.getUnsaved,
    controller.getUnsaved,
  )
  // Subscribe to a stable boolean rather than timer ticks, but protect every in-flight focus write.
  const busy = useSyncExternalStore(controller.subscribe, controller.getBusy, controller.getBusy)
  useDirtyGuard({ dirty, busy })
  return null
}
export function FocusRuntimeProvider({ children }: { children: ReactNode }) {
  const services = useV4Services()
  const confirm = useConfirm()
  const [controller] = useState(() => new FocusController(services, confirm))
  useEffect(() => controller.connect(), [controller])
  return (
    <Context.Provider value={controller}>
      <FocusGuard controller={controller} />
      {children}
    </Context.Provider>
  )
}
