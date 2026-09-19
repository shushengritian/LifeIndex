'use strict'

// This isolated proposal never touches LifeIndex storage. Every value is a disposable fixture.
const params = new URLSearchParams(location.search)
document.documentElement.dataset.theme = params.get('theme') === 'light' ? 'light' : 'dark'
const views = ['finance', 'health', 'focus']
let view = views.includes(params.get('view')) ? params.get('view') : 'finance'
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
let initialDraft = ''
let toastTimeout
let focusDuration = 25
let customDuration = false
let focusTitle = ''
let lastSavedRecord = null
let session = null
let confirmAction = null
const fixtures = { transactions: [], weights: [], activities: [], habits: [false, true] }
let sequence = 0
const focusHistory = [
  { title: '阅读', minutes: 25, time: '08:30' },
  { title: '写作', minutes: 50, time: '10:00' },
]
const paths = {
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
const categories = {
  food: { title: '餐饮', icon: 'food', color: 'orange' },
  coffee: { title: '咖啡', icon: 'coffee', color: 'purple' },
  transit: { title: '交通', icon: 'transit', color: 'blue' },
  bag: { title: '购物', icon: 'bag', color: 'green' },
  pay: { title: '工资', icon: 'pay', color: 'green' },
}
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
  const items = [
    ['today', '今天', 'today'],
    ['finance', '记账', 'wallet'],
    ['focus', '专注', 'timer'],
    ['health', '健康', 'heart'],
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
              return `<button class="record" data-action="record" data-id="${t.id}">${glyph(c.icon, c.color)}<span class="meta"><strong>${escapeHTML(t.note || c.title)}</strong><small>${c.title} · ${t.time}</small></span><span class="amount${t.type === 'income' ? ' income' : ''}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span></button>`
            })
            .join('')
        : '<div class="empty">这一天还没有记录。<br><button class="subtle-button" data-action="add" data-kind="finance">记一笔</button></div>'
    }</div>
    <p class="sample-caption">合成样本 · 日历小额为元，k 为千元</p>`
}
function health() {
  const weights = [...fixtures.weights].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  )
  const latest = weights.at(-1)
  const difference = latest.value - weights[0].value
  const activities = fixtures.activities.filter((a) => a.date >= '2026-09-14' && a.date <= today)
  screen.innerHTML =
    header('健康', '照顾身体，也照顾日常') +
    `<section class="weight-panel"><div class="row between"><div class="row"><span style="color:var(--blue)">${icon('weight')}</span><h2>体重</h2></div>${addButton('记录体重', 'weight')}</div><div class="weight-metric"><div><div class="big">${latest.value.toFixed(1)} <small>kg</small></div><span class="tiny muted">${latest.date === today ? '今天' : latest.date} ${latest.time}</span></div><div class="change">${difference > 0 ? '+' : '−'} ${Math.abs(difference).toFixed(1)} kg<small>较首条样本记录</small></div></div>${chart(
      weights.map((w) => w.value),
      true,
    )}<div class="axis"><span>${weights[0].date.slice(5).replace('-', '.')}</span><span>记录趋势 · kg</span><span>${latest.date.slice(5).replace('-', '.')}</span></div><div class="footer"><span class="muted">目标 <span style="color:var(--text)">63.0 kg</span></span><button class="subtle-button" data-action="history" data-kind="weight">全部记录 ${icon('right', true)}</button></div></section>
    <section class="health-group"><div class="row between"><div class="group-title">${glyph('activity', 'orange')}<h2>运动</h2></div>${addButton('记录运动', 'activity')}</div><div class="metrics"><strong>${activities.length}</strong><small>次</small><span class="divider"></span><strong>${activities.reduce((sum, a) => sum + a.value, 0)}</strong><small>分钟 · 本周</small><button class="iconbtn" style="margin-left:auto" data-action="history" data-kind="activity" aria-label="查看运动记录">${icon('right', true)}</button></div></section>
    <section class="health-group"><div class="row between"><div class="group-title">${glyph('leaf', 'green')}<div><h2>戒烟</h2><p class="subtitle">计划开始第 12 天</p></div></div><button class="iconbtn" data-action="cessation" aria-label="查看戒烟设计范围">${icon('right', true)}</button></div><div class="footnote">今天尚未记录 · 计划天数不等于无烟天数</div></section>
    <section><div class="sectionhead"><h2>今天的习惯</h2><small>${fixtures.habits.filter(Boolean).length} / 2 完成</small></div>${[
      ['阅读 20 分钟', 'book', 'purple'],
      ['晨间喝水', 'drop', 'blue'],
    ]
      .map(
        ([name, symbol, color], i) =>
          `<button class="record habit" data-action="habit" data-index="${i}" aria-pressed="${fixtures.habits[i]}" aria-label="${fixtures.habits[i] ? '撤销' : '完成'}${name}">${glyph(symbol, color)}<span class="meta"><strong>${name}</strong><small>${fixtures.habits[i] ? '今天已完成' : '今天待完成'}</small></span><span class="check${fixtures.habits[i] ? ' done' : ''}">${fixtures.habits[i] ? icon('check', true) : ''}</span></button>`,
      )
      .join('')}</section><p class="sample-caption">合成样本 · 不提供医学判断</p>`
}
function focus() {
  const running = session !== null
  const total = focusHistory.reduce((sum, item) => sum + item.minutes, 0)
  screen.innerHTML =
    header(
      '专注',
      running ? '把这一段时间，留给眼前' : '一次只做一件事',
      `<button class="iconbtn" data-action="focus-history" aria-label="查看专注记录">${icon('history')}</button>`,
    ) +
    `<section class="focus-stage" aria-label="专注计时"><svg class="orbit" viewBox="0 0 390 294" aria-hidden="true"><path d="M43 233 A169 169 0 0 1 304 49" fill="none" stroke="var(--line)" stroke-width="1.5"/><path id="progress-arc" d="M43 233 A169 169 0 0 1 304 49" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/><circle cx="43" cy="233" r="4" fill="var(--accent)"/><text x="29" y="258" fill="var(--muted)" font-size="10">0 分钟</text><text x="311" y="48" fill="var(--muted)" font-size="10">${session ? session.duration : focusDuration} 分钟</text></svg><p class="label">${running ? escapeHTML(session.title || '专注进行中') : '准备好，进入专注'}</p><div id="clock" class="clock" role="timer" aria-live="off">${String(focusDuration).padStart(2, '0')}:00</div><p id="focus-note" class="note">${running ? '已开始 · 离开此页不会停止计时' : '留一点空间，让注意力安静下来'}</p></section>
    <section class="focus-controls">${running ? `<button class="primary" data-action="finish">提前结束</button><button class="subtle-button" style="width:100%;margin-top:6px" data-action="cancel-focus">取消本次专注</button>` : `<div class="segmented" aria-label="专注时长">${[25, 50].map((n) => `<button data-action="duration" data-value="${n}" aria-pressed="${!customDuration && focusDuration === n}">${n} 分钟</button>`).join('')}<button data-action="custom-duration" aria-pressed="${customDuration}">自定义</button></div><div id="custom-time" class="time-custom" ${customDuration ? '' : 'hidden'}><label for="custom-minutes">分钟</label><input id="custom-minutes" type="number" min="1" max="240" value="${focusDuration}"></div><div class="focus-task"><label for="focus-title">这次想做什么？</label><input id="focus-title" maxlength="100" placeholder="例如：阅读、写作" value="${escapeHTML(focusTitle)}"></div><button class="primary" data-action="start">${icon('play', true)} 开始专注</button>`}</section>
    <div class="focus-summary"><span>今天已完成 <strong>${focusHistory.length}</strong> 次</span><span>累计 <strong>${total}</strong> 分钟</span></div><section class="focus-history"><div class="sectionhead"><h2>今天的记录</h2><span class="tiny muted">9 月 18 日</span></div>${focusHistory
      .slice(-3)
      .reverse()
      .map(
        (item) =>
          `<div class="record">${glyph('timer', 'purple')}<span class="meta"><strong>${escapeHTML(item.title || '专注')}</strong><small>${item.time} · 已完成</small></span><span>${item.minutes} <small>分钟</small></span></div>`,
      )
      .join('')}</section><p class="focus-footer">计时无需一直停留在此页 · 原型刷新会重置</p>`
  updateClock()
}
function render() {
  if (view === 'finance') finance()
  else if (view === 'health') health()
  else focus()
  navigation()
}
function updateClock() {
  if (!session) return
  const remaining = Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000))
  const clock = document.querySelector('#clock')
  if (clock) {
    clock.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    document
      .querySelector('#progress-arc')
      .setAttribute('stroke-dashoffset', String((100 * remaining) / (session.duration * 60)))
  }
  if (!remaining) completeFocus(false)
}
function updateDurationPreview() {
  // Update only the preview nodes so typing does not destroy the custom-minute input or its focus.
  const valid = Number.isInteger(focusDuration) && focusDuration >= 1 && focusDuration <= 240
  document.querySelector('#clock').textContent = valid
    ? `${String(focusDuration).padStart(2, '0')}:00`
    : '—:—'
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
function completeFocus(cancelled) {
  if (!session) return
  // Elapsed time derives from timestamps; hiding the tab cannot create extra completed sessions.
  if (!cancelled) {
    const elapsed = Math.min(
      session.duration,
      Math.max(0, Math.floor((Date.now() - session.startedAt) / 60000)),
    )
    focusHistory.push({ title: session.title, minutes: elapsed, time: '刚刚' })
  }
  session = null
  log(cancelled ? 'focus.cancelled' : 'focus.completed', 'focus')
  if (view === 'focus') render()
  toast(cancelled ? '本次专注已取消，未计入记录' : '专注已记录')
}
function ask(title, text, destructiveLabel, action) {
  confirmAction = action
  document.querySelector('#confirmation-content').innerHTML =
    `<h2 id="confirmation-title">${title}</h2><p>${text}</p><div class="actions"><button class="secondary" data-confirm="stay" autofocus>${editor.open || title.startsWith('离开') ? '继续编辑' : '继续专注'}</button><button class="secondary danger" data-confirm="accept">${destructiveLabel}</button></div>`
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
  const items = type === 'income' ? ['pay'] : ['food', 'coffee', 'transit', 'bag']
  return items
    .map(
      (id) =>
        `<button type="button" class="category" data-action="category" data-value="${id}" aria-pressed="${id === active}">${glyph(categories[id].icon, categories[id].color)}${categories[id].title}</button>`,
    )
    .join('')
}
function openEditor(kind) {
  log('editor.opened', kind)
  draftKind = kind
  const title = { finance: '记一笔', weight: '记录体重', activity: '记录运动' }[kind]
  const content =
    kind === 'finance'
      ? `<div class="segmented"><button type="button" data-action="record-type" data-value="expense" aria-pressed="true">支出</button><button type="button" data-action="record-type" data-value="income" aria-pressed="false">收入</button></div><input type="hidden" name="type" value="expense"><label class="amount-entry"><span>¥</span><input name="amount" aria-label="金额" inputmode="decimal" placeholder="0.00" autocomplete="off"></label><div class="field"><span>分类</span><input name="category" type="hidden" value=""><div class="category-grid">${categoryMarkup('expense')}</div></div>${dateFields(selected)}`
      : kind === 'weight'
        ? `<label class="field"><span>体重 · kg</span><input name="value" aria-label="体重" inputmode="decimal" placeholder="例如 64.8" autocomplete="off"></label>${dateFields(today)}<p class="helper">只记录变化，不评价好坏。</p>`
        : `<label class="field"><span>运动类型</span><select name="activityType"><option>散步</option><option>力量训练</option><option>跑步</option></select></label><label class="field"><span>时长 · 分钟</span><input name="value" aria-label="运动时长" inputmode="numeric" placeholder="例如 30" autocomplete="off"></label>${dateFields(today)}`
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${title}</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body">${content}<label class="field"><span>备注 <small>· 可选</small></span><input name="note" maxlength="120" placeholder="留下一点细节"></label><p id="form-error" class="error" role="alert"></p><p class="helper">设计演示 · 仅保存在当前原型内存</p></div><div class="sheet-footer"><button class="primary" type="submit">${icon('check', true)} 保存${kind === 'finance' ? '账目' : '记录'}</button></div>`
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
  let amount = 0
  if (draftKind === 'finance') {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(data.amount || '') || Number(data.amount) <= 0) {
      error('请输入大于 0、最多两位小数的金额。', 'amount')
      return
    }
    const [whole, fraction = ''] = data.amount.split('.')
    amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    if (!data.category) {
      error('请选择一个分类。')
      form.querySelector('.category').focus()
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
    if (kind === 'finance') {
      lastSavedRecord = { id: ++sequence, ...data, amount }
      fixtures.transactions.push(lastSavedRecord)
    } else if (kind === 'weight')
      fixtures.weights.push({
        date: data.date,
        time: data.time,
        value: Number(data.value),
        note: data.note,
      })
    else
      fixtures.activities.push({
        date: data.date,
        time: data.time,
        value: Number(data.value),
        type: data.activityType,
        note: data.note,
      })
    editor.close()
    draftKind = ''
    render()
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
  if (action === 'category') {
    form.elements.namedItem('category').value = button.dataset.value
    form
      .querySelectorAll('.category')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
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
    if (
      view === 'focus' &&
      !session &&
      (focusTitle || focusDuration !== 25 || customDuration) &&
      next !== view
    ) {
      ask(
        '离开尚未开始的专注？',
        '事项和时长还没有提交，离开将放弃本次草稿。',
        '放弃并离开',
        () => {
          focusTitle = ''
          focusDuration = 25
          customDuration = false
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
    showInfo(
      '账目详情',
      `<p class="dialog-note">${escapeHTML(item.date)} ${escapeHTML(item.time)}</p><h2 style="font-size:32px;margin:20px 0">${item.type === 'income' ? '+' : '−'}¥ ${money(item.amount)}</h2><p>${categories[item.category].title} · ${escapeHTML(item.note || '无备注')}</p><p class="helper" style="margin-top:22px">本轮演示新增与回看；编辑和删除全流程在 G4 展开。</p>`,
    )
    return
  }
  if (action === 'habit') {
    const i = Number(button.dataset.index)
    fixtures.habits[i] = !fixtures.habits[i]
    render()
    log('habit.toggled', 'health')
    return
  }
  if (action === 'history') {
    const isWeight = button.dataset.kind === 'weight'
    const rows = [...(isWeight ? fixtures.weights : fixtures.activities)].sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    )
    showInfo(
      isWeight ? '体重记录' : '运动记录',
      `<p class="helper">全部 ${rows.length} 条合成记录 · 此处仅演示浏览</p><div class="history">${rows.map((row) => `<div class="record"><span class="meta"><strong>${row.date}</strong><small>${row.time}${row.type ? ` · ${row.type}` : ''}</small>${row.note ? `<small>${escapeHTML(row.note)}</small>` : ''}</span><span>${row.value} ${isWeight ? 'kg' : '分钟'}</span></div>`).join('')}</div>`,
    )
    return
  }
  if (action === 'cessation') {
    showInfo(
      '戒烟 · 摘要设计',
      '<p class="dialog-note">本轮只审核健康页的戒烟摘要与入口。计划管理、烟瘾/吸烟记录和全天确认沿用已确认的事实规则，在 G4 补齐高保真流程；没有在此模拟写入。</p>',
    )
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
    if (session) {
      log('focus.duplicate_start_blocked')
      return
    }
    // Keep prototype controls within the existing product contract, not a new duration policy.
    if (
      !focusTitle.trim() ||
      !Number.isInteger(focusDuration) ||
      focusDuration < 1 ||
      focusDuration > 240
    ) {
      toast('请填写事项，并选择 1–240 的整数分钟')
      log('focus.validation_failed')
      return
    }
    session = {
      title: focusTitle.trim(),
      duration: focusDuration,
      startedAt: Date.now(),
      endsAt: Date.now() + focusDuration * 60000,
    }
    focusTitle = ''
    log('focus.started')
    render()
    return
  }
  if (action === 'finish' || action === 'cancel-focus') {
    const cancelled = action === 'cancel-focus'
    ask(
      cancelled ? '取消本次专注？' : '提前结束本次专注？',
      cancelled ? '本次专注不会计入完成记录。' : '将按实际经过的完整分钟记录。',
      cancelled ? '取消本次专注' : '结束并记录',
      () => completeFocus(cancelled),
    )
    return
  }
  if (action === 'focus-history') {
    showInfo(
      '专注记录',
      `<div class="history">${focusHistory.map((item) => `<div class="record"><span class="meta"><strong>${escapeHTML(item.title || '专注')}</strong><small>${item.time}</small></span><span>${item.minutes} 分钟</span></div>`).join('')}</div>`,
    )
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
setInterval(updateClock, 1000)
log('prototype.ready')
render()
