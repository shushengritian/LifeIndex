'use strict'

// Category identity is shared by management and all record pickers; names are never foreign keys.
const categoryBook = [
  ['food', 'expense', '餐饮', 'food', 'orange'],
  ['coffee', 'expense', '咖啡', 'coffee', 'purple'],
  ['transit', 'expense', '交通', 'transit', 'blue'],
  ['bag', 'expense', '购物', 'bag', 'green'],
  ['pay', 'income', '工资', 'pay', 'green'],
  ['reading', 'focus', '阅读', 'book', 'purple'],
  ['work', 'focus', '工作', 'bag', 'blue'],
  ['study', 'focus', '学习', 'book', 'green'],
  ['walking', 'activity', '散步', 'activity', 'green'],
  ['strength', 'activity', '力量训练', 'activity', 'orange'],
  ['running', 'activity', '跑步', 'activity', 'blue'],
].map(([id, group, title, icon, color]) => ({ id, group, title, icon, color, archived: false }))
const categoryGroups = {
  expense: '支出分类',
  income: '收入分类',
  focus: '专注分类',
  activity: '运动分类',
}
// Hierarchy is finance-only and at most two levels; existing IDs remain valid root categories.
categoryBook.push(
  ...[
    {
      id: 'food-breakfast',
      group: 'expense',
      title: '早餐',
      icon: 'food',
      color: 'orange',
      parentId: 'food',
    },
    {
      id: 'food-dinner',
      group: 'expense',
      title: '正餐',
      icon: 'food',
      color: 'orange',
      parentId: 'food',
    },
    {
      id: 'pay-bonus',
      group: 'income',
      title: '奖金',
      icon: 'pay',
      color: 'green',
      parentId: 'pay',
    },
  ].map((c) => ({ ...c, archived: false })),
)
let categoryGroup = 'expense',
  categoryArchived = false,
  categoryEditing = null,
  categoryDraftId = '',
  categoryParent = null,
  categoryDraftParent = null,
  categoryRootArchived = false,
  categoryRootScroll = 0
