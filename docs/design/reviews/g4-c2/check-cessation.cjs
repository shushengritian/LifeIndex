// Synthetic domain checks for the actual prototype; not a replacement for production migration tests.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict')
const context = vm.createContext({
  Date,
  Math,
  Number,
  String,
  Map,
  Set,
  URLSearchParams,
  location: { search: '' },
  document: { addEventListener() {} },
  setInterval() {},
  habitDate(date, delta) {
    return new Date(Date.parse(date + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0, 10)
  },
})
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../prototypes/g4-cessation.js'), 'utf8'),
  context,
)
const run = (code) => vm.runInContext(code, context)
assert.equal(run('cessationState(cessationPlan())'), '进行中')
assert.equal(run("cessationFullEligible(cessationPlan(),'2026-09-07')"), false)
assert.equal(run("cessationFullEligible(cessationPlan(),'2026-09-17')"), true)
assert.equal(run("cessationFullEligible(cessationPlan(),'2026-09-18')"), false)
assert.equal(run('cessationSummary(cessationPlan()).estimate'), 7500)
run("cessationDays.push({planId:1,date:'2026-09-18',kind:'snapshot'})")
assert.equal(run('cessationSummary(cessationPlan()).full'), 5)
run("cessationDays.push({planId:1,date:'2026-09-10',kind:'snapshot'})")
assert.equal(run("cessationStatus(cessationPlan(),'2026-09-10')"), '快照待确认')
run(
  "applyCessationEvent({id:30,planId:1,kind:'smoking',count:1,at:Date.parse('2026-09-18T11:00:00+08:00')})",
)
assert.equal(run("cessationDays.some(d=>d.date==='2026-09-18')"), false)
run(
  "applyCessationEvent({id:30,planId:1,kind:'smoking',count:1,at:Date.parse('2026-09-15T11:00:00+08:00')})",
)
assert.equal(run("cessationStatus(cessationPlan(),'2026-09-18')"), '尚未确认')
assert.equal(run("cessationDays.some(d=>d.date==='2026-09-15')"), false)
assert.equal(run('cessationEvents.filter(e=>e.id===30).length'), 1)
run('cessationEvents.splice(cessationEvents.findIndex(e=>e.id===30),1)')
assert.equal(run("cessationStatus(cessationPlan(),'2026-09-15')"), '尚未确认')
assert.equal(run("cessationStatus(cessationPlan(),'2026-09-01')"), '计划范围外')
assert.equal(run('cessationState({start:cessationNow+1000,end:null})'), '准备中')
assert.equal(run('cessationState({start:cessationNow+1000,end:cessationNow+1000})'), '已取消')
assert.equal(run('cessationState({start:cessationNow-2000,end:cessationNow-1000})'), '已结束')
assert.equal(run('cessationSummary({id:99,start:cessationNow,end:null,baseline:null}).reached'), 1)
assert.equal(
  run('cessationSummary({id:99,start:cessationNow,end:cessationNow,baseline:null}).reached'),
  0,
)
console.log(
  'PASS: day eligibility, snapshot/full-day separation, estimate, stale snapshot, conflict revocation, move/delete neutrality, stable edit ID, plan states',
)
