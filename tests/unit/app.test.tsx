import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import packageMetadata from '../../package.json'

describe('application shell', () => {
  it('uses the current package version in the test runtime', () => {
    expect(__APP_VERSION__).toBe(packageMetadata.version)
  })
  beforeEach(() => {
    window.location.hash = ''
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('opens Today and exposes all primary destinations', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '今天' }, { timeout: 3_000 }),
    ).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: '主要导航' })
    // Order is part of the accepted design; checking presence alone misses regressions.
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['今天', '健康', '专注', '记账', '设置'])
  })

  it('navigates to Finance without a page reload', async () => {
    const user = userEvent.setup()
    // StrictMode recreates effects; the active router must retain its history listener.
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    await user.click(await screen.findByRole('link', { name: /记账/ }))

    expect(
      await screen.findByRole('heading', { name: '记账' }, { timeout: 3_000 }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#/finance')
    expect(screen.getByRole('link', { name: '记账' })).toHaveAttribute('aria-current', 'page')
    // Navigation logging is an effect and may commit after the destination heading is visible.
    await waitFor(() =>
      expect(console.info).toHaveBeenCalledWith(
        '[LifeIndex] ui.navigation.entered',
        expect.objectContaining({ toState: '记账' }),
      ),
    )
  })

  it('redirects the shipped Habits bookmark to Health', async () => {
    window.location.hash = '#/habits'
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '健康' }, { timeout: 3_000 }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#/health')
  })

  it('opens the guarded finance editor directly from Today without creating a record', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('link', { name: '记一笔' }))
    const sheet = await screen.findByRole('dialog', { name: '记一笔' })
    expect(window.location.hash).toBe('#/finance/new')
    expect(within(sheet).getByLabelText('金额（CNY）')).toHaveValue('')
    await user.click(within(sheet).getByRole('button', { name: '关闭编辑器' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '记账' }))
    expect(window.location.hash).toBe('#/finance')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
