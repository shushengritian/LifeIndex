import assert from 'node:assert/strict'
import {
  action,
  attachment,
  input,
  output,
  plist,
  workflow,
  xml,
  tokenText,
} from './shortcut-plist.mjs'

// Synthetic authoring regression; it never launches Shortcuts, reads photos, or sends a network request.
const item = action('gettext', { WFTextActionText: '合成<&>"\'' })
assert.match(item.WFWorkflowActionParameters.UUID, /^[0-9A-F-]{36}$/)
assert.equal(output(item).Value.OutputUUID, item.WFWorkflowActionParameters.UUID)
assert.equal(input(attachment({ Type: 'ExtensionInput' })).Variable.Value.Type, 'ExtensionInput')
assert.match(xml(workflow('合成', [item])), /合成&lt;&amp;&gt;&quot;&apos;/)
assert.equal(plist([true, false, 12]), '<array><true/><false/><integer>12</integer></array>')
assert.throws(() => plist(undefined), TypeError)
assert.throws(() => plist(1.5), TypeError)
const model = workflow('合成', [item])
assert.equal(model.WFWorkflowHasOutputFallback, false)
assert.equal(model.WFWorkflowMinimumClientVersionString, '900')
const composed = tokenText(
  '金额💰',
  output(item),
  ' / ',
  attachment({ Type: 'Variable', VariableName: 'Test' }),
)
assert.equal(composed.Value.string, '金额💰\uFFFC / \uFFFC')
assert.deepEqual(Object.keys(composed.Value.attachmentsByRange), ['{4, 1}', '{8, 1}'])
assert.equal(
  composed.Value.attachmentsByRange['{4, 1}'].OutputUUID,
  item.WFWorkflowActionParameters.UUID,
)
assert.throws(() => tokenText('\uFFFC'), TypeError)
assert.throws(() => tokenText({ Value: 'untyped' }), TypeError)
console.info(
  '[LifeIndex shortcut] PASS: typed references, XML escaping, metadata and unsupported-value rejection.',
)
