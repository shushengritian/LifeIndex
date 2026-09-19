import { existsSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { action, workflow, xml } from './shortcut-plist.mjs'
import { appendInputStage } from './shortcut-input-stage.mjs'
import { appendConfirmationStage } from './shortcut-confirmation-stage.mjs'
import { appendCategoryStage } from './shortcut-category-stage.mjs'
import { appendHandoffStage } from './shortcut-handoff-stage.mjs'

export function buildShortcut() {
  const actions = [
    action('comment', {
      WFCommentActionText:
        'LifeIndex 截图记账 · 待设备验收候选。手动从支付页面运行或分享单张截图；系统 OCR 后核对金额时间、选本地分类配置，再打开 LifeIndex 草稿保存。不上传图片，不监听支付，不直接写账本。',
    }),
  ]
  const recognized = appendInputStage(actions)
  const confirmed = appendConfirmationStage(actions, recognized)
  const category = appendCategoryStage(actions)
  appendHandoffStage(actions, { ...confirmed, ...category })
  return workflow('LifeIndex 截图记账 · 验证候选', actions)
}

// Importing the builder in tests never writes an artifact or launches a native application.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.info(
    '[LifeIndex shortcut] Building complete local candidate; device approval remains pending.',
  )
  try {
    const destination = process.argv[2]
    if (!destination || existsSync(destination)) throw new Error('Supply a new destination path')
    const candidate = buildShortcut()
    writeFileSync(destination, xml(candidate), { flag: 'wx' })
    console.info(
      `[LifeIndex shortcut] Built ${candidate.WFWorkflowActions.length} native actions. Not a verified release.`,
    )
  } catch {
    console.error(
      '[LifeIndex shortcut] Build failed; check the destination is new and writable. No private inputs were read.',
    )
    process.exitCode = 1
  }
}