const categorySymbols = {
  food: '餐饮',
  coffee: '饮品',
  transit: '出行',
  bag: '日常',
  pay: '收入',
  book: '阅读',
  timer: '专注',
  activity: '运动',
  heart: '健康',
  leaf: '自然',
}
// Preserve existing IDs while adding the shared library; water reuses the app's existing drop glyph.
Object.assign(
  categorySymbols,
  { drop: '水费' },
  Object.fromEntries(Object.entries(extraCategoryIcons).map(([id, [label]]) => [id, label])),
)
function filterCategoryIcons(groupId) {
  const group = categoryIconGroups[groupId]
  if (!group) {
    log('category.icon_group_invalid', 'settings')
    return
  }
  // Filtering changes visibility only: the selected radio remains in FormData and the preview.
  form.querySelectorAll('.category-symbols label').forEach((label) => {
    label.hidden = !group.ids.includes(label.querySelector('input').value)
  })
  form.querySelector('#icon-group-count').textContent =
    group.ids.length + ' 个图标 · 已选图标保留在上方预览'
  log('category.icon_group_changed', 'settings')
}
function categoryIconGroupFor(id) {
  return (
    Object.keys(categoryIconGroups).find((key) => categoryIconGroups[key].ids.includes(id)) ||
    'common'
  )
}
const categoryColors = { blue: '蓝色', purple: '紫色', green: '绿色', orange: '橙色' }
function categoryFor(id) {
  return categoryBook.find((c) => c.id === id)
}
function categoryActive(c) {
  return Boolean(c && !c.archived && (!c.parentId || !categoryFor(c.parentId)?.archived))
}
function categoryLabel(id) {
  const c = categoryFor(id),
    parent = categoryFor(c?.parentId)
  return c
    ? (parent ? parent.title + ' / ' : '') + c.title + (!categoryActive(c) ? '（已归档）' : '')
    : '未分类'
}
function categoryChoices(group, current = '') {
  return categoryBook.filter((c) => c.group === group && (categoryActive(c) || c.id === current))
}
function categoryAllowed(id, group, previous = '') {
  const c = categoryFor(id)
  return Boolean(c && c.group === group && (categoryActive(c) || id === previous))
}
function categoryOptions(group, current = '', optional = false) {
  const choices = categoryChoices(group, current)
  return (
    (optional
      ? '<option value="">未分类</option>'
      : choices.length
        ? ''
        : '<option value="">暂无可用分类，请先在设置中创建或恢复</option>') +
    choices
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === current ? 'selected' : ''}>${escapeHTML(categoryLabel(c.id))}</option>`,
      )
      .join('')
  )
}
function categoryReferences(c) {
  return c.group === 'focus'
    ? focusHistory.filter((r) => r.category === c.id).length + (session?.category === c.id ? 1 : 0)
    : c.group === 'activity'
      ? fixtures.activities.filter((r) => r.type === c.id).length
      : fixtures.transactions.filter((r) => r.category === c.id).length
}
function categoryManagementItems() {
  // Each screen has one level only. Focus and activity stay flat regardless of finance navigation.
  const hierarchical = ['expense', 'income'].includes(categoryGroup)
  return categoryBook.filter(
    (c) =>
      c.group === categoryGroup &&
      (!hierarchical || (categoryParent ? c.parentId === categoryParent : !c.parentId)),
  )
}
function categoryManagement() {
  const hierarchical = ['expense', 'income'].includes(categoryGroup)
  const parent = hierarchical ? categoryFor(categoryParent) : null
  const all = categoryManagementItems(),
    rows = all.filter((c) => !categoryActive(c) === categoryArchived)
  const title = parent ? parent.title : categoryGroups[categoryGroup],
    noun = hierarchical ? (parent ? '二级分类' : '一级分类') : '分类'
  screen.innerHTML = `<header class="detail-head"><button class="iconbtn" ${parent ? 'data-category="back"' : 'data-g4="settings-back"'} aria-label="${parent ? '返回一级分类' : '返回设置'}">${icon('left')}</button><h1>${escapeHTML(title)}</h1><button class="iconbtn push-right" data-category="${parent ? 'edit-parent' : 'new'}" aria-label="${parent ? '编辑一级分类' : '新增' + noun}">${icon(parent ? 'settings' : 'plus')}</button></header>
    ${parent ? `<div class="category-parent-context">${glyph(parent.icon, parent.color)}<div><strong>${categoryGroups[categoryGroup]} · 一级分类</strong><p>${categoryReferences(parent)} 条记录直接使用此分类</p></div></div><div class="sectionhead"><h2>二级分类</h2><button class="subtle-button" data-category="new" ${categoryActive(parent) ? '' : 'disabled'}>${icon('plus', true)} 新增二级分类</button></div>${categoryActive(parent) ? '' : '<p class="helper">一级分类已归档。可在右上角编辑并恢复，再新增二级分类。</p>'}` : `<p class="detail-copy">${hierarchical ? '点击一级分类，查看或新增二级分类。' : '改名同步显示在历史中，归档不删除记录。'}</p>`}
    <div class="segmented" aria-label="分类状态"><button data-category="filter" data-value="active" aria-pressed="${!categoryArchived}">使用中 ${all.filter((c) => categoryActive(c)).length}</button><button data-category="filter" data-value="archived" aria-pressed="${categoryArchived}">已归档 ${all.filter((c) => !categoryActive(c)).length}</button></div>
    <div class="category-management-list">${rows.map((c) => `<button class="record" data-category="${hierarchical && !parent ? 'open-parent' : 'edit'}" data-id="${c.id}">${glyph(c.icon, c.color)}<span class="meta"><strong>${escapeHTML(c.title)}</strong><small>${hierarchical && !parent ? categoryBook.filter((child) => child.parentId === c.id).length + ' 个二级分类 · ' : ''}${categoryReferences(c)} 条直接记录${!categoryActive(c) ? ' · 已归档' : ''}</small></span>${icon('right', true)}</button>`).join('') || `<div class="empty">${categoryArchived ? '没有已归档的' + noun : parent ? '还没有二级分类' : '还没有' + noun}${parent && !categoryArchived ? '<p>不细分也能记账，需要时再添加。</p>' : ''}</div>`}</div>
    <p class="sample-caption">合成样本 · 改名与归档不会删除历史记录</p>`
}
function categoryPreview() {
  const data = Object.fromEntries(new FormData(form))
  form.querySelector('#category-preview').innerHTML =
    `${glyph(data.icon, data.color)}<span>${escapeHTML(data.title.trim() || '分类预览')}</span>`
}
function openCategoryEditor(id = null) {
  const c = id ? categoryFor(id) : null
  // Parent context is captured on entry; users never re-select a parent or accidentally create a third level.
  categoryDraftParent = c?.parentId || (!c ? categoryParent : null)
  const parent = categoryFor(categoryDraftParent),
    hierarchical = ['expense', 'income'].includes(categoryGroup)
  if (!c && categoryDraftParent && (!parent || !categoryActive(parent))) {
    toast('请先恢复一级分类')
    log('category.create_blocked_parent', 'settings')
    return
  }
  const editorLabel =
    (c ? '编辑' : '新增') + (hierarchical ? (parent ? '二级分类' : '一级分类') : '分类')
  categoryEditing = c?.id ?? null
  categoryDraftId = c?.id ?? 'custom-' + ++sequence
  draftKind = 'category-edit'
  editingId = null
  editorScroll = screen.scrollTop
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${editorLabel}</h2><button class="iconbtn" type="button" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body"><p class="helper">${categoryGroups[categoryGroup]} · 类型固定，不能改为其他模块的分类</p>${parent ? `<p class="category-editor-context">${glyph(parent.icon, parent.color)}<span>所属一级：<strong>${escapeHTML(parent.title)}</strong></span></p>` : ''}<div id="category-preview" class="category-live-preview"></div><label class="field"><span>分类名称</span><input name="title" maxlength="40" value="${escapeHTML(c?.title || '')}" placeholder="例如：早餐"></label><label class="field"><span>图标分组 · ${Object.keys(categorySymbols).length} 个图标</span><select id="category-icon-group">${Object.entries(
    categoryIconGroups,
  )
    .map(
      ([id, group]) =>
        `<option value="${id}" ${id === categoryIconGroupFor(c?.icon || parent?.icon || 'bag') ? 'selected' : ''}>${group.label}</option>`,
    )
    .join(
      '',
    )}</select></label><fieldset class="category-symbols"><legend>选择图标</legend>${Object.entries(
    categorySymbols,
  )
    .map(
      ([id, label]) =>
        `<label><input type="radio" name="icon" value="${id}" ${(c?.icon || parent?.icon || 'bag') === id ? 'checked' : ''}><span>${icon(id)}<small>${label}</small></span></label>`,
    )
    .join(
      '',
    )}</fieldset><p class="helper" id="icon-group-count" role="status"></p><details class="focus-extras"><summary>颜色 · 可选</summary><fieldset class="category-color-options"><legend>颜色</legend>${Object.entries(
    categoryColors,
  )
    .map(
      ([id, label]) =>
        `<label><input type="radio" name="color" value="${id}" ${(c?.color || parent?.color || 'blue') === id ? 'checked' : ''}><span class="glyph ${id}">${icon('check', true)}</span><small>${label}</small></label>`,
    )
    .join(
      '',
    )}</fieldset></details><p id="form-error" class="error" role="alert"></p>${c ? `<button type="button" class="subtle-button ${c.archived ? '' : 'danger'}" data-category="archive">${c.archived ? '恢复这个分类' : '归档这个分类'}</button><p class="helper">${categoryReferences(c)} 条记录引用。${c.archived ? '恢复后可用于新增记录。' : '归档后，历史仍保留名称与图标；编辑原记录可保留此分类。'}</p>` : ''}<button type="button" class="subtle-button" data-action="fail-write">演示下一次写入失败</button></div><div class="sheet-footer"><button type="submit" class="primary">保存分类</button></div>`
  categoryPreview()
  filterCategoryIcons(form.querySelector('#category-icon-group').value)
  initialDraft = draftSnapshot()
  editor.showModal()
  form.elements.namedItem('title').focus()
  log('category.editor_opened', 'settings')
}
async function categoryWrite(operation, mutate) {
  if (busy) {
    log('category.busy', 'settings')
    return false
  }
  busy = true
  const controls = [...document.querySelectorAll('button,input,select')]
  controls.forEach((el) => (el.disabled = true))
  log('category.' + operation + '.started', 'settings')
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (failNext) {
      failNext = false
      throw new Error('preview_failure')
    }
    mutate()
    log('category.' + operation + '.saved', 'settings')
    return true
  } catch {
    error('未能保存，分类和输入保持不变。请重试。')
    log('category.' + operation + '.failed', 'settings')
    return false
  } finally {
    busy = false
    controls.forEach((el) => (el.disabled = false))
  }
}
async function saveCategory(data) {
  if (!data.title.trim() || data.title.trim().length > 40) {
    error('请输入 1–40 字的分类名称。', 'title')
    return
  }
  if (!categorySymbols[data.icon] || !categoryColors[data.color]) {
    error('请选择图标与颜色。')
    return
  }
  const parentId = categoryEditing ? categoryFor(categoryEditing)?.parentId : categoryDraftParent
  const parent = categoryFor(parentId)
  // Validate only new hierarchy assignments; archived historical categories remain editable.
  if (
    !categoryEditing &&
    parentId &&
    (!['expense', 'income'].includes(categoryGroup) ||
      !parent ||
      parent.group !== categoryGroup ||
      parent.parentId ||
      !categoryActive(parent))
  ) {
    error('请选择同类型且使用中的一级分类。')
    log('category.parent_invalid', 'settings')
    return
  }
  form.querySelector('[type=submit]').textContent = '保存中…'
  const saved = await categoryWrite(categoryEditing ? 'rename' : 'create', () => {
    const fields = { title: data.title.trim(), icon: data.icon, color: data.color }
    if (categoryEditing) {
      const existing = categoryFor(categoryEditing)
      if (!existing) throw new Error('missing_category')
      Object.assign(existing, fields)
    } else {
      const c = { ...fields, id: categoryDraftId, group: categoryGroup, parentId, archived: false }
      categoryBook.push(c)
      if (['expense', 'income'].includes(c.group)) categories[c.id] = c
    }
  })
  if (saved) {
    editor.close()
    draftKind = ''
    categoryArchived = !categoryActive(categoryFor(categoryDraftId))
    render()
    screen.scrollTop = editorScroll
    toast('分类已保存，历史引用保持不变')
  } else form.querySelector('[type=submit]').textContent = '重试保存'
}
document.addEventListener('change', (event) => {
  if (event.target.id === 'category-icon-group') filterCategoryIcons(event.target.value)
})
document.addEventListener('input', (event) => {
  if (draftKind === 'category-edit' && event.target.closest('#record-form')) categoryPreview()
})
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-category]')
  if (!button || button.disabled || busy) return
  const action = button.dataset.category
  log('category.ui.' + action, 'settings')
  if (action === 'open-parent') {
    const parent = categoryFor(button.dataset.id)
    if (!parent || parent.parentId || parent.group !== categoryGroup) {
      log('category.parent_navigation_invalid', 'settings')
      return
    }
    categoryRootArchived = categoryArchived
    categoryRootScroll = screen.scrollTop
    categoryParent = parent.id
    categoryArchived = !categoryActive(parent)
    categoryManagement()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    return
  }
  if (action === 'back') {
    const parentId = categoryParent
    categoryParent = null
    categoryArchived = categoryRootArchived
    categoryManagement()
    screen.scrollTop = categoryRootScroll
    ;(screen.querySelector(`[data-category="open-parent"][data-id="${parentId}"]`) || screen).focus(
      { preventScroll: true },
    )
    return
  }
  if (action === 'edit-parent') openCategoryEditor(categoryParent)
  if (action === 'new') openCategoryEditor()
  if (action === 'edit') openCategoryEditor(button.dataset.id)
  if (action === 'filter') {
    categoryArchived = button.dataset.value === 'archived'
    categoryManagement()
    screen.scrollTop = 0
  }
  if (action === 'archive') {
    const c = categoryFor(categoryEditing)
    if (!c) {
      error('分类已不存在，请关闭后重新选择。')
      return
    }
    const archive = !c.archived
    // Archive never deletes references. Follow effective parent status after restoring a child,
    // so it remains visible in Archived while its parent still blocks new records.
    ask(
      archive ? '归档这个分类？' : '恢复这个分类？',
      archive
        ? '它及其二级分类将从新增记录选项中移出，已有记录保留。未保存的名称、图标和颜色修改将放弃。'
        : '恢复后，若父级仍归档，需先恢复父级才能用于新增。未保存的名称、图标和颜色修改将放弃。',
      archive ? '归档分类' : '恢复分类',
      async () => {
        if (
          await categoryWrite(archive ? 'archive' : 'restore', () => {
            c.archived = archive
          })
        ) {
          editor.close()
          draftKind = ''
          categoryArchived = !categoryActive(c)
          render()
          toast(
            archive
              ? '已归档，历史记录保留'
              : categoryActive(c)
                ? '分类已恢复'
                : '分类已恢复；需先恢复一级分类才能用于新增',
          )
        }
      },
      '返回编辑',
    )
  }
})
