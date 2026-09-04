import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { watchPwaUpdates } from '@/pwa/watchPwaUpdates'
import { logger } from '@/shared/logging/logger'

describe('installed PWA update discovery', () => {
  let stopWatching: (() => void) | undefined

  beforeEach(() => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    vi.spyOn(logger, 'info').mockImplementation(() => undefined)
    vi.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    stopWatching?.()
    stopWatching = undefined
    vi.restoreAllMocks()
  })

  function observe(update = vi.fn().mockResolvedValue(undefined)) {
    const registration = { update, installing: null, waiting: null }
    stopWatching = watchPwaUpdates(registration)
    return registration
  }

  it('checks for a newer worker on foreground', async () => {
    const registration = observe()
    expect(registration.update).not.toHaveBeenCalled()
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() =>
      expect(logger.info).toHaveBeenCalledWith('pwa.updatecheck.completed', {
        operation: 'check-update',
      }),
    )
    expect(registration.update).toHaveBeenCalledOnce()
  })

  it('checks when connectivity returns', () => {
    const registration = observe()
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledOnce()
  })

  it('skips hidden and offline states without attempting a fetch', () => {
    const registration = observe()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    window.dispatchEvent(new Event('online'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).not.toHaveBeenCalled()
  })

  it('coalesces an in-flight check and throttles recently successful checks', async () => {
    let finish: (() => void) | undefined
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const registration = observe(vi.fn().mockReturnValue(pending))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledOnce()
    finish!()
    await vi.waitFor(() =>
      expect(logger.info).toHaveBeenCalledWith('pwa.updatecheck.completed', {
        operation: 'check-update',
      }),
    )
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledOnce()
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it('retains the current app on failure and permits a later retry', async () => {
    const registration = observe(
      vi.fn().mockRejectedValueOnce(new Error('synthetic failure')).mockResolvedValue(undefined),
    )
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith('pwa.updatecheck.failed', expect.any(Error), {
        operation: 'check-update',
        failureClass: 'UpdateDiscovery',
      }),
    )
    window.dispatchEvent(new Event('online'))
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it.each(['installing', 'waiting'] as const)('does not disturb an already %s worker', (state) => {
    const update = vi.fn()
    stopWatching = watchPwaUpdates({
      update,
      installing: null,
      waiting: null,
      [state]: {} as ServiceWorker,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).not.toHaveBeenCalled()
  })

  it('removes both event listeners when disposed', () => {
    const registration = observe()
    stopWatching!()
    stopWatching = undefined
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
    expect(registration.update).not.toHaveBeenCalled()
  })
})
