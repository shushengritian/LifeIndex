import { existsSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { action, attachment, input, output, workflow, xml } from './shortcut-plist.mjs'
import { appendConfirmationStage } from './shortcut-confirmation-stage.mjs'

// Authoring candidate ONLY. Configuration/category selection and URL handoff remain separate pending stages.
const destination = process.argv[2]
if (!destination || existsSync(destination)) {
  console.error(
    '[LifeIndex shortcut] Supply a new output .xml path; existing files are never overwritten.',
  )
  process.exit(1)
}
console.info(
  '[LifeIndex shortcut] Building local image/OCR and confirmation stages. Not a complete bookkeeping shortcut.',
)
const actions = []
const emit = (item) => {
  actions.push(item)
  return item
}
emit(
  action('comment', {
    WFCommentActionText:
      'LifeIndex 开发候选：输入、OCR 与金额/时间核对，尚不记账。接收一张共享图片，否则截取当前屏幕。不保存图片、不上传，不开放正式安装。',
  }),
)
const group = randomUUID().toUpperCase()
const shared = attachment({ Type: 'ExtensionInput' })
emit(
  action('conditional', {
    GroupingIdentifier: group,
    WFControlFlowMode: 0,
    WFCondition: 100,
    WFInput: input(shared),
  }),
)
emit(action('setvariable', { WFVariableName: 'PaymentImage', WFInput: shared }))
emit(action('conditional', { GroupingIdentifier: group, WFControlFlowMode: 1 }))
const screenshot = emit(action('takescreenshot'))
emit(action('setvariable', { WFVariableName: 'PaymentImage', WFInput: output(screenshot) }))
emit(action('conditional', { GroupingIdentifier: group, WFControlFlowMode: 2 }))
const recognized = emit(
  action('extracttextfromimage', {
    WFImage: attachment({ Type: 'Variable', VariableName: 'PaymentImage' }),
  }),
)
emit(action('setvariable', { WFVariableName: 'PaymentText', WFInput: output(recognized) }))
appendConfirmationStage(actions, output(recognized))
emit(
  action('comment', {
    WFCommentActionText:
      '后续接分类配置与 URL 转交。禁止将 PaymentText 全文放入 URL、通知、文件或日志。',
  }),
)
// Suppress implicit OCR output while this incomplete authoring stage is inspected; it is not a released template.
emit(action('nothing'))
writeFileSync(destination, xml(workflow('LifeIndex 截图记账 · 开发输入阶段', actions)), {
  flag: 'wx',
})
console.info(
  `[LifeIndex shortcut] Wrote ${actions.length} native actions. Device field wiring remains unverified.`,
)
