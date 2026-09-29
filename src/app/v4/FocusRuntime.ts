import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FocusController } from './FocusController'
export const Context = createContext<FocusController | null>(null)
export function useFocusRuntime() {
  const controller = useContext(Context)
  if (!controller) throw new Error('FocusRuntimeUnavailable')
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  return {
    ...state,
    start: controller.start,
    pause: controller.pause,
    resume: controller.resume,
    finish: controller.finish,
    retry: controller.retry,
    discard: controller.discard,
  }
}
