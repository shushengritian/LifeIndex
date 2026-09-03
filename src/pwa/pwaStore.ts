import { logger } from '@/shared/logging/logger'

export interface PwaState {
  online: boolean
  offlineReady: boolean
  updateReady: boolean
  applyingUpdate: boolean
  registrationFailed: boolean
}

type Listener = () => void
type UpdateHandler = (reloadPage?: boolean) => Promise<void>

const listeners = new Set<Listener>()
let updateHandler: UpdateHandler | undefined
let state: PwaState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  offlineReady: false,
  updateReady: false,
  applyingUpdate: false,
  registrationFailed: false,
}

function updateState(patch: Partial<PwaState>): void {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function getPwaState(): PwaState {
  return state
}

export function subscribeToPwaState(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setPwaUpdateHandler(handler: UpdateHandler): void {
  updateHandler = handler
}

export function setPwaOnline(online: boolean): void {
  if (state.online === online) return
  logger.info(online ? 'pwa.network.online' : 'pwa.network.offline', { operation: 'network' })
  updateState({ online })
}

export function markPwaOfflineReady(): void {
  updateState({ offlineReady: true })
}

export function markPwaUpdateReady(): void {
  updateState({ updateReady: true })
}

export function markPwaRegistrationFailed(): void {
  updateState({ registrationFailed: true })
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateHandler || state.applyingUpdate) {
    logger.warn('pwa.update.unavailable', {
      operation: 'update',
      failureClass: updateHandler ? 'AlreadyApplying' : 'MissingHandler',
    })
    return
  }

  logger.info('pwa.update.approved', { operation: 'update' })
  updateState({ applyingUpdate: true })
  try {
    // The registration helper sends SKIP_WAITING and reloads only after the user approves this transition.
    await updateHandler(true)
  } catch (error) {
    logger.error('pwa.update.failed', error, {
      operation: 'update',
      failureClass: 'UpdateActivation',
    })
    updateState({ applyingUpdate: false })
    throw error
  }
}
