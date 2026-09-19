import { nativeBuilder } from './shortcut-native-builder.mjs'
import { tokenText } from './shortcut-plist.mjs'

export const categoryIdPattern =
  '(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|category-finance-[a-z0-9-]+-v1)'

export function appendCategoryStage(actions) {
  const b = nativeBuilder(actions)
  const invalid =
    '分类配置无效或版本不兼容。请回到 LifeIndex → 设置 → 快捷记账重新导出分类配置，再选择该 JSON 文件。'
  b.emit('comment', {
    WFCommentActionText:
      '选择 LifeIndex 导出的分类 JSON；建议存“我的 iPhone”。存 iCloud Drive 会由系统同步分类名称。模板不上传此文件。',
  })
  const file = b.emit('file.select', { SelectMultiple: false })
  const config = b.emit('detect.dictionary', { WFInput: file })
  b.requireEqual(b.field(config, 'format'), 'lifeindex-shortcut-categories', invalid)
  b.requireEqual(b.text(b.field(config, 'version')), '1', invalid)
  const rows = b.field(config, 'categories')
  b.requireValue(rows, invalid)
  const count = b.emit('count', { Input: rows, WFCountType: 'Items' })
  b.branch(count, 2, 1000, () => b.stop('分类超过 1000 项，请精简或在 App 内直接记账。'))

  // Validate every row before displaying any choices; no partial silently repaired hierarchy.
  b.each(rows, (row) => {
    const id = b.field(row, 'id')
    const type = b.field(row, 'type')
    const parent = b.field(row, 'parentId')
    b.requireValue(b.match(id, `^${categoryIdPattern}$`), invalid)
    b.requireValue(b.field(row, 'name'), invalid)
    b.requireEqual(b.field(row, 'domain'), 'finance', invalid)
    b.requireValue(b.match(type, '^(?:expense|income)$'), invalid)
    // Dictionary booleans may bridge to numeric 1; false/absent values must not enter menus.
    b.requireValue(b.match(b.text(b.field(row, 'available')), '^(?:true|1|Yes|是)$'), invalid)
    b.clear('MatchingIds')
    b.clear('MatchingParents')
    b.each(rows, (other) => {
      const otherId = b.field(other, 'id')
      b.branch(otherId, 4, id, () => b.append('MatchingIds', otherId))
      b.branch(parent, 100, undefined, () => {
        b.branch(otherId, 4, parent, () => {
          b.requireEqual(b.field(other, 'type'), type, invalid)
          b.branch(b.field(other, 'parentId'), 100, undefined, () => b.stop(invalid))
          b.append('MatchingParents', otherId)
        })
      })
    })
    b.requireEqual(
      b.text(b.emit('count', { Input: b.variable('MatchingIds'), WFCountType: 'Items' })),
      '1',
      invalid,
    )
    b.branch(parent, 100, undefined, () => b.requireValue(b.variable('MatchingParents'), invalid))
  })
  const typeText = tokenText(b.text('支出\n收入'))
  const types = b.emit('text.split', {
    WFInput: typeText,
    text: typeText,
    WFTextSeparator: 'New Lines',
  })
  const typeChoice = b.choose(types, '本笔是支出还是收入？退款请核对记账方式')
  b.branch(
    typeChoice,
    4,
    '支出',
    () => b.assign('TransactionType', b.text('expense')),
    () => b.assign('TransactionType', b.text('income')),
  )
  b.clear('RootChoices')
  b.each(rows, (row) => {
    b.branch(b.field(row, 'type'), 4, b.variable('TransactionType'), () => {
      b.branch(b.field(row, 'parentId'), 101, undefined, () => {
        b.append('RootChoices', b.text(b.field(row, 'name'), ' · ', b.field(row, 'id')))
      })
    })
  })
  b.requireValue(
    b.variable('RootChoices'),
    '当前收支类型没有可用分类，请在 LifeIndex 新增后重新导出配置。',
  )
  const root = b.choose(b.variable('RootChoices'), '选择一级分类（末尾 ID 用于区分同名分类）')
  const rootId = b.match(root, `${categoryIdPattern}$`)
  b.assign('SelectedCategoryId', rootId)
  b.clear('ChildChoices')
  b.each(rows, (row) => {
    b.branch(b.field(row, 'parentId'), 4, rootId, () =>
      b.append('ChildChoices', b.text(b.field(row, 'name'), ' · ', b.field(row, 'id'))),
    )
  })
  b.branch(b.variable('ChildChoices'), 100, undefined, () => {
    b.append('ChildChoices', b.text('不细分 · ', rootId))
    const child = b.choose(b.variable('ChildChoices'), '选择二级分类，或选择“不细分”')
    b.assign('SelectedCategoryId', b.match(child, `${categoryIdPattern}$`))
  })
  return { categoryId: b.variable('SelectedCategoryId'), type: b.variable('TransactionType') }
}
