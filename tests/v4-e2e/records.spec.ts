import { expect, test } from '@playwright/test'
import { composer, enterV4, localDay, openEntry, readDatabase, saveEntry } from './support'

test('T1–T3: two activations reach focused inputs and exact facts persist after reload', async ({
  page,
}) => {
  await enterV4(page)
  const day = await localDay(page)
  await saveEntry(page, 'expense', '12.34')
  await saveEntry(page, 'weight', '63.125')
  await saveEntry(page, 'activity', '27')
  await page.reload()
  const data = await readDatabase(page)
  expect(data.transactions).toHaveLength(1)
  expect(data.transactions[0]).toMatchObject({
    amountMinor: 1234,
    timePrecision: 'day',
    localDate: day,
  })
  expect(data.weightEntries).toHaveLength(1)
  expect(data.weightEntries[0]).toMatchObject({
    weightGrams: 63125,
    timePrecision: 'day',
    localDate: day,
  })
  expect(data.activitySessions).toHaveLength(1)
  expect(data.activitySessions[0]).toMatchObject({
    durationMinutes: 27,
    timePrecision: 'day',
    localDate: day,
  })
  for (const record of [...data.transactions, ...data.weightEntries, ...data.activitySessions]) {
    expect(record).not.toHaveProperty('occurredAt')
    expect(record).not.toHaveProperty('measuredAt')
  }
})

test('dirty cancel is reversible, preserves typed values and never writes', async ({ page }) => {
  await enterV4(page)
  const before = await readDatabase(page)
  const { dialog, field } = await openEntry(page, 'expense')
  await field.fill('21.45')
  await dialog.getByLabel(/备注/).fill('SYNTHETIC_DIRTY_DRAFT')
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  const confirmation = page.getByRole('dialog').last()
  await confirmation.getByRole('button', { name: '继续编辑', exact: true }).last().click()
  await expect(field).toHaveValue('21.45')
  await expect(dialog.getByLabel(/备注/)).toHaveValue('SYNTHETIC_DIRTY_DRAFT')
  expect(await readDatabase(page)).toEqual(before)
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: /放弃/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(composer(page)).toBeFocused()
  expect(await readDatabase(page)).toEqual(before)
})

test('transaction details are read-only; editing preserves identity and deletion requires confirmation', async ({
  page,
}) => {
  await enterV4(page)
  await saveEntry(page, 'expense', '11.11')
  const before = await readDatabase(page)
  const original = before.transactions[0]
  await page.goto(`/#/records/transaction/${String(original.id)}`)
  await expect(page.getByRole('button', { name: /编辑/ }).first()).toBeVisible()
  expect(await readDatabase(page)).toEqual(before)
  await page.getByRole('button', { name: /编辑/ }).first().click()
  await page.getByRole('dialog').last().getByLabel(/金额/).fill('22.22')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).transactions[0]?.amountMinor).toBe(2222)
  const edited = (await readDatabase(page)).transactions[0]
  expect(edited.id).toBe(original.id)
  expect(edited.createdAt).toBe(original.createdAt)
  await page.goto(`/#/records/transaction/${String(original.id)}`)
  await page.getByRole('button', { name: /删除/ }).first().click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: /取消|保留记录/ })
    .last()
    .click()
  expect((await readDatabase(page)).transactions).toHaveLength(1)
  await page.getByRole('button', { name: /删除/ }).first().click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: /确认删除/ })
    .click()
  await expect.poll(async () => (await readDatabase(page)).transactions.length).toBe(0)
})

test('global entry defaults to today after browsing another finance date', async ({ page }) => {
  await enterV4(page)
  const today = await localDay(page)
  const yesterday = await localDay(page, -1)
  const month = yesterday.slice(0, 7)
  await page.goto(`/#/finance?month=${month}&day=${yesterday}&view=calendar`)
  await page.getByRole('link', { name: '健康', exact: true }).first().click()
  const origin = page.url()
  const { dialog } = await openEntry(page, 'weight')
  await expect(dialog.getByLabel(/记录日期/)).toHaveValue(today)
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page).toHaveURL(origin)
  await expect(composer(page)).toBeFocused()
  expect((await readDatabase(page)).weightEntries).toHaveLength(0)
})

