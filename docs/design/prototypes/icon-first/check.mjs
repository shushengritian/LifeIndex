import assert from 'node:assert/strict'
import console from 'node:console'
import { URL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { JSDOM, VirtualConsole } from 'jsdom'

const html = await readFile(new URL('./app.html', import.meta.url), 'utf8')
const script = await readFile(new URL('./app.js', import.meta.url), 'utf8')
const dom = new JSDOM(html, {
  url: 'http://design.invalid/app.html?view=focus',
  runScripts: 'outside-only',
  virtualConsole: new VirtualConsole(),
})
const { window } = dom
const doc = window.document
// DOM checks deliberately replace dialog/timers; they do not claim native layout or iPhone evidence.
window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
window.HTMLDialogElement.prototype.close = function () {
  this.open = false
}
window.setInterval = () => 0
const pending = []
window.setTimeout = (callback) => {
  pending.push(callback)
  return pending.length
}
window.eval(script)
const click = (action) => {
  const button = [...doc.querySelectorAll('[data-action]')].find(
    (el) => el.dataset.action === action,
  )
  assert.ok(button, `Missing action: ${action}`)
  button.click()
}
const input = (id, value) => {
  doc.getElementById(id).value = value
  doc.getElementById(id).dispatchEvent(new window.Event('input', { bubbles: true }))
}
click('start')
assert.equal(doc.querySelectorAll('.dial circle').length, 2)
assert.equal(doc.querySelector('.track').getAttribute('r'), '148')
assert.ok(doc.getElementById('nav').hidden)
click('minimize')
assert.ok(doc.querySelector('[data-action="resume"]'))
click('resume')
click('stop')
assert.match(doc.getElementById('sheet').textContent, /保存并结束/)
click('dismiss')
assert.ok(doc.querySelector('.dial'))
click('stop')
click('discard-focus')
assert.ok(doc.querySelector('[data-action="start"]'))
console.info('PASS focus circle / minimize / resume / explicit discard')

click('nav:today')
const assertSeparatedTargets = () => {
  for (const tools of doc.querySelectorAll('.section-head .tools')) {
    assert.ok(tools.querySelectorAll('button').length <= 1, 'One action per section header')
  }
  for (const content of doc.querySelectorAll('.content-link, .habit-entry')) {
    assert.equal(content.querySelectorAll('button, a, [tabindex]').length, 0, 'No nested targets')
    assert.ok(content.getAttribute('aria-label'))
  }
}
assertSeparatedTargets()
click('habit-detail')
assert.match(doc.getElementById('sheet').textContent, /阅读习惯详情/)
assert.equal(doc.querySelector('[data-action="habit"]').getAttribute('aria-pressed'), 'false')
click('dismiss')
click('habit')
assert.equal(doc.getElementById('sheet').open, false, 'Check-in must not open details')
assert.equal(doc.querySelector('[data-action="habit"]').getAttribute('aria-pressed'), 'true')
// Clicking the decorative cue belongs to the whole content target, never to the adjacent writer.
doc
  .querySelector('.content-link[data-action="nav:finance"] .content-cue')
  .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
assert.equal(doc.querySelector('h1').textContent, '记账')
assert.equal(doc.querySelector('.page-head .tools').querySelectorAll('button').length, 1)
click('nav:today')
assert.equal(doc.querySelector('[data-action="new-entry"]').parentElement.className, 'tools')
click('new-entry')
assert.ok(doc.getElementById('nav').hidden)
click('save-entry')
assert.match(doc.getElementById('entry-error').textContent, /大于 0/)
input('amount', '12.50')
click('category:travel')
assert.equal(doc.getElementById('amount').value, '12.50')
click('close-entry')
assert.match(doc.getElementById('sheet').textContent, /放弃这笔草稿/)
click('dismiss')
click('save-entry')
click('close-entry')
assert.equal(doc.querySelector('h2').textContent, '记一笔')
while (pending.length) pending.shift()()
assert.equal(doc.querySelector('h1').textContent, '今天')
assert.match(doc.getElementById('screen').textContent, /60.50/)
console.info('PASS today tools / validation / draft / busy guard / memory save')

click('nav:health')
assertSeparatedTargets()
assert.equal(doc.querySelector('[data-action="add-plan"]').classList.contains('plan-start'), true)
assert.equal(doc.querySelector('[data-action="plan-detail"]'), null)
click('weight-history')
assert.match(doc.getElementById('sheet').textContent, /体重历史/)
assert.equal(doc.getElementById('health-value'), null)
click('dismiss')
click('add-weight')
assert.doesNotMatch(doc.getElementById('sheet').textContent, /体重历史/)
input('health-value', '61.5')
click('dismiss')
assert.ok(doc.getElementById('discard-confirm').open)
click('continue-sheet')
assert.equal(doc.getElementById('health-value').value, '61.5')
doc.getElementById('sheet').dispatchEvent(new window.Event('cancel', { cancelable: true }))
assert.ok(doc.getElementById('discard-confirm').open)
click('continue-sheet')
click('save-weight')
assert.match(doc.querySelector('.metric').textContent, /61.5/)
click('add-plan')
click('save-plan')
assert.match(doc.getElementById('screen').textContent, /计划已开启/)
assertSeparatedTargets()
assert.ok(doc.querySelector('[data-action="add-plan"].ib'))
assert.ok(doc.querySelector('[data-action="plan-detail"].content-link'))
click('plan-detail')
assert.equal(doc.getElementById('sheet').querySelector('[data-action="demo-event"]'), null)
click('dismiss')
click('add-plan')
assert.equal(doc.getElementById('sheet').querySelectorAll('[data-action="demo-event"]').length, 3)
click('dismiss')
console.info('PASS separate read/write targets / decorative cues / habit and plan branches')
click('nav:finance')
click('day:12')
assert.match(doc.getElementById('screen').textContent, /9 月 12 日/)
click('nav:report')
assert.match(doc.getElementById('screen').textContent, /分类分布/)
// Closed confirmation dialogs retain their buttons; check only the visible page and navigation.
assert.equal(
  doc.querySelectorAll('#screen button:not([aria-label]), #nav button:not([aria-label])').length,
  5,
)
console.info('PASS health editor / plan entry / calendar selection / report')
assert.doesNotMatch(script, /localStorage|indexedDB|fetch\(|serviceWorker/)
window.close()
console.info('PASS isolated prototype: no persistence or network APIs')
