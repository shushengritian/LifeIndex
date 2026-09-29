import { expect, test } from '@playwright/test'
import { assertTouchTarget, enterV4, localDay, readDatabase, seedHabits } from './support'

test('T5: whole-row completion is reversible and details never write', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const scope = window as typeof window & { __qaHabitFocus: object[] }
    scope.__qaHabitFocus = []
    const original = HTMLElement.prototype.focus
    // Observe actual focus attempts without supplying focus or changing timing/state to make a test pass.
    HTMLElement.prototype.focus = function (options?: FocusOptions) {
      const observed = this.dataset.focusKey?.startsWith('habit-action-')
      if (observed)
        scope.__qaHabitFocus.push({
          event: 'focus-call',
          disabled: this.matches(':disabled'),
          connected: this.isConnected,
          at: performance.now(),
        })
      original.call(this, options)
      if (observed)
        scope.__qaHabitFocus.push({
          event: 'focus-result',
          focused: document.activeElement === this,
          at: performance.now(),
        })
    }
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target
        if (target instanceof HTMLElement && target.dataset.focusKey?.startsWith('habit-action-')) {
          scope.__qaHabitFocus.push({
            event: 'disabled-mutation',
            disabled: target.matches(':disabled'),
            connected: target.isConnected,
            at: performance.now(),
          })
        }
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['disabled'] })
  })
  try {
    await enterV4(page)
    await seedHabits(page, 6)
    const before = await readDatabase(page)
    const details = page
      .getByRole('link', { name: '查看合成习惯1详情', exact: true })
      .or(page.getByRole('button', { name: '查看合成习惯1详情', exact: true }))
    await details.click()
    await expect(page).toHaveURL(/\/health\/habits\//)
    expect(await readDatabase(page)).toEqual(before)
    await page.goBack()
    const complete = page.getByRole('button', { name: '完成合成习惯1', exact: true })
    await complete.press('Enter')
    const undo = page.getByRole('button', { name: '撤销完成合成习惯1', exact: true })
    await expect(undo).toHaveAttribute('aria-pressed', 'true')
    await expect(undo).toBeFocused()
    await expect.poll(async () => (await readDatabase(page)).habitChecks.length).toBe(1)
    const checked = await readDatabase(page)
    expect(checked.habitChecks[0]).toMatchObject({
      habitId: before.habits[0].id,
      localDate: await localDay(page),
      timePrecision: 'instant',
    })
    expect(checked.habitChecks[0].completedAt).toEqual(expect.any(String))
    await page.reload()
    await undo.press('Space')
    await expect(complete).toBeFocused()
    await expect.poll(async () => (await readDatabase(page)).habitChecks.length).toBe(0)
    const after = await readDatabase(page)
    expect(after.habits).toHaveLength(6)
    expect(after.habits[0].scheduleEffectiveFrom).toBe(before.habits[0].scheduleEffectiveFrom)
  } finally {
    await testInfo.attach('habit-focus-timing', {
      body: JSON.stringify(
        await page.evaluate(
          () => (window as typeof window & { __qaHabitFocus?: object[] }).__qaHabitFocus,
        ),
      ),
      contentType: 'application/json',
    })
  }
})

test('a completion in another tab updates the real shared V4 store and can be undone', async ({
  page,
  context,
}) => {
  await enterV4(page)
  await seedHabits(page)
  const other = await context.newPage()
  await enterV4(other)
  await page.getByRole('button', { name: '完成合成习惯1', exact: true }).click()
  await expect(other.getByRole('button', { name: '撤销完成合成习惯1', exact: true })).toBeVisible()
  await other.getByRole('button', { name: '撤销完成合成习惯1', exact: true }).click()
  await expect(page.getByRole('button', { name: '完成合成习惯1', exact: true })).toBeVisible()
  expect((await readDatabase(page)).habitChecks).toHaveLength(0)
  await other.close()
  console.info('v4.qa.crossContext.verified', { operation: 'habit-check' })
})

