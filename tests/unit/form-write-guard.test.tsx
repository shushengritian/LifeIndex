import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PlanForm } from '@/features/health/cessation/CessationForms'
import { PwaProvider } from '@/pwa/PwaProvider'
import { usePwa } from '@/pwa/PwaContext'
import { useDirtyForm } from '@/pwa/useDirtyForm'

function Counts() {
  const { dirtyFormCount, busyFormCount } = usePwa()
  return (
    <output aria-label="保护状态">
      {dirtyFormCount}:{busyFormCount}
    </output>
  )
}
function Draft({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  useDirtyForm(dirty, busy)
  return null
}
afterEach(() => vi.restoreAllMocks())

describe('form write protection', () => {
  it('keeps another form protected when a write fails or its owner unmounts', () => {
    function Harness({ busy, mounted = true }: { busy: boolean; mounted?: boolean }) {
      return (
        <PwaProvider>
          <Draft dirty busy={false} />
          {mounted && <Draft dirty busy={busy} />}
          <Counts />
        </PwaProvider>
      )
    }
    const view = render(<Harness busy />)
    expect(screen.getByLabelText('保护状态')).toHaveTextContent('2:1')
    // Failure releases only the write lock, retaining both unsaved drafts.
    view.rerender(<Harness busy={false} />)
    expect(screen.getByLabelText('保护状态')).toHaveTextContent('2:0')
    view.rerender(<Harness busy={false} mounted={false} />)
    expect(screen.getByLabelText('保护状态')).toHaveTextContent('1:0')
  })

  it('protects an unchanged cessation form during writing and releases after failure', async () => {
    let rejectWrite!: (error: Error) => void
    const save = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectWrite = reject
        }),
    )
    const close = vi.fn()
    render(
      <PwaProvider>
        <PlanForm onSave={save} onClose={close} />
        <Counts />
      </PwaProvider>,
    )
    expect(screen.getByLabelText('保护状态')).toHaveTextContent('0:0')
    await userEvent.click(screen.getByRole('button', { name: '开始计划' }))
    expect(screen.getByLabelText('保护状态')).toHaveTextContent('1:1')
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(close).not.toHaveBeenCalled()
    await act(async () => rejectWrite(new Error('Synthetic write failure')))
    expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留')
    await waitFor(() => expect(screen.getByLabelText('保护状态')).toHaveTextContent('0:0'))
    expect(screen.getByRole('button', { name: '开始计划' })).toBeEnabled()
    expect(save).toHaveBeenCalledTimes(1)
  })
})
