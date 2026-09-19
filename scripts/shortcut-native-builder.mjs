import { randomUUID } from 'node:crypto'
import { action, attachment, input, output, tokenText } from './shortcut-plist.mjs'

// Shared authoring primitives keep conditions and loops explicitly connected; no implicit pipeline inputs.
export function nativeBuilder(actions) {
  let loopDepth = 0
  const emit = (name, parameters = {}) => {
    const item = action(name, parameters)
    actions.push(item)
    return output(item)
  }
  const variable = (name) => attachment({ Type: 'Variable', VariableName: name })
  const text = (...parts) => emit('gettext', { WFTextActionText: tokenText(...parts) })
  const assign = (name, value) => emit('setvariable', { WFVariableName: name, WFInput: value })
  const append = (name, value) => emit('appendvariable', { WFVariableName: name, WFInput: value })
  const field = (value, key) =>
    emit('getvalueforkey', {
      WFInput: value,
      WFDictionaryKey: key,
      WFGetDictionaryValueType: 'Value',
    })
  const branch = (value, code, expected, yes, no) => {
    const group = randomUUID().toUpperCase()
    // Dictionary outputs have unknown native type; cast before string comparisons so the editor preserves operands.
    const operand = code === 4 || code === 5 ? text(value) : value
    const comparison =
      expected === undefined
        ? {}
        : code < 4
          ? { WFNumberValue: String(expected) }
          : {
              WFConditionalActionString:
                typeof expected === 'string' ? expected : tokenText(expected),
            }
    emit('conditional', {
      GroupingIdentifier: group,
      WFControlFlowMode: 0,
      WFInput: input(operand),
      WFCondition: code,
      ...comparison,
    })
    yes()
    if (no) {
      emit('conditional', { GroupingIdentifier: group, WFControlFlowMode: 1 })
      no()
    }
    emit('conditional', { GroupingIdentifier: group, WFControlFlowMode: 2 })
  }
  const each = (value, body) => {
    const group = randomUUID().toUpperCase()
    emit('repeat.each', {
      GroupingIdentifier: group,
      WFControlFlowMode: 0,
      WFInput: value,
    })
    // A loop action's output imports as Repeat Results, not its current item. Use native loop variables.
    loopDepth += 1
    body(variable(loopDepth === 1 ? 'Repeat Item' : `Repeat Item ${loopDepth}`))
    loopDepth -= 1
    emit('repeat.each', { GroupingIdentifier: group, WFControlFlowMode: 2 })
  }
  const stop = (message) => {
    emit('alert', {
      WFAlertActionTitle: '暂时无法继续记账',
      WFAlertActionMessage: message,
      WFAlertActionCancelButtonShown: false,
    })
    emit('exit')
  }
  const requireValue = (value, message) => branch(value, 101, undefined, () => stop(message))
  const requireEqual = (value, expected, message) => branch(value, 5, expected, () => stop(message))
  const match = (value, pattern) =>
    emit('text.match', {
      // Keep legacy and newer intent text inputs bound to the same explicit text token.
      WFInput: tokenText(value),
      text: tokenText(value),
      WFMatchTextPattern: pattern,
      WFMatchTextCaseSensitive: true,
    })
  const choose = (value, prompt) =>
    emit('choosefromlist', {
      WFInput: value,
      WFChooseFromListActionPrompt: prompt,
      WFChooseFromListActionSelectMultiple: false,
    })
  const clear = (name) => assign(name, emit('nothing'))
  return {
    emit,
    variable,
    text,
    assign,
    append,
    field,
    branch,
    each,
    stop,
    requireValue,
    requireEqual,
    match,
    choose,
    clear,
  }
}
