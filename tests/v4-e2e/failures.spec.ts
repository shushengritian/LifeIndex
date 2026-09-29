import { expect, test, type Page } from '@playwright/test'
import { backupInput, confirmRestore, expectPreview, exportSyntheticBackup } from './backup-support'
import { enterV4, openEntry, readDatabase, saveEntry } from './support'

async function blockStoreWrite(
  page: Page,
  target: 'weightEntries' | 'focusSessions',
  status?: string,
) {
  await page.evaluate(
    ({ target, status }) => {
      const scope = window as typeof window & {
        __qaRestoreWrites?: () => void
        __qaEarlierAdds?: number
      }
      const add = IDBObjectStore.prototype.add,
        put = IDBObjectStore.prototype.put
      scope.__qaEarlierAdds = 0
      const reject = (store: IDBObjectStore, value: unknown) => {
        if (
          store.name === target &&
          (!status || (value as { status?: string }).status === status)
        ) {
          throw new DOMException('Synthetic storage capacity failure', 'QuotaExceededError')
        }
      }
      // Fail at the browser storage boundary; validation, service commands and all other writes stay real.
      IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
        if (this.name === 'categories') scope.__qaEarlierAdds!++
        reject(this, value)
        return key === undefined ? add.call(this, value) : add.call(this, value, key)
      }
      IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
        reject(this, value)
        return key === undefined ? put.call(this, value) : put.call(this, value, key)
      }
      scope.__qaRestoreWrites = () => {
        IDBObjectStore.prototype.add = add
        IDBObjectStore.prototype.put = put
      }
    },
    { target, status },
  )
  console.info('v4.qa.storageFault.installed', { entityType: target, phase: status ?? 'all' })
}

async function releaseWrites(page: Page) {
  await page.evaluate(() => {
    const scope = window as typeof window & { __qaRestoreWrites?: () => void }
    scope.__qaRestoreWrites?.()
    delete scope.__qaRestoreWrites
  })
}

test('a real storage failure retains a record draft and retry creates exactly one fact', async ({
  page,
}) => {
  await enterV4(page)
  const before = await readDatabase(page)
  const { dialog, field } = await openEntry(page, 'weight')
  await field.fill('65.432')
  await blockStoreWrite(page, 'weightEntries')
  try {
    await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(field).toHaveValue('65.432')
    await expect(field).toBeEditable()
    expect(await readDatabase(page)).toEqual(before)
  } finally {
    await releaseWrites(page)
  }
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).weightEntries.length).toBe(1)
  expect((await readDatabase(page)).weightEntries[0].weightGrams).toBe(65432)
})

test('restore aborts after earlier stores were replaced and rolls all nine tables back', async ({
  page,
}) => {
  await enterV4(page)
  await saveEntry(page, 'weight', '61.1')
  const backup = await exportSyntheticBackup(page)
  await page.goto('/#/today')
  await saveEntry(page, 'weight', '62.2')
  await page.goto('/#/settings/backup')
  await backupInput(page).setInputFiles(backup)
  await expectPreview(page)
  const before = await readDatabase(page)
  await blockStoreWrite(page, 'weightEntries')
  try {
    await confirmRestore(page)
    await expect(page.getByRole('alert')).toBeVisible()
    const earlier = await page.evaluate(
      () => (window as typeof window & { __qaEarlierAdds?: number }).__qaEarlierAdds,
    )
    expect(earlier, 'Rollback must follow actual writes to an earlier store').toBeGreaterThan(0)
    expect(await readDatabase(page)).toEqual(before)
  } finally {
    await releaseWrites(page)
  }
  // A failed transaction keeps the validated token available; it is not silently consumed or rebuilt.
  await confirmRestore(page)
  await expect.poll(async () => (await readDatabase(page)).weightEntries.length).toBe(1)
  await page.reload()
  const after = await readDatabase(page)
  expect(after.weightEntries[0].weightGrams).toBe(61100)
  expect(after.meta[0].generation).not.toBe(before.meta[0].generation)
})

