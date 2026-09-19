'use strict'

// This isolated proposal never touches LifeIndex storage. Every value is a disposable fixture.
const params = new URLSearchParams(location.search)
document.documentElement.dataset.theme = params.get('theme') === 'light' ? 'light' : 'dark'
const views = ['today', 'finance', 'health', 'focus', 'settings']
let view = views.includes(params.get('view')) ? params.get('view') : 'today'
const screen = document.querySelector('#screen')
const editor = document.querySelector('#editor')
const form = document.querySelector('#record-form')
const confirmation = document.querySelector('#confirmation')
const today = '2026-09-18'
let selected = today
let month = 8
let year = 2026
let failNext = false
let busy = false
let draftKind = ''
let editingId = null
// Allow review links to open the habit surface without bypassing any write or confirmation flow.
let healthSection =
  view === 'health' && ['habits', 'cessation'].includes(params.get('section'))
    ? params.get('section')
    : ''
let healthOverviewScroll = 0
let editorScroll = 0
let initialDraft = ''
let toastTimeout
let focusDuration = 25
let customDuration = false
let focusTitle = ''
let focusCategory = '',
  focusNote = '',
  focusError = '',
  focusExtras = false
let focusSection = params.get('section') === 'history' && view === 'focus' ? 'history' : ''
let focusRange = 'all'
const previewOpenedAt = Date.now()
let focusDemoOffset = 0
let lastSavedRecord = null
let session = null
let confirmAction = null
const fixtures = { transactions: [], weights: [], activities: [] }
let weightTarget = 63
let selectedHabit = ['1', '2'].includes(params.get('habit')) ? Number(params.get('habit')) : null
let habitDay = today
const habits = [
  {
    id: 1,
    name: '阅读 20 分钟',
    symbol: 'book',
    color: 'purple',
    start: '2026-09-01',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    paused: false,
    note: '',
    records: new Set([
      '2026-09-02',
      '2026-09-03',
      '2026-09-05',
      '2026-09-08',
      '2026-09-09',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
    ]),
  },
  {
    id: 2,
    name: '晨间喝水',
    symbol: 'drop',
    color: 'blue',
    start: '2026-09-01',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    paused: false,
    note: '',
    records: new Set(['2026-09-15', '2026-09-16', '2026-09-17', today]),
  },
]
let sequence = 0
const focusHistory = [
  {
    id: ++sequence,
    title: '阅读',
    seconds: 1500,
    category: 'reading',
    note: '',
    date: today,
    startedAt: new Date(today + 'T08:30:00').getTime(),
    endedAt: new Date(today + 'T08:55:00').getTime(),
    completionKind: 'timer',
  },
  {
    id: ++sequence,
    title: '写作',
    seconds: 3000,
    category: 'work',
    note: '',
    date: today,
    startedAt: new Date(today + 'T10:00:00').getTime(),
    endedAt: new Date(today + 'T10:50:00').getTime(),
    completionKind: 'timer',
  },
  {
    id: ++sequence,
    title: '学习笔记',
    seconds: 1200,
    category: 'study',
    note: '合成历史样本',
    date: '2026-09-17',
    startedAt: new Date('2026-09-17T19:00:00').getTime(),
    endedAt: new Date('2026-09-17T19:20:00').getTime(),
    completionKind: 'early',
  },
]
const paths = {
  appearance:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  upload: '<path d="M12 15V3m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  today:
    '<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/>',
  wallet:
    '<path d="M19 7V5a2 2 0 0 0-2-2L5 6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5"/><path d="M21 12h-5a2 2 0 0 0 0 4h5"/>',
  timer: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 0v4m6 2 2-2m-8 4v5l3 2"/>',
  heart:
    '<path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
  // Eight identical teeth around (12,12) keep the small navigation glyph optically balanced.
  settings:
    '<path d="M9.91 4.69L10.61 2.10L13.39 2.10L14.09 4.69L15.68 5.35L18.02 4.01L19.99 5.98L18.65 8.32L19.31 9.91L21.90 10.61L21.90 13.39L19.31 14.09L18.65 15.68L19.99 18.02L18.02 19.99L15.68 18.65L14.09 19.31L13.39 21.90L10.61 21.90L9.91 19.31L8.32 18.65L5.98 19.99L4.01 18.02L5.35 15.68L4.69 14.09L2.10 13.39L2.10 10.61L4.69 9.91L5.35 8.32L4.01 5.98L5.98 4.01L8.32 5.35Z"/><circle cx="12" cy="12" r="3.2"/>',
  food: '<path d="M5 3v7m3-7v7M3 3v6a3 3 0 0 0 6 0V3M6 12v9m12-18c-3 3-4 7-4 10h5V3h-1Zm1 10v8"/>',
  coffee:
    '<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h18"/>',
  transit:
    '<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 3v8M7 21l2-3m8 3-2-3"/><circle cx="9" cy="15" r=".7"/><circle cx="15" cy="15" r=".7"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2"/>',
  pay: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3M3 11h18m-12 5h6m-3-3v6"/>',
  weight:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 9a5 5 0 0 1 10 0Zm5 0 2-3"/>',
  activity: '<path d="m4 13 4 2 3-6 4 6h5M3 6v12m3-14v16m12-16v16m3-14v12"/>',
  leaf: '<path d="M20 3C9 2 3 8 5 15s15 5 15-12ZM4 21 15 9"/>',
  book: '<path d="M12 5C8 2 5 3 3 4v16c3-2 6-1 9 1 3-2 6-3 9-1V4c-2-1-5-2-9 1Zm0 0v16"/>',
  drop: '<path d="M12 2c-3 5-8 10-8 14a8 8 0 0 0 16 0c0-4-5-9-8-14Z"/><path d="M8 16a4 4 0 0 0 4 4"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  history: '<path d="M3 11a9 9 0 1 1 1 6M3 4v7h7m2-4v6l4 2"/>',
}
const categories = Object.fromEntries(
  categoryBook.filter((c) => ['expense', 'income'].includes(c.group)).map((c) => [c.id, c]),
)
// Install the same paths used by category editing before rendering any history rows.
Object.assign(
  paths,
  Object.fromEntries(Object.entries(extraCategoryIcons).map(([id, [, path]]) => [id, path])),
)
const icon = (name, small = false) =>
  `<svg class="icon${small ? ' small' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.bag}</svg>`
