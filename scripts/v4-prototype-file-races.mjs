/* global window, document */
import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const browser = await chromium.launch()
const results = []
const empty = {
  format: 'lifeindex.prototype.r3',
  version: 1,
  records: [],
  habits: [],
  habitChecks: [],
  categories: [],
  targetGrams: null,
  focusSession: null,
}
const file = (name, value) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(value)),
})
try {
  for (const scenario of ['close-then-resolve', 'A-then-B', 'oversize-then-A']) {
    const context = await browser.newContext()
    // Control file IO latency at the browser boundary; never replace the product's validation or navigation logic.
    await context.addInitScript(() => {
      const read = File.prototype.text
      const pending = new Map()
      File.prototype.text = function () {
        const readInstance = read.bind(this)
        return new Promise((resolve, reject) =>
          pending.set(this.name, () => readInstance().then(resolve, reject)),
        )
      }
      window.releaseSyntheticRead = async (name) => {
        if (!pending.has(name)) throw new Error('Missing controlled file read')
        await pending.get(name)()
        await Promise.resolve()
      }
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4187/prototype-r4/?review=0')
    // Keep coordinate clicks stable while the local review font finishes its first layout swap.
    await page.evaluate(() => document.fonts.ready)
    await page.locator('[data-page=settings]:visible').first().click()
    await page.locator('[data-restore]').click()
    await page.locator('[data-backup-file]').setInputFiles(file('A.json', empty))
    if (scenario === 'close-then-resolve') {
      await page.getByRole('button', { name: '取消', exact: true }).click()
      await page.evaluate(() => window.releaseSyntheticRead('A.json'))
      assert.equal(await page.locator('dialog[open]').count(), 0)
    } else if (scenario === 'A-then-B') {
      const second = {
        ...empty,
        categories: [
          { id: 'b', name: '合成分类B', domain: 'expense', icon: 'cup', archived: false },
        ],
      }
      await page.locator('[data-backup-file]').setInputFiles(file('B.json', second))
      await page.evaluate(() => window.releaseSyntheticRead('B.json'))
      await page.getByRole('dialog', { name: '确认备份内容' }).waitFor()
      const previewBefore = await page.locator('#dialog-body').innerText()
      assert.match(previewBefore, /分类\s+1/)
      await page.evaluate(() => window.releaseSyntheticRead('A.json'))
      assert.equal(await page.locator('#dialog-body').innerText(), previewBefore)
    } else {
      await page.locator('[data-backup-file]').setInputFiles({
        name: 'large.json',
        mimeType: 'application/json',
        buffer: Buffer.alloc(2_000_001),
      })
      await page.getByText('文件超过原型 2 MB 验证上限。', { exact: true }).waitFor()
      await page.evaluate(() => window.releaseSyntheticRead('A.json'))
      assert.equal(await page.getByRole('dialog', { name: '从备份恢复' }).count(), 1)
      assert.equal(await page.getByRole('dialog', { name: '确认备份内容' }).count(), 0)
      assert.equal(await page.locator('#restore-error').isVisible(), true)
    }
    results.push({
      scenario,
      staleReadIgnored: true,
      scope: 'prototype DOM only; production atomic restore remains untested',
    })
    console.info('prototype.fileRace.verified', { scenario })
    await context.close()
  }
  await writeFile(
    'docs/design/v4/prototype-r4/screens/file-race-observations.json',
    JSON.stringify({ results }, null, 2) + '\n',
  )
} finally {
  await browser.close()
}
