/* global URL, structuredClone, setTimeout, clearTimeout, console */
// DOM-only checks for R2 and its bounded OPEN-01 closeout. Native dialog/layout and delays are stubbed, not browser evidence.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const root = new URL('./', import.meta.url)
const dom = new JSDOM(readFileSync(new URL('app.html', root), 'utf8'), {
  runScripts: 'outside-only',
  url: 'http://prototype.invalid/',
})
const w = dom.window,
  doc = w.document,
  logs = [],
  parent = { postMessage() {} }
let instant = Date.parse('2026-09-20T09:00:00+08:00')
Object.defineProperty(w, 'parent', { value: parent })
w.matchMedia = () => ({ matches: true, addEventListener() {} })
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
w.HTMLDialogElement.prototype.close = function () {
  this.open = false
}
w.structuredClone = structuredClone
w.Date.now = () => instant
w.setInterval = () => 1
w.setTimeout = (fn, delay) => setTimeout(fn, Math.min(delay, 5))
w.clearTimeout = clearTimeout
w.console.info = (...args) => logs.push(args)
w.eval(readFileSync(new URL('app.js', root), 'utf8'))
const query = (selector) => doc.querySelector(selector)
const text = () => query('#screen').textContent
const form = () => query('#editor-form')
const send = (action, value) =>
  w.dispatchEvent(
    new w.MessageEvent('message', {
      source: parent,
      data: { channel: 'lifeindex-review', action, value },
    }),
  )
const wait = () => new Promise((resolve) => setTimeout(resolve, 25))
function control(action, value, scope = doc) {
  return [...scope.querySelectorAll('[data-action]')].find(
    (el) =>
      el.dataset.action === action && (value === undefined || el.dataset.value === String(value)),
  )
}
function click(action, value, scope = doc) {
  const el = control(action, value, scope)
  assert.ok(el, `Control missing: ${action}`)
  el.focus({ preventScroll: true })
  el.click()
  return el
}
function input(el, value) {
  assert.ok(el)
  el.value = value
  el.dispatchEvent(new w.Event('input', { bubbles: true }))
}
function submit() {
  form().dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }))
}
function reset(view = 'today', sample = 'sample') {
  send('sample', sample)
  send('view', view)
}
function injectAction(action, value, date) {
  const el = doc.createElement('button')
  el.dataset.action = action
  el.dataset.value = value
  if (date) el.dataset.date = date
  doc.body.append(el)
  el.click()
  el.remove()
}
let passed = 0
const pass = (label) => {
  passed++
  console.log(`PASS ${label}`)
}