const glyph = (name, color) => `<span class="glyph ${color}">${icon(name)}</span>`
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
const money = (minor) =>
  (minor / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const key = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const log = (event, module = view) => console.info('[LifeIndex design]', { event, module })

// All finance projections share one fixture collection, so calendar totals and lists stay consistent.
for (let day = 1; day <= 17; day += 1) {
  const amount = [4200, 8600, 2800, 14500, 5800, 7200, 3900][(day - 1) % 7]
  const category = ['food', 'bag', 'coffee', 'food', 'transit'][day % 5]
  fixtures.transactions.push({
    id: ++sequence,
    date: key(day),
    time: '12:30',
    type: 'expense',
    amount,
    category,
    note: '',
  })
}
fixtures.transactions.push({
  id: ++sequence,
  date: key(5),
  time: '09:00',
  type: 'income',
  amount: 980000,
  category: 'pay',
  note: '',
})
for (const [category, amount, time, note] of [
  ['food', 3600, '12:30', '午餐'],
  ['coffee', 1800, '09:10', '拿铁'],
  ['transit', 1200, '08:20', '地铁'],
]) {
  fixtures.transactions.push({
    id: ++sequence,
    date: today,
    time,
    type: 'expense',
    amount,
    category,
    note,
  })
}
;[65.9, 65.6, 65.8, 65.5, 65.4, 65.6, 65.2, 65.4, 65.1, 65.0, 65.2, 64.9, 65.0, 64.8].forEach(
  (value, i) =>
    fixtures.weights.push({
      date: `2026-09-${String(i + 5).padStart(2, '0')}`,
      time: '07:30',
      value,
    }),
)
fixtures.activities.push(
  { date: '2026-09-15', time: '18:30', value: 35, type: '散步' },
  { date: '2026-09-17', time: '19:00', value: 30, type: '力量训练' },
  { date: today, time: '07:00', value: 25, type: '散步' },
)

function toast(text) {
  clearTimeout(toastTimeout)
  const target = document.querySelector('#toast')
  target.textContent = text
  target.classList.add('visible')
  toastTimeout = setTimeout(() => target.classList.remove('visible'), 2600)
}
function header(title, subtitle, action = '') {
  return `<header class="pagehead"><div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</header>`
}
function addButton(label, kind) {
  return `<button class="head-action" data-action="add" data-kind="${kind}" aria-label="${label}">${icon('plus')}</button>`
}
function navigation() {
  // Keep route IDs unchanged; only the approved bottom-tab positions move.
  const items = [
    ['today', '今天', 'today'],
    ['health', '健康', 'heart'],
    ['focus', '专注', 'timer'],
    ['finance', '记账', 'wallet'],
    ['settings', '设置', 'settings'],
  ]
  document.querySelector('#nav').innerHTML = items
    .map(
      ([id, title, symbol]) =>
        `<button data-action="navigate" data-view="${id}" ${id === view ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${title}</span></button>`,
    )
    .join('')
}
function expenseFor(date) {
  return fixtures.transactions
    .filter((t) => t.date === date && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
}
// Charts join observed points rather than inventing smooth curves or interpolated extrema.
function chart(values, full = false) {
  const width = 320,
    height = full ? 125 : 66
  const low = full ? Math.floor((Math.min(...values) - 0.15) * 2) / 2 : 0
  const high = full
    ? Math.ceil((Math.max(...values) + 0.15) * 2) / 2
    : Math.max(100, ...values) * 1.15
  const inset = full ? 32 : 7
  const coords = values.map((value, index) => [
    inset + (index * (width - inset - 6)) / Math.max(1, values.length - 1),
    height - 16 - ((value - low) / (high - low)) * (height - 30),
  ])
  const points = coords.map((point) => point.join(',')).join(' ')
  const latest = coords.at(-1)
  const grid = [high, (high + low) / 2, low]
    .map((value, index) => {
      const y = 14 + (index * (height - 30)) / 2
      return `<path d="M${inset} ${y}H${width}" stroke="var(--line)" stroke-dasharray="3 5"/>${full ? `<text x="0" y="${y + 3}" fill="var(--muted)" font-size="9">${value.toFixed(1)}</text>` : ''}`
    })
    .join('')
  return `<svg class="${full ? 'weight-chart' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${full ? '体重趋势，单位千克' : '每日支出趋势，单位分'}：${values.join('，')}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".2"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${inset},${height - 16} ${points} ${latest[0]},${height - 16}" fill="url(#chart-fill)"/><polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${latest[0]}" cy="${latest[1]}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/></svg>`
}
function finance() {
  const prefix = key(1).slice(0, 7)
  const list = fixtures.transactions
    .filter((t) => t.date === selected)
    .sort((a, b) => b.time.localeCompare(a.time))
  const monthly = fixtures.transactions.filter((t) => t.date.startsWith(prefix))
  const income = monthly.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = monthly.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: offset }, () => '<span></span>')
  for (let day = 1; day <= count; day += 1) {
    const date = key(day)
    const cost = expenseFor(date)
    const hasIncome = fixtures.transactions.some((t) => t.date === date && t.type === 'income')
    const value = cost
      ? `−${cost >= 100000 ? `${(cost / 100000).toFixed(1)}k` : cost / 100}`
      : hasIncome
        ? '+收入'
        : '·'
    cells.push(
      `<button class="day${date === today ? ' today' : ''}" data-action="day" data-date="${date}" aria-pressed="${selected === date}" aria-label="${date}，${cost ? `支出 ${money(cost)} 元` : '无支出'}${hasIncome ? '，有收入' : ''}"><span>${day}</span><small>${value}</small></button>`,
    )
  }
  const end = Number(selected.slice(-2))
  const start = Math.max(1, end - 6)
  const week = Array.from({ length: end - start + 1 }, (_, i) => expenseFor(key(start + i)))
  const dayTitle = `${Number(selected.slice(5, 7))} 月 ${end} 日`
  // A changed record date must be discoverable without silently replacing the browsing context.
  const savedNotice =
    lastSavedRecord && lastSavedRecord.date !== selected
      ? `<div class="saved-notice" role="status"><span>已保存到 ${escapeHTML(lastSavedRecord.date)}</span><button class="subtle-button" data-action="view-saved">查看记录 ${icon('right', true)}</button></div>`
      : ''
  screen.innerHTML =
    header('记账', '让每一笔，都有迹可循', addButton('新增账目', 'finance')) +
    savedNotice +
    `<section class="calendar" aria-label="记账日历"><div class="monthbar"><div class="month-name">${month + 1} 月 <small>${year}</small></div><div class="monthbuttons"><button class="iconbtn" data-action="month" data-step="-1" aria-label="上个月">${icon('left', true)}</button><button class="iconbtn" data-action="month" data-step="1" aria-label="下个月">${icon('right', true)}</button></div></div><div class="weekdays">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span>${d}</span>`).join('')}</div><div class="days">${cells.join('')}</div></section>
    <section class="month-total" aria-label="月汇总"><div><small>本月支出</small><strong>¥ ${money(expense)}</strong></div><div><small>本月收入</small><strong>¥ ${money(income)}</strong></div><div><small>本月结余</small><strong>¥ ${money(income - expense)}</strong></div></section>
    <section class="trend-mini"><div class="trend-title"><span>每日支出</span><span>${month + 1}.${start} — ${month + 1}.${end}</span></div>${chart(week)}<div class="axis"><span>${start} 日</span><span>最高 ¥ ${money(Math.max(...week))}</span><span>${end} 日</span></div></section>
    <div class="sectionhead"><h2>${dayTitle}${selected === today ? ' · 今天' : ''}</h2><small>${list.length} 笔</small></div>
    <div>${
      list.length
        ? list
            .map((t) => {
              const c = categories[t.category]
              return `<button class="record" data-action="record" data-id="${t.id}">${glyph(c.icon, c.color)}<span class="meta"><strong>${escapeHTML(t.note || c.title)}</strong><small>${escapeHTML(categoryLabel(c.id))} · ${t.time}</small></span><span class="amount${t.type === 'income' ? ' income' : ''}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span></button>`
            })
            .join('')
        : '<div class="empty">这一天还没有记录。<br><button class="subtle-button" data-action="add" data-kind="finance">记一笔</button></div>'
    }</div>
    <p class="sample-caption">合成样本 · 日历小额为元，k 为千元</p>`
}
function health() {
  if (healthSection === 'cessation') {
    cessationPage()
    return
  }
  if (healthSection === 'habits') {
    habitPage()
    return
  }
  if (healthSection) {
    healthHistoryPage()
    return
  }
  const weights = [...fixtures.weights].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  )
  const latest = weights.at(-1)
  const difference = latest ? latest.value - weights[0].value : 0
  const activities = fixtures.activities.filter((a) => a.date >= '2026-09-14' && a.date <= today)
  screen.innerHTML =
    header('健康', '照顾身体，也照顾日常') +
    `<section class="weight-panel"><div class="row between"><div class="row"><span style="color:var(--blue)">${icon('weight')}</span><h2>体重</h2></div>${addButton('记录体重', 'weight')}</div>${
      latest
        ? `<div class="weight-metric"><div><div class="big">${latest.value.toFixed(1)} <small>kg</small></div><span class="tiny muted">${latest.date === today ? '今天' : latest.date} ${latest.time}</span></div><div class="change">${difference > 0 ? '+' : '−'} ${Math.abs(difference).toFixed(1)} kg<small>较首条样本记录</small></div></div>${chart(
            weights.map((w) => w.value),
            true,
          )}<div class="axis"><span>${weights[0].date.slice(5).replace('-', '.')}</span><span>记录趋势 · kg</span><span>${latest.date.slice(5).replace('-', '.')}</span></div>`
        : '<p class="empty">记录第一次体重后，这里会显示趋势。</p>'
    }<div class="footer"><span class="muted">目标 <span style="color:var(--text)">63.0 kg</span></span><button class="subtle-button" data-action="history" data-kind="weight">全部记录 ${icon('right', true)}</button></div></section>
    <section class="health-group"><div class="row between"><div class="group-title">${glyph('activity', 'orange')}<h2>运动</h2></div>${addButton('记录运动', 'activity')}</div><div class="metrics"><strong>${activities.length}</strong><small>次</small><span class="divider"></span><strong>${activities.reduce((sum, a) => sum + a.value, 0)}</strong><small>分钟 · 本周</small><button class="iconbtn" style="margin-left:auto" data-action="history" data-kind="activity" aria-label="查看运动记录">${icon('right', true)}</button></div></section>
    ${cessationCard()}
    ${habitList()}<p class="sample-caption">合成样本 · 不提供医学判断</p>`
  // Target is a preference, not a measurement: changing it never rewrites weight history.
  screen.querySelector('.weight-panel .footer .muted').outerHTML =
    `<button class="subtle-button" data-b2="target">目标 ${weightTarget === null ? '未设置' : weightTarget.toFixed(1) + ' kg'} ${icon('right', true)}</button>`
}
function render() {
  if (view === 'finance') finance()
  else if (view === 'health') health()
  else if (view === 'today') todayPage()
  else if (view === 'settings') settingsPage()
  else focus()
  navigation()
}
function updateDurationPreview() {
  // Update only the preview nodes so typing does not destroy the custom-minute input or its focus.
  const valid = Number.isInteger(focusDuration) && focusDuration >= 1 && focusDuration <= 240
  document.querySelector('#clock').textContent = valid ? focusClock(focusDuration * 60) : '—:—'
  document.querySelector('.orbit text:last-child').textContent = valid
    ? `${focusDuration} 分钟`
    : '待设置'
  document.querySelector('#focus-note').textContent = valid
    ? '留一点空间，让注意力安静下来'
    : '请输入 1–240 的整数分钟'
  document
    .querySelectorAll('[data-action=duration]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(!customDuration && Number(button.dataset.value) === focusDuration),
      ),
    )
  document
    .querySelector('[data-action=custom-duration]')
    .setAttribute('aria-pressed', String(customDuration))
  document.querySelector('#custom-minutes').setAttribute('aria-invalid', String(!valid))
  log(valid ? 'focus.preview_updated' : 'focus.preview_invalid', 'focus')
}
function ask(title, text, destructiveLabel, action, cancelLabel = '') {
  confirmAction = action
  document.querySelector('#confirmation-content').innerHTML =
    `<h2 id="confirmation-title">${title}</h2><p>${text}</p><div class="actions"><button class="secondary" data-confirm="stay" autofocus>${cancelLabel || (editor.open || title.startsWith('离开') ? '继续编辑' : '继续专注')}</button><button class="secondary danger" data-confirm="accept">${destructiveLabel}</button></div>`
  confirmation.showModal()
  log('confirmation.opened', draftKind || view)
}
function draftSnapshot() {
  return JSON.stringify([...new FormData(form).entries()])
}
function closeEditor() {
  if (busy) {
    log('editor.exit_blocked_busy', draftKind)
    return
  }
  if (draftKind && draftSnapshot() !== initialDraft) {
    log('editor.exit_dirty', draftKind)
    ask('放弃尚未保存的更改？', '关闭后，本次输入不会保留。', '放弃更改', () => {
      editor.close()
      log('editor.discarded', draftKind)
      draftKind = ''
    })
  } else {
    editor.close()
    log('editor.closed', draftKind || view)
    draftKind = ''
  }
}
const dateFields = (date) =>
  `<div class="field-grid"><label class="field"><span>日期</span><input name="date" type="date" value="${date}" required></label><label class="field"><span>时间</span><input name="time" type="time" value="12:30" required></label></div>`
function categoryMarkup(type, active = '') {
  // One stored category ID identifies either a root or a leaf; parent selection is optional detail.
  const items = categoryChoices(type, active),
    current = categoryFor(active),
    parentId = current?.parentId || active
  const roots = categoryBook.filter(
    (c) => c.group === type && !c.parentId && (!c.archived || c.id === parentId),
  )
  const parent = roots.find((c) => c.id === parentId),
    children = items.filter((c) => c.parentId === parentId)
  const rootMarkup = roots
    .map(
      (c) =>
        `<button type="button" class="category" data-action="category-parent" data-value="${c.id}" ${c.archived ? 'disabled' : ''} aria-pressed="${c.id === parentId}">${glyph(c.icon, c.color)}${escapeHTML(c.title)}${c.archived ? '（已归档）' : ''}</button>`,
    )
    .join('')
  return (
    rootMarkup +
      (parent
        ? `<div class="subcategory-picker"><p class="helper">二级分类 · 可选</p><div class="category-grid">${!parent.archived ? `<button type="button" class="category" data-action="category" data-value="${parent.id}" aria-pressed="${active === parent.id}">不细分</button>` : ''}${children.map((c) => `<button type="button" class="category" data-action="category" data-value="${c.id}" aria-pressed="${active === c.id}">${glyph(c.icon, c.color)}${escapeHTML(c.title)}${c.archived ? '（已归档）' : ''}</button>`).join('')}</div><p class="helper" role="status">已选：${escapeHTML(categoryLabel(active))}</p></div>`
        : '') || '<p class="helper">暂无可用分类，请到设置创建或恢复分类。</p>'
  )
}
function openEditor(kind, item = null) {
  log('editor.opened', kind)
  editingId = item?.id ?? null
  editorScroll = screen.scrollTop
  draftKind = kind
  const title = { finance: '记一笔', weight: '记录体重', activity: '记录运动' }[kind]
  const content =
    kind === 'finance'
      ? `<div class="segmented"><button type="button" data-action="record-type" data-value="expense" aria-pressed="true">支出</button><button type="button" data-action="record-type" data-value="income" aria-pressed="false">收入</button></div><input type="hidden" name="type" value="expense"><label class="amount-entry"><span>¥</span><input name="amount" aria-label="金额" inputmode="decimal" placeholder="0.00" autocomplete="off"></label><div class="field"><span>分类</span><input name="category" type="hidden" value=""><div class="category-grid">${categoryMarkup('expense')}</div></div>${dateFields(view === 'today' ? today : selected)}`
      : kind === 'weight'
        ? `<label class="field"><span>体重 · kg</span><input name="value" aria-label="体重" inputmode="decimal" placeholder="例如 64.8" autocomplete="off"></label>${dateFields(today)}<p class="helper">只记录变化，不评价好坏。</p>`
        : `<label class="field"><span>运动类型</span><select name="activityType">${categoryOptions('activity', item?.type || '')}</select></label><label class="field"><span>时长 · 分钟</span><input name="value" aria-label="运动时长" inputmode="numeric" placeholder="例如 30" autocomplete="off"></label>${dateFields(today)}`
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${title}</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body">${content}<label class="field"><span>备注 <small>· 可选</small></span><input name="note" maxlength="120" placeholder="留下一点细节"></label><p id="form-error" class="error" role="alert"></p><p class="helper">设计演示 · 仅保存在当前原型内存</p></div><div class="sheet-footer"><button class="primary" type="submit">${icon('check', true)} 保存${kind === 'finance' ? '账目' : '记录'}</button></div>`
  if (item) {
    // Editing starts from the saved record, so unchanged defaults are never treated as a dirty draft.
    document.querySelector('#editor-title').textContent =
      kind === 'finance' ? '编辑账目' : kind === 'weight' ? '编辑体重' : '编辑运动'
    for (const name of ['date', 'time', 'note'])
      form.elements.namedItem(name).value = item[name] || ''
    if (kind === 'finance') {
      form.elements.namedItem('amount').value = (item.amount / 100).toFixed(2)
      form.elements.namedItem('type').value = item.type
      form.elements.namedItem('category').value = item.category
      form.querySelector('.category-grid').innerHTML = categoryMarkup(item.type, item.category)
      form
        .querySelectorAll('[data-action=record-type]')
        .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.value === item.type)))
    } else {
      form.elements.namedItem('value').value = String(item.value)
      if (kind === 'activity') form.elements.namedItem('activityType').value = item.type
    }
    form
      .querySelector('.sheet-body')
      .insertAdjacentHTML(
        'beforeend',
        '<button type="button" class="subtle-button danger" data-action="delete-record">删除这条记录</button>',
      )
    log('editor.edit_loaded', kind)
  }
  form
    .querySelector('.sheet-body')
    .insertAdjacentHTML(
      'beforeend',
      '<button type="button" class="subtle-button" data-action="fail-write">演示下一次写入失败</button>',
    )
  initialDraft = draftSnapshot()
  editor.showModal()
  form.querySelector('input:not([type=hidden])').focus()
}
function showInfo(title, content) {
  draftKind = ''
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${title}</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭详情">${icon('close')}</button></div><div class="sheet-body">${content}</div>`
  editor.showModal()
  log('detail.opened')
}
function error(message, field) {
  document.querySelector('#form-error').textContent = message
  const target = field && form.elements.namedItem(field)
  if (target && target.type !== 'hidden') {
    target.setAttribute('aria-invalid', 'true')
    target.focus()
  }
  log('editor.validation_failed', draftKind)
}
form.addEventListener('input', () => {
  form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'))
  // Editing invalid input clears the stale message; submit validates the complete draft again.
  const message = document.querySelector('#form-error')
  if (message && !busy) message.textContent = ''
})
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (busy || !draftKind) {
    log('editor.submit_ignored')
    return
  }
  log('editor.submit', draftKind)
  const data = Object.fromEntries(new FormData(form))
  if (draftKind === 'category-edit') {
    await saveCategory(data)
    return
  }
  if (draftKind.startsWith('cessation-')) {
    await saveCessation(data)
    return
  }
  if (draftKind === 'focus-edit') {
    await saveFocusEdit(data)
    return
  }
  if (draftKind === 'target' || draftKind === 'habit-settings') {
    await saveHealthPreference(data)
    return
  }
  let amount = 0
  if (draftKind === 'finance') {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(data.amount || '') || Number(data.amount) <= 0) {
      error('请输入大于 0、最多两位小数的金额。', 'amount')
      return
    }
    const [whole, fraction = ''] = data.amount.split('.')
    amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    if (
      !categoryAllowed(
        data.category,
        data.type,
        fixtures.transactions.find((row) => row.id === editingId)?.category,
      )
    ) {
      error('请选择可用分类，或到设置创建/恢复分类。')
      form.querySelector('.category')?.focus()
      return
    }
  } else if (
    !/^\d{1,4}(\.\d)?$/.test(data.value || '') ||
    Number(data.value) <= 0 ||
    (draftKind === 'weight' && (Number(data.value) < 20 || Number(data.value) > 500)) ||
    (draftKind === 'activity' &&
      (!Number.isInteger(Number(data.value)) || Number(data.value) > 1440))
  ) {
    error(
      draftKind === 'weight'
        ? '请输入 20–500 kg 范围内的体重，最多一位小数。'
        : '请输入 1–1440 的整数分钟。',
      'value',
    )
    return
  }
  if (
    draftKind === 'activity' &&
    !categoryAllowed(
      data.activityType,
      'activity',
      fixtures.activities.find((row) => row.id === editingId)?.type,
    )
  ) {
    error('请选择可用运动分类，或到设置创建/恢复分类。', 'activityType')
    return
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ||
    !Number.isFinite(Date.parse(`${data.date}T12:00:00`))
  ) {
    error('请选择有效日期。', 'date')
    return
  }
  if (!/^\d{2}:\d{2}$/.test(data.time || '')) {
    error('请选择记录时间。', 'time')
    return
  }
  const kind = draftKind
  busy = true
  form.querySelectorAll('button,input,select').forEach((element) => {
    element.disabled = true
  })
  const submit = form.querySelector('[type=submit]')
  submit.textContent = '保存中…'
  document.querySelector('#form-error').textContent = ''
  log('editor.saving', kind)
  try {
    // A short delay makes the blocking state reviewable; simulated failure never mutates fixtures.
    await new Promise((resolve) => setTimeout(resolve, 450))
    if (failNext) {
      failNext = false
      throw new Error('preview_failure')
    }
    // Keep every offered field in memory; success must never discard a supplied health note.
    const collection = recordCollection(kind)
    const item =
      kind === 'finance'
        ? { ...data, amount }
        : {
            date: data.date,
            time: data.time,
            value: Number(data.value),
            note: data.note,
            ...(kind === 'activity' ? { type: data.activityType } : {}),
          }
    // Replace by stable identity only after success; retrying an edit must not append a duplicate.
    if (editingId !== null) {
      const index = collection.findIndex((row) => row.id === editingId)
      if (index < 0) throw new Error('preview_record_missing')
      collection[index] = { ...item, id: editingId }
    } else collection.push({ ...item, id: ++sequence })
    if (kind === 'finance')
      lastSavedRecord = collection.find((row) => row.id === (editingId ?? sequence))
    editor.close()
    draftKind = ''
    render()
    restoreEditorContext()
    toast('已保存 · 仅当前原型有效')
    log('editor.saved', kind)
  } catch {
    document.querySelector('#form-error').textContent = '未能保存，输入已保留。请重试。'
    submit.textContent = '重试保存'
    log('editor.save_failed', kind)
  } finally {
    busy = false
    form.querySelectorAll('button,input,select').forEach((element) => {
      element.disabled = false
    })
  }
})
editor.addEventListener('cancel', (event) => {
  event.preventDefault()
  closeEditor()
})
confirmation.addEventListener('click', (event) => {
  const button = event.target.closest('[data-confirm]')
  if (!button) return
  const accept = button.dataset.confirm === 'accept'
  const action = confirmAction
  confirmAction = null
  confirmation.close()
  log(accept ? 'confirmation.accepted' : 'confirmation.cancelled')
  if (accept) action?.()
})
confirmation.addEventListener('cancel', () => {
  confirmAction = null
  log('confirmation.cancelled')
})

