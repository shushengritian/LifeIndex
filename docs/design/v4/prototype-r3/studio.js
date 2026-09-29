/* global R3 */
icons.pause = '<path d="M8 5v14M16 5v14"/>'
icons.close = '<path d="m6 6 12 12M6 18 18 6"/>'
icons.back = '<path d="m14 5-7 7 7 7"/>'
icons.shield = '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>'
const params = new URLSearchParams(location.search)
const today = '2026-09-28'
const trace = (operation, context = {}) =>
  console.info('[lifeindex.r3]', { operation, ...context, synthetic: true })
const safe = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const money = (minor) =>
  (minor / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const clock = (seconds) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`
const mockRecords = () => [
  {
    id: 't1',
    kind: 'finance',
    title: '餐饮 · 咖啡',
    category: '咖啡',
    date: today,
    time: '09:16',
    minor: 2800,
    type: 'expense',
    note: '',
  },
  {
    id: 'f1',
    kind: 'focus',
    title: '阅读与思考',
    category: '阅读',
    date: today,
    time: '08:30',
    seconds: 1500,
    note: '',
  },
  {
    id: 'w1',
    kind: 'weight',
    title: '体重记录',
    category: '体重',
    date: today,
    time: '07:30',
    grams: 63200,
    note: '',
  },
  {
    id: 't2',
    kind: 'finance',
    title: '餐饮',
    category: '餐饮',
    date: '2026-09-14',
    time: '12:30',
    minor: 61400,
    type: 'expense',
    note: '',
  },
  {
    id: 't3',
    kind: 'finance',
    title: '生活用品',
    category: '日用',
    date: '2026-09-12',
    time: '18:30',
    minor: 40800,
    type: 'expense',
    note: '',
  },
  {
    id: 't4',
    kind: 'finance',
    title: '公共交通',
    category: '交通',
    date: '2026-09-10',
    time: '08:00',
    minor: 23600,
    type: 'expense',
    note: '',
  },
  {
    id: 't5',
    kind: 'finance',
    title: '工作收入',
    category: '工资',
    date: '2026-09-01',
    time: '10:00',
    minor: 800000,
    type: 'income',
    note: '',
  },
  {
    id: 'a1',
    kind: 'activity',
    title: '户外步行',
    category: '步行',
    date: '2026-09-27',
    time: '18:00',
    minutes: 35,
    intensity: '轻松',
    note: '',
  },
]
const mockHabits = () => [
  { id: 'h1', title: '晨间伸展', subtitle: '10 分钟，唤醒身体', icon: 'health', done: false },
  { id: 'h2', title: '读几页书', subtitle: '每天，给思绪留一点空间', icon: 'book', done: true },
  { id: 'h3', title: '到户外走走', subtitle: '工作日', icon: 'leaf', done: false },
  { id: 'h4', title: '整理桌面', subtitle: '每天', icon: 'bag', done: false },
  { id: 'h5', title: '写下今日回顾', subtitle: '每天', icon: 'today', done: false },
  { id: 'h6', title: '早点放下手机', subtitle: '每天', icon: 'focus', done: false },
]
// R3 is an isolated in-memory product model. No reads or writes target user IndexedDB or historical backups.
const state = {
  theme: params.get('theme') === 'dark' ? 'dark' : 'light',
  page: 'today',
  todayView: 'now',
  scenario: 'ready',
  records: mockRecords(),
  habits: mockHabits(),
  financeView: 'list',
  selectedDate: today,
  returnContext: undefined,
  modal: undefined,
  editor: undefined,
  focus: { status: 'idle', plannedSeconds: 1500, elapsedSeconds: 0, runningSince: undefined },
  confirmed: undefined,
}
const main = document.querySelector('#main')
const dialog = document.querySelector('#studio-dialog')
const body = document.querySelector('#dialog-body')
const confirmDialog = document.querySelector('#confirm-dialog')
let modalOrigin
let toastTimeout
const rosette = (className = '') =>
  `<svg class="${className}" viewBox="0 0 160 160" fill="none" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="80" cy="80" rx="64" ry="25" transform="rotate(${i * 15} 80 80)" stroke="currentColor" stroke-width="1.1"/>`).join('')}</svg>`
function currentSeconds() {
  // Display both counters from one integer snapshot; subsecond pause intervals remain accumulated.
  return Math.min(
    state.focus.plannedSeconds,
    Math.floor(
      state.focus.elapsedSeconds +
        (state.focus.status === 'running'
          ? Math.max(0, (Date.now() - state.focus.runningSince) / 1000)
          : 0),
    ),
  )
}
function sum(type, date) {
  return state.records
    .filter(
      (r) =>
        r.kind === 'finance' &&
        r.type === type &&
        (date ? r.date === date : r.date.startsWith(state.financeMonth)) &&
        (!date || r.date === date),
    )
    .reduce((total, r) => total + r.minor, 0)
}
function navigate(page) {
  // Route navigation changes presentation only; active or paused focus retains its clock state.
  if (dialog.open) closeModal(false)
  document.querySelector('#toast').hidden = true
  state.page = page
  trace('navigation.entered', { page })
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function navigation() {
  const nav = [
    ['today', '今天'],
    ['health', '健康'],
    ['focus', '专注'],
    ['finance', '记账'],
  ]
  const link = ([page, label], className) =>
    `<button type="button" class="${className}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(page)}<span>${label}</span></button>`
  const composer = `<button type="button" class="dock-compose" data-compose aria-haspopup="dialog" aria-label="记录，选择记录类型">${icon('add')}<span>记录</span></button>`
  document.querySelector('.mobile-dock').innerHTML =
    nav
      .slice(0, 2)
      .map((v) => link(v, 'dock-link'))
      .join('') +
    composer +
    nav
      .slice(2)
      .map((v) => link(v, 'dock-link'))
      .join('')
  document.querySelector('.studio-rail').innerHTML =
    `<div class="rail-brand">LifeIndex<small>日常，由你调频。</small></div>${nav.map((v) => link(v, 'rail-link')).join('')}<button class="button rail-compose" type="button" data-compose>${icon('add', 19)}记录生活</button><div class="rail-bottom">${link(['settings', '设置'], 'rail-link')}<div class="rail-note">只留在本机<br>没有账号，也没有云端</div></div>`
  document.querySelector('.settings-trigger').innerHTML = icon('settings', 17) + '<span>设置</span>'
}
const pageHeading = (title, subtitle, action = '') =>
  `<header class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</header>`
function habitStation(full = false) {
  return R3.habitStation(full)
}
function recordValue(record) {
  if (record.kind === 'habit') return '已完成'
  if (record.kind === 'finance')
    return `${record.type === 'expense' ? '−' : '+'} ¥ ${money(record.minor)}`
  if (record.kind === 'weight')
    return `${(record.grams / 1000).toLocaleString('zh-CN', { maximumFractionDigits: 3 })} kg`
  if (record.kind === 'activity') return `${record.minutes} 分钟`
  return `${Math.max(1, Math.floor(record.seconds / 60))} 分钟`
}
const recordGlyph = (record) =>
  record.kind === 'habit'
    ? 'check'
    : record.kind === 'finance'
      ? record.category === '咖啡'
        ? 'cup'
        : 'finance'
      : record.kind
function recordRows(records, timeline = false) {
  if (!records.length)
    return `<div class="empty-block"><h2>今天还很宽阔。</h2><p>一笔开销，一次运动，一段专注。<br>按下底部“记录”，留下第一条。</p><button type="button" class="button" data-compose>${icon('add', 18)}留下记录</button></div>`
  const content = (r) =>
    `<button type="button" class="record-button" ${r.kind === 'habit' ? `data-habit-detail="${r.habitId}"` : `data-record="${r.id}"`}><span class="record-sign">${icon(recordGlyph(r), 19)}</span><span class="record-copy"><strong>${safe(r.title)}</strong><small>${timeline ? { finance: '记账', weight: '健康 · 体重', activity: '健康 · 运动', focus: '专注 · 已保存', habit: '习惯 · 已完成' }[r.kind] : `${r.date === today ? '今天' : r.date.slice(5).replace('-', '月') + '日'}${r.timePrecision === 'instant' ? ` ${r.time}` : ' · 日期记录'}`}</small></span><span class="record-value">${recordValue(r)}${r.kind === 'finance' ? `<small>${r.type === 'expense' ? '支出' : '收入'}</small>` : ''}</span></button>`
  if (timeline) {
    // Unknown times form their own readable group, so entry timestamps cannot imply a fabricated daily chronology.
    const timed = records
      .filter((r) => r.timePrecision === 'instant')
      .sort((a, b) => b.time.localeCompare(a.time) || R3.recordOrder(a, b))
    const dated = records
      .filter((r) => r.timePrecision === 'day')
      .sort((a, b) => R3.recordOrder(a, b))
    return `${timed.length ? `<h2 class="trajectory-group">有明确时刻</h2><ol class="timeline-list">${timed.map((r) => `<li><time>${r.time}</time>${content(r)}</li>`).join('')}</ol>` : ''}${dated.length ? `<h2 class="trajectory-group">当日记录 · 未记录具体时刻</h2>${recordRows(dated)}` : ''}`
  }
  return `<ul class="records-list">${records.map((r) => `<li>${content(r)}</li>`).join('')}</ul>`
}
function resumeStrip() {
  const focus = state.focus
  return focus.status === 'idle'
    ? ''
    : `<div class="resume-strip">${icon(focus.status === 'paused' ? 'pause' : 'focus', 20)}<span><strong>${focus.status === 'paused' ? '这一段，已暂停' : focus.status === 'awaiting-save' ? '专注完成，待保存' : '专注还在继续'}</strong><span data-timer-used>${clock(currentSeconds())}</span> 已用 · ${focus.status === 'paused' ? '暂停期间不累计' : focus.status === 'awaiting-save' ? '时间已停止，等待保存' : '离开不会停止'}</span><button type="button" data-page="focus">返回专注</button></div>`
}
function todayPage() {
  const daily = [...state.records, ...R3.habitFacts()]
    .filter(
      (r) =>
        r.date === today &&
        !(state.scenario === 'finance-failed' && r.kind === 'finance') &&
        !(state.scenario === 'weight-failed' && r.kind === 'weight'),
    )
    .sort((a, b) => R3.recordOrder(a, b))
  return `<div class="today-title"><div><h1>把今天，<br>过成自己的。</h1><p>2026 年 9 月 28 日，星期一</p></div><div class="date-mark"><strong class="numeric">28</strong><span>九月 · MONDAY</span></div></div><div class="today-view-switch" role="group" aria-label="今天的视图"><button type="button" data-today-view="now" aria-pressed="${state.todayView === 'now'}">今日概览</button><button type="button" data-today-view="timeline" aria-pressed="${state.todayView === 'timeline'}">今日轨迹 <span>${daily.length}</span></button></div>${state.todayView === 'timeline' ? `<p class="timeline-note">9 月 28 日 · 仅展示已经保存的记录${['finance-failed', 'weight-failed'].includes(state.scenario) ? ' · 部分领域暂不可读取' : ''}</p>${recordRows(daily, true)}` : `${resumeStrip()}<div class="today-grid"><div>${habitStation()}<div class="action-panels"><section class="focus-tile"><div class="tile-top"><span>给自己一段专注</span></div>${rosette('tile-graphic')}<div class="tile-time numeric">${state.focus.status === 'idle' ? clock(state.focus.plannedSeconds) : clock(state.focus.plannedSeconds - currentSeconds())}</div><p>${state.focus.status === 'idle' ? '一次，只做一件事' : state.focus.status === 'paused' ? '已暂停 · 时间不累计' : state.focus.status === 'awaiting-save' ? '待保存 · 时间已停止' : '这一刻正在进行'}</p><button type="button" class="tile-action" data-page="focus">${state.focus.status === 'idle' ? '进入专注空间' : '回到专注空间'}<span>${icon('arrow', 17)}</span></button></section><section class="money-tile">${state.scenario === 'finance-failed' ? R3.failure('finance') : `<div><h2>今日支出</h2><div class="cash-value numeric"><small>¥</small>${money(sum('expense', today)).replace('.00', '')}</div><p>${daily.filter((r) => r.kind === 'finance').length} 笔收支记录</p></div><button type="button" class="text-button" data-report>本月报表 ${icon('arrow', 14)}</button>`}</section></div></div><div class="today-secondary"><div class="section-heading"><h2>刚刚留下的</h2><button type="button" class="text-button" data-today-view="timeline">全部轨迹 ${icon('arrow', 14)}</button></div>${recordRows(daily.slice(0, 3))}<div class="local-stamp">记录只在本机，随时可以带走</div></div></div>`}`
}
function financePage(report = false) {
  return R3.financePage(report)
}
function healthPage() {
  return R3.healthPage()
}
function focusPage() {
  const focus = state.focus
  // One render uses one clock snapshot, including the ring and both complementary counters.
  const elapsed = currentSeconds()
  const remaining = focus.plannedSeconds - elapsed
  const status = focus.status
  return `${pageHeading('专注空间', '不必做很多，只做眼前这一件。')}<div class="two-column"><section class="focus-space"><div class="focus-space-head"><span class="focus-status">${status === 'idle' ? '准备好，就开始' : status === 'running' ? '正在专注' : status === 'paused' ? '已暂停 · 不累计时间' : '完成 · 等待保存'}</span><button type="button" data-page="today">${status === 'idle' ? '返回今天' : status === 'paused' ? '收起，保持暂停' : status === 'awaiting-save' ? '收起，保留待保存' : '收起，继续计时'}</button></div><h2>${status === 'idle' ? '给重要的事，一点留白。' : status === 'paused' ? '等你准备好，再继续。' : '此刻，只需要在这里。'}</h2><div class="focus-sculpture" data-paused="${status === 'paused'}"><svg viewBox="0 0 280 280" fill="none" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<ellipse cx="140" cy="140" rx="118" ry="92" transform="rotate(${i * 10} 140 140)" stroke="currentColor" stroke-width=".45" opacity=".48"/>`).join('')}<circle cx="140" cy="140" r="123" stroke="currentColor" stroke-width="2.2" stroke-dasharray="772.83" data-focus-progress stroke-dashoffset="${772.83 * (elapsed / focus.plannedSeconds)}" transform="rotate(-90 140 140)"/></svg><div class="focus-digit numeric"><span data-timer-remaining>${clock(remaining)}</span><small>${status === 'paused' ? '暂停中' : status === 'idle' ? '分钟 : 秒' : '剩余时间'}</small></div></div>${status === 'idle' ? `<div class="duration-choices" aria-label="计划专注时长">${[15, 25, 45].map((n) => `<button type="button" data-duration="${n}" aria-pressed="${focus.plannedSeconds === n * 60}">${n} 分钟</button>`).join('')}</div><div class="focus-controls"><button type="button" class="button" data-focus-action="start">${icon('play', 18)}开始专注</button></div><p class="focus-note">默认名称为“自由专注”，完成后可编辑</p>` : `<div class="focus-controls"><button type="button" class="button" data-focus-action="${status === 'running' ? 'pause' : status === 'paused' ? 'resume' : 'save'}">${icon(status === 'running' ? 'pause' : 'play', 18)}${status === 'running' ? '暂停一下' : status === 'paused' ? '继续专注' : '重试保存'}</button><button type="button" class="button secondary" data-focus-action="finish">结束</button></div><p class="focus-note">已专注 <span data-timer-used>${clock(elapsed)}</span> · 目标 ${focus.plannedSeconds / 60} 分钟</p>`}</section><div class="focus-side"><div class="section-heading"><h2>今天的专注</h2><span>仅已保存</span></div><div class="focus-history-value numeric">${Math.floor(state.records.filter((r) => r.kind === 'focus' && r.date === today).reduce((n, r) => n + r.seconds, 0) / 60)}<small>分钟</small></div><p class="body-copy">暂停让时间停下来。<br>收起让空间留出来。<br>两种选择，由你决定。</p>${recordRows(state.records.filter((r) => r.kind === 'focus' && r.date === today))}</div></div>`
}
function settingsPage() {
  return `${pageHeading('设置', '你的记录，你的选择。')}<div class="two-column"><div><div class="settings-signet"><span class="brand-sign" aria-hidden="true"></span><div><strong>LifeIndex</strong><p>本地优先的私人生活索引</p></div></div><ul class="settings-list"><li><button type="button" data-page="categories">${icon('bag', 22)}<span><strong>分类管理</strong><small>收支、运动与专注，保持简单</small></span>${icon('arrow', 17)}</button></li><li><button type="button" data-theme-toggle>${icon('sun', 22)}<span><strong>主题外观</strong><small>${state.theme === 'light' ? '浅色 · 切换为深色' : '深色 · 切换为浅色'}</small></span>${icon('arrow', 17)}</button></li></ul></div><div><div class="section-heading"><h2>数据与安全</h2></div><ul class="settings-list"><li><button type="button" data-export>${icon('download', 22)}<span><strong>导出备份</strong><small>下载本轮原型的合成记录</small></span>${icon('arrow', 17)}</button></li><li><button type="button" data-restore>${icon('upload', 22)}<span><strong>从备份恢复</strong><small>先验证内容，再确认替换</small></span>${icon('arrow', 17)}</button></li></ul><p class="tiny">原型仅使用内存中的合成记录，刷新后重置。正式应用会将记录保存在本机；清理设备存储可能移除数据。</p></div></div>`
}
function render() {
  document.body.dataset.theme = state.theme
  document.body.dataset.review = params.get('review') === '0' ? 'hidden' : 'visible'
  document.querySelector('meta[name="theme-color"]').content =
    state.theme === 'light' ? '#f5f0e8' : '#221e29'
  document.querySelector('#theme-switch').textContent =
    state.theme === 'light' ? '切换深色' : '切换浅色'
  navigation()
  const pages = {
    today: todayPage,
    health: healthPage,
    focus: focusPage,
    finance: financePage,
    settings: settingsPage,
    report: () => financePage(true),
    'weight-history': () => R3.historyPage('weight'),
    'activity-history': () => R3.historyPage('activity'),
    categories: () => R3.categoryPage(),
  }
  main.innerHTML =
    state.scenario === 'read-failed'
      ? pageHeading('记录暂时读不到', '这不表示数据已被清空。') +
        '<div class="failure-block" role="alert"><h2>稍后再试一次。</h2><p>本轮模拟本地读取失败，当前不展示虚构的0值。重试后会回到同一页面。</p><button type="button" class="button" data-retry-read>重新读取</button></div>'
      : (pages[state.page] || todayPage)()
  R3.shell()
}
function toast(message, recordId) {
  const el = document.querySelector('#toast')
  el.innerHTML =
    safe(message) +
    (recordId ? `<button type="button" data-record="${recordId}">查看记录</button>` : '')
  el.hidden = false
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    el.hidden = true
  }, 4800)
}
function openModal(kind, html) {
  if (!dialog.open) {
    const element = document.activeElement
    const attr = [
      'data-compose',
      'data-entry',
      'data-record',
      'data-habit-detail',
      'data-restore',
      'data-target',
      'data-category-new',
      'data-category-edit',
      'data-habit-edit',
    ].find((name) => element?.hasAttribute(name))
    modalOrigin = {
      element,
      scroll: window.scrollY,
      selector: attr ? `[${attr}="${CSS.escape(element.getAttribute(attr))}"]` : undefined,
    }
  }
  dialog.dataset.motion = state.inputMode === 'keyboard' ? 'instant' : 'spatial'
  state.modal = kind
  body.innerHTML = html
  if (kind === 'editor' && params.get('review') !== '0')
    body.insertAdjacentHTML(
      'beforeend',
      '<div class="review-sim"><button class="text-button" type="button" data-simulate-restore>评审：模拟另一标签页恢复</button></div>',
    )
  if (!dialog.open) dialog.showModal()
  trace('modal.opened', { kind })
}
function restoreOrigin() {
  if (!modalOrigin) return
  window.scrollTo({ top: modalOrigin.scroll, behavior: 'instant' })
  // Rendering may replace the old node, so restore its semantic successor rather than a detached element.
  const candidates = modalOrigin.selector
    ? [...document.querySelectorAll(modalOrigin.selector)]
    : []
  const target = modalOrigin.element?.isConnected
    ? modalOrigin.element
    : candidates.find((element) => element.getClientRects().length)
  ;(target || main)?.focus({ preventScroll: true })
  trace('modal.originrestored', { target: target ? 'trigger' : 'viewport' })
}
function closeModal(restore = true) {
  state.restoreReadToken = (state.restoreReadToken || 0) + 1
  dialog.close()
  state.modal = undefined
  state.editor = undefined
  if (restore) restoreOrigin()
  trace('modal.closed', { reason: restore ? 'return' : 'navigate' })
}
const dialogHeader = (title, close = '取消') =>
  `<header class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="text-button" type="button" data-dialog-close>${close}</button></header>`
function openComposer() {
  openModal(
    'composer',
    dialogHeader('想留下什么？') +
      `<div class="composer-content"><p>一条就好，随时可以回来。</p><div class="composer-options">${[
        ['finance', '记一笔'],
        ['weight', '记体重'],
        ['activity', '记运动'],
      ]
        .map(
          ([kind, label]) =>
            `<button class="compose-option" type="button" data-entry="${kind}">${icon(kind, 28)}${label}</button>`,
        )
        .join(
          '',
        )}</div><div class="composer-foot">${icon('shield', 15)}本机记录，没有上传</div></div>`,
  )
}
const entryLabel = (kind) =>
  ({
    finance: '记一笔',
    weight: '记录体重',
    activity: '记录运动',
    habit: '创建习惯',
    focus: '编辑专注',
  })[kind]
function openEditor(kind, record) {
  if (kind === 'habit') {
    R3.openHabitEditor(record)
    return
  }
  // A global action starts today. Only an explicit ledger-date entry inherits that ledger date.
  const entryDate =
    record?.date ||
    (kind === 'finance' && state.page === 'finance' && state.modal !== 'composer'
      ? state.selectedDate
      : today)
  const category =
    record?.category || (kind === 'finance' ? '餐饮' : kind === 'activity' ? '步行' : '')
  state.editor = {
    kind,
    recordId: record?.id,
    dirty: false,
    category,
    type: record?.type || 'expense',
    generation: state.generation,
  }
  const amount = record
    ? kind === 'finance'
      ? String(record.minor / 100)
      : kind === 'weight'
        ? String(record.grams / 1000)
        : kind === 'activity'
          ? String(record.minutes)
          : ''
    : ''
  const categories = R3.categoryPicker(kind, record)
  const amountField = `<label class="amount-label" for="record-amount">${kind === 'finance' ? '金额' : kind === 'weight' ? '体重' : '运动时长'}</label><div class="amount-input-wrap"><span>${kind === 'finance' ? '¥' : ''}</span><input id="record-amount" name="amount" inputmode="${kind === 'activity' ? 'numeric' : 'decimal'}" value="${safe(amount)}" placeholder="${kind === 'weight' ? '0.0' : '0.00'}" autocomplete="off" /><span>${kind === 'weight' ? 'kg' : kind === 'activity' ? '分钟' : ''}</span></div>`
  const fields =
    kind === 'habit'
      ? `<label class="field-row"><span>名称</span><input name="title" value="" maxlength="40" placeholder="一个想重复的小动作" /></label><label class="field-row"><span>频率</span><select name="frequency"><option>每天</option><option>工作日</option><option>周末</option></select></label>`
      : kind === 'focus'
        ? `<label class="field-row"><span>名称</span><input name="title" value="${safe(record?.title || '自由专注')}" maxlength="80" /></label>${categories}`
        : `${kind === 'finance' ? `<div class="type-switch" role="group" aria-label="收支类型"><button type="button" data-type="expense" aria-pressed="${state.editor.type === 'expense'}">支出</button><button type="button" data-type="income" aria-pressed="${state.editor.type === 'income'}">收入</button></div>` : ''}${amountField}${kind === 'finance' || kind === 'activity' ? categories : ''}${kind === 'activity' ? `<label class="field-row"><span>感受强度</span><select name="intensity">${['轻松', '适中', '高强度'].map((v) => `<option ${record?.intensity === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}`
  openModal(
    'editor',
    dialogHeader(record ? '编辑记录' : entryLabel(kind)) +
      `<form id="record-form" novalidate><div class="entry-content"><div id="entry-error" class="entry-error" role="alert" hidden></div>${fields}${kind === 'habit' ? '' : `<label class="field-row"><span>日期</span><input name="date" aria-label="记录日期" type="date" value="${entryDate}" /></label>`}<label class="field-row"><span>备注</span><input name="note" aria-label="备注" value="${safe(record?.note || '')}" placeholder="选填，记下此刻" maxlength="1000" /></label></div><footer class="entry-footer"><p class="entry-status">${record ? '修改已保存记录；取消会保留原内容。' : '仅为本轮合成原型，保存后可查看或编辑。'}</p><button class="button" type="submit">${icon('check', 18)}${record ? '保存修改' : '保存记录'}</button></footer></form>`,
  )
  // The second tap hands input focus to the primary field, including composer-to-editor replacement.
  queueMicrotask(() =>
    body.querySelector('#record-amount, [name="title"]')?.focus({ preventScroll: true }),
  )
}
function showConfirm(title, message, acceptLabel, callback, cancelLabel = '继续编辑') {
  state.confirmed = callback
  document.querySelector('#confirm-title').textContent = title
  document.querySelector('#confirm-message').textContent = message
  document.querySelector('#confirm-accept').textContent = acceptLabel
  document.querySelector('#confirm-cancel').textContent = cancelLabel
  confirmDialog.dataset.motion = state.inputMode === 'keyboard' ? 'instant' : 'spatial'
  confirmDialog.showModal()
  trace('confirmation.opened', { kind: state.modal || 'focus' })
}
function requestClose() {
  if (state.editor?.busy || state.restoreBusy) {
    trace('modal.closeblocked', { reason: 'write-pending' })
    return
  }
  if (state.modal === 'editor' && state.editor?.dirty)
    showConfirm('离开这条记录？', '尚未保存的内容会被丢弃。你也可以继续编辑。', '放弃修改', () =>
      closeModal(),
    )
  else closeModal()
}
function openRecord(id) {
  const record = state.records.find((r) => r.id === id)
  if (!record) {
    toast('记录已不存在')
    trace('record.missing', { reason: 'not-found' })
    return
  }
  state.editor = undefined
  openModal(
    'detail',
    dialogHeader('记录详情', '关闭') +
      `<div class="detail-content"><span class="preview-label">已保存 · ${{ finance: '记账', weight: '体重', activity: '运动', focus: '专注' }[record.kind]}</span><div class="detail-value numeric">${recordValue(record)}</div><dl class="detail-facts"><div><dt>名称</dt><dd>${safe(record.title)}</dd></div><div><dt>日期</dt><dd>${record.date}${record.timePrecision === 'instant' ? ` ${record.time}` : ' · 未记录具体时刻'}</dd></div><div><dt>备注</dt><dd>${record.note ? safe(record.note) : '没有填写'}</dd></div></dl><div class="detail-actions"><button class="button dark" type="button" data-edit="${record.id}">编辑这条记录</button><button class="text-button" type="button" data-delete="${record.id}">删除</button></div></div>`,
  )
  trace('record.viewed', { kind: record.kind })
}
function editorError(message) {
  const error = document.querySelector('#entry-error')
  error.hidden = false
  error.textContent = message
  error.tabIndex = -1
  error.focus()
  trace('entry.failed', { reason: 'validation-or-simulated-write', kind: state.editor?.kind })
}
async function saveEditor(form) {
  const editor = state.editor
  if (!editor || editor.busy) return
  if (editor.generation !== state.generation) {
    editorError('本机内容已在另一标签页恢复。输入已保留，请复制需要的内容，再关闭并重新开始。')
    return
  }
  const values = new FormData(form)
  const raw = String(values.get('amount') || '').trim()
  const date = String(values.get('date') || today)
  const note = String(values.get('note') || '').trim()
  const title = String(values.get('title') || '').trim()
  if (
    ['finance', 'weight', 'activity'].includes(editor.kind) &&
    !(editor.kind === 'weight' ? /^\d{1,4}(\.\d{1,3})?$/ : /^\d{1,8}(\.\d{1,2})?$/).test(raw)
  ) {
    editorError(
      editor.kind === 'weight'
        ? '请填写有效体重，最多保留三位小数。'
        : '请填写有效数字，金额最多保留两位小数。',
    )
    return
  }
  if (['finance', 'weight', 'activity'].includes(editor.kind) && Number(raw) <= 0) {
    editorError('数值需要大于 0，原输入已保留。')
    return
  }
  if (editor.kind === 'activity' && !/^\d+$/.test(raw)) {
    editorError('运动时长请填写整数分钟。')
    return
  }
  if (['habit', 'focus'].includes(editor.kind) && !title) {
    editorError('请填写一个名称，稍后仍可修改。')
    return
  }
  if (!R3.validDate(date) || date > today) {
    editorError('请选择有效日期，记录日期不能晚于今天。')
    return
  }
  if (editor.kind === 'weight' && (Number(raw) < 1 || Number(raw) > 1000)) {
    editorError('体重须在1至1000kg之间。')
    return
  }
  if (editor.kind === 'activity' && Number(raw) > 1440) {
    editorError('一次运动时长最多1440分钟。')
    return
  }
  // Lock the synchronous event boundary so repeated taps cannot create duplicate records while saving.
  editor.busy = true
  const submit = form.querySelector('[type=submit]')
  R3.setFormBusy(true)
  submit.textContent = '正在保存…'
  trace('entry.saving', { kind: editor.kind })
  await new Promise((resolve) => setTimeout(resolve, state.scenario === 'busy' ? 1800 : 240))
  if (editor.generation !== state.generation) {
    editor.busy = false
    R3.setFormBusy(false)
    editorError('本机内容有变化，当前输入已保留。请关闭并重新开始。')
    return
  }
  if (R3.consumeWriteFailure()) {
    editor.busy = false
    R3.setFormBusy(false)
    submit.textContent = '重试保存'
    editorError('保存失败，输入没有丢失。请重试。')
    return
  }
  const id = editor.recordId || `synthetic-${Date.now()}`
  const original = state.records.find((r) => r.id === id)
  const record = {
    ...original,
    id,
    kind: editor.kind,
    date,
    createdAt: original?.createdAt || new Date().toISOString(),
    timePrecision: editor.kind === 'focus' ? 'instant' : 'day',
    note,
    category: editor.category,
    categoryId: editor.categoryId,
  }
  if (editor.kind === 'finance') {
    record.minor = Math.round(Number(raw) * 100)
    record.type = editor.type
    record.title = editor.category || '其他'
  }
  if (editor.kind === 'weight') {
    record.grams = Math.round(Number(raw) * 1000)
    record.title = '体重记录'
    record.category = '体重'
  }
  if (editor.kind === 'activity') {
    record.minutes = Number(raw)
    record.title = editor.category
    record.intensity = String(values.get('intensity') || '适中')
  }
  if (editor.kind === 'focus') record.title = title
  if (editor.kind === 'habit')
    state.habits.push({
      id,
      title,
      subtitle: String(values.get('frequency')),
      icon: 'leaf',
      done: false,
    })
  else {
    const index = state.records.findIndex((r) => r.id === id)
    if (index >= 0) state.records[index] = record
    else state.records.unshift(record)
  }
  state.revision++
  trace('entry.saved', { kind: editor.kind, mode: editor.recordId ? 'edit' : 'create' })
  const kind = editor.kind
  // A completed write releases the shell update guard; closing the editor alone does not clear this shared flag.
  R3.setFormBusy(false)
  trace('entry.guardreleased', { reason: 'saved' })
  closeModal(false)
  render()
  restoreOrigin()
  toast(kind === 'habit' ? '习惯已创建' : `已保存 · ${date}`, kind === 'habit' ? undefined : id)
}
function openReport() {
  state.returnContext = {
    page: state.page,
    scroll: window.scrollY,
    element: document.activeElement,
    date: state.selectedDate,
    month: state.financeMonth,
    view: state.financeView,
  }
  if (state.page === 'today') state.financeMonth = today.slice(0, 7)
  state.page = 'report'
  trace('report.opened', { source: state.returnContext.page })
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function returnReport() {
  const context = state.returnContext
  state.page = context?.page || 'finance'
  state.selectedDate = context?.date || today
  state.financeMonth = context?.month || today.slice(0, 7)
  state.financeView = context?.view || 'list'
  render()
  window.scrollTo({ top: context?.scroll || 0, behavior: 'instant' })
  const target = document.querySelector('[data-report]')
  target?.focus({ preventScroll: true })
  trace('report.returned', { page: state.page })
}
function focusCommand(command) {
  const focus = state.focus
  if (command === 'start') {
    focus.status = 'running'
    focus.elapsedSeconds = 0
    focus.runningSince = Date.now()
    focus.startedAt = new Date(focus.runningSince).toISOString()
  }
  if (command === 'pause' && focus.status === 'running') {
    focus.elapsedSeconds += Math.max(0, (Date.now() - focus.runningSince) / 1000)
    focus.runningSince = undefined
    focus.status = 'paused'
  }
  if (command === 'resume' && focus.status === 'paused') {
    focus.runningSince = Date.now()
    focus.status = 'running'
  }
  if (command === 'finish') {
    showConfirm(
      '结束这一段专注？',
      '保存已经专注的时间。暂停期间不会计入时长。',
      '保存并结束',
      () => focusCommand('save'),
      '继续专注',
    )
    return
  }
  if (command === 'save') {
    const seconds = Math.floor(currentSeconds())
    if (seconds < 1) {
      toast('至少专注 1 秒后再保存。')
      return
    }
    if (R3.consumeWriteFailure()) {
      focus.elapsedSeconds = seconds
      focus.runningSince = undefined
      focus.status = 'awaiting-save'
      trace('focus.savefailed', { reason: 'simulated' })
      render()
      document.querySelector('[data-focus-action=save]')?.focus({ preventScroll: true })
      toast('保存失败，会话与时长已保留。')
      return
    }
    state.records.unshift({
      id: `synthetic-focus-${Date.now()}`,
      kind: 'focus',
      title: '自由专注',
      date: today,
      time: new Date(focus.startedAt).toTimeString().slice(0, 5),
      timePrecision: 'instant',
      createdAt: new Date().toISOString(),
      seconds,
      note: '',
      category: '自由专注',
      categoryId: state.categories.find((c) => c.domain === 'focus' && !c.archived)?.id,
    })
    state.revision++
    focus.status = 'idle'
    focus.elapsedSeconds = 0
    focus.runningSince = undefined
    toast('这一段专注，已保存。')
  }
  if (command !== 'save') state.revision++
  trace('focus.transitioned', { command, status: focus.status })
  render()
  const nextAction = { start: 'pause', pause: 'resume', resume: 'pause', save: 'start' }[command]
  document.querySelector(`[data-focus-action="${nextAction}"]`)?.focus({ preventScroll: true })
}
// Track activation modality for visible focus. Frequent recording dialogs open immediately in either modality.
document.addEventListener(
  'keydown',
  () => {
    state.inputMode = 'keyboard'
  },
  true,
)
document.addEventListener(
  'pointerdown',
  () => {
    state.inputMode = 'pointer'
  },
  true,
)
document.addEventListener('click', (event) => {
  const target = event.target.closest('button')
  if (!target) return
  if (target.dataset.page) {
    navigate(target.dataset.page)
    return
  }
  if (target.hasAttribute('data-compose')) {
    openComposer()
    return
  }
  if (target.dataset.entry) {
    openEditor(target.dataset.entry)
    return
  }
  if (target.dataset.todayView) {
    state.todayView = target.dataset.todayView
    trace('today.viewchanged', { view: state.todayView })
    render()
    return
  }
  if (target.dataset.habit) {
    R3.toggleHabit(target.dataset.habit, today)
    return
  }
  if (target.dataset.habitDetail) {
    R3.habitDetail(target.dataset.habitDetail)
    return
  }
  if (target.hasAttribute('data-report')) {
    openReport()
    return
  }
  if (target.hasAttribute('data-report-back')) {
    returnReport()
    return
  }
  if (target.dataset.financeView) {
    state.financeView = target.dataset.financeView
    trace('finance.viewchanged', { view: state.financeView })
    render()
    return
  }
  if (target.dataset.date) {
    state.selectedDate = target.dataset.date
    trace('finance.datechanged', { reason: 'calendar' })
    render()
    return
  }
  if (target.hasAttribute('data-calendar-today')) {
    state.selectedDate = today
    state.financeMonth = today.slice(0, 7)
    render()
    return
  }
  if (target.dataset.record) {
    openRecord(target.dataset.record)
    return
  }
  if (target.dataset.edit) {
    const record = state.records.find((r) => r.id === target.dataset.edit)
    if (record) openEditor(record.kind, record)
    return
  }
  if (target.dataset.delete) {
    const id = target.dataset.delete
    showConfirm(
      '删除这条记录？',
      '删除后，这条合成记录及对应汇总会立即更新。',
      '确认删除',
      () => {
        state.records = state.records.filter((r) => r.id !== id)
        state.revision++
        trace('record.deleted', { reason: 'confirmed' })
        closeModal(false)
        render()
        toast('记录已删除。')
      },
      '保留记录',
    )
    return
  }
  if (target.dataset.category) {
    R3.selectCategory(target.dataset.category)
    return
  }
  if (target.dataset.type) {
    if (state.editor) {
      state.editor.type = target.dataset.type
      state.editor.dirty = true
      document
        .querySelectorAll('[data-type]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === target)))
      R3.refreshCategories()
      trace('entry.typechanged', { type: state.editor.type })
    }
    return
  }
  if (target.hasAttribute('data-dialog-close')) {
    requestClose()
    return
  }
  if (target.id === 'confirm-cancel') {
    confirmDialog.close()
    state.confirmed = undefined
    trace('confirmation.cancelled')
    return
  }
  if (target.id === 'confirm-accept') {
    const callback = state.confirmed
    confirmDialog.close()
    state.confirmed = undefined
    callback?.()
    return
  }
  if (target.dataset.duration) {
    state.focus.plannedSeconds = Number(target.dataset.duration) * 60
    trace('focus.durationchanged', { reason: 'preset' })
    render()
    return
  }
  if (target.dataset.focusAction) {
    focusCommand(target.dataset.focusAction)
    return
  }
  if (target.hasAttribute('data-theme-toggle') || target.id === 'theme-switch') {
    state.theme = state.theme === 'light' ? 'dark' : 'light'
    trace('theme.changed', { theme: state.theme })
    render()
    return
  }
  if (target.hasAttribute('data-retry-read')) {
    state.scenario = 'ready'
    document.querySelector('#scenario').value = 'ready'
    trace('read.retried', { state: 'ready' })
    render()
    return
  }
  if (target.hasAttribute('data-export')) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(R3.backupData(), null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'lifeindex-r3-synthetic.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    trace('backup.exported', { source: 'synthetic' })
    toast('合成备份已下载。')
    return
  }
  if (target.hasAttribute('data-restore')) {
    R3.openRestore()
    return
  }
  if (target.hasAttribute('data-restore-preview')) {
    R3.previewBackup(R3.backupData())
    return
  }
  if (target.hasAttribute('data-restore-confirm')) {
    R3.confirmRestore()
    return
  }
})
document.addEventListener('input', (event) => {
  if (state.modal === 'editor' && event.target.closest('#record-form') && state.editor)
    state.editor.dirty = true
  R3.shell()
})
document.addEventListener('submit', (event) => {
  if (event.target.id === 'record-form') {
    event.preventDefault()
    void saveEditor(event.target)
  }
})
dialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  requestClose()
})
confirmDialog.addEventListener('cancel', () => {
  state.confirmed = undefined
  trace('confirmation.cancelled', { reason: 'escape' })
})
document.querySelector('#scenario').addEventListener('change', (event) => {
  state.scenario = event.target.value
  if (state.scenario === 'empty') {
    state.records = []
    state.habits = []
    state.focus = {
      status: 'idle',
      plannedSeconds: 1500,
      elapsedSeconds: 0,
      runningSince: undefined,
    }
  }
  if (state.scenario === 'ready' && state.records.length === 0) {
    state.records = mockRecords()
    state.habits = mockHabits()
  }
  R3.normalizeHabits()
  R3.normalizeRecords()
  trace('scenario.changed', { scenario: state.scenario })
  render()
})
// Only clock text and progress update per tick. Starting, pausing, resuming and saving are distinct transitions.
setInterval(() => {
  if (!['running', 'paused', 'awaiting-save'].includes(state.focus.status)) return
  const elapsed = currentSeconds()
  document.querySelectorAll('[data-timer-remaining]').forEach((el) => {
    el.textContent = clock(state.focus.plannedSeconds - elapsed)
  })
  document.querySelectorAll('[data-timer-used]').forEach((el) => {
    el.textContent = clock(elapsed)
  })
  document
    .querySelector('[data-focus-progress]')
    ?.setAttribute('stroke-dashoffset', String((772.83 * elapsed) / state.focus.plannedSeconds))
  if (state.focus.status === 'running' && elapsed >= state.focus.plannedSeconds)
    focusCommand('save')
}, 250)
window.addEventListener('error', () =>
  console.warn('[lifeindex.r3]', {
    operation: 'runtime.failed',
    failureClass: 'Prototype',
    synthetic: true,
  }),
)
R3.initialize()
trace('prototype.entered', { direction: 'daily-frequency-complete' })
render()