try {
  // R2-10: presentation selects a route with no h1 focus; interactive navigation does focus the destination.
  assert.equal(doc.activeElement, doc.body)
  for (const view of ['today', 'health', 'focus', 'finance', 'settings']) {
    send('view', view)
    assert.equal(doc.activeElement, doc.body)
    assert.equal(query('#nav').children.length, 5)
  }
  click('route', 'today', query('#nav'))
  assert.equal(doc.activeElement.tagName, 'H1')
  pass('10: initial view has no focus; explicit navigation does')

  // R2-01: protection, failure retention and sibling header/body/footer are checked without claiming geometry.
  reset('finance')
  click('new-transaction')
  input(form().elements.amount, '12.34')
  click('pick-category', 'food')
  click('pick-child', 'lunch')
  input(form().elements.date, '2026-09-19')
  click('close-editor')
  assert.ok(query('#confirmation').open)
  click('confirm-no')
  assert.equal(form().elements.amount.value, '12.34')
  send('failure')
  submit()
  assert.equal(form().querySelector('fieldset').disabled, true)
  submit()
  click('close-editor')
  assert.ok(query('#editor').open)
  await wait()
  assert.equal(query('#form-error').textContent, '这次保存没有成功，输入已保留。请直接重试。')
  assert.equal(doc.activeElement.id, 'form-error')
  assert.equal(query('.sheet-body').tagName, 'DIV')
  assert.deepEqual(
    [...form().children].map((el) => el.className),
    ['sheet-head', 'sheet-body', 'sheet-footer'],
  )
  for (const [name, value] of [
    ['amount', '12.34'],
    ['category', 'food'],
    ['child', 'lunch'],
    ['date', '2026-09-19'],
  ])
    assert.equal(form().elements[name].value, value)
  submit()
  await wait()
  assert.equal(query('#editor').open, false)
  assert.equal(doc.activeElement.dataset.action, 'new-transaction')
  pass('01: dirty protection, busy lock, failed draft retry and separate sheet tracks')

  // R2-06: save on another day/month stays at the browsed date until the user follows the result link.
  assert.equal(query('.calendar [aria-pressed="true"]').dataset.value, '2026-09-20')
  click('view-saved-transaction')
  assert.equal(query('.calendar [aria-pressed="true"]').dataset.value, '2026-09-19')
  assert.match(text(), /12\.34/)
  click('edit-transaction', 201)
  input(form().elements.date, '2026-08-31')
  submit()
  await wait()
  assert.equal(query('.calendar [aria-pressed="true"]').dataset.value, '2026-09-19')
  assert.match(query('.calendar-head h2').textContent, /9月/)
  click('view-saved-transaction')
  assert.equal(query('.calendar [aria-pressed="true"]').dataset.value, '2026-08-31')
  assert.match(text(), /12\.34/)
  click('route', 'today', query('#nav'))
  click('new-transaction', 'today')
  input(form().elements.amount, '3.21')
  click('pick-category', 'food')
  input(form().elements.date, '2026-08-30')
  submit()
  await wait()
  assert.equal(query('h1').textContent, '今天')
  assert.ok(control('view-saved-transaction'))
  pass('06: date/month preservation on new/edit and Today return')

  // R2-05: calendar labels, monthly order and the last seven local days share the fixture amounts.
  reset('finance')
  const date = control('date', '2026-09-20')
  assert.equal(date.querySelector('small').textContent, '−68')
  assert.match(date.getAttribute('aria-label'), /净额 -68\.00 元，支出 68\.00 元，收入 0\.00 元/)
  assert.deepEqual(
    [...query('.calendar-summary').querySelectorAll('small')].map((el) => el.textContent),
    ['本月结余', '支出', '收入'],
  )
  const line = query('.daily-expense polyline')
  assert.equal(line.getAttribute('points').split(' ').length, 7)
  assert.match(query('.daily-expense svg').getAttribute('aria-label'), /2026-09-20支出 68\.00 元/)
  click('date', '2026-09-01')
  assert.equal(query('.daily-expense polyline'), null)
  assert.equal(query('.daily-expense').querySelectorAll('circle').length, 1)
  pass('05: daily money, full labels, summary order and sample-driven daily curve')

  // R2-02/03: trim required titles, freeze the pending result, retain exact seconds across all three summaries.
  reset('focus')
  click('start-focus')
  assert.ok(query('#focus-title').hasAttribute('aria-invalid'))
  assert.equal(control('end-focus'), undefined)
  input(query('#focus-title'), '   ')
  click('start-focus')
  assert.equal(control('end-focus'), undefined)
  input(query('#focus-title'), '  阅读校验  ')
  click('start-focus')
  await wait()
  assert.equal(query('.focus-area h2').textContent, '阅读校验')
  instant += 33000
  click('route', 'health', query('#nav'))
  click('route', 'focus', query('#nav'))
  assert.equal(query('#focus-elapsed').textContent, '00:33')
  click('end-focus')
  send('failure')
  click('confirm-yes')
  await wait()
  assert.equal(query('#timer-value').textContent, '00:33')
  assert.match(query('.dial-content').textContent, /本次结果 · 待保存/)
  assert.ok(control('save-focus'))
  assert.deepEqual(
    [...query('[aria-label="专注汇总"]').querySelectorAll('strong')].map((el) => el.textContent),
    ['25 分钟', '1 小时 15 分钟'],
  )
  instant += 91000
  click('route', 'health', query('#nav'))
  click('route', 'focus', query('#nav'))
  assert.equal(query('#timer-value').textContent, '00:33')
  click('save-focus')
  click('save-focus')
  await wait()
  assert.deepEqual(
    [...query('[aria-label="专注汇总"]').querySelectorAll('strong')].map((el) => el.textContent),
    ['25 分钟 33 秒', '1 小时 15 分钟 33 秒'],
  )
  const recent = [...query('#screen').querySelectorAll('[data-action="edit-focus"]')].find((el) =>
    el.textContent.includes('阅读校验'),
  )
  assert.ok(recent)
  assert.match(recent.textContent, /33 秒/)
  const sessionId = recent.dataset.value
  recent.click()
  input(form().elements.title, '  ')
  submit()
  assert.equal(form().elements.title.getAttribute('aria-invalid'), 'true')
  input(form().elements.title, '  修订后的事项  ')
  submit()
  await wait()
  assert.match(control('edit-focus', sessionId).textContent, /修订后的事项/)
  click('edit-focus', sessionId)
  assert.equal(form().elements.title.value, '修订后的事项')
  click('close-editor')
  click('route', 'today', query('#nav'))
  assert.match(text(), /今日专注25 分钟 33 秒/)
  assert.match(text(), /本周专注 1 小时 15 分钟 33 秒/)
  click('route', 'focus', query('#nav'))
  click('route', 'focus/history')
  assert.match(query('[aria-label="专注汇总"]').textContent, /25 分钟 33 秒/)
  click('focus-range', 'week')
  assert.match(text(), /所选范围 · 3 次 · 1 小时 15 分钟 33 秒/)
  pass('02: start/history-edit required titles and normalization')
  pass('03: pending actual time, duplicate retry lock and exact Today/week/history totals')

  // R2-04: inspection never changes totals; a historical write request is rejected by the handler.
  reset('health')
  click('route', 'health/habits')
  click('route', 'health/habit/71')
  assert.match(query('[aria-label="习惯统计"]').textContent, /当前连续5 天最长连续5 天本月完成25%/)
  assert.equal(query('.heatmap').querySelectorAll('button').length, 98)
  const stats = query('[aria-label="习惯统计"]').textContent
  click('habit-date', '2026-09-14')
  assert.match(query('#habit-inspection').textContent, /2026-09-14 · 未完成/)
  assert.equal(query('[aria-label="习惯统计"]').textContent, stats)
  assert.equal(control('check-habit', 71).dataset.date, '2026-09-20')
  injectAction('check-habit', '71', '2026-09-14')
  await wait()
  assert.equal(query('[aria-label="习惯统计"]').textContent, stats)
  click('check-habit', 71)
  await wait()
  assert.match(query('[aria-label="习惯统计"]').textContent, /当前连续6 天最长连续6 天本月完成30%/)
  assert.match(query('#habit-inspection').textContent, /2026-09-14 · 未完成/)
  click('check-habit', 71)
  await wait()
  assert.equal(query('[aria-label="习惯统计"]').textContent, stats)
  pass('04: selectable read-only history, computed streaks and today-only write guard')

  // R2-07: the return target and recorded pane offset come from the entry path, not a hard-coded parent.
  reset('settings')
  query('#screen').scrollTop = 245
  click('route', 'health/cessation/manage')
  click('back')
  assert.equal(query('h1').textContent, '设置')
  assert.equal(query('#screen').scrollTop, 245)
  assert.equal(doc.activeElement.dataset.value, 'health/cessation/manage')
  click('route', 'health', query('#nav'))
  click('route', 'health/cessation')
  query('#screen').scrollTop = 111
  click('route', 'health/cessation/manage')
  click('back')
  assert.equal(query('h1').textContent, '戒烟')
  assert.equal(query('#screen').scrollTop, 111)
  click('route', 'today', query('#nav'))
  query('#screen').scrollTop = 170
  click('route', 'health/habit/71')
  click('back')
  assert.equal(query('h1').textContent, '今天')
  assert.equal(query('#screen').scrollTop, 170)
  click('route', 'health', query('#nav'))
  click('route', 'health/habits')
  click('route', 'health/habit/71')
  click('back')
  assert.equal(query('h1').textContent, '习惯')
  pass('07: Settings/cessation/Today/health return sources and stored pane offsets')

  // R2-08: equal record timestamps select the newest created id everywhere.
  reset('health')
  click('new-weight')
  input(form().elements.value, '68.1')
  submit()
  await wait()
  assert.match(query('.metric').textContent, /68\.1/)
  assert.match(query('.trend').getAttribute('aria-label'), /68\.4公斤、68\.1公斤$/)
  click('route', 'health/weight')
  assert.match(query('#screen .row').textContent, /68\.1 kg/)
  assert.match(query('#screen .row:nth-of-type(2)').textContent, /68\.4 kg/)
  pass('08: equal-timestamp weight summary, curve endpoint and history agree')

  // R2-09/11: finance alone has children; compact menu commands still change the corresponding records.
  reset('settings')
  click('route', 'settings/categories')
  for (const [group, id] of [
    ['focus', 'reading'],
    ['activity', 'walk'],
  ]) {
    click('category-group', group)
    click('route', 'settings/category/' + id)
    assert.equal(control('new-child'), undefined)
    injectAction('new-child', id)
    assert.equal(query('#editor').open, false)
    click('back')
  }
  click('category-group', 'expense')
  click('route', 'settings/category/food')
  click('new-child', 'food')
  input(form().elements.name, '审稿早餐')
  submit()
  await wait()
  assert.match(text(), /审稿早餐/)
  click('back')
  click('category-menu', 'transit')
  assert.equal(form().querySelectorAll('.menu-row').length, 3)
  assert.equal(form().querySelectorAll('.secondary.full').length, 0)
  click('edit-category', 'transit')
  assert.equal(form().elements.name.value, '交通')
  click('close-editor')
  click('category-menu', 'transit')
  click('move-category', 'transit')
  assert.equal(query('#screen .row-action .row').dataset.value, 'settings/category/transit')
  click('category-menu', 'transit')
  click('archive-category', 'transit')
  click('confirm-no')
  assert.ok(control('category-menu', 'transit'))
  click('archive-category', 'transit')
  click('confirm-yes')
  await wait()
  assert.equal(query('#editor').open, false)
  assert.equal(control('category-menu', 'transit'), undefined)
  pass('09: finance children retained; focus/activity child paths blocked')
  pass('11: compact icon/text menu supports edit, ordering and confirmed archive')

  // Adjacent state contracts: cancellation and natural completion, a seconds-only empty-state session, and safe restore retry.
  reset('focus', 'empty')
  input(query('#focus-title'), '短会话')
  click('start-focus')
  await wait()
  instant += 33000
  click('end-focus')
  click('confirm-yes')
  await wait()
  assert.match(query('[aria-label="专注汇总"]').textContent, /今日专注33 秒/)
  const before = query('[aria-label="专注汇总"]').textContent
  click('start-focus')
  await wait()
  instant += 5000
  click('cancel-focus')
  click('confirm-yes')
  await wait()
  assert.equal(query('[aria-label="专注汇总"]').textContent, before)
  click('start-focus')
  await wait()
  send('finish')
  await wait()
  assert.match(query('[aria-label="专注汇总"]').textContent, /25 分钟 33 秒/)
  click('route', 'settings', query('#nav'))
  click('route', 'settings/restore')
  click('restore-check')
  await wait()
  click('restore-confirm')
  click('confirm-no')
  assert.match(text(), /恢复预览/)
  click('restore-confirm')
  send('failure')
  click('confirm-yes')
  await wait()
  assert.ok(query('#confirmation').open)
  assert.match(query('#confirm-error').textContent, /操作未完成/)
  click('confirm-yes')
  await wait()
  assert.match(text(), /模拟恢复完成/)
  for (const theme of ['light', 'dark']) {
    send('theme', theme)
    assert.equal(doc.documentElement.dataset.theme, theme)
  }
  assert.equal(
    logs.some((args) => JSON.stringify(args).includes('修订后的事项')),
    false,
  )
  pass(
    'adjacent: seconds-only session, cancellation, natural completion, restore retry, theme and privacy-safe logs',
  )

  // User addition: reports only aggregate existing entries and own their month/type separately from the ledger.
  reset('finance')
  click('date', '2026-09-19')
  query('#screen').scrollTop = 230
  click('finance-report')
  assert.equal(query('h1').textContent, '报表')
  assert.equal(query('#nav').children.length, 5)
  assert.match(query('[aria-label="报表月份"]').textContent, /2026年9月/)
  assert.match(query('[aria-label="报表月汇总"]').textContent, /本月支出1,014\.00 元记录22 笔/)
  assert.equal(query('.report-categories').children.length, 2)
  assert.match(query('.report-category').textContent, /餐饮/)
  assert.match(query('.report-category').textContent, /1,008\.00 元/)
  assert.match(query('.daily-expense svg').getAttribute('aria-label'), /2026-09-20支出 68\.00 元/)
  click('report-type', 'income')
  assert.match(query('[aria-label="报表月汇总"]').textContent, /12,800\.00 元记录1 笔/)
  assert.match(query('.report-bar').getAttribute('aria-label'), /100\.0%/)
  click('report-month', '-1')
  assert.match(text(), /本月暂无收入/)
  assert.equal(query('.report-bar'), null)
  click('back')
  assert.equal(query('.calendar [aria-pressed="true"]').dataset.value, '2026-09-19')
  assert.equal(query('#screen').scrollTop, 230)
  assert.equal(doc.activeElement.dataset.action, 'finance-report')
  reset('finance', 'long')
  click('finance-report')
  click('report-type', 'expense')
  assert.match(query('.report-category').textContent, /餐饮与饮品及日常聚餐的长分类名称/)
  assert.match(query('.report-category').textContent, /12,346,662\.90 元/)
  assert.ok(Number(query('.report-bar rect:last-child').getAttribute('width')) <= 100)
  reset('finance', 'empty')
  click('finance-report')
  assert.match(text(), /本月暂无支出/)
  assert.equal(query('.report-bar'), null)
  pass(
    'user addition: report aggregate/types/month, empty and large/long samples, ledger return context',
  )

  // OPEN-01: empty months/types/ranges omit chart geometry; a recorded range still fills missing days, and switching back restores it.
  const expectEmptyTrend = () => {
    assert.match(query('.daily-expense').textContent, /暂无记录，无法形成趋势/)
    assert.equal(query('.daily-expense svg'), null)
  }
  for (const theme of ['light', 'dark']) {
    reset('finance', 'empty')
    send('theme', theme)
    expectEmptyTrend()
    click('finance-report')
    for (const type of ['expense', 'income']) {
      click('report-type', type)
      expectEmptyTrend()
      assert.match(query('[aria-label="报表月汇总"]').textContent, /0\.00 元记录0 笔/)
    }
    reset('finance')
    click('finance-report')
    click('report-type', 'expense')
    click('report-month', '-1')
    expectEmptyTrend()
    click('report-month', '1')
    assert.equal(query('.daily-expense').querySelectorAll('circle').length, 20)
    click('report-type', 'income')
    assert.match(query('.daily-expense svg').getAttribute('aria-label'), /2026-09-01收入 0\.00 元/)
    assert.match(
      query('.daily-expense svg').getAttribute('aria-label'),
      /2026-09-05收入 12,800\.00 元/,
    )
    assert.ok(query('.daily-expense polyline'))
  }
  reset('finance', 'empty')
  click('new-transaction')
  input(form().elements.amount, '10')
  click('pick-category', 'food')
  input(form().elements.date, '2026-09-01')
  submit()
  await wait()
  expectEmptyTrend() // The month has a record, but the displayed seven days do not.
  // Report type intentionally survives re-entry; select the expense fixture rather than assuming the prior income filter was reset.
  click('finance-report')
  click('report-type', 'expense')
  assert.equal(query('.daily-expense').querySelectorAll('circle').length, 20)
  click('report-type', 'income')
  expectEmptyTrend()
  click('report-type', 'expense')
  assert.ok(query('.daily-expense polyline'))
  const trendEvents = logs
    .map((args) => args[1])
    .filter((entry) => entry?.event.startsWith('finance.trend.'))
  for (const event of ['started', 'empty', 'data'])
    assert.ok(trendEvents.some((entry) => entry.event === 'finance.trend.render.' + event))
  assert.ok(
    trendEvents.every((entry) => entry.module === 'finance' && Object.keys(entry).length === 2),
  )
  pass(
    'OPEN-01: both themes, empty months/types/ranges, populated recovery, missing-day zeros and fixed-event-only logs',
  )
  console.log(
    `${passed} DOM check groups passed. Browser geometry, real keyboard and iPhone remain unverified.`,
  )
} finally {
  w.close()
}