function switchView(next) {
  // Category depth belongs to its settings visit; never leak a finance parent into another group.
  categoryParent = null
  settingsSection = ''
  healthSection = ''
  focusSection = ''
  if (!views.includes(next)) {
    showInfo(
      next === 'today' ? '今天 · 后续设计范围' : '设置 · 后续设计范围',
      '<p class="dialog-note">本轮只展开记账、健康和专注三个关键页面。此入口保留在五项导航中，完整界面待视觉方向通过后在 G4 展开。</p>',
    )
    return
  }
  view = next
  render()
  screen.scrollTop = 0
  screen.focus({ preventScroll: true })
  log('navigation.changed')
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]')
  if (!button || button.disabled) return
  const action = button.dataset.action
  if (action === 'add') {
    openEditor(button.dataset.kind)
    return
  }
  if (action === 'close-editor') {
    closeEditor()
    return
  }
  if (action === 'category-parent') {
    form.elements.namedItem('category').value = button.dataset.value
    form.querySelector('.sheet-body>.field .category-grid').innerHTML = categoryMarkup(
      form.elements.namedItem('type').value,
      button.dataset.value,
    )
    form
      .querySelector(`[data-action="category-parent"][data-value="${button.dataset.value}"]`)
      ?.focus()
    log('editor.parent_category_selected', draftKind)
    return
  }
  if (action === 'category') {
    form.elements.namedItem('category').value = button.dataset.value
    // Keep the root highlight while choosing a leaf so both hierarchy levels remain visible.
    form
      .querySelectorAll('[data-action=category]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
    const summary = form.querySelector('.subcategory-picker [role=status]')
    if (summary) summary.textContent = '已选：' + categoryLabel(button.dataset.value)
    log('editor.category_selected', draftKind)
    return
  }
  if (action === 'record-type') {
    form.elements.namedItem('type').value = button.dataset.value
    form.elements.namedItem('category').value = ''
    form.querySelector('.category-grid').innerHTML = categoryMarkup(button.dataset.value)
    form
      .querySelectorAll('[data-action=record-type]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
    log('editor.type_changed', draftKind)
    return
  }
  if (action === 'navigate') {
    const next = button.dataset.view
    if (view === 'focus' && !session && focusDirty() && next !== view) {
      ask(
        '离开尚未开始的专注？',
        '事项和时长还没有提交，离开将放弃本次草稿。',
        '放弃并离开',
        () => {
          resetFocusDraft()
          switchView(next)
        },
      )
    } else switchView(next)
    return
  }
  // The calendar is the sole browsing date picker; selection also seeds the add-record form.
  if (action === 'day') {
    selected = button.dataset.date
    render()
    log('calendar.day_selected', 'finance')
    return
  }
  if (action === 'view-saved' && lastSavedRecord) {
    view = 'finance'
    selected = lastSavedRecord.date
    year = Number(selected.slice(0, 4))
    month = Number(selected.slice(5, 7)) - 1
    render()
    log('record.saved_date_opened', 'finance')
    return
  }
  if (action === 'month') {
    const next = new Date(year, month + Number(button.dataset.step), 1)
    year = next.getFullYear()
    month = next.getMonth()
    selected = key(1)
    render()
    log('calendar.month_changed')
    return
  }
  if (action === 'record') {
    const item = fixtures.transactions.find((t) => t.id === Number(button.dataset.id))
    if (item) openEditor('finance', item)
    else {
      toast('记录已不存在，请重新选择')
      log('editor.record_missing', 'finance')
    }
    return
  }
  if (action === 'history') {
    healthOverviewScroll = screen.scrollTop
    healthSection = button.dataset.kind
    render()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    log('health.history_opened', 'health')
    return
  }
  if (action === 'health-back') {
    healthSection = ''
    render()
    screen.scrollTop = healthOverviewScroll
    screen.focus({ preventScroll: true })
    log('health.history_closed', 'health')
    return
  }
  if (action === 'edit-health') {
    const item = recordCollection(healthSection).find((row) => row.id === Number(button.dataset.id))
    if (item) openEditor(healthSection, item)
    return
  }
  if (action === 'fail-write') {
    failNext = true
    toast('下一次保存或删除将模拟失败')
    log('simulation.failure_armed', draftKind)
    return
  }
  if (action === 'delete-record') {
    requestRecordDeletion()
    return
  }
  if (action === 'duration') {
    focusDuration = Number(button.dataset.value)
    customDuration = false
    render()
    log('focus.duration_selected')
    return
  }
  if (action === 'custom-duration') {
    customDuration = true
    document.querySelector('#custom-time').hidden = false
    updateDurationPreview()
    document.querySelector('#custom-minutes').focus()
    return
  }
  if (action === 'start') {
    void startFocus()
    return
  }
  if (action === 'finish' || action === 'cancel-focus') {
    if (!session || session.pending || busy) return
    const cancelled = action === 'cancel-focus'
    ask(
      cancelled ? '取消本次专注？' : '提前结束本次专注？',
      cancelled ? '本次专注不会计入完成记录。' : '将按实际经过的秒数记录；不足一秒不计入。',
      cancelled ? '取消本次专注' : '结束并记录',
      () => completeFocus(cancelled),
    )
    return
  }
  if (action === 'focus-history') {
    openFocusHistory()
    return
  }
})
document.addEventListener('input', (event) => {
  if (event.target.id === 'focus-title') focusTitle = event.target.value
  if (event.target.id === 'custom-minutes') {
    focusDuration = Number(event.target.value)
    updateDurationPreview()
  }
})
// Only the same-origin review parent can request a fixed simulation event; no payload is logged.
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent) return
  if (event.data?.type === 'fail-next') {
    failNext = true
    toast('下一次保存将模拟失败')
    log('simulation.failure_armed')
  }
})

