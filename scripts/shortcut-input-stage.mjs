import { nativeBuilder } from './shortcut-native-builder.mjs'
import { attachment } from './shortcut-plist.mjs'

export function appendInputStage(actions) {
  const b = nativeBuilder(actions)
  const shared = attachment({ Type: 'ExtensionInput' })
  b.branch(
    shared,
    100,
    undefined,
    () => {
      // Never merge multiple payment screenshots into one transaction's OCR candidates.
      const count = b.emit('count', { Input: shared, WFCountType: 'Items' })
      b.requireEqual(b.text(count), '1', '每次只能分享一张支付截图，请重新选择。')
      b.assign('PaymentImage', shared)
    },
    () => b.assign('PaymentImage', b.emit('takescreenshot')),
  )
  const recognized = b.emit('extracttextfromimage', { WFImage: b.variable('PaymentImage') })
  b.assign('PaymentText', recognized)
  return recognized
}
