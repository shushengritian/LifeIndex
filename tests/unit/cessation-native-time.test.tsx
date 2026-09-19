import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PlanForm, SmokingForm } from '@/features/health/cessation/CessationForms'
import { PwaProvider } from '@/pwa/PwaProvider'

afterEach(cleanup)
it.each(['plan', 'smoking'] as const)(
  'submits the visible native %s time and retains it after failure',
  async (kind) => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Synthetic failure'))
      .mockResolvedValue(undefined)
    const close = vi.fn()
    render(
      <PwaProvider>
        {kind === 'plan' ? (
          <PlanForm onSave={save} onClose={close} />
        ) : (
          <SmokingForm onSave={save} onClose={close} />
        )}
      </PwaProvider>,
    )
    const input = screen.getByLabelText(
      kind === 'plan' ? '开始日期与时间' : '日期与时间',
    ) as HTMLInputElement
    // Deliberately omit change/input to model a system picker committing immediately before submit.
    input.value = '2026-09-01T12:34'
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    await screen.findByRole('alert')
    expect(input.value).toBe('2026-09-01T12:34')
    expect(close).not.toHaveBeenCalled()
    fireEvent.submit(form)
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
    expect(save).toHaveBeenCalledTimes(2)
    for (const call of save.mock.calls) {
      expect(call[1]).toMatchObject({
        [kind === 'plan' ? 'startAt' : 'occurredAt']: new Date('2026-09-01T12:34').toISOString(),
      })
    }
  },
)