/* G4 batch A extends the approved shell only; all settings and safety steps below are disposable simulations. */
// Only documented review destinations are accepted; URL content never becomes executable actions.
let settingsSection =
  ['categories', 'shortcuts'].includes(params.get('section')) && view === 'settings'
    ? params.get('section')
    : ''
// Review links accept only owned group keys, never arbitrary object properties.
if (Object.hasOwn(categoryGroups, params.get('group'))) categoryGroup = params.get('group')
let themePreference = document.documentElement.dataset.theme
const systemTheme = matchMedia('(prefers-color-scheme: dark)')
let settingsBusy = false
const settingRow = (name, detail, symbol, color, action, value = '') =>
  `<button type="button" class="setting-row" data-g4="${action}" data-value="${value}">${glyph(symbol, color)}<span class="meta"><strong>${name}</strong><small>${detail}</small></span>${icon('right', true)}</button>`
function todayPage() {
  // Keep the Today projection date-scoped when later batches add older history fixtures.
  const todaysFocus = focusHistory.filter((row) => row.date === today)
  const total = todaysFocus.reduce((sum, row) => sum + row.seconds, 0)
  const rows = fixtures.transactions.filter((row) => row.date === today)
  screen.innerHTML =
    header('今天', '9 月 18 日 · 星期五 · 演示日期') +
    `<section class="daily-intro"><h2>从一笔记录开始</h2><p>把花费、专注和日常，留在今天。</p><button class="primary" data-action="add" data-kind="finance">${icon('plus')} 记一笔</button></section>
    <button class="setting-row focus-entry" data-action="navigate" data-view="focus">${glyph('timer', 'purple')}<span class="meta"><strong>${session ? '继续本次专注' : '给自己一段专注时间'}</strong><small>${session ? (session.pending ? '本次操作待保存，点击重试' : '计时仍在进行，点击返回') : '25 分钟，专心做一件事'}</small></span>${icon('right', true)}</button>
    ${habitList()}
    <section class="daily-summary" aria-label="今日摘要"><button data-g4="today-finance"><small>今日支出</small><strong>${rows.length ? '¥ ' + money(expenseFor(today)) : '尚无记录'}</strong><span>${rows.length} 笔收支 ${icon('right', true)}</span></button><button data-action="navigate" data-view="focus"><small>已完成专注</small><strong>${focusDurationLabel(total)}</strong><span>${todaysFocus.length} 次 ${icon('right', true)}</span></button></section>
    ${lastSavedRecord ? `<div class="saved-notice" role="status"><span>已保存到 ${escapeHTML(lastSavedRecord.date)}</span><button class="subtle-button" data-action="view-saved">查看记录</button></div>` : ''}
    <p class="sample-caption">G4 交互原型 · 合成数据，刷新重置</p>`
}
function settingsPage() {
  if (settingsSection === 'categories') {
    categoryManagement()
    return
  }
  if (settingsSection) {
    settingsDetail()
    return
  }
  screen.innerHTML =
    header('设置', '按自己的方式，记录生活') +
    `<section class="settings-group"><h2>分类管理</h2><details><summary>${glyph('bag', 'orange')}<span>管理分类<small>记账、专注与运动</small></span>${icon('right', true)}</summary><div class="category-links">
    ${['支出分类', '收入分类', '专注分类', '运动分类'].map((name) => `<button data-g4="category-preview" data-value="${name}">${name}${icon('right', true)}</button>`).join('')}</div></details></section>
    <section class="settings-group"><h2>外观</h2>${settingRow('主题外观', { light: '浅色', dark: '深色', system: '跟随系统' }[themePreference], 'appearance', 'blue', 'settings-section', 'appearance')}</section>
    <section class="settings-group"><h2>数据与安全</h2>${settingRow('导出备份', '保留一份自己的数据', 'download', 'green', 'settings-section', 'export')}${settingRow('从备份恢复', '先检查内容，再确认替换', 'upload', 'blue', 'settings-section', 'restore')}<p class="group-note">原型不访问本机记录，也不读取真实备份。</p></section>
    <section class="settings-group"><h2>其他</h2><button class="setting-row" data-cessation="open">${glyph('leaf', 'green')}<span class="meta"><strong>戒烟计划</strong><small>${cessationHidden ? '健康入口已隐藏 · 可在此恢复' : '查看历史与入口设置'}</small></span>${icon('right', true)}</button>${settingRow('快捷记账', '安装指令与使用说明', 'wallet', 'blue', 'settings-section', 'shortcuts')}${settingRow('关于 LifeIndex', '私人生活索引 · 设计预览', 'heart', 'purple', 'settings-section', 'about')}</section>`
}
function detailHead(title) {
  return `<header class="detail-head"><button class="iconbtn" data-g4="settings-back" aria-label="返回设置">${icon('left')}</button><h1>${title}</h1></header>`
}
function settingsDetail() {
  const titles = {
    appearance: '主题外观',
    export: '导出备份',
    restore: '从备份恢复',
    about: '关于 LifeIndex',
    shortcuts: '快捷记账',
  }
  let content
  if (settingsSection === 'appearance') {
    content = `<p class="detail-copy">深浅之间，找到舒服的阅读方式。</p><div class="theme-options">${[
      ['system', '跟随系统', '与设备外观保持一致'],
      ['light', '浅色', '冷白背景，清晰轻盈'],
      ['dark', '深色', '深海蓝背景，安静沉浸'],
    ]
      .map(
        ([id, label, desc]) =>
          `<button data-g4="theme" data-value="${id}" aria-pressed="${themePreference === id}"><span class="theme-swatch ${id}" aria-hidden="true"><i></i><i></i></span><span class="meta"><strong>${label}</strong><small>${desc}</small></span><span class="check ${themePreference === id ? 'done' : ''}">${themePreference === id ? icon('check', true) : ''}</span></button>`,
      )
      .join(
        '',
      )}</div><p class="helper">仅应用于当前原型；刷新后重置。</p><button class="subtle-button" data-g4="arm-theme-failure">演示下一次切换失败</button>`
  } else if (settingsSection === 'shortcuts') {
    content = `<p class="detail-copy">从手机快捷指令发起一笔记录，回到 LifeIndex 确认后保存。</p><div class="safety-note">${icon('wallet')}<div><h2>快速记一笔</h2><p>拟支持输入金额与可选备注，然后在 App 选择一级/二级分类。不是支付监听，不会自动读取其他 App。</p></div></div><button class="primary" disabled aria-describedby="shortcut-availability">添加到快捷指令 · 待提供</button><p id="shortcut-availability" class="helper">设计预览：尚无可安装的共享链接，不会触发下载或安装。</p><ol class="backup-steps"><li>正式上线后点“添加到快捷指令”</li><li>在 iPhone 快捷指令中查看内容并确认添加</li><li>运行指令，输入金额，可选填备注</li><li>在 LifeIndex 选择分类并确认记账</li></ol><div class="safety-note"><div><h2>先验证，再开放安装</h2><p>需要完成快捷协议升级及 iPhone 测试，确认打开的是平时使用的账本。快捷指令不能直接写入网页的本地数据库。</p></div></div>`
    log('shortcuts.guide_opened', 'settings')
  } else if (settingsSection === 'export') {
    content = `<p class="detail-copy">备份是一份可由你保管的数据副本。</p><div class="safety-note">${icon('history')}<div><h2>演示，不会生成文件</h2><p>正式产品会生成备份，再交给系统分享或保存。本页只说明流程，不能作为已有备份的证明。</p></div></div><ol class="backup-steps"><li>生成包含当前记录的备份</li><li>选择“存储到文件”或分享</li><li>在文件 App 中确认文件存在</li></ol><button class="primary" data-g4="export-preview">查看导出完成提示样式</button>`
  } else if (settingsSection === 'restore') {
    content = `<p class="detail-copy">先检查备份，再决定是否替换。恢复不是合并。</p><div class="safety-note">${icon('wallet')}<div><h2>只演示，不触碰数据</h2><p>使用内置合成备份预览；不选择真实文件，不执行本机数据替换。</p></div></div><button class="primary" data-g4="restore-preview">预览合成备份</button><button class="secondary full" data-g4="restore-legacy">预览旧格式备份（V2）</button><button class="secondary full" data-g4="restore-invalid">演示无效文件</button><div id="safety-result" role="status"></div>`
  } else {
    content = `<div class="about-mark">${icon('heart')}<h2>LifeIndex</h2><p>Index your life.</p></div><p class="detail-copy">记录金钱、专注和健康。轻量、本地优先，数据由你保管。</p><div class="safety-note"><p>这是 G4 交互原型，不是已发布的新版本。所有记录均为合成样本，刷新后重置。</p></div>`
  }
  screen.innerHTML = detailHead(titles[settingsSection]) + content
}
function applyPreviewTheme() {
  // System preference affects appearance only; no business data or real settings are persisted.
  document.documentElement.dataset.theme =
    themePreference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themePreference
}
systemTheme.addEventListener('change', () => {
  if (themePreference === 'system') {
    applyPreviewTheme()
    log('theme.system_changed', 'settings')
  }
})
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-g4]')
  if (!button || button.disabled) return
  const action = button.dataset.g4
  log('preview.' + action, view)
  if (settingsBusy) {
    log('settings.action_blocked_busy', 'settings')
    return
  }
  if (action === 'today-finance') {
    selected = today
    year = 2026
    month = 8
    switchView('finance')
    return
  }
  if (action === 'settings-section') {
    settingsSection = button.dataset.value
    settingsPage()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    return
  }
  if (action === 'settings-back') {
    categoryParent = null
    settingsSection = ''
    settingsPage()
    screen.scrollTop = 0
    return
  }
  if (action === 'arm-theme-failure') {
    failNext = true
    toast('下一次主题切换将模拟失败')
    return
  }
  if (action === 'theme') {
    const previous = themePreference
    settingsBusy = true
    screen.querySelectorAll('button').forEach((el) => (el.disabled = true))
    document.querySelectorAll('#nav button').forEach((el) => (el.disabled = true))
    log('theme.saving', 'settings')
    try {
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (failNext) {
        failNext = false
        throw new Error('preview_failure')
      }
      themePreference = button.dataset.value
      applyPreviewTheme()
      log('theme.saved', 'settings')
    } catch {
      themePreference = previous
      applyPreviewTheme()
      toast('未能切换，已保留原主题。请重试。')
      log('theme.save_failed', 'settings')
    } finally {
      settingsBusy = false
      render()
    }
    return
  }
  if (action === 'category-preview') {
    categoryGroup =
      Object.keys(categoryGroups).find((key) => categoryGroups[key] === button.dataset.value) ||
      'expense'
    categoryParent = null
    categoryArchived = false
    settingsSection = 'categories'
    render()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    return
  }
  if (action === 'export-preview') {
    showInfo(
      '导出提示 · 样式演示',
      '<p class="detail-copy">请到文件 App 确认备份文件存在，再将它视为可用备份。</p><p class="helper">当前原型没有生成文件，也没有调起系统分享。</p>',
    )
    return
  }
  if (action === 'restore-invalid') {
    document.querySelector('#safety-result').innerHTML =
      '<p class="error">无法读取这份示例备份：格式不受支持。请选择有效的 LifeIndex 备份。</p><p class="helper">演示结果 · 当前数据未被替换。</p>'
    log('restore.validation_failed', 'settings')
    return
  }
  if (action === 'restore-preview' || action === 'restore-legacy') {
    // A legacy preview must disclose deterministic data loss, not soften it as a possibility.
    const legacy = action === 'restore-legacy'
    showInfo(
      '备份预览 · 合成样本',
      `<p class="helper">内置示例，非真实文件校验</p><dl class="backup-facts"><div><dt>备份格式</dt><dd>${legacy ? 'V2' : 'V3'}</dd></div><div><dt>导出时间</dt><dd>2026-09-17 20:00</dd></div><div><dt>账目 / 体重 / 运动</dt><dd>21 / 14 / 3 条</dd></div></dl><p class="detail-copy">正式恢复会替换当前本机记录，不是追加或合并。</p>${legacy ? '<div class="safety-note" role="alert"><p><strong class="danger">这份旧备份不包含戒烟数据。</strong><br>正式恢复会清空本机现有的戒烟计划和相关记录，不能通过切回旧版本找回。本次仅演示，不替换数据。</p></div>' : ''}<button type="button" class="secondary full danger" data-g4="restore-confirm">演示替换确认</button>`,
    )
    return
  }
  if (action === 'restore-confirm') {
    ask(
      '替换本机数据？',
      '正式操作会以所选备份替换本机数据；本次仅演示确认，不进行任何替换。',
      '确认演示（不替换数据）',
      () => {
        editor.close()
        toast('确认流程演示结束 · 数据未改变')
        log('restore.confirmation_demo_completed', 'settings')
      },
      '返回预览',
    )
  }
})

