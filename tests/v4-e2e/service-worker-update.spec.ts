import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { enterV4, openEntry, readDatabase } from './support'

for (const fault of ['none', 'activation-timeout'] as const) {
  test(`real A/B service-worker update protects a dirty editor and preserves data (${fault})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000)
    const scratch = await mkdtemp(join(tmpdir(), 'lifeindex-v4-qa-update-'))
    let active = 'A'
    const uncaught: string[] = []
    page.on('pageerror', (error) => uncaught.push(error.name))
    // Two real Vite builds differ in an embedded public identity, producing different shell and SW hashes.
    for (const build of ['A', 'B']) {
      console.info('v4.qa.update.build', { build })
      execFileSync(
        process.execPath,
        ['node_modules/vite/bin/vite.js', 'build', '--outDir', join(scratch, build)],
        {
          env: {
            ...process.env,
            LIFEINDEX_BASE_PATH: '/',
            LIFEINDEX_BUILD_ID: `qa-update-${build}`,
          },
          stdio: 'pipe',
        },
      )
    }
    const provenance = await Promise.all(
      ['A', 'B'].map(async (build) => ({
        build,
        indexSha256: createHash('sha256')
          .update(await readFile(join(scratch, build, 'index.html')))
          .digest('hex'),
        workerSha256: createHash('sha256')
          .update(await readFile(join(scratch, build, 'sw.js')))
          .digest('hex'),
      })),
    )
    await testInfo.attach('real-build-provenance', {
      body: JSON.stringify(provenance),
      contentType: 'application/json',
    })
    const mime: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
      '.webmanifest': 'application/manifest+json',
    }
    const server = http.createServer(async (request, response) => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname
      const root = resolve(scratch, active)
      const file = resolve(root, `.${path === '/' ? '/index.html' : path}`)
      if (!file.startsWith(root + '/')) {
        response.writeHead(400)
        response.end()
        return
      }
      try {
        const body = await readFile(file)
        response.writeHead(200, {
          'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        })
        response.end(body)
      } catch {
        response.writeHead(404)
        response.end()
      }
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('QA update origin unavailable')
    try {
      await enterV4(page, '/today', `http://127.0.0.1:${address.port}`)
      await expect(page.locator('[data-app-build]')).toHaveAttribute(
        'data-app-build',
        'qa-update-A',
      )
      await expect
        .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
        .toBe(true)
      const { dialog, field } = await openEntry(page, 'expense')
      await field.fill('19.28')
      active = 'B'
      console.info('v4.qa.update.origin-switched', { from: 'A', to: 'B' })
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration!.update()
      })
      const update = page.getByRole('button', { name: '立即更新', exact: true })
      await expect(update).toBeVisible({ timeout: 20_000 })
      await expect(update).toBeDisabled()
      await expect(field).toHaveValue('19.28')
      await expect(page.locator('[data-app-build]')).toHaveAttribute(
        'data-app-build',
        'qa-update-A',
      )
      expect((await readDatabase(page)).transactions).toHaveLength(0)
      await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(update).toBeEnabled()
      const before = await readDatabase(page)
      if (fault === 'activation-timeout') {
        await page.clock.install()
        // Lose one transport message to the real waiting worker. The production 30-second timeout/retry logic remains intact.
        await page.evaluate(() => {
          const original = ServiceWorker.prototype.postMessage
          ServiceWorker.prototype.postMessage = function (message, transfer) {
            if (message?.type === 'SKIP_WAITING') {
              ServiceWorker.prototype.postMessage = original
              console.info('v4.qa.update.message-dropped', { operation: 'skip-waiting' })
              return
            }
            original.call(this, message, Array.isArray(transfer) ? { transfer } : transfer)
          }
        })
        await update.click()
        await expect(page.getByRole('button', { name: '正在更新…', exact: true })).toBeDisabled()
        await page.clock.fastForward(31_000)
        await expect(page.getByText('更新暂未完成，当前记录保持原样，请重试。')).toBeVisible()
        await expect(page.locator('[data-app-build]')).toHaveAttribute(
          'data-app-build',
          'qa-update-A',
        )
        expect((await readDatabase(page)).transactions).toEqual(before.transactions)
        await page.getByRole('button', { name: '重试更新', exact: true }).click()
      } else await update.click()
      await expect(page.locator('[data-app-build]')).toHaveAttribute(
        'data-app-build',
        'qa-update-B',
        { timeout: 20_000 },
      )
      expect((await readDatabase(page)).transactions).toEqual(before.transactions)
      expect(before.transactions[0].amountMinor).toBe(1928)
      expect(uncaught).toEqual([])
      console.info('v4.qa.update.verified', {
        draftProtected: true,
        buildReplaced: true,
        dataPreserved: true,
      })
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(scratch, { recursive: true, force: true })
    }
  })
}
