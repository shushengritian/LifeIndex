import assert from 'node:assert/strict'
import { fixtureCandidates } from './shortcut-payment-rules.mjs'
import { appendConfirmationStage } from './shortcut-confirmation-stage.mjs'
import { action, output } from './shortcut-plist.mjs'

// All fixtures are synthetic strings; these checks model regex rules, not Apple's OCR recognition accuracy.
assert.deepEqual(
  fixtureCandidates('原价 ¥100.00\n优惠 ¥10.00\n实付金额：¥90.00\n余额 ¥9999.00').amounts,
  ['实付金额:¥90.00'],
)
assert.equal(fixtureCandidates('付款金额\n￥１，２３４．５６').amounts.length, 1)
assert.deepEqual(fixtureCandidates('订单号123456789\n10:45\n余额 ¥100.00'), {
  amounts: [],
  times: [],
})
assert.equal(fixtureCandidates('¥1.00\n￥2.00').amounts.length, 2)
assert.equal(fixtureCandidates('实际支付 1O.00').amounts.length, 0)
assert.equal(fixtureCandidates('支付金额 1,23.00').amounts.length, 0)
assert.equal(fixtureCandidates('实付金额 10.123').amounts.length, 0)
assert.equal(fixtureCandidates('实付金额 -10.00').amounts.length, 0)
assert.equal(fixtureCandidates('付款金额 USD 20.00').amounts.length, 0)
assert.equal(
  fixtureCandidates('下单时间 2026-09-19 10:45\n支付时间：2026-09-19 10:46:30').times.length,
  1,
)
assert.equal(fixtureCandidates('支付时间 昨天 10:45\n交易时间 09-19 10:45').times.length, 0)
const source = action('gettext', { WFTextActionText: '合成' })
const actions = [source]
appendConfirmationStage(actions, output(source))
const seen = new Set()
const groups = []
function refs(value) {
  if (!value || typeof value !== 'object') return
  if (value.Type === 'ActionOutput')
    assert.ok(seen.has(value.OutputUUID), 'references must point backward')
  Object.values(value).forEach(refs)
}
for (const item of actions) {
  refs(item.WFWorkflowActionParameters)
  const p = item.WFWorkflowActionParameters
  if (item.WFWorkflowActionIdentifier.endsWith('.conditional')) {
    if (p.WFControlFlowMode === 0) groups.push(p.GroupingIdentifier)
    else {
      assert.equal(groups.at(-1), p.GroupingIdentifier)
      if (p.WFControlFlowMode === 2) groups.pop()
    }
  }
  assert.ok(!seen.has(p.UUID))
  seen.add(p.UUID)
}
assert.equal(groups.length, 0)
assert.ok(actions.some((item) => item.WFWorkflowActionParameters.WFInputType === 'Date and Time'))
assert.ok(
  actions.every(
    (item) =>
      !/downloadurl|openurl|notification|savetocameraroll/.test(item.WFWorkflowActionIdentifier),
  ),
)
console.info(
  `[LifeIndex shortcut] PASS: payment candidates, false-positive exclusions and ${actions.length} staged action references. Native runtime remains unverified.`,
)
