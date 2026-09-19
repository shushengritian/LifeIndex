import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { NavigationGuard } from '@/app/NavigationGuard'
import { PwaProvider } from '@/pwa/PwaProvider'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { usePwa } from '@/pwa/PwaContext'
import { setPwaUpdateHandler } from '@/pwa/pwaStore'

beforeAll(() => {
  // Only model dialog lifecycle in jsdom; actual focus isolation is a browser check.
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
const routers: ReturnType<typeof createMemoryRouter>[] = []
afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
})

function Draft({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  useDirtyForm(dirty, busy)
  const { applyUpdate } = usePwa()
  return (
    <>
      <h1>编辑页</h1>
      <input aria-label="测试草稿" defaultValue="未保存" />
      <Link to="/other">切换模块</Link>
      <button onClick={() => void applyUpdate()}>直接请求更新</button>
    </>
  )
}
function setup(dirty = true, busy = false) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <NavigationGuard />
            <Outlet />
          </>
        ),
        children: [
          { path: '/draft', element: <Draft dirty={dirty} busy={busy} /> },
          { path: '/other', element: <h1>另一页</h1> },
        ],
      },
    ],
    { initialEntries: ['/other', '/draft'], initialIndex: 1 },
  )
  routers.push(router)
  render(
    <PwaProvider>
      <RouterProvider router={router} />
    </PwaProvider>,
  )
  return router
}

describe('navigation draft guard', () => {
  it('preserves a draft on stay and navigates only after explicit discard', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: '切换模块' }))
    await user.click(await screen.findByRole('button', { name: '留在当前页' }))
    expect(screen.getByLabelText('测试草稿')).toHaveValue('未保存')
    await user.click(screen.getByRole('link', { name: '切换模块' }))
    await user.click(await screen.findByRole('button', { name: '放弃并离开' }))
    expect(await screen.findByRole('heading', { name: '另一页' })).toBeInTheDocument()
  })
  it('blocks browser-history POP and keeps its pending destination', async () => {
    const router = setup()
    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/draft')
    await userEvent.click(screen.getByRole('button', { name: '放弃并离开' }))
    expect(await screen.findByRole('heading', { name: '另一页' })).toBeInTheDocument()
  })
  it('rejects navigation while writing without offering discard', async () => {
    const router = setup(false, true)
    await userEvent.click(screen.getByRole('link', { name: '切换模块' }))
    await waitFor(() =>
      expect(
        router.state.blockers.size === 0 ||
          [...router.state.blockers.values()].every((b) => b.state === 'unblocked'),
      ).toBe(true),
    )
    expect(router.state.location.pathname).toBe('/draft')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('allows clean navigation without prompting', async () => {
    setup(false)
    await userEvent.click(screen.getByRole('link', { name: '切换模块' }))
    expect(await screen.findByRole('heading', { name: '另一页' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('guards reload and command-level update, then releases on unmount', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    setPwaUpdateHandler(update)
    setup()
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: '直接请求更新' }))
    expect(update).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('link', { name: '切换模块' }))
    await userEvent.click(screen.getByRole('button', { name: '放弃并离开' }))
    await screen.findByRole('heading', { name: '另一页' })
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })
})
