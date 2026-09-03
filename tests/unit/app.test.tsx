import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'

describe('application shell', () => {
  beforeEach(() => {
    window.location.hash = ''
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('opens Today and exposes all primary destinations', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: '让今天保持清晰' })).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: '主要导航' })
    for (const label of ['今天', '记账', '专注', '习惯', '设置']) {
      expect(navigation).toHaveTextContent(label)
    }
  })

  it('navigates to Finance without a page reload', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('link', { name: /记账/ }))

    expect(await screen.findByRole('heading', { name: '记账' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/finance')
  })
})
