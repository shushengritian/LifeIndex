import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { ReasonForm } from '@/features/health/cessation/CessationForms'
import { PwaProvider } from '@/pwa/PwaProvider'

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

it('keeps the cessation draft behind confirmation and does not propagate Escape to discard it', async () => {
  const close = vi.fn(),
    save = vi.fn()
  render(
    <PwaProvider>
      <ReasonForm initial="" onClose={close} onSave={save} />
    </PwaProvider>,
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('为什么想戒烟'), '合成原因')
  await user.click(screen.getByRole('button', { name: '取消' }))
  const dialog = screen.getByRole('dialog', { name: '放弃戒烟输入？' })
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).not.toHaveBeenCalled()
  // Native dialog cancellation is modeled explicitly; real top-layer dismissal is browser-owned.
  fireEvent(dialog, new Event('cancel', { cancelable: true, bubbles: false }))
  expect(screen.getByLabelText('为什么想戒烟')).toHaveValue('合成原因')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '取消' }))
  await user.click(screen.getByRole('button', { name: '放弃输入' }))
  expect(close).toHaveBeenCalledTimes(1)
  expect(save).not.toHaveBeenCalled()
})
