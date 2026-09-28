/* global document, innerWidth */
import { chromium, webkit } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Author verification of isolated design artifacts; this is not independent product acceptance.
const output = 'docs/design/v4/prototype-r4/screens'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const observations = []
try {
  for (const variant of ['surface', 'paper', 'slide']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.name))
    await page.goto(`http://127.0.0.1:4187/prototype-r4/?controls=${variant}&review=0`)
    await page.getByRole('button', { name: '完成晨间伸展', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/${variant}-390.png`, fullPage: true })
    const habit = page.locator('[data-habit=h1]')
    await habit.click()
    assert.equal(await habit.getAttribute('aria-pressed'), 'true')
    assert.equal(await habit.evaluate((element) => element === document.activeElement), true)
    // Keyboard activation must perform exactly one undo and retain the same semantic focus.
    await habit.press('Enter')
    assert.equal(await habit.getAttribute('aria-pressed'), 'false')
    assert.equal(await habit.evaluate((element) => element === document.activeElement), true)
    await page.locator('.habit-station [data-habit-detail=h1]').click()
    await page.getByRole('dialog', { name: '晨间伸展' }).waitFor()
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    assert.equal(await habit.getAttribute('aria-pressed'), 'false')
    await page.getByRole('button', { name: '留一笔，选择记录类型', exact: true }).click()
    await page.getByRole('button', { name: '记体重', exact: true }).click()
    assert.equal(
      await page
        .locator('#record-amount')
        .evaluate((element) => element === document.activeElement),
      true,
    )
    await page.locator('#record-amount').press('6')
    assert.equal(await page.locator('#record-amount').inputValue(), '6')
    await page.getByRole('button', { name: '取消', exact: true }).click()
    await page.getByRole('button', { name: '放弃修改', exact: true }).click()
    const dimensions = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      action: {
        width: document.querySelector('[data-habit=h1]').getBoundingClientRect().width,
        height: document.querySelector('[data-habit=h1]').getBoundingClientRect().height,
      },
    }))
    assert.equal(dimensions.overflow, false)
    assert.ok(dimensions.action.width >= 44 && dimensions.action.height >= 44)
    if (variant === 'slide') {
      const drag = async (dx, dy) => {
        const box = await habit.boundingBox()
        await page.mouse.move(box.x + 20, box.y + 30)
        await page.mouse.down()
        await page.mouse.move(box.x + 20 + dx, box.y + 30 + dy, { steps: 8 })
        await page.mouse.up()
      }
      await drag(70, 0)
      assert.equal(await habit.getAttribute('aria-pressed'), 'true')
      await habit.press('Enter')
      assert.equal(await habit.getAttribute('aria-pressed'), 'false')
      await drag(30, 0)
      assert.equal(await habit.getAttribute('aria-pressed'), 'false')
      await drag(0, 35)
      assert.equal(await habit.getAttribute('aria-pressed'), 'false')
    }
    assert.deepEqual(errors, [])
    observations.push({
      variant,
      completionUndoAndFocus: 'pass',
      detailsReadOnly: 'pass',
      twoTapEntry: 'pass',
      dimensions,
      gesture:
        variant === 'slide'
          ? 'mouse drag commit, below-threshold cancellation and vertical gesture pass; physical touch unverified'
          : 'not-applicable',
    })
    console.info('prototype.controls.verified', { variant, engine: 'chromium' })
    await context.close()
  }
  const page = await browser.newPage({ viewport: { width: 1360, height: 1240 } })
  await page.goto('http://127.0.0.1:4187/prototype-r4/compare.html')
  await page.frameLocator('iframe').first().locator('.control-row').first().waitFor()
  await page.screenshot({ path: `${output}/comparison-board.png`, fullPage: true })
  await writeFile(
    `${output}/author-observations.json`,
    JSON.stringify(
      { scope: 'R4 prototype author checks, not independent acceptance', observations },
      null,
      2,
    ) + '\n',
  )
  const layoutObservations = []
  for (const [engine, launcher] of [
    ['chromium', chromium],
    ['webkit', webkit],
  ]) {
    const engineBrowser = engine === 'chromium' ? browser : await launcher.launch()
    try {
      for (const width of [320, 390, 430, 768, 1440]) {
        for (const theme of ['light', 'dark']) {
          const context = await engineBrowser.newContext({
            viewport: { width, height: 844 },
            reducedMotion: 'reduce',
          })
          const page = await context.newPage()
          await page.goto(
            `http://127.0.0.1:4187/prototype-r4/?controls=surface&theme=${theme}&review=0`,
          )
          await page.locator('[data-habit=h1]').waitFor()
          const measure = () =>
            page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth > innerWidth,
              actions: [...document.querySelectorAll('.control-row button, [data-compose]')]
                .filter((el) => el.getClientRects().length)
                .map((el) => ({
                  width: el.getBoundingClientRect().width,
                  height: el.getBoundingClientRect().height,
                })),
            }))
          const initial = await measure()
          assert.equal(initial.overflow, false, `${engine}/${width}/${theme} overflow`)
          assert.ok(initial.actions.every((r) => r.width >= 44 && r.height >= 44))
          // Emulate text scaling as a layout stressor; this is not physical Safari text-size verification.
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%'
          })
          const enlarged = await measure()
          assert.equal(enlarged.overflow, false, `${engine}/${width}/${theme}/200% overflow`)
          const timerClipped = await page
            .locator('.tile-time')
            .evaluate((el) => el.scrollWidth > el.clientWidth)
          assert.equal(timerClipped, false, `${engine}/${width}/${theme}/200% timer clipped`)
          await page.getByRole('button', { name: '完成晨间伸展', exact: true }).press('Enter')
          assert.equal(await page.locator('[data-habit=h1]').getAttribute('aria-pressed'), 'true')
          assert.equal(
            await page.locator('[data-habit=h1]').evaluate((el) => el === document.activeElement),
            true,
          )
          const focusCovered = await page.locator('[data-habit=h1]').evaluate((el) => {
            const dock = document.querySelector('.mobile-dock')
            return (
              dock.getClientRects().length > 0 &&
              el.getBoundingClientRect().bottom > dock.getBoundingClientRect().top
            )
          })
          assert.equal(focusCovered, false, `${engine}/${width}/${theme}/200% focus covered`)
          layoutObservations.push({
            engine,
            width,
            theme,
            initial,
            enlarged,
            keyboardCompletion: 'pass',
          })
          if (engine === 'chromium' && width === 320 && theme === 'light')
            await page.screenshot({ path: `${output}/surface-320-text200.png`, fullPage: true })
          await page.evaluate(() => {
            document.documentElement.style.fontSize = ''
          })
          if (
            engine === 'chromium' &&
            ((width === 390 && theme === 'dark') || (width === 1440 && theme === 'light'))
          )
            await page.screenshot({
              path: `${output}/surface-${width}-${theme}.png`,
              fullPage: true,
            })
          await context.close()
        }
      }
    } finally {
      if (engine !== 'chromium') await engineBrowser.close()
    }
  }
  await writeFile(
    `${output}/layout-observations.json`,
    JSON.stringify(
      { scope: 'author layout stress checks, not physical device acceptance', layoutObservations },
      null,
      2,
    ) + '\n',
  )
  console.info('prototype.layout.verified', { contexts: layoutObservations.length, engines: 2 })
} catch (error) {
  console.error('prototype.controls.failed', { failureClass: error.name })
  throw error
} finally {
  await browser.close()
}
