import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
})
