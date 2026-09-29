import { expect, test } from '@playwright/test'
import { enterV4, localDay, readDatabase, saveEntry } from './support'

test('T6: the month report uses one month and returns to its browsing context', async ({
  page,
}) => {
  await enterV4(page)
  const today = await localDay(page)
  const previousMonth = await page.evaluate(() => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  })
  await saveEntry(page, 'expense', '123.45')
  await saveEntry(page, 'expense', '7.89', { day: previousMonth })
  const origin = `/#/finance?month=${today.slice(0, 7)}&day=${today}&view=calendar`
  await page.goto(origin)
  await page
    .getByRole('button', { name: /月报表|本月报表|查看月报/ })
    .or(page.getByRole('link', { name: /月报表|本月报表|查看月报/ }))
    .click()
  await expect(page).toHaveURL(/\/finance\/report/)
  await expect(page.getByText(/123\.45/).first()).toBeVisible()
  await expect(page.getByText(/7\.89/)).toHaveCount(0)
  await page
    .getByRole('button', { name: /返回原页面/ })
    .or(page.getByRole('link', { name: /返回原页面/ }))
    .click()
  await expect(page).toHaveURL(
    new RegExp(`#\\/finance\\?month=${today.slice(0, 7)}&day=${today}&view=calendar$`),
  )
  expect((await readDatabase(page)).transactions).toHaveLength(2)
})

test('private record text stays out of console, requests and shell caches', async ({ page }) => {
  const marker = 'SYNTHETIC_V4_PRIVATE_NOTE_9F87CB'
  const requestContent: string[] = []
  const logReads: Promise<string>[] = []
  page.on('request', (request) =>
    requestContent.push(`${request.url()} ${request.postData() ?? ''}`),
  )
  page.on('console', (message) => {
    // Inspect serialized argument values too: console.text alone may hide properties behind JSHandle@object.
    logReads.push(
      Promise.all(
        message.args().map((argument) => argument.jsonValue().catch(() => undefined)),
      ).then((values) => JSON.stringify(values)),
    )
  })
  await enterV4(page)
  await saveEntry(page, 'expense', '42.17', { note: marker })
  expect((await readDatabase(page)).transactions[0].note).toBe(marker)
  const cacheBodies = await page.evaluate(async () => {
    const bodies: string[] = []
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        const response = await cache.match(request)
        const type = response?.headers.get('content-type') ?? ''
        if (response && /text|javascript|json/.test(type)) bodies.push(await response.text())
      }
    }
    return bodies
  })
  for (const value of [...requestContent, ...(await Promise.all(logReads)), ...cacheBodies])
    expect(value).not.toContain(marker)
  expect(requestContent.every((value) => value.startsWith('http://127.0.0.1:4173/'))).toBe(true)
  console.info('v4.qa.privacy.verified', { surfaces: 3 })
})
