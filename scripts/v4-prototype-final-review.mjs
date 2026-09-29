/* global document */
import { chromium, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// These cases close concrete prototype review findings through public controls, with synthetic files only.
const browser = await chromium.launch()
const output = 'docs/design/v4/prototype-r4/screens'
const results = []
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  const url = 'http://127.0.0.1:4187/prototype-r4/?controls=surface&theme=dark&review=0'
  await page.goto(url)
  await page.locator('[data-habit=h1]').press('Enter')
  const textInset = await page.locator('[data-habit=h1]').evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el.querySelector('strong'))
    return range.getBoundingClientRect().left - el.getBoundingClientRect().left
  })
  expect(textInset).toBeGreaterThanOrEqual(8)
  results.push({ case: 'inset-focus-keeps-text-clear', textInset })
  await page.screenshot({ path: `${output}/surface-focus-viewport.png` })
  const skip = await page.locator('.skip-main').evaluate((el) => el.getBoundingClientRect().bottom)
  if (skip > 0) throw new Error('Unfocused skip link must stay offscreen')
  await page.locator('[data-page=health]:visible').first().click()
  await page.locator('[data-habit-detail=h1]').click()
  await page.locator('[data-habit-pause=h1]').click()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.locator('[data-habit-detail=h2]').click()
  await page.locator('[data-habit-edit=h2]').click()
  await page.locator('[name=weekdays][value="1"]').uncheck()
  await page.getByRole('button', { name: '保存习惯', exact: true }).click()
  await page.getByText('已暂停 · 可手动记录', { exact: true }).first().waitFor()
  await page
    .getByText(/今天非计划日/)
    .first()
    .waitFor()
  await page.screenshot({ path: `${output}/surface-health-schedules.png`, fullPage: true })
  results.push({ case: 'health-plan-status', pausedAndNonScheduledVisible: true })

  const base = {
    format: 'lifeindex.prototype.r3',
    version: 1,
    records: [],
    habits: [],
    habitChecks: [],
    categories: [],
    targetGrams: null,
    focusSession: null,
  }
  for (const scenario of ['invalid-instant-time', 'wrong-category-domain']) {
    const category = {
      id: 'synthetic-category',
      name: '合成分类',
      icon: 'leaf',
      archived: false,
      domain: scenario === 'invalid-instant-time' ? 'focus' : 'activity',
    }
    const record = {
      id: 'synthetic-record',
      title: '合成记录',
      note: '',
      date: '2026-09-28',
      createdAt: '2026-09-28T01:00:00.000Z',
      categoryId: category.id,
      ...(scenario === 'invalid-instant-time'
        ? { kind: 'focus', timePrecision: 'instant', time: '99:99', seconds: 60 }
        : { kind: 'finance', type: 'expense', timePrecision: 'day', minor: 100 }),
    }
    await page.locator('[data-page=settings]:visible').first().click()
    await page.locator('[data-restore]').click()
    await page.locator('[data-backup-file]').setInputFiles({
      name: `${scenario}.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...base, categories: [category], records: [record] })),
    })
    await expect(page.locator('#restore-error')).toHaveText(
      scenario === 'invalid-instant-time'
        ? '记录日期或内容无效。'
        : '记录引用的分类不存在或领域不匹配。',
    )
    await expect(page.getByRole('dialog', { name: '确认备份内容' })).toHaveCount(0)
    await page.getByRole('button', { name: '取消', exact: true }).click()
    results.push({ case: scenario, rejectedBeforePreview: true })
    console.info('prototype.validation.verified', { scenario })
  }
  // A successful save must release the update guard as well as close the editor.
  await page.goto(url.replace('review=0', 'review=1'))
  await page.locator('#shell-scenario').selectOption('update')
  await page.locator('[data-compose]:visible').first().click()
  await page.getByRole('button', { name: '记体重', exact: true }).click()
  await page.locator('#record-amount').fill('65')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.locator('#studio-dialog')).not.toBeVisible()
  await expect(page.locator('[data-shell-update]')).toBeEnabled()
  results.push({ case: 'save-releases-update-guard', pass: true })
  await page.locator('#scenario').selectOption('save-failed')
  await page.locator('[data-compose]:visible').first().click()
  await page.getByRole('button', { name: '记体重', exact: true }).click()
  await page.locator('#record-amount').fill('66')
  await page.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(page.locator('#entry-error')).toContainText('保存失败')
  await expect(page.locator('#record-amount')).toHaveValue('66')
  await expect(page.locator('#record-amount')).toBeEnabled()
  await page.getByRole('button', { name: '重试保存', exact: true }).click()
  await expect(page.locator('#studio-dialog')).not.toBeVisible()
  await expect(page.locator('[data-shell-update]')).toBeEnabled()
  results.push({ case: 'save-failure-retains-input-and-retries', pass: true })
  console.info('prototype.finalReview.verified', { cases: results.length })
  await writeFile(
    `${output}/final-review-observations.json`,
    JSON.stringify(
      { scope: 'author prototype checks; production acceptance pending', results },
      null,
      2,
    ) + '\n',
  )
} finally {
  await browser.close()
}
