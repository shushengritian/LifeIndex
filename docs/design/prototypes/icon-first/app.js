/* Isolated design demonstration: synthetic memory only; no storage, files, service workers or network. */
const params = new URLSearchParams(location.search)
document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light'
const screen = document.getElementById('screen')
const nav = document.getElementById('nav')
const sheet = document.getElementById('sheet')
const discardConfirm = document.getElementById('discard-confirm')
let sheetDirty = false
const paths = {
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  right: 'm9 5 7 7-7 7',
  left: 'm15 5-7 7 7 7',
  down: 'm5 9 7 7 7-7',
  play: 'm8 4 12 8-12 8Z',
  stop: 'M6 6h12v12H6Z',
  chart: 'M4 20V11h3v9M10 20V4h3v16M16 20V8h3v12',
  clock: 'M12 8v5l3 2M9 2h6M12 2v3',
  calendar: 'M5 5h14v15H5ZM8 2v6M16 2v6M5 10h14m-9 4 2 2 4-4',
  heart: 'M12 20 4 12C-1 6 6 1 12 7c6-6 13-1 8 5ZM7 12h3l2-3 2 6 2-3h2',
  wallet: 'M3 6h17v14H3ZM3 6V3h13M15 11h5v5h-5Z',
  settings:
    'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  food: 'M5 3v7M8 3v7M2 3v7h6M5 10v11M17 3c-4 5-4 9 0 9V3v18',
  bag: 'M5 7h14l1 14H4ZM8 7V5a4 4 0 0 1 8 0v2',
  travel: 'm3 11 7 1 5-9 3 1-3 8 6 3-1 2-7-1-4 5-2-1 2-6-6-1Z',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7',
  book: 'M4 4h7v16H4ZM13 4h7v16h-7Z',
  weight: 'M4 4h16v16H4ZM8 8a6 6 0 0 1 8 0M12 7v4',
  shoe: 'M3 14 8 5l4 2-1 5 9 4v4H3Z',
  leaf: 'M4 20C2 10 8 3 20 3c0 12-5 18-16 17ZM4 20 15 9',
  edit: 'm4 16 12-12 4 4L8 20H4ZM13 7l4 4',
}
function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.heart}"/>${name === 'clock' ? '<circle cx="12" cy="14" r="8"/>' : ''}</svg>`
}
function ib(action, name, label, style = '') {
  return `<button class="ib ${style}" data-action="${action}" aria-label="${label}" title="${label}">${icon(name)}</button>`
}
function glyph(name, color = '') {
  return `<span class="glyph ${color}">${icon(name)}</span>`
}
function head(title, actions = '') {
  return `<header class="page-head"><h1>${title}</h1><div class="tools">${actions}</div></header>`
}
function sh(title, actions = '') {
  return `<div class="section-head"><h2>${title}</h2><div class="tools">${actions}</div></div>`
}
function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}
const routeNames = {
  today: '今天',
  health: '健康',
  focus: '专注',
  finance: '记账',
  settings: '设置',
}
const routeIcons = {
  today: 'calendar',
  health: 'heart',
  focus: 'clock',
  finance: 'wallet',
  settings: 'settings',
}
let view = params.get('view') || 'focus'
let selectedDay = 21
let checked = false
let duration = 25
let task = '阅读一章书'
let started = view === 'running' ? Date.now() - 180000 : null
let savedSeconds = 0
let entryReturn = 'finance'
let amount = ''
let category = 'food'
let child = '午餐'
let draftDirty = false
let entryBusy = false
let weight = '62.4'
let activity = '30'
let plan = false
let ledger = []
const categoryNames = { food: '餐饮', travel: '旅行', bag: '购物', home: '居家' }
const childNames = {
  food: ['早餐', '午餐', '晚餐'],
  travel: ['交通', '住宿', '门票'],
  bag: ['日用', '服饰'],
  home: ['水电', '用品'],
}
function log(event, context = {}) {
  console.info(`[design-prototype] ${event}`, context)
}
function toast(message) {
  document.getElementById('status').textContent = message
  setTimeout(() => {
    document.getElementById('status').textContent = ''
  }, 3500)
}
function clock(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
function row(title, meta, name, action, color = '') {
  return `<button class="row" data-action="${action}">${glyph(name, color)}<span class="copy"><strong>${title}</strong><small>${meta}</small></span>${icon('right')}</button>`
}
// The content itself is the read target. The chevron is decorative, never a second touch target.
function contentLink(action, label, content) {
  return `<button class="content-link" data-action="${action}" aria-label="${label}"><span class="content-copy">${content}</span><span class="content-cue" aria-hidden="true">${icon('right')}</span></button>`
}
function habitRow() {
  // Read and write are sibling buttons: clicking the title cannot bubble into a check-in action.
  return `<div class="habit-row"><button class="habit-entry" data-action="habit-detail" aria-label="查看阅读习惯详情">${glyph('book', 'purple')}<span class="copy"><strong>阅读</strong><small>每天给自己一点时间</small></span></button><button class="ib ${checked ? 'primary' : 'soft'}" data-action="habit" aria-label="${checked ? '撤销演示打卡' : '完成今日阅读'}" aria-pressed="${checked}">${icon('check')}</button></div>`
}
function spark() {
  return '<svg class="spark" viewBox="0 0 320 88" role="img" aria-label="合成演示趋势"><path class="guide" d="M0 24H320M0 64H320"/><path d="M2 54 54 42 106 49 158 30 210 38 262 21 318 26"/></svg>'
}
function render() {
  const active = ['running'].includes(view)
  document.body.classList.toggle('running', active)
  // Editing is a protected scene: leave only through the draft-aware close control.
  document.body.classList.toggle('editing', view === 'entry')
  nav.hidden = active || view === 'entry'
  nav.innerHTML = Object.keys(routeNames)
    .map(
      (key) =>
        `<button data-action="nav:${key}" ${view === key || (['entry', 'report'].includes(view) && key === 'finance') ? 'aria-current="page"' : ''}>${icon(routeIcons[key])}<span>${routeNames[key]}</span></button>`,
    )
    .join('')
  const pages = {
    today: todayPage,
    health: healthPage,
    focus: focusPage,
    running: runningPage,
    finance: financePage,
    entry: entryPage,
    report: reportPage,
    settings: settingsPage,
  }
  screen.innerHTML = (pages[view] || focusPage)()
  if (active) updateTimer()
}
function todayPage() {
  return (
    head('今天') +
    '<p class="intro">9 月 21 日，周一</p>' +
    `<section class="panel">${sh('今日习惯')}${habitRow()}</section><section class="panel">${sh('今日账目', ib('new-entry', 'plus', '记一笔', 'soft'))}${contentLink('nav:finance', '查看今日账目', `<span class="summary"><span><small>支出</small><strong>¥${(48 + ledger.reduce((n, r) => n + r.amount, 0)).toFixed(2)}</strong></span><span><small>收入</small><strong>¥0.00</strong></span></span>`)}</section><section class="panel">${sh('今日专注', ib(started ? 'resume' : 'nav:focus', 'play', started ? '返回正在进行的专注' : '准备专注', 'soft'))}${contentLink('focus-history', '查看专注记录', `<span class="summary"><span><small>已保存时长</small><strong>${Math.floor(savedSeconds / 60)} <small>分钟</small></strong></span><span><small>进行中</small><strong>${started ? '1' : '0'} <small>次</small></strong></span></span>`)}</section>`
  )
}
function focusPage() {
  return (
    head('专注', ib('focus-history', 'chart', '查看专注记录')) +
    '<p class="intro">一次，只做一件事。</p>' +
    `<section class="panel focus-task"><div class="row">${glyph('book', 'purple')}<span class="copy"><strong>${esc(task)}</strong><small>${duration} 分钟 · ${started ? '正在进行' : '准备开始'}</small></span>${ib(started ? 'resume' : 'start', 'play', started ? '返回计时' : '开始专注', 'primary')}</div>${started ? '' : `<label>专注事项<input id="task" maxlength="100" value="${esc(task)}"></label><div class="segments" aria-label="专注时长">${[25, 50].map((n) => `<button data-action="duration:${n}" aria-pressed="${duration === n}">${n} 分钟</button>`).join('')}<button data-action="custom-duration" aria-pressed="${![25, 50].includes(duration)}">自定义</button></div>`}</section><section><div class="summary"><div><small>今日已保存</small><strong>${clock(savedSeconds)}</strong></div><div><small>目标时长</small><strong>${duration}<small> 分钟</small></strong></div></div></section>`
  )
}
function runningPage() {
  return `<div class="immersive"><header class="page-head">${ib('minimize', 'down', '收起计时，继续运行')}<small>专注中</small><span class="ib" aria-hidden="true"></span></header><div class="scene"><div class="dial"><svg viewBox="0 0 320 320" aria-hidden="true"><circle class="track" cx="160" cy="160" r="148"/><circle id="progress" class="progress" cx="160" cy="160" r="148" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/></svg><div class="dial-content"><h2>${esc(task)}</h2><strong class="clock" id="clock" role="timer" aria-live="off"></strong><small>剩余时间</small></div></div><p class="timer-foot muted"><span id="elapsed"></span> / ${duration} 分钟</p></div><div class="timer-actions">${ib('stop', 'stop', '结束本次专注', 'soft')}</div><p class="muted" style="text-align:center;font-size:12px">收起不会停止计时</p></div>`
}
function updateTimer() {
  if (!started) return
  const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000))
  const remaining = Math.max(0, duration * 60 - elapsed)
  if (view === 'running') {
    document.getElementById('clock').textContent = clock(remaining)
    document.getElementById('elapsed').textContent = `已专注 ${clock(elapsed)}`
    document
      .getElementById('progress')
      .setAttribute(
        'stroke-dashoffset',
        String(100 - Math.min(100, (elapsed / (duration * 60)) * 100)),
      )
  }
  // A timestamp remains the authority across navigation; the interval only repaints.
  if (!remaining) finishFocus(true)
}
function financePage() {
  const amounts = { 3: 18, 6: 32, 12: 25, 18: 16, 21: 48 }
  return (
    head('记账', ib('new-entry', 'plus', '记一笔', 'primary')) +
    `<section class="panel"><div class="split month"><h2>2026 年 9 月</h2><small>月历</small></div><div class="calendar">${['一', '二', '三', '四', '五', '六', '日'].map((s) => `<span class="weekday">${s}</span>`).join('')}<span></span>${Array.from(
      { length: 30 },
      (_, i) => i + 1,
    )
      .map(
        (d) =>
          `<button class="day" data-action="day:${d}" aria-label="9月${d}日${amounts[d] ? '，有支出' : ''}" aria-pressed="${selectedDay === d}">${d}<small>${amounts[d] ? '-' + amounts[d] : '&nbsp;'}</small></button>`,
      )
      .join(
        '',
      )}</div><div class="monthly"><div><small>本月结余</small><strong>−¥139.00</strong></div><div><small>支出</small><strong>¥139.00</strong></div><div><small>收入</small><strong>¥0.00</strong></div></div></section><section class="panel">${contentLink('nav:report', '查看记账报表', `<span class="row">${glyph('chart')}<span class="copy"><strong>收支报表</strong><small>分类分布 · 消费趋势</small></span></span>`)}</section><section>${sh(`9 月 ${selectedDay} 日`)}${selectedDay === 21 ? `<div class="panel">${row('餐饮 · 午餐', '合成样本 · ¥48.00', 'food', 'record-detail', 'orange')}${ledger.map((r) => row(categoryNames[r.category], `演示新增 · ¥${r.amount.toFixed(2)}`, r.category, 'record-detail')).join('')}</div>` : '<p class="muted">该日明细未在本轮演示中展开。</p>'}</section>`
  )
}
function entryPage() {
  return `<header class="page-head">${ib('close-entry', 'close', '关闭账目草稿')}<h2>记一笔</h2><button class="ib primary" data-action="save-entry" aria-label="保存账目" ${entryBusy ? 'disabled' : ''}>${icon('check')}</button></header><div class="amount"><label for="amount">支出金额 · 元</label><input id="amount" inputmode="decimal" value="${esc(amount)}" placeholder="0.00" aria-label="支出金额" autocomplete="off"></div><p id="entry-error" class="error" role="alert"></p><section class="panel"><div class="categories">${Object.entries(
    categoryNames,
  )
    .map(
      ([key, title]) =>
        `<button class="category" data-action="category:${key}" aria-pressed="${category === key}">${glyph(key, key === 'food' ? 'orange' : key === 'travel' ? 'purple' : '')}<span>${title}</span></button>`,
    )
    .join(
      '',
    )}</div><div class="children" aria-label="二级分类">${childNames[category].map((name) => `<button data-action="child:${name}" aria-pressed="${child === name}">${name}</button>`).join('')}</div><label>日期<input type="date" value="2026-09-21" id="entry-date"></label><label>备注<input id="note" placeholder="可不填" maxlength="280"></label></section><p class="muted" style="font-size:12px;margin-top:24px">设计演示仅保存金额与分类到本页内存，日期和备注展示布局，不写入真实账本。</p>`
}
function reportPage() {
  return (
    head('报表', ib('nav:finance', 'close', '返回记账')) +
    '<p class="intro">2026 年 9 月 · 支出 · 合成样本</p>' +
    `<section class="panel">${sh('每日支出')}${spark()}<div class="split"><small>9 月 1 日</small><small>9 月 21 日</small></div></section><section class="panel">${sh('分类分布')}${[
      ['food', '餐饮', 'orange', 60],
      ['travel', '旅行', 'purple', 25],
      ['bag', '购物', '', 15],
    ]
      .map(
        ([key, title, color, value]) =>
          `<div class="split"><div class="tools">${glyph(key, color)}<strong>${title}</strong></div><small>${value}%</small></div><div class="bar"><span style="width:${value}%"></span></div>`,
      )
      .join('')}<small>仅表达报表样式，不与日历样本联动。</small></section>`
  )
}
function healthPage() {
  // No-plan has a single full-card entry; only an existing plan exposes a separate event writer.
  const cessation = plan
    ? `<section class="panel">${sh('戒烟', ib('add-plan', 'plus', '记录戒烟事件', 'soft'))}${contentLink('plan-detail', '查看戒烟计划', '<strong>计划已开启</strong><small>演示状态，不产生真实记录</small>')}</section>`
    : `<section aria-label="戒烟"><button class="panel content-link plan-start" data-action="add-plan" aria-label="创建戒烟计划"><span class="content-copy"><strong class="section-title">戒烟</strong><span>给自己一个新的开始。</span><small>按自己的节奏，从今天开始。</small></span><span class="content-cue" aria-hidden="true">${icon('right')}</span></button></section>`
  return (
    head('健康') +
    `<section class="panel">${sh('体重', ib('add-weight', 'plus', '记录体重', 'soft'))}${contentLink('weight-history', '查看体重历史', `<span class="metric">${weight}<small>kg</small></span>${spark()}<span class="split"><small>近 7 次 · 合成趋势</small><small>目标 60 kg</small></span>`)}</section><section class="panel">${sh('运动', ib('add-activity', 'plus', '记录运动', 'soft'))}${contentLink('activity-history', '查看运动历史', `<span class="row">${glyph('shoe', 'orange')}<span class="copy"><strong>步行 · ${activity} 分钟</strong><small>本周 2 次 · 合成样本</small></span></span>`)}</section>${cessation}<section class="panel">${sh('习惯')}${habitRow()}${contentLink('habit-list', '查看全部习惯', '<strong>全部习惯</strong>')}</section>`
  )
}
function settingsPage() {
  return (
    head('设置') +
    '<p class="muted">设置沿用现有设计，本轮不重做。此原型没有文件选择、备份恢复或外部链接。</p>'
  )
}
function openSheet(html) {
  sheetDirty = false
  sheet.innerHTML = html
  sheet.showModal()
  log('sheet.opened')
}
function closeSheet() {
  sheetDirty = false
  sheet.close()
  log('sheet.closed')
}
// Keep the original sheet mounted under confirmation so its field values and focus are retained.
function requestSheetClose() {
  if (!sheetDirty) {
    closeSheet()
    return
  }
  discardConfirm.innerHTML =
    '<h2 id="discard-heading">放弃尚未保存的修改？</h2><p class="muted">继续编辑可以保留当前输入。</p><div class="confirm-actions"><button data-action="continue-sheet">继续编辑</button><button data-action="discard-sheet" class="danger">放弃修改</button></div>'
  discardConfirm.showModal()
  log('sheet.discard.requested')
}
function finishFocus(natural = false) {
  savedSeconds += Math.min(duration * 60, Math.max(0, Math.floor((Date.now() - started) / 1000)))
  started = null
  if (sheet.open) closeSheet()
  view = 'focus'
  render()
  log('focus.saved', { natural })
  toast('本次专注已保存到演示内存')
}
function closeEntry() {
  if (draftDirty)
    openSheet(
      '<h2>放弃这笔草稿？</h2><p class="muted">尚未保存的内容会丢失。</p><div class="confirm-actions"><button data-action="dismiss">继续编辑</button><button class="danger" data-action="discard-entry">放弃草稿</button></div>',
    )
  else {
    view = entryReturn
    render()
  }
}
// All actions are allowlisted and privacy-safe logs contain only action names, never input values.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]')
  if (!button || button.disabled) return
  const [action, value] = button.dataset.action.split(':')
  if (entryBusy) {
    log('action.blocked', { reason: 'saving' })
    return
  }
  log('action.entered', { action })
  if (button.matches('.content-link, .habit-entry')) {
    log('content.opened', { action, view })
  }
  if (action === 'nav') {
    view = value
    render()
    screen.scrollTop = 0
  } else if (action === 'new-entry') {
    entryReturn = view
    amount = ''
    draftDirty = false
    view = 'entry'
    render()
  } else if (action === 'day') {
    selectedDay = Number(value)
    render()
  } else if (action === 'habit') {
    checked = !checked
    render()
    toast(checked ? '已完成演示打卡' : '已撤销演示打卡')
  } else if (action === 'duration') {
    duration = Number(value)
    render()
  } else if (action === 'custom-duration') {
    openSheet(
      `<h2>专注时长</h2><label>分钟 · 1–240<input id="custom-minutes" type="number" min="1" max="240" value="${duration}"></label><div class="tools">${ib('dismiss', 'close', '取消修改')}${ib('save-duration', 'check', '确认时长', 'primary')}</div>`,
    )
  } else if (action === 'save-duration') {
    const minutes = Number(document.getElementById('custom-minutes').value)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      toast('请输入 1–240 的整数分钟')
      log('validation.failed', { field: 'duration' })
      return
    }
    duration = minutes
    closeSheet()
    render()
  } else if (action === 'start') {
    task = document.getElementById('task').value.trim()
    if (!task) {
      toast('先填写这次要专注的事项')
      log('validation.failed', { field: 'task' })
      return
    }
    started = Date.now()
    view = 'running'
    render()
    log('focus.started')
  } else if (action === 'resume') {
    view = 'running'
    render()
  } else if (action === 'minimize') {
    view = 'focus'
    render()
    log('focus.minimized')
  } else if (action === 'stop') {
    openSheet(
      '<h2>结束这次专注？</h2><p class="muted">保存已专注的时间，或继续保持专注。</p><div class="confirm-actions"><button data-action="finish">保存并结束</button><button data-action="dismiss">继续专注</button><button data-action="discard-focus" class="danger">放弃本次，不保存</button></div>',
    )
  } else if (action === 'finish') {
    finishFocus()
  } else if (action === 'discard-focus') {
    started = null
    closeSheet()
    view = 'focus'
    render()
    log('focus.discarded')
  } else if (action === 'dismiss') {
    requestSheetClose()
  } else if (action === 'continue-sheet') {
    discardConfirm.close()
    log('sheet.editing.resumed')
  } else if (action === 'discard-sheet') {
    discardConfirm.close()
    closeSheet()
    log('sheet.draft.discarded')
  } else if (action === 'category') {
    amount = document.getElementById('amount').value
    category = value
    child = childNames[value][0]
    draftDirty = true
    render()
  } else if (action === 'child') {
    amount = document.getElementById('amount').value
    child = value
    draftDirty = true
    render()
  } else if (action === 'close-entry') {
    closeEntry()
  } else if (action === 'discard-entry') {
    draftDirty = false
    closeSheet()
    view = entryReturn
    render()
    log('draft.discarded')
  } else if (action === 'save-entry') {
    const raw = document.getElementById('amount').value
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) {
      document.getElementById('entry-error').textContent = '请输入大于 0、最多两位小数的金额'
      log('validation.failed', { field: 'amount' })
      return
    }
    entryBusy = true
    button.disabled = true
    log('entry.saving')
    setTimeout(() => {
      ledger.push({ amount: Number(raw), category })
      entryBusy = false
      draftDirty = false
      view = entryReturn
      render()
      toast('已保存到演示内存')
      log('entry.saved')
    }, 400)
  } else if (action === 'add-weight' || action === 'add-activity') {
    const isWeight = action === 'add-weight'
    openSheet(
      `<header class="page-head">${ib('dismiss', 'close', '关闭录入')}<h2>${isWeight ? '体重' : '运动'}</h2>${ib(isWeight ? 'save-weight' : 'save-activity', 'check', '保存记录', 'primary')}</header><label>${isWeight ? '体重 · kg' : '步行 · 分钟'}<input id="health-value" type="number" step="${isWeight ? '0.1' : '1'}" min="1" value="${isWeight ? weight : activity}"></label><p class="muted">仅演示录入样式，数据保存在内存。</p>`,
    )
  } else if (action === 'save-weight' || action === 'save-activity') {
    const raw = document.getElementById('health-value').value
    if (!Number.isFinite(Number(raw)) || Number(raw) <= 0) {
      toast('请输入有效的正数')
      log('validation.failed', { field: 'health' })
      return
    }
    if (action === 'save-weight') weight = raw
    else activity = raw
    closeSheet()
    render()
    toast('已保存到演示内存')
    log('health.saved')
  } else if (action === 'add-plan') {
    if (plan) {
      openSheet(
        `<h2>记录当下</h2><div class="confirm-actions"><button data-action="demo-event">未吸烟</button><button data-action="demo-event">吸烟</button><button data-action="demo-event">烟瘾</button></div><div class="tools">${ib('dismiss', 'close', '关闭记录')}</div>`,
      )
    } else {
      openSheet(
        `<header class="page-head">${ib('dismiss', 'close', '关闭计划草稿')}<h2>戒烟计划</h2>${ib('save-plan', 'check', '确认创建计划', 'primary')}</header><label>开始日期<input type="date" value="2026-09-21"></label><p class="muted">本稿仅演示入口与工具栏，正式计划字段与校验沿用现有实现。</p>`,
      )
    }
  } else if (action === 'save-plan') {
    plan = true
    closeSheet()
    render()
    toast('演示计划已开启')
    log('plan.created')
  } else if (action === 'demo-event') {
    closeSheet()
    toast('已演示事件选择；本稿不模拟事件历史')
  } else {
    openSheet(
      `<header class="page-head"><h2>${action === 'focus-history' ? '专注记录' : action === 'weight-history' ? '体重历史' : action === 'activity-history' ? '运动历史' : action === 'plan-detail' ? '戒烟计划' : action === 'habit-list' ? '习惯' : action === 'habit-detail' ? '阅读习惯详情' : '账目详情'}</h2>${ib('dismiss', 'close', '关闭详情')}</header><p class="muted">本轮重点审核入口、图标与间距。此处沿用既有详情能力，不在本稿重复实现完整历史流程。</p>`,
    )
    log('detail.preview', { action })
  }
})
document.addEventListener('input', (event) => {
  if (sheet.contains(event.target)) sheetDirty = true
  if (event.target.id === 'task') task = event.target.value
  if (view === 'entry') {
    draftDirty = true
    if (event.target.id === 'amount') amount = event.target.value
  }
})
sheet.addEventListener('cancel', (event) => {
  event.preventDefault()
  requestSheetClose()
  log('sheet.cancel.requested')
})
setInterval(updateTimer, 1000)
log('initialized', { view, synthetic: true })
render()