test('input bounds reject overprecision while retaining the draft', async ({ page }) => {
  await enterV4(page)
  const { dialog, field } = await openEntry(page, 'weight')
  await field.fill('63.1234')
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(field).toHaveValue('63.1234')
  expect((await readDatabase(page)).weightEntries).toHaveLength(0)
  await field.fill('1.000')
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).weightEntries[0]?.weightGrams).toBe(1000)
})

for (const scenario of [
  {
    kind: 'weight',
    store: 'weightEntries',
    initial: '62.5',
    revised: '63.75',
    field: /体重/,
    fact: 'weightGrams',
    expected: 63750,
  },
  {
    kind: 'activity',
    store: 'activitySessions',
    initial: '20',
    revised: '45',
    field: /时长|分钟/,
    fact: 'durationMinutes',
    expected: 45,
  },
] as const) {
  test(`${scenario.kind} detail, edit and confirmed deletion preserve the other domains`, async ({
    page,
  }) => {
    await enterV4(page)
    await saveEntry(page, 'expense', '7.89')
    await saveEntry(page, scenario.kind, scenario.initial)
    const before = await readDatabase(page)
    const original = before[scenario.store][0]
    const route = `/#/records/${scenario.kind}/${String(original.id)}`
    await page.goto(route)
    await expect(page.getByRole('button', { name: '编辑这条记录', exact: true })).toBeVisible()
    expect(await readDatabase(page)).toEqual(before)
    await page.getByRole('button', { name: '编辑这条记录', exact: true }).click()
    const editor = page.getByRole('dialog').last()
    await editor.getByLabel(scenario.field).first().fill(scenario.revised)
    await editor.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect
      .poll(async () => (await readDatabase(page))[scenario.store][0]?.[scenario.fact])
      .toBe(scenario.expected)
    const edited = (await readDatabase(page))[scenario.store][0]
    expect(edited).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      localDate: original.localDate,
    })
    await page.goto(route)
    await page.getByRole('button', { name: '删除', exact: true }).click()
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: '保留记录', exact: true })
      .last()
      .click()
    expect((await readDatabase(page))[scenario.store]).toHaveLength(1)
    await page.getByRole('button', { name: '删除', exact: true }).click()
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: '确认删除', exact: true })
      .click()
    await expect.poll(async () => (await readDatabase(page))[scenario.store].length).toBe(0)
    await page.reload()
    // Domain-specific deletion must not disturb the unrelated saved transaction.
    expect((await readDatabase(page)).transactions).toEqual(before.transactions)
  })
}

test('a different-day receipt opens the committed record then returns to the original filter', async ({
  page,
}) => {
  await enterV4(page)
  const yesterday = await localDay(page, -1)
  const earlier = await localDay(page, -2)
  const route = `/#/finance?month=${yesterday.slice(0, 7)}&day=${yesterday}&view=calendar`
  await page.goto(route)
  await saveEntry(page, 'expense', '17.29', { day: earlier })
  await expect(page).toHaveURL(new RegExp(`day=${yesterday}&view=calendar`))
  const fact = (await readDatabase(page)).transactions[0]
  expect(fact.localDate).toBe(earlier)
  await page.getByRole('button', { name: '查看记录', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/records/transaction/${String(fact.id)}`))
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(earlier)
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`day=${yesterday}&view=calendar`))
  // The receipt disappears after activation; return must fall back to a live semantic focus target.
  await expect(page.locator('#main-content')).toBeFocused()
  expect((await readDatabase(page)).transactions).toHaveLength(1)
  console.info('v4.qa.receipt.verified', { scenario: 'different-day-return' })
})
