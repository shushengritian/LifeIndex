import { nativeBuilder } from './shortcut-native-builder.mjs'
import { tokenText } from './shortcut-plist.mjs'

export function appendHandoffStage(actions, { amount, occurredAt, categoryId, type }) {
  const b = nativeBuilder(actions)
  // Generate per invocation, never at template build time. Digits preserve UUID grammar across locales.
  const randomPart = (digits) => {
    const number = b.emit('number.random', {
      WFRandomNumberMinimum: 10 ** (digits - 1),
      WFRandomNumberMaximum: 10 ** digits - 1,
    })
    const raw = b.text(number)
    const part = b.emit('text.replace', {
      WFInput: tokenText(raw),
      WFReplaceTextFind: '[^0-9]',
      WFReplaceTextReplace: tokenText(''),
      WFReplaceTextRegularExpression: true,
    })
    b.requireValue(
      b.match(part, `^[0-9]{${digits}}$`),
      '系统数字格式不兼容，未打开账本。请改用 App 记账。',
    )
    return part
  }
  const actionId = b.text(
    randomPart(8),
    '-',
    randomPart(4),
    '-4',
    randomPart(3),
    '-8',
    randomPart(3),
    '-',
    randomPart(6),
    randomPart(6),
  )
  b.assign('ActionId', actionId)
  b.requireValue(
    b.match(amount, '^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,2})?$'),
    '金额格式不正确，请重新运行并核对。只能使用数字和小数点，最多两位小数。',
  )
  b.requireValue(b.match(amount, '[1-9]'), '金额必须大于零，请重新核对。')
  // Encode values separately; no OCR text, category names, screenshots, notes, or order identifiers enter the URL.
  const encoded = Object.entries({ actionId, amount, occurredAt, categoryId, type }).map(
    ([key, value]) => [
      key,
      b.emit('urlencode', { WFInput: tokenText(value), WFEncodeMode: 'Encode' }),
    ],
  )
  const parts = ['https://shushengritian.github.io/LifeIndex/#/action/add-transaction?']
  encoded.forEach(([key, value], index) => parts.push(`${index ? '&' : ''}${key}=`, value))
  const url = b.text(...parts)
  b.emit('alert', {
    WFAlertActionTitle: '打开 LifeIndex 核对保存',
    WFAlertActionMessage:
      '下一步仅打开草稿，尚未记账。确认打开的是你平时使用的同一账本；若浏览器中数据不同，请取消保存。',
    WFAlertActionCancelButtonShown: true,
  })
  b.emit('openurl', { WFInput: tokenText(url) })
  b.emit('nothing')
}
