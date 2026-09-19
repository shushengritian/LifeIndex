// Runs the actual prototype reducer without browser APIs, storage, or external requests.
const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const path = require('node:path')
const ctx = vm.createContext({})
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../prototypes/g4-states.js'), 'utf8'), ctx)
const fresh = () => ctx.deliveryState()
const step = (s, event) => ctx.deliveryTransition(s, event)
for (const guard of ['dirty', 'saving', 'network-toggle']) {
  const blocked = step(fresh(), guard)
  assert.equal(step(blocked, 'update').update, 'ready', guard + ' must block update')
}
let s = step(step(fresh(), 'update-fail'), 'update')
assert.equal(s.update, 'busy')
assert.equal(step(s, 'update-reset').update, 'busy')
s = step(s, 'update-result')
assert.equal(s.update, 'failed')
s = step(step(s, 'update'), 'update-result')
assert.equal(s.update, 'done')
assert.equal(step(step(fresh(), 'later'), 'update').update, 'deferred')
assert.equal(step(step(fresh(), 'invalid'), 'confirm-action').action, 'preview')
s = step(step(fresh(), 'action-fail'), 'confirm-action')
assert.equal(s.action, 'busy')
assert.equal(step(s, 'cancel-action').action, 'busy')
s = step(s, 'action-result')
assert.equal(s.action, 'failed')
assert.equal(s.handled, false)
s = step(step(s, 'confirm-action'), 'action-result')
assert.equal(s.action, 'done')
assert.equal(s.handled, true)
assert.equal(step(s, 'reopen').action, 'duplicate')
assert.equal(step(s, 'confirm-action').action, 'duplicate')
assert.equal(step(step(fresh(), 'cancel-action'), 'reopen').action, 'preview')
assert.equal(
  step(step(fresh(), 'network-toggle'), 'confirm-action').action,
  'busy',
  'local record remains available offline',
)
console.log(
  'PASS: update guards, busy isolation, failure/retry, defer, validation, cancellation, deduplication, offline local action',
)
