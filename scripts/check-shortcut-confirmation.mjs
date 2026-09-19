import assert from 'node:assert/strict'
import { appendConfirmationStage } from './shortcut-confirmation-stage.mjs'
import { attachment } from './shortcut-plist.mjs'

// A deliberately small model tests generated data-flow, not Apple's OCR/date parsing or UI runtime.
function simulate(text, { amount = '8.88', select = 0, rejectDate = false } = {}) {
  const actions = []
  appendConfirmationStage(actions, attachment({ Type: 'Variable', VariableName: 'OCR' }))
  const variables = { OCR: text }
  const outputs = new Map()
  const frames = []
  const prompts = []
  const resolve = (value) => {
    if (!value || typeof value !== 'object') return value
    if (value.WFSerializationType === 'WFTextTokenString') {
      const { string, attachmentsByRange } = value.Value
      return string.replace(/\uFFFC/g, (_, index) =>
        String(resolve(attachment(attachmentsByRange[`{${index}, 1}`]))),
      )
    }
    if (value.WFSerializationType === 'WFTextTokenAttachment') {
      return value.Value.Type === 'Variable'
        ? variables[value.Value.VariableName]
        : outputs.get(value.Value.OutputUUID)
    }
    if (value.Type === 'Variable') return resolve(value.Variable)
    throw new Error('Unmodelled reference')
  }
  const hasValue = (value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''
  for (const item of actions) {
    const name = item.WFWorkflowActionIdentifier.replace('is.workflow.actions.', '')
    const p = item.WFWorkflowActionParameters
    if (name === 'conditional') {
      if (p.WFControlFlowMode === 0) {
        const parent = frames.every((frame) => frame.active)
        const condition = parent && hasValue(resolve(p.WFInput))
        frames.push({ parent, condition, active: condition })
      } else if (p.WFControlFlowMode === 1) {
        const frame = frames.at(-1)
        frame.active = frame.parent && !frame.condition
      } else frames.pop()
      continue
    }
    if (!frames.every((frame) => frame.active)) continue
    let result
    if (name === 'text.replace') {
      result = String(resolve(p.WFInput)).replace(
        new RegExp(p.WFReplaceTextFind, 'g'),
        resolve(p.WFReplaceTextReplace),
      )
    } else if (name === 'text.match') {
      result =
        String(resolve(p.WFInput)).match(
          new RegExp(p.WFMatchTextPattern.replace(/^\(\?m\)/, ''), 'gm'),
        ) ?? []
    } else if (name === 'setvariable') {
      variables[p.WFVariableName] = resolve(p.WFInput)
    } else if (name === 'choosefromlist') {
      const list = resolve(p.WFInput)
      assert.ok(Array.isArray(list) && list.length > 0, 'Never choose from an empty candidate list')
      result = list[Math.min(select, list.length - 1)]
    } else if (name === 'ask') {
      prompts.push({
        type: p.WFInputType,
        initial: resolve(p.WFAskActionDefaultAnswer ?? p.WFAskActionDefaultAnswerDateAndTime),
      })
      result = p.WFInputType === 'Text' ? amount : 'USER_CONFIRMED_DATE'
    } else if (name === 'detect.date') {
      result = rejectDate ? [] : [resolve(p.WFInput)]
    } else if (name === 'format.date') {
      assert.equal(
        resolve(p.WFDate),
        'USER_CONFIRMED_DATE',
        'Only the explicitly confirmed date reaches formatting',
      )
      assert.equal(p.WFDateFormatString, "yyyy-MM-dd'T'HH:mm:ssXXXXX")
      result = '2026-09-19T10:45:00+08:00'
    } else throw new Error(`Unmodelled action: ${name}`)
    outputs.set(p.UUID, result)
  }
  assert.equal(frames.length, 0)
  assert.equal(variables.ConfirmedAmount, amount, 'User correction must win over OCR')
  assert.equal(variables.ConfirmedOccurredAt, '2026-09-19T10:45:00+08:00')
  assert.equal(prompts.length, 2, 'Both amount and date must always be confirmed')
  return prompts
}

console.info('[LifeIndex shortcut] Checking generated confirmation branches with synthetic input.')
assert.deepEqual(simulate('实付金额\n￥１，２３４．５６\r\n支付时间：2026年9月19日 10:45'), [
  { type: 'Text', initial: '1234.56' },
  { type: 'Date and Time', initial: '2026-9-19 10:45' },
])
assert.deepEqual(simulate('10:45\n订单号 123456\n余额 ¥100.00'), [
  { type: 'Text', initial: undefined },
  { type: 'Date and Time', initial: undefined },
])
assert.equal(simulate('¥1.00\n￥2.50', { select: 1 })[0].initial, '2.50')
assert.equal(simulate('¥999.00\n实际支付 5.00')[0].initial, '5.00')
assert.equal(simulate('实付金额 1O.00')[0].initial, undefined)
assert.equal(simulate('交易时间 2026-02-31 10:45', { rejectDate: true })[1].initial, undefined)
console.info(
  '[LifeIndex shortcut] PASS: generated candidate selection, normalization, correction and missing-date branches. Apple runtime remains unverified.',
)
