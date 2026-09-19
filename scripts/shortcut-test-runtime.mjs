// Synthetic execution model for authored wiring only. It does not implement Apple's coercions or permission UI.
export function modelShortcut(
  actions,
  {
    config,
    shared = [],
    ocr = '',
    choose = (items) => items[0],
    amount = '12.34',
    date = '2026-09-19T10:45:00+08:00',
  },
) {
  const variables = {}
  const outputs = new Map()
  const opened = []
  const alerts = []
  const prompts = []
  let stopped = false
  let loopDepth = 0
  const list = (value) =>
    value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]
  const text = (value) => (value === undefined || value === null ? '' : String(value))
  const resolve = (value) => {
    if (!value || typeof value !== 'object') return value
    if (value.WFSerializationType === 'WFTextTokenString') {
      return value.Value.string.replace(/\uFFFC/g, (_, index) =>
        text(
          resolve({
            WFSerializationType: 'WFTextTokenAttachment',
            Value: value.Value.attachmentsByRange[`{${index}, 1}`],
          }),
        ),
      )
    }
    if (value.WFSerializationType === 'WFTextTokenAttachment') {
      const ref = value.Value
      if (ref.Type === 'ExtensionInput') return shared
      if (ref.Type === 'Variable') return variables[ref.VariableName]
      if (!outputs.has(ref.OutputUUID)) throw new Error('Unresolved action output')
      return outputs.get(ref.OutputUUID)
    }
    if (value.Type === 'Variable') return resolve(value.Variable)
    throw new Error('Unmodelled input')
  }
  const bounds = (start) => {
    const group = actions[start].WFWorkflowActionParameters.GroupingIdentifier
    let otherwise
    for (let at = start + 1; at < actions.length; at++) {
      const p = actions[at].WFWorkflowActionParameters
      if (p.GroupingIdentifier !== group) continue
      if (p.WFControlFlowMode === 1) otherwise = at
      if (p.WFControlFlowMode === 2) return { end: at, otherwise }
    }
    throw new Error('Unclosed control flow')
  }
  const run = (start, end) => {
    for (let at = start; at < end && !stopped; at++) {
      const item = actions[at]
      const name = item.WFWorkflowActionIdentifier.replace('is.workflow.actions.', '')
      const p = item.WFWorkflowActionParameters
      if (name === 'conditional' || name === 'repeat.each') {
        const block = bounds(at)
        const value = resolve(p.WFInput)
        if (name === 'repeat.each') {
          loopDepth += 1
          const itemName = loopDepth === 1 ? 'Repeat Item' : `Repeat Item ${loopDepth}`
          for (const row of list(value)) {
            if (stopped) break
            // Do not pretend a repeat action output is its item: macOS imports that reference as Repeat Results.
            variables[itemName] = row
            run(at + 1, block.end)
          }
          delete variables[itemName]
          loopDepth -= 1
        } else {
          const expected = resolve(p.WFConditionalActionString)
          const exists = list(value).length > 0 && text(value) !== ''
          const condition = {
            100: exists,
            101: !exists,
            4: text(value) === text(expected),
            5: text(value) !== text(expected),
            2: Number(value) > Number(p.WFNumberValue),
          }[p.WFCondition]
          if (condition === undefined) throw new Error('Unmodelled condition')
          if (condition) run(at + 1, block.otherwise ?? block.end)
          else if (block.otherwise !== undefined) run(block.otherwise + 1, block.end)
        }
        at = block.end
        continue
      }
      let result
      if (name === 'gettext') result = resolve(p.WFTextActionText)
      else if (name === 'setvariable') variables[p.WFVariableName] = resolve(p.WFInput)
      else if (name === 'appendvariable')
        variables[p.WFVariableName] = [
          ...list(variables[p.WFVariableName]),
          ...list(resolve(p.WFInput)),
        ]
      else if (name === 'count') result = list(resolve(p.Input)).length
      else if (name === 'file.select' || name === 'detect.dictionary') result = config
      else if (name === 'getvalueforkey') result = resolve(p.WFInput)?.[p.WFDictionaryKey]
      else if (name === 'text.match')
        result =
          text(resolve(p.WFInput)).match(
            new RegExp(
              p.WFMatchTextPattern.replace(/^\(\?m\)/, ''),
              p.WFMatchTextPattern.startsWith('(?m)') ? 'gm' : 'g',
            ),
          ) ?? []
      else if (name === 'text.replace')
        result = text(resolve(p.WFInput)).replace(
          new RegExp(p.WFReplaceTextFind, 'g'),
          resolve(p.WFReplaceTextReplace),
        )
      else if (name === 'text.split') result = text(resolve(p.WFInput)).split('\n')
      else if (name === 'choosefromlist') {
        const items = list(resolve(p.WFInput))
        result = choose(items, p.WFChooseFromListActionPrompt)
        if (!items.includes(result)) throw new Error('Selection outside candidate list')
      } else if (name === 'ask') {
        prompts.push(p.WFInputType)
        result = p.WFInputType === 'Text' ? amount : date
      } else if (name === 'detect.date') result = [date]
      else if (name === 'format.date') result = resolve(p.WFDate)
      else if (name === 'takescreenshot') result = 'synthetic-image'
      else if (name === 'extracttextfromimage') result = ocr
      else if (name === 'number.random') result = p.WFRandomNumberMinimum
      else if (name === 'urlencode') result = encodeURIComponent(text(resolve(p.WFInput)))
      else if (name === 'openurl') opened.push(resolve(p.WFInput))
      else if (name === 'alert') alerts.push(p.WFAlertActionMessage)
      else if (name === 'exit') stopped = true
      else if (!['nothing', 'comment'].includes(name)) throw new Error(`Unmodelled action: ${name}`)
      outputs.set(p.UUID, result)
    }
  }
  run(0, actions.length)
  return { opened, alerts, stopped, prompts }
}
