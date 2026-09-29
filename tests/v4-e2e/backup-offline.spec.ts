import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { enterV4, readDatabase, saveEntry } from './support'
import { backupInput, exportSyntheticBackup, confirmRestore, expectPreview } from './backup-support'
import { createUnavailableOrigin } from './unavailable-origin'

test('backup parsing and preview are non-destructive; confirmation restores a new generation', async ({
  page,
}) => {
  await enterV4(page)
  await saveEntry(page, 'expense', '3.21')
  const backup = await exportSyntheticBackup(page)
  await page.goto('/#/today')
  await saveEntry(page, 'weight', '61.234')
  await page.goto('/#/settings/backup')
  const before = await readDatabase(page)
  const fileInput = backupInput(page)
  await fileInput.setInputFiles({
    name: 'synthetic-invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"unrecognized"}'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await readDatabase(page)).toEqual(before)
  await fileInput.setInputFiles(backup)
  await expectPreview(page)
  expect(await readDatabase(page)).toEqual(before)
  await page.getByRole('button', { name: '取消恢复', exact: true }).click()
  expect(await readDatabase(page)).toEqual(before)
  await fileInput.setInputFiles(backup)
  await confirmRestore(page)
  await expect.poll(async () => (await readDatabase(page)).weightEntries.length).toBe(0)
  const after = await readDatabase(page)
  expect(after.transactions).toHaveLength(1)
  expect(after.transactions[0].amountMinor).toBe(321)
  expect(after.meta[0].generation).not.toBe(before.meta[0].generation)
})

test('another context writing after preview invalidates restore without deleting its new fact', async ({
  page,
  context,
}) => {
  await enterV4(page)
  await saveEntry(page, 'expense', '4.56')
  const backup = await exportSyntheticBackup(page)
  await backupInput(page).setInputFiles(backup)
  await expectPreview(page)
  const other = await context.newPage()
  await enterV4(other)
  await saveEntry(other, 'weight', '62.345')
  const current = await readDatabase(other)
  await confirmRestore(page)
  await expect(page.getByRole('alert')).toContainText(/变化|重新/)
  expect(await readDatabase(page)).toEqual(current)
  await other.close()
  console.info('v4.qa.restore.conflict', { reason: 'concurrent-write' })
})

test('offline reload reaches unseen lazy routes and commits local records', async ({
  page,
  context,
  browserName,
  baseURL,
}, testInfo) => {
  // A minimal app reproduced WebKit's setOffline/reload internal error. TCP refusal tests the same cached navigation capability.
  const proxy = browserName === 'webkit' ? await createUnavailableOrigin(baseURL!) : null
  const origin = proxy?.origin ?? baseURL!
  try {
    await enterV4(page, '/today', origin)
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
        timeout: 20_000,
      })
      .toBe(true)
    if (proxy) proxy.disconnect()
    else await context.setOffline(true)
    const networkUnavailable = await page.evaluate(() =>
      fetch('/__qa_uncached_network_probe__', { cache: 'no-store' }).then(
        () => false,
        () => true,
      ),
    )
    expect(networkUnavailable).toBe(true)
    // These feature chunks have not been visited before going offline; the production precache must contain them.
    await page.reload()
    await expect(page.locator('[data-lifeindex-version="4"]')).toBeVisible()
    await saveEntry(page, 'activity', '18')
    await page.goto(`${origin}/#/health`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto(`${origin}/#/finance/report`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.reload()
    expect((await readDatabase(page)).activitySessions).toHaveLength(1)
    if (proxy) expect(proxy.refused).toBeGreaterThan(0)
    await testInfo.attach('offline-transport', {
      body: JSON.stringify({
        browserName,
        method: proxy
          ? 'TCP socket refusal; navigator.onLine unchanged'
          : 'browser offline emulation',
        networkUnavailable,
        refusedRequests: proxy?.refused ?? null,
        reloadVerified: true,
      }),
      contentType: 'application/json',
    })
  } finally {
    await context.setOffline(false)
    await proxy?.close()
  }
})

test('the new application leaves an unrelated synthetic legacy database untouched', async ({
  page,
}) => {
  // The blank same-origin response seeds only a sentinel database before any application code runs.
  await page.route('**/__v4_qa_blank__', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>QA fixture</title>',
    }),
  )
  await page.goto('/__v4_qa_blank__')
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexDB', 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('sentinel', { keyPath: 'id' })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const tx = database.transaction('sentinel', 'readwrite')
        tx.objectStore('sentinel').put({ id: 'synthetic-sentinel', value: 'UNCHANGED_V4_BOUNDARY' })
        tx.oncomplete = () => {
          database.close()
          resolve()
        }
        tx.onabort = () => {
          database.close()
          reject(tx.error)
        }
      }
    })
  })
  await enterV4(page)
  await saveEntry(page, 'weight', '64')
  const sentinel = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LifeIndexDB')
      request.onupgradeneeded = () => request.transaction?.abort()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
    try {
      return await new Promise((resolve, reject) => {
        const request = database
          .transaction('sentinel')
          .objectStore('sentinel')
          .get('synthetic-sentinel')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally {
      database.close()
    }
  })
  expect(sentinel).toEqual({ id: 'synthetic-sentinel', value: 'UNCHANGED_V4_BOUNDARY' })
})
