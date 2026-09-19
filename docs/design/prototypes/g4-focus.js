'use strict'

// C1 is an isolated, in-memory interaction model; no timer or record survives a reload.
function focusNow() {
  return new Date(today + 'T12:00:00').getTime() + Date.now() - previewOpenedAt + focusDemoOffset
}
function focusDate(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function focusTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}
function focusDurationLabel(seconds) {
  const minutes = Math.floor(seconds / 60),
    rest = seconds % 60
  return minutes ? `${minutes} 分${rest ? ` ${rest} 秒` : '钟'}` : `${seconds} 秒`
}
function focusClock(seconds) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor(seconds / 60) % 60
  return (
    (hours ? `${String(hours).padStart(2, '0')}:` : '') +
    `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  )
}
function focusCategories(selected = '') {
  return categoryOptions('focus', selected, true)
}
function focusCategoryLabel(id) {
  return escapeHTML(categoryLabel(id))
}
function focusDirty() {
  return Boolean(focusTitle || focusCategory || focusNote || focusDuration !== 25 || customDuration)
}
function resetFocusDraft() {
  focusTitle = ''
  focusCategory = ''
  focusNote = ''
  focusDuration = 25
  customDuration = false
  focusExtras = false
}
function focusRows(rows) {
  return (
    [...rows]
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(
        (item) =>
          `<button class="record" data-focus="edit" data-id="${item.id}">${glyph(categoryFor(item.category)?.icon || 'timer', categoryFor(item.category)?.color || 'purple')}<span class="meta"><strong>${escapeHTML(item.title)}</strong><small>${item.date} · ${focusTime(item.startedAt).slice(0, 5)} · ${focusCategoryLabel(item.category)}</small><small>${item.completionKind === 'early' ? '提前结束' : '计时完成'}</small></span><span class="focus-record-duration">${focusDurationLabel(item.seconds)}</span>${icon('right', true)}</button>`,
      )
      .join('') || '<p class="empty">还没有完成的专注。开始一段自己的时间。</p>'
  )
}
function focus() {
  if (focusSection === 'history') {
    focusHistoryPage()
    return
  }
  const running = Boolean(session),
    pending = Boolean(session?.pending)
  const rows = focusHistory.filter((row) => row.date === today),
    total = rows.reduce((sum, row) => sum + row.seconds, 0)
  screen.innerHTML =
    header(
      '专注',
      running ? '把这一段时间，留给眼前' : '一次只做一件事',
      `<button class="iconbtn" data-action="focus-history" aria-label="查看专注记录">${icon('history')}</button>`,
    ) +
    `
    <section class="focus-stage" aria-label="专注计时"><svg class="orbit" viewBox="0 0 390 294" aria-hidden="true"><path d="M43 233 A169 169 0 0 1 304 49" fill="none" stroke="var(--line)" stroke-width="1.5"/><path id="progress-arc" d="M43 233 A169 169 0 0 1 304 49" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100"/><circle cx="43" cy="233" r="4" fill="var(--accent)"/><text x="29" y="258" fill="var(--muted)" font-size="10">0 分钟</text><text x="311" y="48" fill="var(--muted)" font-size="10">${session ? session.duration : focusDuration} 分钟</text></svg><p class="label">${running ? escapeHTML(session.title) : '准备好，进入专注'}</p><div id="clock" class="clock" role="timer" aria-live="off">${focusClock((session ? session.duration : focusDuration) * 60)}</div><p id="focus-note" class="note">${pending ? '操作待保存 · 已保留本次结果' : running ? '离开此页，计时继续' : '留一点空间，让注意力安静下来'}</p></section>
    <section class="focus-controls">${running ? (pending ? '<p class="error" role="alert">未能保存本次操作。重试不会增加时长或重复记录。</p><button class="primary" data-focus="retry">重试保存本次操作</button>' : `<button class="primary" data-action="finish">提前结束</button><button class="subtle-button full" data-action="cancel-focus">取消本次专注</button>`) : `<div class="segmented" aria-label="专注时长">${[25, 50].map((n) => `<button data-action="duration" data-value="${n}" aria-pressed="${!customDuration && focusDuration === n}">${n} 分钟</button>`).join('')}<button data-action="custom-duration" aria-pressed="${customDuration}">自定义</button></div><div id="custom-time" class="time-custom" ${customDuration ? '' : 'hidden'}><label for="custom-minutes">分钟</label><input id="custom-minutes" type="number" min="1" max="240" value="${focusDuration}"></div><div class="focus-task"><label for="focus-title">这次想做什么？</label><input id="focus-title" maxlength="100" placeholder="例如：阅读、写作" value="${escapeHTML(focusTitle)}"></div><details class="focus-extras" ${focusExtras ? 'open' : ''}><summary>分类与备注 <small>可选</small></summary><label class="field"><span>专注分类</span><select id="focus-category">${focusCategories(focusCategory)}</select></label><label class="field"><span>专注备注</span><input id="focus-note-input" maxlength="500" value="${escapeHTML(focusNote)}" placeholder="留下一点上下文"></label></details><p id="focus-error" class="error" role="alert">${escapeHTML(focusError)}</p><button class="primary" data-action="start">${icon('play', true)} 开始专注</button>`}</section>
    <div class="focus-summary"><span>今天完成 <strong>${rows.length}</strong> 次</span><span>累计 <strong>${focusDurationLabel(total)}</strong></span></div><section class="focus-history"><div class="sectionhead"><h2>今天的记录</h2><button class="subtle-button" data-action="focus-history">全部记录 ${icon('right', true)}</button></div>${focusRows(rows)}</section><details class="focus-demo"><summary>原型验证工具</summary><p class="helper">固定演示日期 9 月 18 日。推进只影响原型时钟，不修改设备时间。</p><button class="subtle-button" data-action="fail-write">演示下一次写入失败</button>${session && !pending ? '<button class="secondary full" data-focus="advance">推进到计时结束（演示）</button>' : ''}</details><p class="focus-footer">仅内存演示 · 刷新会重置，不代表后台持久化已验证</p>`
  if (!running && (!Number.isInteger(focusDuration) || focusDuration < 1 || focusDuration > 240))
    updateDurationPreview()
  updateClock()
}
function updateClock() {
  if (!session) return
  const now = session.pending?.endedAt ?? focusNow()
  const remaining = Math.max(0, Math.ceil((session.endsAt - now) / 1000))
  const clock = document.querySelector('#clock')
  if (clock) {
    clock.textContent = focusClock(remaining)
    document
      .querySelector('#progress-arc')
      .setAttribute('stroke-dashoffset', String((100 * remaining) / (session.duration * 60)))
  }
  // Reconciliation is idempotent, and never interrupts another editor or retries a failed write invisibly.
  if (!remaining && !session.pending && !busy && !editor.open && !confirmation.open)
    void completeFocus(false)
}
async function focusWrite(operation, mutate) {
  if (busy) {
    log('focus.write_blocked_busy', 'focus')
    return false
  }
  busy = true
  const controls = [...document.querySelectorAll('button,input,select')]
  controls.forEach((el) => (el.disabled = true))
  log('focus.' + operation + '.started', 'focus')
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (failNext) {
      failNext = false
      throw new Error('preview_failure')
    }
    mutate()
    log('focus.' + operation + '.saved', 'focus')
    return true
  } catch {
    log('focus.' + operation + '.failed', 'focus')
    return false
  } finally {
    busy = false
    controls.forEach((el) => (el.disabled = false))
  }
}
async function startFocus() {
  if (session || busy) {
    log('focus.duplicate_start_blocked', 'focus')
    return
  }
  if (
    !focusTitle.trim() ||
    !Number.isInteger(focusDuration) ||
    focusDuration < 1 ||
    focusDuration > 240
  ) {
    focusError = '请填写事项，并选择 1–240 的整数分钟。'
    document.querySelector('#focus-error').textContent = focusError
    log('focus.validation_failed', 'focus')
    return
  }
  if (focusCategory && !categoryAllowed(focusCategory, 'focus')) {
    focusError = '所选分类已归档，请改选或使用未分类。'
    document.querySelector('#focus-error').textContent = focusError
    log('focus.category_invalid', 'focus')
    return
  }
  document.querySelector('[data-action=start]').textContent = '正在开始…'
  const saved = await focusWrite('start', () => {
    const startedAt = focusNow()
    session = {
      id: ++sequence,
      title: focusTitle.trim(),
      category: focusCategory,
      note: focusNote.trim(),
      duration: focusDuration,
      startedAt,
      endsAt: startedAt + focusDuration * 60000,
      date: focusDate(startedAt),
    }
    resetFocusDraft()
    focusError = ''
  })
  if (!saved) focusError = '未能开始，本次输入已保留。请重试。'
  render()
}
async function completeFocus(cancelled) {
  if (!session || busy) return
  // Freeze the requested endpoint before waiting: failed/retried writes cannot inflate duration.
  if (!session.pending) {
    const endedAt = Math.min(focusNow(), session.endsAt),
      seconds = Math.max(0, Math.floor((endedAt - session.startedAt) / 1000))
    session.pending = {
      cancelled,
      endedAt,
      seconds,
      kind: endedAt >= session.endsAt ? 'timer' : 'early',
    }
  }
  const current = session,
    result = current.pending
  const saved = await focusWrite(result.cancelled ? 'cancel' : 'finish', () => {
    if (
      !result.cancelled &&
      result.seconds >= 1 &&
      !focusHistory.some((row) => row.id === current.id)
    )
      focusHistory.push({
        ...current,
        seconds: result.seconds,
        endedAt: result.endedAt,
        completionKind: result.kind,
        pending: undefined,
      })
    session = null
  })
  if (view === 'focus' || view === 'today') render()
  toast(
    saved
      ? result.cancelled || result.seconds < 1
        ? '本次未计入完成记录'
        : '专注已记录'
      : '未能保存，请回专注页重试。结果已保留。',
  )
}
function openFocusHistory() {
  const open = () => {
    focusSection = 'history'
    focusRange = 'all'
    render()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    log('focus.history_opened', 'focus')
  }
  if (!session && focusDirty())
    ask(
      '离开尚未开始的专注？',
      '进入历史将放弃尚未提交的事项、分类、备注和时长。',
      '放弃并查看',
      () => {
        resetFocusDraft()
        open()
      },
      '继续编辑',
    )
  else open()
}
function focusHistoryPage() {
  const rows = focusHistory.filter(
    (row) =>
      focusRange === 'all' ||
      (focusRange === 'today'
        ? row.date === today
        : focusRange === 'month'
          ? row.date.startsWith(today.slice(0, 7))
          : row.date >= '2026-09-14' && row.date <= today),
  )
  const total = rows.reduce((sum, row) => sum + row.seconds, 0)
  const groups = new Map()
  rows.forEach((row) => groups.set(row.category, (groups.get(row.category) || 0) + row.seconds))
  screen.innerHTML = `<header class="detail-head"><button class="iconbtn" data-focus="back" aria-label="返回专注">${icon('left')}</button><h1>专注记录</h1></header><div class="segmented" aria-label="记录范围">${[
    ['today', '今天'],
    ['week', '本周'],
    ['month', '本月'],
    ['all', '全部'],
  ]
    .map(
      ([id, label]) =>
        `<button data-focus="range" data-value="${id}" aria-pressed="${focusRange === id}">${label}</button>`,
    )
    .join(
      '',
    )}</div><div class="focus-summary"><span>已完成 <strong>${rows.length}</strong> 次</span><strong>${focusDurationLabel(total)}</strong></div>${session ? '<button class="setting-row" data-focus="back">' + glyph('timer', 'purple') + '<span class="meta"><strong>返回当前专注</strong><small>进行中或待保存的会话不计入完成统计</small></span>' + icon('right', true) + '</button>' : ''}<section aria-label="分类汇总">${[
    ...groups,
  ]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, seconds]) =>
        `<div class="focus-category-total"><span>${focusCategoryLabel(category)}</span><strong>${focusDurationLabel(seconds)}</strong></div>`,
    )
    .join(
      '',
    )}</section><div class="sectionhead"><h2>完成记录</h2><small>点记录查看与编辑</small></div>${focusRows(rows)}<p class="sample-caption">按开始日期归属 · 取消不计入 · 合成记录</p>`
}
function openFocusEditor(id) {
  const row = focusHistory.find((item) => item.id === id)
  if (!row) {
    toast('记录不存在，请重新选择')
    log('focus.record_missing', 'focus')
    return
  }
  editingId = id
  draftKind = 'focus-edit'
  editorScroll = screen.scrollTop
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">专注记录详情</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body"><dl class="backup-facts"><div><dt>开始</dt><dd>${row.date} ${focusTime(row.startedAt)}</dd></div><div><dt>结束</dt><dd>${focusDate(row.endedAt)} ${focusTime(row.endedAt)}</dd></div><div><dt>${row.completionKind === 'early' ? '提前结束' : '计时完成'}</dt><dd>${focusDurationLabel(row.seconds)}</dd></div></dl><p class="helper">仅编辑描述。日期、时长与完成方式保持原始记录。</p><label class="field"><span>专注事项</span><input name="title" maxlength="100" value="${escapeHTML(row.title)}"></label><label class="field"><span>分类</span><select name="category">${focusCategories(row.category)}</select></label><label class="field"><span>备注 · 可选</span><input name="note" maxlength="500" value="${escapeHTML(row.note)}"></label><p id="form-error" class="error" role="alert"></p><button type="button" class="subtle-button danger" data-focus="delete">删除这条专注记录</button><button type="button" class="subtle-button" data-action="fail-write">演示下一次写入失败</button></div><div class="sheet-footer"><button type="submit" class="primary">保存描述</button></div>`
  initialDraft = draftSnapshot()
  editor.showModal()
  form.elements.namedItem('title').focus()
  log('focus.editor_opened', 'focus')
}
async function saveFocusEdit(data) {
  if (
    data.category &&
    !categoryAllowed(data.category, 'focus', focusHistory.find((r) => r.id === editingId)?.category)
  ) {
    error('请选择可用分类，或保留原分类。', 'category')
    return
  }
  if (!data.title.trim()) {
    error('专注事项不能为空。', 'title')
    return
  }
  form.querySelector('[type=submit]').textContent = '保存中…'
  const saved = await focusWrite('edit', () => {
    const row = focusHistory.find((item) => item.id === editingId)
    if (!row) throw new Error('missing_record')
    Object.assign(row, {
      title: data.title.trim(),
      category: data.category,
      note: data.note.trim(),
    })
  })
  if (saved) {
    editor.close()
    draftKind = ''
    render()
    restoreEditorContext()
    toast('描述已保存，计时时长未改变')
  } else {
    error('未能保存，输入已保留。计时时长没有改变。')
    form.querySelector('[type=submit]').textContent = '重试保存'
  }
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-focus]')
  if (!button || button.disabled || busy) return
  const action = button.dataset.focus
  log('focus.ui.' + action, 'focus')
  if (action === 'back') {
    focusSection = ''
    render()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
  }
  if (action === 'range') {
    focusRange = button.dataset.value
    focusHistoryPage()
  }
  if (action === 'edit') openFocusEditor(Number(button.dataset.id))
  if (action === 'retry') await completeFocus(session?.pending?.cancelled || false)
  if (action === 'advance' && session && !session.pending) {
    focusDemoOffset += Math.max(0, session.endsAt - focusNow())
    log('focus.demo_clock_advanced', 'focus')
    updateClock()
  }
  if (action === 'delete')
    ask(
      '删除这条专注记录？',
      '删除后不能在应用内撤销，累计次数和时长将重新计算，未保存的描述也会放弃。原型刷新可重置样本。',
      '删除记录',
      async () => {
        const saved = await focusWrite('delete', () => {
          const index = focusHistory.findIndex((row) => row.id === editingId)
          if (index < 0) throw new Error('missing_record')
          focusHistory.splice(index, 1)
        })
        if (saved) {
          editor.close()
          draftKind = ''
          render()
          restoreEditorContext()
          toast('专注记录已删除')
        } else error('未能删除，记录和输入已保留。请重试。')
      },
      '保留记录',
    )
})
document.addEventListener('input', (event) => {
  if (event.target.id === 'focus-category') focusCategory = event.target.value
  if (event.target.id === 'focus-note-input') focusNote = event.target.value
  if (
    ['focus-title', 'focus-category', 'focus-note-input', 'custom-minutes'].includes(
      event.target.id,
    )
  ) {
    focusError = ''
    const message = document.querySelector('#focus-error')
    if (message) message.textContent = ''
  }
})
document.addEventListener(
  'toggle',
  (event) => {
    if (event.target.matches('.focus-extras')) focusExtras = event.target.open
  },
  true,
)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    log('focus.visibility_reconcile', 'focus')
    updateClock()
  }
})