// Use local noon for calendar arithmetic so timezone offsets do not shift a date key.
function habitDate(date, delta = 0) {
  const value = new Date(date + 'T12:00:00')
  value.setDate(value.getDate() + delta)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
function habitScheduled(habit, date) {
  return date >= habit.start && habit.weekdays.includes(new Date(date + 'T12:00:00').getDay())
}
function habitStats(habit) {
  const dates = []
  for (let date = habit.start; date <= today; date = habitDate(date, 1))
    if (habitScheduled(habit, date)) dates.push(date)
  let running = 0,
    longest = 0,
    current = 0
  dates.forEach((date) => {
    running = habit.records.has(date) ? running + 1 : 0
    longest = Math.max(longest, running)
  })
  // Today's unfinished task is still in progress; it must not erase yesterday's streak.
  let index = dates.length - 1
  if (dates[index] === today && !habit.records.has(today)) index--
  while (index >= 0 && habit.records.has(dates[index--])) current++
  const monthDates = dates.filter((date) => date.startsWith(today.slice(0, 7)))
  const completed = monthDates.filter((date) => habit.records.has(date)).length
  return {
    current,
    longest,
    completed,
    scheduled: monthDates.length,
    rate: monthDates.length ? Math.round((completed / monthDates.length) * 100) : 0,
    total: habit.records.size,
  }
}
function habitList() {
  const active = habits.filter((habit) => !habit.paused && habitScheduled(habit, today))
  return `<section aria-label="今日习惯"><div class="sectionhead"><h2>今天的习惯</h2><small>${active.filter((h) => h.records.has(today)).length} / ${active.length}</small></div>${active.map((h) => `<div class="record habit-row"><button class="habit-open" data-b2="detail" data-id="${h.id}">${glyph(h.symbol, h.color)}<span class="meta"><strong>${escapeHTML(h.name)}</strong><small>${h.records.has(today) ? '今天已完成' : '今天待完成'} · 查看详情</small></span></button><button class="iconbtn" data-b2="toggle" data-id="${h.id}" aria-label="${h.records.has(today) ? '撤销' : '完成'}${escapeHTML(h.name)}" aria-pressed="${h.records.has(today)}"><span class="check ${h.records.has(today) ? 'done' : ''}">${h.records.has(today) ? icon('check', true) : icon('plus', true)}</span></button></div>`).join('') || '<p class="empty">今天没有待完成的习惯。</p>'}<button class="subtle-button" data-b2="manage">管理习惯 ${icon('right', true)}</button></section>`
}
function habitPage() {
  const h = habits.find((item) => item.id === selectedHabit)
  const head = `<header class="detail-head"><button class="iconbtn" data-b2="${h ? 'manage' : 'back'}" aria-label="${h ? '返回习惯管理' : '返回健康'}">${icon('left')}</button><h1>${h ? '习惯详情' : '习惯管理'}</h1><button class="iconbtn push-right" data-b2="${h ? 'edit-habit' : 'new-habit'}" aria-label="${h ? '编辑习惯' : '新增习惯'}">${icon(h ? 'settings' : 'plus')}</button></header>`
  if (!h) {
    screen.innerHTML =
      head +
      `<p class="detail-copy">按自己的节奏。暂停后保留已有记录。</p>${habits.map((item) => `<button class="record" data-b2="detail" data-id="${item.id}">${glyph(item.symbol, item.color)}<span class="meta"><strong>${escapeHTML(item.name)}</strong><small>${item.paused ? '已暂停' : item.weekdays.length === 7 ? '每天' : '每周 ' + item.weekdays.map((d) => '日一二三四五六'[d]).join('、')}</small></span>${icon('right', true)}</button>`).join('')}`
    return
  }
  const stats = habitStats(h)
  const start = habitDate(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7) - 91)
  const state = (date) =>
    date > today
      ? '未来日期'
      : h.records.has(date)
        ? '已完成'
        : !habitScheduled(h, date)
          ? '非计划日'
          : '未完成'
  screen.innerHTML =
    head +
    `<div class="habit-identity">${glyph(h.symbol, h.color)}<h2>${escapeHTML(h.name)}</h2><p>${h.paused ? '已暂停 · 历史保留' : h.weekdays.length === 7 ? '每天' : '每周 ' + h.weekdays.map((d) => '日一二三四五六'[d]).join('、')} · ${h.start} 开始</p></div><dl class="habit-stats"><div><dt>当前连续</dt><dd>${stats.current}<small> 天</small></dd></div><div><dt>最长连续</dt><dd>${stats.longest}<small> 天</small></dd></div><div><dt>本月完成率</dt><dd>${stats.rate}<small>%</small></dd></div><div><dt>累计完成</dt><dd>${stats.total}<small> 次</small></dd></div></dl><section><div class="sectionhead"><h2>最近 14 周</h2><small>本月 ${stats.completed} / ${stats.scheduled} 计划日</small></div><p class="helper">${start} — ${habitDate(start, 97)} · 列为周，行从周一至周日</p><div class="heatmap-scroll"><div class="habit-heatmap" aria-label="习惯完成日历">${Array.from(
      { length: 98 },
      (_, index) => {
        const date = habitDate(start, index),
          status = state(date)
        return `<button class="heat-cell ${h.records.has(date) ? 'completed' : ''} ${!habitScheduled(h, date) || date > today ? 'unscheduled' : ''}" data-b2="day" data-date="${date}" aria-label="${date}，${status}" aria-pressed="${habitDay === date}">${h.records.has(date) ? icon('check', true) : '<span aria-hidden="true">·</span>'}</button>`
      },
    ).join(
      '',
    )}</div></div><p id="habit-day-status" class="heatmap-status" role="status">${habitDay} · ${state(habitDay)}</p><p class="helper">实色 ✓ 为完成，空心为未完成，虚线为非计划日或未来。点日期只查看，不补打卡。今日未完成不打断此前连续天数；本月统计截至演示今天。</p></section>${h.note ? `<p class="detail-copy">${escapeHTML(h.note)}</p>` : ''}<div class="habit-actions">${!h.paused && habitScheduled(h, today) ? `<button class="primary" data-b2="toggle" data-id="${h.id}">${icon('check', true)} ${h.records.has(today) ? '撤销今天打卡' : '完成今天打卡'}</button>` : ''}<button class="secondary full" data-b2="pause">${h.paused ? '恢复习惯' : '暂停习惯'}</button><button class="subtle-button" data-action="fail-write">演示下一次写入失败</button></div><p class="sample-caption">合成样本 · 暂停不免除原计划日，不改写历史统计</p>`
}
function openHealthPreference(kind) {
  draftKind = kind
  editingId = null
  editorScroll = screen.scrollTop
  const h = kind === 'habit-settings' ? habits.find((item) => item.id === selectedHabit) : null
  const content =
    kind === 'target'
      ? `<p class="detail-copy">目标只用于对照，不评价体重或健康状态。清除目标不会删除体重记录。</p><label class="field"><span>目标 · kg</span><input name="target" inputmode="decimal" value="${weightTarget ?? ''}" placeholder="20–500，最多一位小数"></label>${weightTarget !== null ? '<button type="button" class="subtle-button danger" data-b2="clear-target">清除目标</button>' : ''}`
      : `<label class="field"><span>习惯名称</span><input name="name" maxlength="60" value="${escapeHTML(h?.name || '')}" placeholder="例如：睡前阅读"></label><div class="field-grid"><label class="field"><span>图标</span><select name="symbol">${[
          ['book', '阅读'],
          ['drop', '喝水'],
          ['activity', '运动'],
          ['heart', '健康'],
          ['leaf', '日常'],
        ]
          .map(
            ([id, title]) =>
              `<option value="${id}" ${h?.symbol === id ? 'selected' : ''}>${title}</option>`,
          )
          .join('')}</select></label><label class="field"><span>颜色</span><select name="color">${[
          ['purple', '紫色'],
          ['blue', '蓝色'],
          ['green', '绿色'],
          ['orange', '橙色'],
        ]
          .map(
            ([id, title]) =>
              `<option value="${id}" ${h?.color === id ? 'selected' : ''}>${title}</option>`,
          )
          .join(
            '',
          )}</select></label></div><fieldset class="habit-schedule"><legend>每周计划日 · 全选即每天</legend>${[1, 2, 3, 4, 5, 6, 0].map((day) => `<label><input type="checkbox" name="weekday" value="${day}" ${!h || h.weekdays.includes(day) ? 'checked' : ''}><span>${'日一二三四五六'[day]}</span></label>`).join('')}</fieldset><label class="field"><span>开始日期</span><input type="date" name="start" value="${h?.start || today}"></label><label class="field"><span>备注 · 可选</span><input name="note" maxlength="280" value="${escapeHTML(h?.note || '')}"></label><p class="helper">修改计划会按新规则重新计算连续天数与本月完成率，已有打卡保留。</p>`
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${kind === 'target' ? '体重目标' : h ? '编辑习惯' : '新增习惯'}</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body">${content}<p id="form-error" class="error" role="alert"></p><button type="button" class="subtle-button" data-action="fail-write">演示下一次写入失败</button><p class="helper">仅保存在本次原型内存，刷新重置。</p></div><div class="sheet-footer"><button type="submit" class="primary">保存${kind === 'target' ? '目标' : '习惯'}</button></div>`
  initialDraft = draftSnapshot()
  editor.showModal()
  form.querySelector('input').focus()
  log('preference.opened', kind)
}
async function healthMutation(eventName, mutate) {
  if (busy) {
    log('health.action_blocked_busy', 'health')
    return false
  }
  busy = true
  const controls = [...document.querySelectorAll('button,input,select')]
  controls.forEach((el) => (el.disabled = true))
  log(eventName + '.started', 'health')
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (failNext) {
      failNext = false
      throw new Error('preview_failure')
    }
    // Apply only after the simulated write succeeds; failed changes preserve records and drafts.
    mutate()
    log(eventName + '.saved', 'health')
    return true
  } catch {
    if (editor.open) error('未能保存，原值和输入已保留。请重试。')
    else toast('未能保存，原记录已保留。请重试。')
    log(eventName + '.failed', 'health')
    return false
  } finally {
    busy = false
    controls.forEach((el) => (el.disabled = false))
  }
}
async function saveHealthPreference(data) {
  const kind = draftKind
  const days = [...new FormData(form).getAll('weekday')].map(Number).sort()
  if (
    kind === 'target' &&
    (!/^\d{1,3}(\.\d)?$/.test(data.target || '') ||
      Number(data.target) < 20 ||
      Number(data.target) > 500)
  ) {
    error('请输入 20–500 kg 的目标，最多一位小数。', 'target')
    return
  }
  if (kind === 'habit-settings') {
    if (!data.name.trim()) {
      error('请输入习惯名称。', 'name')
      return
    }
    if (!days.length) {
      error('请至少选择一个计划日。')
      return
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.start || '') ||
      habitDate(data.start) !== data.start ||
      data.start < '2000-01-01' ||
      data.start > '2100-12-31'
    ) {
      error('请选择 2000–2100 年内的有效日期。', 'start')
      return
    }
  }
  const submit = form.querySelector('[type=submit]')
  submit.textContent = '保存中…'
  const saved = await healthMutation(kind, () => {
    if (kind === 'target') weightTarget = Number(data.target)
    else {
      const existing = habits.find((h) => h.id === selectedHabit)
      const fields = {
        name: data.name.trim(),
        symbol: data.symbol,
        color: data.color,
        start: data.start,
        weekdays: days,
        note: data.note.trim(),
      }
      if (existing) Object.assign(existing, fields)
      else {
        const id = Math.max(0, ...habits.map((h) => h.id)) + 1
        habits.push({ ...fields, id, paused: false, records: new Set() })
        selectedHabit = id
      }
    }
  })
  if (saved) {
    editor.close()
    draftKind = ''
    render()
    screen.scrollTop = editorScroll
    toast('已保存 · 仅当前原型有效')
  } else submit.textContent = '重试保存'
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-b2]')
  if (!button || button.disabled || busy) return
  const action = button.dataset.b2
  log('habit_ui.' + action, 'health')
  if (action === 'target') {
    openHealthPreference('target')
    return
  }
  if (action === 'new-habit' || action === 'edit-habit') {
    if (action === 'new-habit') selectedHabit = null
    openHealthPreference('habit-settings')
    return
  }
  if (action === 'clear-target') {
    ask(
      '清除体重目标？',
      '仅清除目标，所有体重记录和趋势保留。',
      '清除目标',
      async () => {
        if (
          await healthMutation('target.clear', () => {
            weightTarget = null
          })
        ) {
          editor.close()
          draftKind = ''
          render()
          toast('目标已清除，记录保留')
        }
      },
      '保留目标',
    )
    return
  }
  if (action === 'detail' || action === 'manage') {
    if (healthSection !== 'habits') healthOverviewScroll = screen.scrollTop
    selectedHabit = action === 'detail' ? Number(button.dataset.id) : null
    habitDay = today
    healthSection = 'habits'
    view = 'health'
    render()
    screen.scrollTop = 0
    screen.focus({ preventScroll: true })
    return
  }
  if (action === 'back') {
    healthSection = ''
    render()
    screen.scrollTop = healthOverviewScroll
    screen.focus({ preventScroll: true })
    return
  }
  const h = habits.find((item) => item.id === Number(button.dataset.id || selectedHabit))
  if (!h) {
    toast('习惯不存在，请重新选择')
    log('habit.missing', 'health')
    return
  }
  if (action === 'day') {
    habitDay = button.dataset.date
    const position = screen.scrollTop
    habitPage()
    screen.scrollTop = position
    screen.querySelector(`[data-date="${habitDay}"]`)?.focus({ preventScroll: true })
    return
  }
  if (action === 'toggle') {
    if (h.paused || !habitScheduled(h, today)) {
      log('habit.not_scheduled', 'health')
      return
    }
    if (
      await healthMutation('habit.checkin', () => {
        if (h.records.has(today)) h.records.delete(today)
        else h.records.add(today)
      })
    ) {
      const position = screen.scrollTop
      render()
      screen.scrollTop = position
      toast(h.records.has(today) ? '今天已完成' : '已撤销今天打卡')
    }
  }
  if (action === 'pause')
    ask(
      h.paused ? '恢复这个习惯？' : '暂停这个习惯？',
      h.paused
        ? '恢复后，计划日会重新出现在今天。已有记录保持不变。'
        : '暂停后不出现在今天，已有打卡保留。历史统计仍按计划日计算。',
      h.paused ? '恢复习惯' : '暂停习惯',
      async () => {
        if (
          await healthMutation('habit.status', () => {
            h.paused = !h.paused
          })
        ) {
          render()
          toast(h.paused ? '已暂停，历史保留' : '已恢复习惯')
        }
      },
      '返回详情',
    )
})
function recordCollection(kind) {
  return kind === 'finance'
    ? fixtures.transactions
    : kind === 'weight'
      ? fixtures.weights
      : fixtures.activities
}
function restoreEditorContext() {
  // Re-rendering removes the original trigger: restore a surviving row, otherwise the list container.
  screen.scrollTop = editorScroll
  const trigger = editingId === null ? null : screen.querySelector(`[data-id="${editingId}"]`)
  ;(trigger || screen).focus({ preventScroll: true })
}
function healthHistoryPage() {
  const weight = healthSection === 'weight'
  const rows = [...recordCollection(healthSection)].sort((a, b) =>
    `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
  )
  let previousDate = ''
  screen.innerHTML = `<header class="detail-head"><button class="iconbtn" data-action="health-back" aria-label="返回健康">${icon('left')}</button><h1>${weight ? '体重记录' : '运动记录'}</h1><span style="margin-left:auto">${addButton(weight ? '新增体重' : '新增运动', healthSection)}</span></header><p class="detail-copy">全部 ${rows.length} 条记录 · 按日期排列<br>点记录编辑，已有历史不会隐藏。</p>${
    rows
      .map((row) => {
        const heading =
          row.date === previousDate ? '' : `<h2 class="history-date">${escapeHTML(row.date)}</h2>`
        previousDate = row.date
        return (
          heading +
          `<button class="record" data-action="edit-health" data-id="${row.id}">${glyph(weight ? 'weight' : categoryFor(row.type)?.icon || 'activity', weight ? 'blue' : categoryFor(row.type)?.color || 'orange')}<span class="meta"><strong>${weight ? '体重' : escapeHTML(categoryLabel(row.type))}</strong><small>${escapeHTML(row.time)}</small>${row.note ? `<small>${escapeHTML(row.note)}</small>` : ''}</span><span class="amount">${row.value} <small>${weight ? 'kg' : '分钟'}</small></span>${icon('right', true)}</button>`
        )
      })
      .join('') ||
    `<div class="empty">尚无${weight ? '体重' : '运动'}记录<br><button class="subtle-button" data-action="add" data-kind="${healthSection}">记录第一次${weight ? '体重' : '运动'}</button></div>`
  }<p class="sample-caption">合成内存记录 · 编辑与删除仅影响本次预览</p>`
}
function requestRecordDeletion() {
  if (busy || editingId === null) return
  const kind = draftKind,
    id = editingId
  const item = recordCollection(kind).find((row) => row.id === id)
  if (!item) {
    error('记录已不存在，请关闭后重新选择。')
    log('delete.record_missing', kind)
    return
  }
  // Confirmation describes the saved object, never an unsaved draft; no record details enter logs.
  ask(
    '删除这条记录？',
    `${item.date} · ${kind === 'finance' ? escapeHTML(categories[item.category].title) : kind === 'weight' ? '体重' : '运动'}。删除后无法在应用内撤销；尚未保存的修改也会放弃。原型刷新可重置样本。`,
    '删除记录',
    async () => {
      busy = true
      form.querySelectorAll('button,input,select').forEach((el) => (el.disabled = true))
      document.querySelector('#form-error').textContent = '正在删除…'
      log('delete.started', kind)
      try {
        await new Promise((resolve) => setTimeout(resolve, 450))
        if (failNext) {
          failNext = false
          throw new Error('preview_failure')
        }
        const rows = recordCollection(kind),
          index = rows.findIndex((row) => row.id === id)
        if (index < 0) throw new Error('preview_record_missing')
        rows.splice(index, 1)
        if (kind === 'finance' && lastSavedRecord?.id === id) lastSavedRecord = null
        editor.close()
        draftKind = ''
        render()
        restoreEditorContext()
        toast('已删除 · 仅当前原型有效')
        log('delete.completed', kind)
      } catch {
        error('未能删除，记录和输入已保留。请重试。')
        log('delete.failed', kind)
      } finally {
        busy = false
        form.querySelectorAll('button,input,select').forEach((el) => (el.disabled = false))
      }
    },
    '保留记录',
  )
}
// Convert synthetic movement labels to stable category references; production data is not touched.
for (const row of fixtures.activities)
  row.type = { 散步: 'walking', 力量训练: 'strength', 跑步: 'running' }[row.type]
// Health fixture IDs remain stable across sorting, edits and deletes; list position is not identity.
for (const row of [...fixtures.weights, ...fixtures.activities]) row.id = ++sequence
setInterval(updateClock, 1000)
log('prototype.ready')
render()
