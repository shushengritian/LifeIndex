// Run with Node; tests the real prototype controller without browser or personal data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const source = fs.readFileSync(path.join(__dirname, '../../prototypes/g4-focus.js'), 'utf8')
const context = vm.createContext({
  Date,
  Math,
  Boolean,
  String,
  Number,
  Map,
  document: {
    addEventListener() {},
    querySelectorAll() {
      return []
    },
  },
  setTimeout(callback) {
    callback()
  },
  busy: false,
  failNext: false,
  view: 'health',
  sequence: 0,
  session: null,
  focusHistory: [],
  log() {},
  toast() {},
  render() {},
})
vm.runInContext(source, context)
let now = 0
context.focusNow = () => now
function start() {
  context.session = {
    id: ++context.sequence,
    title: 'Synthetic',
    duration: 25,
    startedAt: 0,
    endsAt: 1500000,
    date: '2026-09-18',
  }
}
;(async () => {
  assert.equal(context.focusClock(14400), '04:00:00')
  assert.equal(context.focusDurationLabel(59), '59 秒')
  start()
  now = 999
  await context.completeFocus(false)
  assert.equal(context.focusHistory.length, 0, 'sub-second session is not completed')
  start()
  now = 59000
  await context.completeFocus(false)
  assert.equal(context.focusHistory[0].seconds, 59)
  assert.equal(context.focusHistory[0].completionKind, 'early')
  start()
  now = 1600000
  context.failNext = true
  await context.completeFocus(false)
  assert.equal(context.focusHistory.length, 1, 'failed write must not append')
  assert.equal(context.session.pending.seconds, 1500)
  now = 3600000
  await context.completeFocus(false)
  assert.equal(context.focusHistory[1].seconds, 1500, 'retry freezes the original endpoint')
  assert.equal(context.focusHistory[1].endedAt, 1500000)
  assert.equal(context.focusHistory[1].completionKind, 'timer')
  await context.completeFocus(false)
  assert.equal(context.focusHistory.length, 2, 'repeat reconciliation cannot duplicate')
  start()
  now = 300000
  await context.completeFocus(true)
  assert.equal(context.focusHistory.length, 2, 'cancel never counts as completion')
  assert.equal(context.session, null)
  console.log(
    'PASS: clock, seconds, sub-second cancel, early finish, capped natural finish, failure retention, frozen retry, deduplication, cancel',
  )
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