test('a new habit is a real plan and pausing retains its completed fact', async ({ page }) => {
  await enterV4(page, '/health/habits')
  await page.getByRole('link', { name: '新建习惯', exact: true }).click()
  await page.getByLabel('习惯名称', { exact: true }).fill('合成新计划')
  await page.getByRole('button', { name: '保存习惯', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).habits.length).toBe(1)
  const habit = (await readDatabase(page)).habits[0]
  await page.goto('/#/today')
  await page.getByRole('button', { name: '完成合成新计划', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).habitChecks.length).toBe(1)
  await page.goto(`/#/health/habits/${String(habit.id)}`)
  await page.getByRole('button', { name: '暂停习惯', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).habits[0]?.status).toBe('paused')
  expect((await readDatabase(page)).habitChecks).toHaveLength(1)
})

test('T4: pause stops accumulation, collapse preserves the session and completion counts once', async ({
  page,
}) => {
  // Only this functional case controls wall time. Performance tests must use the real scheduler.
  await page.clock.install({ time: new Date() })
  await enterV4(page, '/focus')
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(2_000)
  await page.getByRole('button', { name: '暂停一下', exact: true }).click()
  await expect(page.getByRole('button', { name: '继续专注', exact: true })).toBeFocused()
  const paused = (await readDatabase(page)).focusSessions[0]
  expect(paused.status).toBe('paused')
  expect(Number(paused.accumulatedMs)).toBeGreaterThanOrEqual(2_000)
  await page.clock.fastForward(60_000)
  await page.getByRole('link', { name: /收起/ }).click()
  await page.getByRole('link', { name: /回到专注空间/ }).click()
  const returned = (await readDatabase(page)).focusSessions[0]
  expect(returned.id).toBe(paused.id)
  expect(returned.accumulatedMs).toBe(paused.accumulatedMs)
  await page.getByRole('button', { name: '继续专注', exact: true }).click()
  await expect(page.getByRole('button', { name: '暂停一下', exact: true })).toBeFocused()
  await page.clock.fastForward(1_000)
  await page.getByRole('button', { name: '结束', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: '结束并保存', exact: true })
    .click()
  await expect
    .poll(async () => (await readDatabase(page)).focusSessions[0]?.status)
    .toBe('completed')
  const completed = (await readDatabase(page)).focusSessions
  expect(completed).toHaveLength(1)
  expect(completed[0].id).toBe(paused.id)
  expect(Number(completed[0].durationMs)).toBeGreaterThanOrEqual(3_000)
  expect(Number(completed[0].durationMs)).toBeLessThan(10_000)
  await page.reload()
  expect((await readDatabase(page)).focusSessions).toHaveLength(1)
})

for (const width of [320, 390]) {
  test(`focus primary controls remain in the first viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 664 })
    await enterV4(page, '/focus')
    for (const name of ['开始专注', '暂停一下', '继续专注']) {
      const button = page.getByRole('button', { name, exact: true })
      await expect(button).toBeEnabled()
      // Capture before click: Playwright's automatic scrolling must not hide a first-screen failure.
      const rect = await button.boundingBox()
      expect(rect!.y).toBeGreaterThanOrEqual(0)
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
      await assertTouchTarget(button)
      await button.click()
    }
    console.info('v4.qa.focus.viewport', { width, states: 3 })
  })
}

test('natural focus expiry across midnight saves once and retains the start-day attribution', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-28T15:55:00.000Z') })
  await enterV4(page, '/focus')
  await page.getByRole('button', { name: '15 分钟', exact: true }).click()
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect.poll(async () => (await readDatabase(page)).focusSessions[0]?.status).toBe('running')
  await page.clock.fastForward(16 * 60_000)
  await expect
    .poll(async () => (await readDatabase(page)).focusSessions[0]?.status)
    .toBe('completed')
  const fact = (await readDatabase(page)).focusSessions[0]
  expect(fact).toMatchObject({
    localDate: '2026-09-28',
    durationMs: 900_000,
    completionKind: 'timer',
  })
  await page.reload()
  await page.clock.fastForward(60_000)
  expect((await readDatabase(page)).focusSessions).toEqual([fact])
  await page.goto(`/#/records/focus/${String(fact.id)}`)
  const detail = page.getByRole('dialog')
  await expect(detail).toContainText('2026-09-28')
  await expect(detail).toContainText('2026-09-29')
  console.info('v4.qa.focus.verified', { scenario: 'natural-cross-midnight-once' })
})