test('restoring in another tab rejects the old editor generation without discarding its input', async ({
  page,
  context,
}) => {
  await enterV4(page)
  await saveEntry(page, 'expense', '5.67')
  const backup = await exportSyntheticBackup(page)
  const other = await context.newPage()
  await enterV4(other)
  const { dialog, field } = await openEntry(other, 'weight')
  await field.fill('66.789')
  await backupInput(page).setInputFiles(backup)
  const originalGeneration = (await readDatabase(page)).meta[0].generation
  await confirmRestore(page)
  await expect
    .poll(async () => (await readDatabase(page)).meta[0].generation)
    .not.toBe(originalGeneration)
  const restored = await readDatabase(page)
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(/恢复|重新打开/)
  await expect(field).toHaveValue('66.789')
  expect(await readDatabase(other)).toEqual(restored)
  await other.close()
})

test('focus completion failure retains a durable fixed endpoint across refresh', async ({
  page,
}) => {
  await page.clock.install({ time: new Date() })
  await enterV4(page, '/focus')
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  // Click dispatch can finish before the start transaction; advance time only after the durable segment exists.
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(3_000)
  await blockStoreWrite(page, 'focusSessions', 'completed')
  try {
    await page.getByRole('button', { name: '结束', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '结束并保存', exact: true }).click()
    await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible()
    const pending = (await readDatabase(page)).focusSessions[0]
    expect(pending.status).toBe('paused')
    expect(pending.pendingCompletion).toEqual(
      expect.objectContaining({ durationMs: expect.any(Number) }),
    )
    await page.clock.fastForward(60_000)
    expect((await readDatabase(page)).focusSessions[0]).toEqual(pending)
    // Refresh naturally removes the temporary fault patch and exercises the durable pending reconcile path.
    await page.reload()
    await expect
      .poll(async () => (await readDatabase(page)).focusSessions[0]?.status)
      .toBe('completed')
    const completed = (await readDatabase(page)).focusSessions
    expect(completed).toHaveLength(1)
    expect(completed[0].id).toBe(pending.id)
    expect(completed[0].durationMs).toBe(
      (pending.pendingCompletion as { durationMs: number }).durationMs,
    )
  } finally {
    await releaseWrites(page)
  }
})

test('finishing before one second is rejected without freezing a zero-length pending intent', async ({
  page,
}) => {
  await enterV4(page, '/focus')
  // Fix Date only, leaving native timers and modal focus delivery active; elapsed duration remains exactly zero.
  await page.clock.setFixedTime(new Date())
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await page.getByRole('button', { name: '结束', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '结束并保存', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  const session = (await readDatabase(page)).focusSessions[0]
  expect(session.status).toBe('running')
  expect(session).not.toHaveProperty('pendingCompletion')
  await expect(page.getByRole('button', { name: '重试保存', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '暂停一下', exact: true })).toBeEnabled()
})

test('a detected backwards clock cannot persist a shortened running segment', async ({ page }) => {
  await page.clock.install({ time: new Date() })
  await enterV4(page, '/focus')
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  // Click dispatch can finish before the start transaction; advance time only after the durable segment exists.
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(10_000)
  const before = await readDatabase(page)
  const trustedNow = await page.evaluate(() => Date.now())
  await page.clock.setSystemTime(new Date(trustedNow - 5_000))
  await page.clock.runFor(300)
  await expect(page.getByRole('alert')).toContainText(/时间.*变化|时钟/)
  const pause = page.getByRole('button', { name: '暂停一下', exact: true })
  // Either remove/disable the illegal action, or explicitly reject it; a successful state transition is forbidden.
  if ((await pause.isVisible()) && (await pause.isEnabled())) await pause.click()
  expect(await readDatabase(page)).toEqual(before)
  const retry = page.getByRole('button', { name: '重试专注状态', exact: true })
  await expect(retry).toBeVisible()
  await page.clock.setSystemTime(new Date((await page.evaluate(() => Date.now())) + 5_000))
  await retry.click()
  await pause.click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('paused')
})
