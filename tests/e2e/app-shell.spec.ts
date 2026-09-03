import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('loads the LifeIndex shell and navigates between primary destinations', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()
  await page.getByRole('link', { name: /习惯/ }).click()
  await expect(page.getByRole('heading', { name: '习惯' })).toBeVisible()
  await expect(page).toHaveURL(/#\/habits$/)
})

test('has no automatically detectable accessibility violations on the shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('creates, persists, edits, and deletes a local transaction', async ({ page }) => {
  await page.goto('/#/finance')
  await expect(page.getByRole('heading', { name: '记账' })).toBeVisible()

  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('12.30')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥12.30')).toBeVisible()

  await page.reload()
  await expect(page.getByText('−¥12.30')).toBeVisible()
  await page.getByRole('button', { name: '编辑' }).click()
  await page.getByLabel('金额（CNY）').fill('20.00')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('−¥20.00')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除' }).click()
  await expect(page.getByText('这个时间范围还没有账目。新增一笔，就从这里开始。')).toBeVisible()
})

test('creates a habit and persists reversible daily check-in', async ({ page }) => {
  await page.goto('/#/habits')
  await expect(page.getByRole('heading', { name: '习惯' })).toBeVisible()

  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('习惯名称').fill('合成阅读习惯')
  await page.getByRole('button', { name: '保存' }).click()

  const checkIn = page.getByRole('button', { name: /合成阅读习惯.*点按完成/ })
  await expect(checkIn).toBeVisible()
  await checkIn.click()
  await expect(page.getByRole('button', { name: /合成阅读习惯.*已完成/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.reload()
  const completed = page.getByRole('button', { name: /合成阅读习惯.*已完成/ })
  await expect(completed).toBeVisible()
  await completed.click()
  await expect(page.getByRole('button', { name: /合成阅读习惯.*点按完成/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('restores an active focus timer after reload and saves one early finish', async ({ page }) => {
  await page.goto('/#/focus')
  await expect(page.getByRole('heading', { name: '专注' })).toBeVisible()

  await page.getByLabel('专注标题').fill('合成专注会话')
  await page.getByRole('combobox', { name: '分类（可选）' }).selectOption({ label: '工作' })
  await page.getByRole('button', { name: '开始专注' }).click()
  await expect(page.getByRole('heading', { name: '合成专注会话' })).toBeVisible()
  await expect(page.getByText(/^2[45]:[0-5][0-9]$/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: '合成专注会话' })).toBeVisible()
  await page.waitForTimeout(1_100)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '提前结束' }).click()

  const history = page.getByRole('region', { name: '最近记录' })
  await expect(history.getByText('合成专注会话')).toBeVisible()
  await expect(history.getByText(/提前结束/)).toBeVisible()
})

test('keeps Today calm while reflecting cross-feature local changes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '让今天保持清晰' })).toBeVisible()

  await page.getByRole('link', { name: '记一笔' }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('金额（CNY）').fill('8.80')
  await page.getByRole('combobox', { name: '分类' }).selectOption({ label: '餐饮' })
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await expect(
    page.getByRole('region', { name: '今日账目' }).getByText('¥8.80', { exact: true }),
  ).toBeVisible()

  await page.getByRole('link', { name: '管理习惯' }).click()
  await page.getByRole('button', { name: '新增' }).click()
  await page.getByLabel('习惯名称').fill('合成今日习惯')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await page.getByRole('button', { name: /合成今日习惯.*点按完成/ }).click()
  await expect(page.getByText('1/1')).toBeVisible()

  await page.getByRole('link', { name: '开始专注' }).click()
  await page.getByLabel('专注标题').fill('合成今日专注')
  await page.getByRole('button', { name: '开始专注' }).click()
  await page.getByRole('link', { name: /今天/ }).click()
  await expect(
    page.getByRole('region', { name: '今日专注' }).getByText('合成今日专注'),
  ).toBeVisible()
})
