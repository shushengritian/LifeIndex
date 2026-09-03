import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PwaContext, usePwa, type PwaContextValue } from '@/pwa/PwaContext'
import { PwaProvider } from '@/pwa/PwaProvider'
import { PwaStatus } from '@/pwa/PwaStatus'
import { useDirtyForm } from '@/pwa/useDirtyForm'

const readyState: PwaContextValue['state'] = {
  online: true,
  offlineReady: true,
  updateReady: true,
  applyingUpdate: false,
  registrationFailed: false,
}

function DirtyDraft() {
  useDirtyForm(true)
  const { dirtyFormCount } = usePwa()
  return <output aria-label="未保存表单数量">{dirtyFormCount}</output>
}

describe('PWA update safety', () => {
  it('counts a mounted dirty form through the shared provider', async () => {
    render(
      <PwaProvider>
        <DirtyDraft />
      </PwaProvider>,
    )

    expect(await screen.findByLabelText('未保存表单数量')).toHaveTextContent('1')
  })

  it('blocks update activation while a form is dirty', () => {
    render(
      <PwaContext.Provider
        value={{
          state: readyState,
          dirtyFormCount: 1,
          setFormDirty: vi.fn(),
          applyUpdate: vi.fn(),
        }}
      >
        <PwaStatus />
      </PwaContext.Provider>,
    )

    expect(screen.getByText('检测到未保存输入。请先保存或取消表单，再更新。')).toBeVisible()
    expect(screen.getByRole('button', { name: '立即更新' })).toBeDisabled()
  })

  it('applies a waiting update only after an explicit click', async () => {
    const user = userEvent.setup()
    const applyUpdate = vi.fn().mockResolvedValue(undefined)
    render(
      <PwaContext.Provider
        value={{
          state: readyState,
          dirtyFormCount: 0,
          setFormDirty: vi.fn(),
          applyUpdate,
        }}
      >
        <PwaStatus />
      </PwaContext.Provider>,
    )

    expect(applyUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '立即更新' }))
    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('shows an explicit offline state without treating it as a data failure', () => {
    render(
      <PwaContext.Provider
        value={{
          state: { ...readyState, online: false, updateReady: false },
          dirtyFormCount: 0,
          setFormDirty: vi.fn(),
          applyUpdate: vi.fn(),
        }}
      >
        <PwaStatus />
      </PwaContext.Provider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('当前离线 · 本机数据仍可继续使用')
  })
})
