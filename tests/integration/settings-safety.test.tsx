import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { AppServicesContext } from '@/app/AppServicesContext'
import { BackupService } from '@/data/backup/BackupService'
import * as browserBackup from '@/data/backup/browserBackup'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import { SettingsPage, SettingsDetailPage } from '@/features/settings/SettingsPage'
import { PwaProvider } from '@/pwa/PwaProvider'

const databases: LifeIndexDatabase[] = []
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
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
  delete document.documentElement.dataset.theme
})

async function setup() {
  const database = new LifeIndexDatabase(`SettingsSafety-${crypto.randomUUID()}`)
  databases.push(database)
  await database.initialize()
  const snapshot = await new BackupService(database, 'test').createSnapshot()
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <AppServicesContext.Provider value={{ database }}>
        <PwaProvider>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:section" element={<SettingsDetailPage />} />
          </Routes>
        </PwaProvider>
      </AppServicesContext.Provider>
    </MemoryRouter>,
  )
  await screen.findByRole('link', { name: '主题外观' })
  const user = userEvent.setup()
  async function inspect() {
    await user.click(screen.getByRole('link', { name: '从备份恢复' }))
    const file = new File([JSON.stringify(snapshot)], 'synthetic.json', {
      type: 'application/json',
    })
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(snapshot) })
    await user.upload(await screen.findByLabelText('选择备份文件'), file)
    await screen.findByRole('heading', { name: '恢复预览' })
  }
  return { database, user, inspect, counts: snapshot.counts }
}

it('keeps a validated preview on cancel and restore failure, then allows retry', async () => {
  const { user, inspect } = await setup()
  await inspect()
  const restore = vi
    .spyOn(BackupService.prototype, 'restore')
    .mockRejectedValueOnce(new Error('SyntheticWriteFailure'))
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  await user.click(screen.getByRole('button', { name: '返回预览' }))
  expect(restore).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: '恢复预览' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  await user.click(screen.getByRole('button', { name: '替换并恢复' }))
  const dialog = screen.getByRole('dialog', { name: '替换全部本地数据？' })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('原有数据已保留')
  await user.click(within(dialog).getByRole('button', { name: '替换并恢复' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(restore).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('status')).toHaveTextContent('恢复完成')
})

it('locks duplicate restores, preview cancellation and appearance changes while committing', async () => {
  const { user, inspect, counts } = await setup()
  await inspect()
  let release!: () => void
  const restore = vi.spyOn(BackupService.prototype, 'restore').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ counts })
      }),
  )
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  const confirm = screen.getByRole('button', { name: '替换并恢复' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  expect(restore).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '取消恢复' })).toBeDisabled()
  expect(screen.getByLabelText('选择备份文件')).toBeDisabled()
  const dialog = screen.getByRole('dialog')
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(dialog).toBeInTheDocument()
  await act(async () => release())
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('does not claim rollback when appearance lookup fails after the restore commit', async () => {
  const { database, user, inspect, counts } = await setup()
  await inspect()
  vi.spyOn(BackupService.prototype, 'restore').mockImplementationOnce(async () => {
    // Isolate the post-commit UI failure; transaction rollback is covered by BackupService tests.
    vi.spyOn(database.settings, 'get').mockRejectedValueOnce(new Error('SyntheticReadFailure'))
    return { counts }
  })
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  await user.click(screen.getByRole('button', { name: '替换并恢复' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('数据已恢复，但外观暂未同步')
  expect(screen.queryByRole('heading', { name: '恢复预览' })).not.toBeInTheDocument()
})

it('rolls back a failed theme change and releases the operation lock for retry', async () => {
  const { user, database } = await setup()
  await user.click(screen.getByRole('link', { name: '主题外观' }))
  await screen.findByRole('button', { name: '深色' })
  vi.spyOn(SettingsRepository.prototype, 'put').mockRejectedValueOnce(
    new Error('SyntheticPreferenceFailure'),
  )
  await user.click(screen.getByRole('button', { name: '深色' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('已恢复之前的选择')
  expect(document.documentElement.dataset.theme).toBeUndefined()
  await user.click(screen.getByRole('button', { name: '深色' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '深色' })).toHaveAttribute('aria-pressed', 'true'),
  )
  expect((await database.settings.get('appearance'))?.value).toBe('dark')
})

it('distinguishes successful export handoff from failure to record its timestamp', async () => {
  const { user } = await setup()
  await user.click(screen.getByRole('link', { name: '导出备份' }))
  await screen.findByRole('button', { name: '导出完整备份' })
  vi.spyOn(browserBackup, 'exportBackupToDevice').mockResolvedValueOnce(new Date().toISOString())
  vi.spyOn(SettingsRepository.prototype, 'put').mockRejectedValueOnce(
    new Error('SyntheticTimestampFailure'),
  )
  await user.click(screen.getByRole('button', { name: '导出完整备份' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('备份已交给系统，但导出时间未能记录')
  expect(screen.getByRole('status')).toHaveTextContent('请确认')
  expect(screen.getByRole('button', { name: '导出完整备份' })).toBeEnabled()
})

it('opens independent settings details and returns to the four-group home', async () => {
  const { user } = await setup()
  expect(screen.queryByRole('button', { name: '深色' })).not.toBeInTheDocument()
  for (const title of ['主题外观', '导出备份', '从备份恢复', '关于 LifeIndex']) {
    await user.click(await screen.findByRole('link', { name: title }))
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '分类' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '返回设置' }))
    await screen.findByRole('heading', { name: '分类' })
  }
  expect(screen.getByRole('link', { name: '戒烟计划' })).toHaveAttribute(
    'href',
    '/health/cessation',
  )
})
