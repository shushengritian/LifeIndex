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
