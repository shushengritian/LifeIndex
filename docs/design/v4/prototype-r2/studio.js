icons.pause = '<path d="M8 5v14M16 5v14"/>'
icons.close = '<path d="m6 6 12 12M6 18 18 6"/>'
icons.back = '<path d="m14 5-7 7 7 7"/>'
icons.shield = '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>'
const params = new URLSearchParams(location.search)
const today = '2026-09-28'
const trace = (operation, context = {}) =>
  console.info('[lifeindex.r2]', { operation, ...context, synthetic: true })
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
// R2 is an isolated in-memory product model. No reads or writes target user IndexedDB or historical backups.
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
  return Math.min(
    state.focus.plannedSeconds,
    state.focus.elapsedSeconds +
      (state.focus.status === 'running'
        ? Math.max(0, (Date.now() - state.focus.runningSince) / 1000)
        : 0),
  )
}
function sum(type, date) {
  return state.records
    .filter(
      (r) =>
        r.kind === 'finance' &&
        r.type === type &&
        r.date.startsWith('2026-09') &&
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
function habitRows(items) {
  return items
    .map(
      (h) =>
        `<div class="habit-row"><button type="button" class="habit-name" data-habit-detail="${h.id}"><span class="habit-orbit">${icon(h.icon, 18)}</span><span><strong>${safe(h.title)}</strong><small>${safe(h.subtitle)}</small></span></button><button type="button" class="habit-tick" data-habit="${h.id}" aria-pressed="${h.done}" aria-label="${safe(h.title)}，${h.done ? '已完成，点按撤销' : '点按完成'}">${icon(h.done ? 'check' : 'add', 19)}</button></div>`,
    )
    .join('')
}
function habitStation(full = false) {
  const count = state.habits.filter((h) => h.done).length
  return `<section class="habit-station"><div class="section-heading"><h2>今天的小习惯</h2><span>${count} / ${state.habits.length}</span></div>${state.habits.length ? habitRows(full ? state.habits : state.habits.slice(0, 2)) : '<p class="station-note">不必一次安排很多事。<br>先从一个小习惯开始。</p><button type="button" class="text-button" data-entry="habit">' + icon('add', 16) + '创建习惯</button>'}<div class="habit-footer"><p class="station-note">点名称查看，右侧完成</p><button type="button" class="text-button" data-page="health">${full ? '管理习惯' : `查看 ${state.habits.length} 个习惯`} ${icon('arrow', 14)}</button></div></section>`
}
function recordValue(record) {
  if (record.kind === 'finance')
    return `${record.type === 'expense' ? '−' : '+'} ¥ ${money(record.minor)}`
  if (record.kind === 'weight') return `${(record.grams / 1000).toFixed(1)} kg`
  if (record.kind === 'activity') return `${record.minutes} 分钟`
  return `${Math.max(1, Math.floor(record.seconds / 60))} 分钟`
}
const recordGlyph = (record) =>
  record.kind === 'finance' ? (record.category === '咖啡' ? 'cup' : 'finance') : record.kind
function recordRows(records, timeline = false) {
  if (!records.length)
    return `<div class="empty-block"><h2>今天还很宽阔。</h2><p>一笔开销，一次运动，一段专注。<br>按下底部“记录”，留下第一条。</p><button type="button" class="button" data-compose>${icon('add', 18)}留下记录</button></div>`
  const content = (r) =>
    `<button type="button" class="record-button" data-record="${r.id}"><span class="record-sign">${icon(recordGlyph(r), 19)}</span><span class="record-copy"><strong>${safe(r.title)}</strong><small>${timeline ? { finance: '记账', weight: '健康 · 体重', activity: '健康 · 运动', focus: '专注 · 已保存' }[r.kind] : `${r.date === today ? '今天' : r.date.slice(5).replace('-', '月') + '日'} ${r.time}`}</small></span><span class="record-value">${recordValue(r)}${r.kind === 'finance' ? `<small>${r.type === 'expense' ? '支出' : '收入'}</small>` : ''}</span></button>`
  return timeline
    ? `<ol class="timeline-list">${records.map((r) => `<li><time>${r.time}</time>${content(r)}</li>`).join('')}</ol>`
    : `<ul class="records-list">${records.map((r) => `<li>${content(r)}</li>`).join('')}</ul>`
}
function resumeStrip() {
  const focus = state.focus
  return focus.status === 'idle'
    ? ''
    : `<div class="resume-strip">${icon(focus.status === 'paused' ? 'pause' : 'focus', 20)}<span><strong>${focus.status === 'paused' ? '这一段，已暂停' : focus.status === 'awaiting-save' ? '专注完成，待保存' : '专注还在继续'}</strong><span data-timer-used>${clock(currentSeconds())}</span> 已用 · ${focus.status === 'paused' ? '暂停期间不累计' : focus.status === 'awaiting-save' ? '时间已停止，等待保存' : '离开不会停止'}</span><button type="button" data-page="focus">返回专注</button></div>`
}
function todayPage() {
  const daily = state.records
    .filter((r) => r.date === today)
    .sort((a, b) => b.time.localeCompare(a.time))
  return `<div class="today-title"><div><h1>把今天，<br>过成自己的。</h1><p>2026 年 9 月 28 日，星期一</p></div><div class="date-mark"><strong class="numeric">28</strong><span>九月 · MONDAY</span></div></div><div class="today-view-switch" role="group" aria-label="今天的视图"><button type="button" data-today-view="now" aria-pressed="${state.todayView === 'now'}">今日概览</button><button type="button" data-today-view="timeline" aria-pressed="${state.todayView === 'timeline'}">今日轨迹 <span>${daily.length}</span></button></div>${state.todayView === 'timeline' ? `<p class="timeline-note">9 月 28 日 · 仅展示已经保存的记录</p>${recordRows(daily, true)}` : `${resumeStrip()}<div class="today-grid"><div>${habitStation()}<div class="action-panels"><section class="focus-tile"><div class="tile-top"><span>给自己一段专注</span></div>${rosette('tile-graphic')}<div class="tile-time numeric">${state.focus.status === 'idle' ? '25:00' : clock(state.focus.plannedSeconds - currentSeconds())}</div><p>${state.focus.status === 'idle' ? '一次，只做一件事' : state.focus.status === 'paused' ? '已暂停 · 时间不累计' : state.focus.status === 'awaiting-save' ? '待保存 · 时间已停止' : '这一刻正在进行'}</p><button type="button" class="tile-action" data-page="focus">${state.focus.status === 'idle' ? '进入专注空间' : '回到专注空间'}<span>${icon('arrow', 17)}</span></button></section><section class="money-tile"><div><h2>今日支出</h2><div class="cash-value numeric"><small>¥</small>${money(sum('expense', today)).replace('.00', '')}</div><p>${daily.filter((r) => r.kind === 'finance').length} 笔收支记录</p></div><button type="button" class="text-button" data-report>本月报表 ${icon('arrow', 14)}</button></section></div></div><div class="today-secondary"><div class="section-heading"><h2>刚刚留下的</h2><button type="button" class="text-button" data-today-view="timeline">全部轨迹 ${icon('arrow', 14)}</button></div>${recordRows(daily.slice(0, 3))}<div class="local-stamp">记录只在本机，随时可以带走</div></div></div>`}`
}
function financePage(report = false) {
  // Month labels and totals share the same explicit calendar range.
  const transactions = state.records.filter(
    (r) => r.kind === 'finance' && r.date.startsWith('2026-09'),
  )
  const current = transactions.filter((r) => r.date === state.selectedDate)
  const totals = {}
  transactions
    .filter((r) => r.type === 'expense')
    .forEach((r) => {
      const label = r.category === '咖啡' ? '餐饮' : r.category
      totals[label] = (totals[label] || 0) + r.minor
    })
  const breakdown = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([label, minor]) =>
        `<div class="category-bar"><span>${safe(label)}</span><div class="bar-track"><i style="width:${sum('expense') ? (minor / sum('expense')) * 100 : 0}%"></i></div><strong>¥ ${money(minor)}</strong></div>`,
    )
    .join('')
  const calendar = `<div class="range-control"><strong>2026 年 9 月</strong><button type="button" class="text-button" data-calendar-today>回到今天</button></div><div class="calendar-grid" aria-label="2026年9月日期">${['一', '二', '三', '四', '五', '六', '日'].map((v) => `<span>${v}</span>`).join('')}<span></span>${Array.from(
    { length: 30 },
    (_, i) => {
      const date = `2026-09-${String(i + 1).padStart(2, '0')}`
      return `<button type="button" aria-label="9月${i + 1}日" aria-pressed="${state.selectedDate === date}" data-date="${date}">${i + 1}${transactions.some((r) => r.date === date) ? '<span aria-hidden="true"></span>' : ''}</button>`
    },
  ).join('')}</div>`
  return `${report ? '<button type="button" class="text-button back-line" data-report-back>' + icon('back', 18) + '返回' + (state.returnContext?.page === 'today' ? '今天' : '记账') + '</button>' : ''}${pageHeading(report ? '把花费，看明白。' : '每一笔，都有去向。', '2026 年 9 月 · 人民币', report ? '' : `<button type="button" class="circle-button" data-entry="finance" aria-label="记一笔">${icon('add')}</button>`)}<div class="two-column"><div><section class="finance-stage"><h2>本月支出</h2>${rosette('finance-graphic')}<div class="finance-main-value numeric"><small>¥</small>${money(sum('expense'))}</div><div class="finance-meta"><div><span>收入</span><strong>¥ ${money(sum('income'))}</strong></div><div><span>结余</span><strong>¥ ${money(sum('income') - sum('expense'))}</strong></div></div></section>${report ? `<div class="section-heading"><h2>花在哪里</h2><span>按支出金额</span></div>${breakdown || '<p class="tiny">本月还没有支出记录。</p>'}` : `<div class="module-tabs" aria-label="记账视图"><button type="button" data-finance-view="list" aria-pressed="${state.financeView === 'list'}">流水</button><button type="button" data-finance-view="calendar" aria-pressed="${state.financeView === 'calendar'}">日期</button><button type="button" data-report>月报 ${icon('arrow', 13)}</button></div>${state.financeView === 'calendar' ? calendar : ''}<div class="section-heading"><h2>${state.selectedDate === today ? '今天' : state.selectedDate.slice(5).replace('-', '月') + '日'}</h2><span>${current.length} 笔记录</span></div>${current.length ? recordRows(current) : '<div class="empty-block"><h2>这一天，还没有账目。</h2><p>可以选其他日期，或记下这一天的收支。</p><button type="button" class="button" data-entry="finance">记一笔</button></div>'}`}</div><div><div class="section-heading"><h2>${report ? '本月流水' : '分类概览'}</h2></div>${report ? recordRows(transactions) : breakdown || '<p class="tiny">有了支出后，分类会自然形成。</p>'}<p class="chart-caption">金额与明细来自同一份合成记录。分类比例只计算支出，收入独立列示。</p></div></div>`
}
function healthPage() {
  const weights = state.records
    .filter((r) => r.kind === 'weight')
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const weight = weights[0]
  // The prototype week begins on Monday 28 September; previous-Sunday activity is outside this period.
  const activity = state.records.filter(
    (r) => r.kind === 'activity' && r.date >= '2026-09-28' && r.date <= '2026-10-04',
  )
  return `${pageHeading('照顾自己，有迹可循。', '体重、运动与习惯，各有自己的节奏')}<div class="two-column"><div><div class="health-top"><div><p>最近一次体重</p><div class="weight-value numeric">${weight ? (weight.grams / 1000).toFixed(1) : '—'}<small>kg</small></div><p>${weight ? weight.date + ' · ' + weight.time : '从第一条记录开始'}</p></div><button type="button" class="circle-button" data-entry="weight" aria-label="记录体重">${icon('add')}</button></div>${weight ? '<div class="empty-block"><p>已有 ' + weights.length + ' 次测量。完整趋势图将在方向选定后的状态轮完成。</p><button type="button" class="text-button" data-record="' + weight.id + '">查看这条记录 ' + icon('arrow', 15) + '</button></div>' : '<div class="empty-block"><h2>从认识当下开始。</h2><p>留下第一次体重，不作好坏评价。</p></div>'}<section class="activity-banner"><header><span>本周运动</span>${icon('activity', 20)}</header><strong class="numeric">${activity.reduce((n, r) => n + r.minutes, 0)}<small>分钟 · ${activity.length} 次记录</small></strong><button type="button" class="text-button" data-entry="activity">记录一次运动 ${icon('add', 16)}</button></section>${activity.length ? recordRows(activity) : ''}</div><div class="health-habits"><div class="section-heading"><h2>我的习惯</h2><button class="text-button" type="button" data-entry="habit">${icon('add', 16)}新习惯</button></div><div class="habit-list-full">${habitRows(state.habits)}</div>${state.habits.length ? '' : '<p class="tiny">先从一个想重复的小动作开始。</p>'}</div></div>`
}
function focusPage() {
  const focus = state.focus
  const remaining = focus.plannedSeconds - currentSeconds()
  const status = focus.status
  return `${pageHeading('专注空间', '不必做很多，只做眼前这一件。')}<div class="two-column"><section class="focus-space"><div class="focus-space-head"><span class="focus-status">${status === 'idle' ? '准备好，就开始' : status === 'running' ? '正在专注' : status === 'paused' ? '已暂停 · 不累计时间' : '完成 · 等待保存'}</span><button type="button" data-page="today">${status === 'idle' ? '返回今天' : status === 'paused' ? '收起，保持暂停' : status === 'awaiting-save' ? '收起，保留待保存' : '收起，继续计时'}</button></div><h2>${status === 'idle' ? '给重要的事，一点留白。' : status === 'paused' ? '等你准备好，再继续。' : '此刻，只需要在这里。'}</h2><div class="focus-sculpture" data-paused="${status === 'paused'}"><svg viewBox="0 0 280 280" fill="none" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<ellipse cx="140" cy="140" rx="118" ry="92" transform="rotate(${i * 10} 140 140)" stroke="currentColor" stroke-width=".45" opacity=".48"/>`).join('')}<circle cx="140" cy="140" r="123" stroke="currentColor" stroke-width="2.2" stroke-dasharray="772.83" data-focus-progress stroke-dashoffset="${772.83 * (currentSeconds() / focus.plannedSeconds)}" transform="rotate(-90 140 140)"/></svg><div class="focus-digit numeric"><span data-timer-remaining>${clock(remaining)}</span><small>${status === 'paused' ? '暂停中' : status === 'idle' ? '分钟 : 秒' : '剩余时间'}</small></div></div>${status === 'idle' ? `<div class="duration-choices" aria-label="计划专注时长">${[15, 25, 45].map((n) => `<button type="button" data-duration="${n}" aria-pressed="${focus.plannedSeconds === n * 60}">${n} 分钟</button>`).join('')}</div><div class="focus-controls"><button type="button" class="button" data-focus-action="start">${icon('play', 18)}开始专注</button></div><p class="focus-note">默认名称为“自由专注”，完成后可编辑</p>` : `<div class="focus-controls"><button type="button" class="button" data-focus-action="${status === 'running' ? 'pause' : status === 'paused' ? 'resume' : 'save'}">${icon(status === 'running' ? 'pause' : 'play', 18)}${status === 'running' ? '暂停一下' : status === 'paused' ? '继续专注' : '重试保存'}</button><button type="button" class="button secondary" data-focus-action="finish">结束</button></div><p class="focus-note">已专注 <span data-timer-used>${clock(currentSeconds())}</span> · 目标 ${focus.plannedSeconds / 60} 分钟</p>`}</section><div class="focus-side"><div class="section-heading"><h2>今天的专注</h2><span>仅已保存</span></div><div class="focus-history-value numeric">${Math.floor(state.records.filter((r) => r.kind === 'focus' && r.date === today).reduce((n, r) => n + r.seconds, 0) / 60)}<small>分钟</small></div><p class="body-copy">暂停让时间停下来。<br>收起让空间留出来。<br>两种选择，由你决定。</p>${recordRows(state.records.filter((r) => r.kind === 'focus'))}</div></div>`
}
function settingsPage() {
  return `${pageHeading('设置', '你的记录，你的选择。')}<div class="two-column"><div><div class="settings-signet"><span class="brand-sign" aria-hidden="true"></span><div><strong>LifeIndex</strong><p>本地优先的私人生活索引</p></div></div><ul class="settings-list"><li><button type="button" data-theme-toggle>${icon('sun', 22)}<span><strong>主题外观</strong><small>${state.theme === 'light' ? '浅色 · 切换为深色' : '深色 · 切换为浅色'}</small></span>${icon('arrow', 17)}</button></li></ul></div><div><div class="section-heading"><h2>数据与安全</h2></div><ul class="settings-list"><li><button type="button" data-export>${icon('download', 22)}<span><strong>导出备份</strong><small>下载本轮原型的合成记录</small></span>${icon('arrow', 17)}</button></li><li><button type="button" data-restore>${icon('upload', 22)}<span><strong>从备份恢复</strong><small>先验证内容，再确认替换</small></span>${icon('arrow', 17)}</button></li></ul><p class="tiny">原型仅使用内存中的合成记录，刷新后重置。正式应用会将记录保存在本机；清理设备存储可能移除数据。</p></div></div>`
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
  }
  main.innerHTML =
    state.scenario === 'read-failed'
      ? pageHeading('记录暂时读不到', '这不表示数据已被清空。') +
        '<div class="failure-block" role="alert"><h2>稍后再试一次。</h2><p>本轮模拟本地读取失败，当前不展示虚构的0值。重试后会回到同一页面。</p><button type="button" class="button" data-retry-read>重新读取</button></div>'
      : (pages[state.page] || todayPage)()
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
    ].find((name) => element?.hasAttribute(name))
    modalOrigin = {
      element,
      scroll: window.scrollY,
      selector: attr ? `[${attr}="${CSS.escape(element.getAttribute(attr))}"]` : undefined,
    }
  }
  state.modal = kind
  body.innerHTML = html
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
  target?.focus({ preventScroll: true })
  trace('modal.originrestored', { target: target ? 'trigger' : 'viewport' })
}
function closeModal(restore = true) {
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
  const choices =
    kind === 'finance'
      ? [
          ['food', '餐饮'],
          ['train', '交通'],
          ['bag', '日用'],
          ['cup', '咖啡'],
        ]
      : [
          ['leaf', '步行'],
          ['activity', '力量'],
          ['health', '跑步'],
          ['focus', '其他'],
        ]
  const categories = `<span class="form-label">${kind === 'finance' ? '分类' : '运动类型'}</span><div class="categories" role="group" aria-label="${kind === 'finance' ? '交易分类' : '运动类型'}">${choices.map(([glyph, label]) => `<button class="category" type="button" data-category="${label}" aria-pressed="${category === label}">${icon(glyph, 23)}${label}</button>`).join('')}</div>`
  const amountField = `<label class="amount-label" for="record-amount">${kind === 'finance' ? '金额' : kind === 'weight' ? '体重' : '运动时长'}</label><div class="amount-input-wrap"><span>${kind === 'finance' ? '¥' : ''}</span><input id="record-amount" name="amount" inputmode="${kind === 'activity' ? 'numeric' : 'decimal'}" value="${safe(amount)}" placeholder="${kind === 'weight' ? '0.0' : '0.00'}" autocomplete="off" /><span>${kind === 'weight' ? 'kg' : kind === 'activity' ? '分钟' : ''}</span></div>`
  const fields =
    kind === 'habit'
      ? `<label class="field-row"><span>名称</span><input name="title" value="" maxlength="40" placeholder="一个想重复的小动作" /></label><label class="field-row"><span>频率</span><select name="frequency"><option>每天</option><option>工作日</option><option>周末</option></select></label>`
      : kind === 'focus'
        ? `<label class="field-row"><span>名称</span><input name="title" value="${safe(record?.title || '自由专注')}" maxlength="80" /></label>`
        : `${kind === 'finance' ? `<div class="type-switch" role="group" aria-label="收支类型"><button type="button" data-type="expense" aria-pressed="${state.editor.type === 'expense'}">支出</button><button type="button" data-type="income" aria-pressed="${state.editor.type === 'income'}">收入</button></div>` : ''}${amountField}${kind === 'finance' || kind === 'activity' ? categories : ''}`
  openModal(
    'editor',
    dialogHeader(record ? '编辑记录' : entryLabel(kind)) +
      `<form id="record-form" novalidate><div class="entry-content"><div id="entry-error" class="entry-error" role="alert" hidden></div>${fields}${kind === 'habit' ? '' : `<label class="field-row"><span>日期</span><input name="date" aria-label="记录日期" type="date" value="${entryDate}" /></label>`}<label class="field-row"><span>备注</span><input name="note" aria-label="备注" value="${safe(record?.note || '')}" placeholder="选填，记下此刻" maxlength="200" /></label></div><footer class="entry-footer"><p class="entry-status">${record ? '修改已保存记录；取消会保留原内容。' : '仅为本轮合成原型，保存后可查看或编辑。'}</p><button class="button" type="submit">${icon('check', 18)}${record ? '保存修改' : '保存记录'}</button></footer></form>`,
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
  confirmDialog.showModal()
  trace('confirmation.opened', { kind: state.modal || 'focus' })
}
function requestClose() {
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
      `<div class="detail-content"><span class="preview-label">已保存 · ${{ finance: '记账', weight: '体重', activity: '运动', focus: '专注' }[record.kind]}</span><div class="detail-value numeric">${recordValue(record)}</div><dl class="detail-facts"><div><dt>名称</dt><dd>${safe(record.title)}</dd></div><div><dt>日期</dt><dd>${record.date} ${record.time}</dd></div><div><dt>备注</dt><dd>${record.note ? safe(record.note) : '没有填写'}</dd></div></dl><div class="detail-actions"><button class="button dark" type="button" data-edit="${record.id}">编辑这条记录</button><button class="text-button" type="button" data-delete="${record.id}">删除</button></div></div>`,
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
  const values = new FormData(form)
  const raw = String(values.get('amount') || '').trim()
  const date = String(values.get('date') || today)
  const note = String(values.get('note') || '').trim()
  const title = String(values.get('title') || '').trim()
  if (
    ['finance', 'weight', 'activity'].includes(editor.kind) &&
    !/^\d{1,8}(\.\d{1,2})?$/.test(raw)
  ) {
    editorError('请填写有效的数字，小数最多保留两位。')
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    editorError('请选择有效日期。')
    return
  }
  // Lock the synchronous event boundary so repeated taps cannot create duplicate records while saving.
  editor.busy = true
  const submit = form.querySelector('[type=submit]')
  submit.disabled = true
  submit.textContent = '正在保存…'
  trace('entry.saving', { kind: editor.kind })
  await new Promise((resolve) => setTimeout(resolve, 240))
  if (state.scenario === 'save-failed') {
    editor.busy = false
    submit.disabled = false
    submit.textContent = '重试保存'
    editorError('本次模拟保存失败，输入没有丢失。切换评审场景为正常数据后可重试。')
    return
  }
  const id = editor.recordId || `synthetic-${Date.now()}`
  const original = state.records.find((r) => r.id === id)
  const record = {
    ...original,
    id,
    kind: editor.kind,
    date,
    time: original?.time || '10:20',
    note,
    category: editor.category,
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
    record.intensity = '适中'
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
  trace('entry.saved', { kind: editor.kind, mode: editor.recordId ? 'edit' : 'create' })
  const kind = editor.kind
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
    view: state.financeView,
  }
  state.page = 'report'
  trace('report.opened', { source: state.returnContext.page })
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function returnReport() {
  const context = state.returnContext
  state.page = context?.page || 'finance'
  state.selectedDate = context?.date || today
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
  }
  if (command === 'pause' && focus.status === 'running') {
    focus.elapsedSeconds = currentSeconds()
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
    if (state.scenario === 'save-failed') {
      focus.elapsedSeconds = seconds
      focus.runningSince = undefined
      focus.status = 'awaiting-save'
      trace('focus.savefailed', { reason: 'simulated' })
      render()
      toast('保存失败，会话与时长已保留。')
      return
    }
    state.records.unshift({
      id: `synthetic-focus-${Date.now()}`,
      kind: 'focus',
      title: '自由专注',
      date: today,
      time: '10:20',
      seconds,
      note: '',
      category: '自由专注',
    })
    focus.status = 'idle'
    focus.elapsedSeconds = 0
    focus.runningSince = undefined
    toast('这一段专注，已保存。')
  }
  trace('focus.transitioned', { command, status: focus.status })
  render()
}
function openRestore() {
  openModal(
    'restore',
    dialogHeader('恢复备份', '关闭') +
      `<div class="backup-preview"><h3>先检查，再替换。</h3><p>本轮使用当前原型的合成备份演示。这里不会读取旧版数据库或旧备份。</p><button type="button" class="button dark" data-restore-preview>载入合成备份预览</button></div>`,
  )
}
function restorePreview() {
  state.restoreCandidate = mockRecords()
  openModal(
    'restore',
    dialogHeader('备份预览', '取消') +
      `<div class="backup-preview"><span class="preview-label">格式校验通过 · 合成备份</span><h3>确认后，替换当前原型记录。</h3><p>不会合并。取消不会改变当前内容。正式实现需在完整校验后进行原子替换。</p><ul><li>5 条账目</li><li>1 条体重</li><li>1 次运动</li><li>1 次已保存专注</li></ul><button type="button" class="button" data-restore-confirm>确认替换合成记录</button></div>`,
  )
}
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
    const h = state.habits.find((v) => v.id === target.dataset.habit)
    if (h) {
      h.done = !h.done
      trace('habit.changed', { state: h.done ? 'completed' : 'pending' })
      render()
      toast(h.done ? '已完成，今天又留下一点积累。' : '已撤销这次打卡。')
    }
    return
  }
  if (target.dataset.habitDetail) {
    const h = state.habits.find((v) => v.id === target.dataset.habitDetail)
    if (h)
      openModal(
        'habit-detail',
        dialogHeader('习惯详情', '关闭') +
          `<div class="detail-content"><h3>${safe(h.title)}</h3><p class="tiny">${safe(h.subtitle)}</p><dl class="detail-facts"><div><dt>今天</dt><dd>${h.done ? '已完成' : '尚未完成'}</dd></div><div><dt>说明</dt><dd>查看详情不会改变打卡</dd></div></dl><button type="button" class="button dark" data-dialog-close>回到原页面</button></div>`,
      )
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
    if (state.editor) {
      state.editor.category = target.dataset.category
      state.editor.dirty = true
      document
        .querySelectorAll('[data-category]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === target)))
      trace('entry.categorychanged', { kind: state.editor.kind })
    }
    return
  }
  if (target.dataset.type) {
    if (state.editor) {
      state.editor.type = target.dataset.type
      state.editor.dirty = true
      document
        .querySelectorAll('[data-type]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === target)))
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
      new Blob([JSON.stringify({ prototype: 'LifeIndex R2', records: state.records }, null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'lifeindex-r2-synthetic.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    trace('backup.exported', { source: 'synthetic' })
    toast('合成备份已下载。')
    return
  }
  if (target.hasAttribute('data-restore')) {
    openRestore()
    return
  }
  if (target.hasAttribute('data-restore-preview')) {
    restorePreview()
    return
  }
  if (target.hasAttribute('data-restore-confirm')) {
    showConfirm(
      '替换当前合成记录？',
      '这会覆盖本轮原型的记录，不会读取或改变真实数据库。',
      '确认替换',
      () => {
        state.records = state.restoreCandidate
        state.restoreCandidate = undefined
        trace('backup.restored', { source: 'synthetic' })
        closeModal(false)
        render()
        toast('合成备份已恢复。')
      },
      '取消',
    )
    return
  }
})
document.addEventListener('input', (event) => {
  if (state.modal === 'editor' && event.target.closest('#record-form') && state.editor)
    state.editor.dirty = true
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
  console.warn('[lifeindex.r2]', {
    operation: 'runtime.failed',
    failureClass: 'Prototype',
    synthetic: true,
  }),
)
trace('prototype.entered', { direction: 'daily-frequency' })
render()
