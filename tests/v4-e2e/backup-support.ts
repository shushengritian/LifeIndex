import { expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export function backupInput(page: Page) {
  return page.getByLabel('选择 JSON 备份', { exact: true })
}

export async function exportSyntheticBackup(page: Page) {
  await page.goto('/#/settings/backup')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()
  const buffer = await readFile(path!)
  const data = JSON.parse(buffer.toString())
  expect(data).toMatchObject({ format: 'lifeindex-v4-backup', formatVersion: 1, schemaVersion: 1 })
  expect(data.data).not.toHaveProperty('meta')
  // The download event can precede the lastExportedAt transaction; wait for the real workflow to settle.
  await expect(page.getByRole('button', { name: '导出备份', exact: true })).toBeEnabled()
  console.info('v4.qa.backup.downloaded', { operation: 'export' })
  return { name: 'synthetic-v4-backup.json', mimeType: 'application/json', buffer }
}

export async function expectPreview(page: Page) {
  await expect(page.getByRole('heading', { name: '确认备份内容', exact: true })).toBeVisible()
  // Clearing the native picker value permits selecting the same file again after cancel/error.
  await expect(backupInput(page)).toHaveValue('')
  await expect(
    page.getByRole('table', { name: '恢复将替换以下新版数据', exact: true }),
  ).toBeVisible()
}

export async function confirmRestore(page: Page) {
  await expectPreview(page)
  await page.getByRole('button', { name: '继续，确认替换', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '替换当前新版数据？', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '确认替换', exact: true }).click()
}
