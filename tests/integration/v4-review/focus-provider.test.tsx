import Dexie from 'dexie'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FocusRuntimeProvider } from '@/app/v4/FocusRuntimeProvider'
import { useFocusRuntime } from '@/app/v4/FocusRuntime'
import { ConfirmationContext } from '@/app/v4/Confirmation'
import { V4ServicesContext } from '@/app/v4/Services'
import { PwaProvider } from '@/pwa/PwaProvider'
import { usePwa, type PwaContextValue } from '@/pwa/PwaContext'
import { setPwaUpdateHandler } from '@/pwa/pwaStore'
import { createLifeIndexServices } from '@/core/services'

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const dispose of cleanup.splice(0)) await dispose()
})

for (const operation of ['start', 'pause', 'finalizeCompletion'] as const) {
  for (const outcome of ['success', 'failure'] as const) {
    it(`S03: the real provider blocks updates during ${operation} ${outcome} then releases busy`, async () => {
      const name = `LifeIndexV4-provider-review-${crypto.randomUUID()}`
      // Advancing the injected clock by two seconds stays below clock-jump detection and avoids timer mocks.
      let now = Date.now()
      const services = createLifeIndexServices({
        databaseName: name,
        clock: {
          now: () => now,
          utcOffsetMinutes: () => 480,
          monotonicNow: () => performance.now(),
        },
      })
      await services.database.open()
      let runtime!: ReturnType<typeof useFocusRuntime>
      let pwa!: PwaContextValue
      function Probe() {
        runtime = useFocusRuntime()
        pwa = usePwa()
        return null
      }
      const mounted = render(
        <PwaProvider>
          <V4ServicesContext.Provider value={services}>
            <ConfirmationContext.Provider value={async () => true}>
              <FocusRuntimeProvider>
                <Probe />
              </FocusRuntimeProvider>
            </ConfirmationContext.Provider>
          </V4ServicesContext.Provider>
        </PwaProvider>,
      )
      cleanup.push(async () => {
        mounted.unmount()
        services.database.close()
        await Dexie.delete(name)
      })
      await waitFor(() => expect(runtime.status).toBe('ready'))
      if (operation !== 'start') {
        await act(async () => {
          await runtime.start(25)
        })
        await waitFor(() => expect(pwa.dirtyFormCount).toBe(0))
        expect(pwa.busyFormCount).toBe(0)
        now += 2_000
      }
      let release!: () => void
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      const method = services.focus[operation].bind(services.focus)
      // Delay the actual persistence boundary while leaving controller/provider/UI guard wiring intact.
      const spy = vi
        .spyOn(services.focus, operation)
        .mockImplementation(async (...args: unknown[]) => {
          await pending
          if (outcome === 'failure')
            throw new DOMException('Synthetic provider write fault', 'QuotaExceededError')
          return (method as (...values: unknown[]) => ReturnType<typeof method>)(...args)
        })
      const update = vi.fn(async () => {})
      setPwaUpdateHandler(update)
      let task!: Promise<void>
      await act(async () => {
        task =
          operation === 'start'
            ? runtime.start(25)
            : operation === 'pause'
              ? runtime.pause()
              : runtime.finish()
      })
      await waitFor(() => expect(spy).toHaveBeenCalledOnce())
      await waitFor(() => expect(pwa.busyFormCount).toBeGreaterThan(0))
      expect(pwa.dirtyFormCount).toBeGreaterThan(0)
      await act(async () => {
        await pwa.applyUpdate()
      })
      expect(update).not.toHaveBeenCalled()
      await act(async () => {
        release()
        await task
      })
      await waitFor(() => expect(pwa.busyFormCount).toBe(0))
      await waitFor(() => expect(pwa.dirtyFormCount).toBe(0))
      if (outcome === 'failure') expect(runtime.error).toBeTruthy()
      console.info('v4.qa.provider.verified', { operation, outcome, updateBlocked: true })
    })
  }
}
