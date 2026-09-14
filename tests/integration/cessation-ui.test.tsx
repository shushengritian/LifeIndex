import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SmokingForm } from '@/features/health/cessation/CessationForms'
import { PwaProvider } from '@/pwa/PwaProvider'

it('retains a failed smoking draft and retries with the same operation ID', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  const onSave = vi
    .fn()
    .mockRejectedValueOnce(new Error('Injected failure'))
    .mockResolvedValue(undefined)
  render(
    <PwaProvider>
      <SmokingForm onSave={onSave} onClose={onClose} />
    </PwaProvider>,
  )
  await user.clear(screen.getByLabelText('这次吸了几支'))
  await user.type(screen.getByLabelText('这次吸了几支'), '3')
  await user.click(screen.getByRole('button', { name: '保存记录' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留')
  expect(screen.getByLabelText('这次吸了几支')).toHaveValue(3)
  expect(onClose).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '保存记录' }))
  expect(onSave.mock.calls[0]![0]).toBe(onSave.mock.calls[1]![0])
  expect(onClose).toHaveBeenCalledOnce()
})

it('Escape asks before discarding a changed smoking draft', async () => {
  const user = userEvent.setup()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  const onClose = vi.fn()
  render(
    <PwaProvider>
      <SmokingForm onSave={vi.fn()} onClose={onClose} />
    </PwaProvider>,
  )
  await user.clear(screen.getByLabelText('这次吸了几支'))
  await user.type(screen.getByLabelText('这次吸了几支'), '2')
  await user.keyboard('{Escape}')
  expect(onClose).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledOnce()
  confirm.mockRestore()
})
