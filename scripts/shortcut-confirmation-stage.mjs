import { randomUUID } from 'node:crypto'
import { action, attachment, input, output, tokenText } from './shortcut-plist.mjs'
import {
  amountPattern,
  currencyPattern,
  timePattern,
  amountPrefixPattern,
  timePrefixPattern,
} from './shortcut-payment-rules.mjs'

export function appendConfirmationStage(actions, ocrOutput) {
  const emit = (name, parameters = {}) => {
    const item = action(name, parameters)
    actions.push(item)
    return output(item)
  }
  const variable = (name) => attachment({ Type: 'Variable', VariableName: name })
  const assign = (name, value) => emit('setvariable', { WFVariableName: name, WFInput: value })
  const replace = (value, pattern, replacement = '') =>
    emit('text.replace', {
      WFInput: tokenText(value),
      WFReplaceTextFind: pattern,
      // Native empty strings can import as the default “World”; an explicit empty token means deletion.
      WFReplaceTextReplace: tokenText(replacement),
      WFReplaceTextRegularExpression: true,
      WFReplaceTextCaseSensitive: true,
    })
  const match = (value, pattern) =>
    emit('text.match', {
      WFInput: tokenText(value),
      text: tokenText(value),
      WFMatchTextPattern: `(?m)${pattern}`,
      WFMatchTextCaseSensitive: true,
    })
  const branch = (value, yes, no) => {
    const group = randomUUID().toUpperCase()
    emit('conditional', {
      GroupingIdentifier: group,
      WFControlFlowMode: 0,
      WFCondition: 100,
      WFInput: input(value),
    })
    yes()
    emit('conditional', { GroupingIdentifier: group, WFControlFlowMode: 1 })
    no()
    emit('conditional', { GroupingIdentifier: group, WFControlFlowMode: 2 })
  }
  const choose = (value, prompt) =>
    emit('choosefromlist', {
      WFInput: value,
      WFChooseFromListActionPrompt: prompt,
      WFChooseFromListActionSelectMultiple: false,
    })
  let normalized = ocrOutput
  // Finite literal replacements preserve uncertain O/0 or I/1 glyphs for human correction.
  for (let digit = 0; digit < 10; digit++)
    normalized = replace(normalized, String.fromCharCode(0xff10 + digit), String(digit))
  for (const [from, to] of [
    ['．', '.'],
    ['，', ','],
    ['：', ':'],
    ['\r\n', '\n'],
  ])
    normalized = replace(normalized, from, to)
  const amounts = match(normalized, amountPattern)
  branch(
    amounts,
    () => assign('AmountCandidates', amounts),
    () => assign('AmountCandidates', match(normalized, currencyPattern)),
  )
  const askAmount = (defaultValue) =>
    emit('ask', {
      WFInputType: 'Text',
      WFAskActionPrompt:
        '核对实际金额（人民币）。退款、转账或未支付请勿直接当成支出。只输入数字和小数点。',
      ...(defaultValue ? { WFAskActionDefaultAnswer: tokenText(defaultValue) } : {}),
    })
  branch(
    variable('AmountCandidates'),
    () => {
      const chosen = choose(variable('AmountCandidates'), '选择本笔实付候选；下一步仍可修改金额')
      const stripped = replace(
        replace(replace(chosen, amountPrefixPattern), '[ \\t]*(?:元)?[ \\t]*$'),
        ',',
        '',
      )
      assign('ConfirmedAmount', askAmount(stripped))
    },
    () => assign('ConfirmedAmount', askAmount()),
  )
  const times = match(normalized, timePattern)
  const askDate = (defaultValue) =>
    emit('ask', {
      WFInputType: 'Date and Time',
      WFAskActionPrompt: defaultValue
        ? '核对实际交易日期和时间（按设备本地时区解释），不要误用下单时间。'
        : '未识别到完整交易时间。请手动选择；默认当前时间不是截图识别结果。',
      ...(defaultValue ? { WFAskActionDefaultAnswerDateAndTime: tokenText(defaultValue) } : {}),
    })
  branch(
    times,
    () => {
      const chosen = choose(times, '选择交易时间候选；下一步核对日期和时间')
      let dateText = replace(chosen, timePrefixPattern)
      dateText = replace(replace(dateText, '[年/月.]', '-'), '日', '')
      const dates = emit('detect.date', { WFInput: dateText })
      // Date detection may still reject impossible calendar dates. Never default an unparseable candidate silently.
      branch(
        dates,
        () => assign('ConfirmedDate', askDate(dates)),
        () => assign('ConfirmedDate', askDate()),
      )
    },
    () => assign('ConfirmedDate', askDate()),
  )
  const iso = emit('format.date', {
    WFDate: tokenText(variable('ConfirmedDate')),
    WFDateFormatStyle: 'Custom',
    WFDateFormat: 'Custom',
    WFDateFormatString: "yyyy-MM-dd'T'HH:mm:ssXXXXX",
  })
  assign('ConfirmedOccurredAt', iso)
  return { amount: variable('ConfirmedAmount'), occurredAt: variable('ConfirmedOccurredAt') }
}
