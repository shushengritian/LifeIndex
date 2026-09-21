'use strict'
;(() => {
  // Every record below is invented and lives only in this closure. No storage or network API is used.
  const TODAY = '2026-09-20'
  const screen = document.querySelector('#screen')
  const editor = document.querySelector('#editor')
  const form = document.querySelector('#editor-form')
  const confirmation = document.querySelector('#confirmation')
  const nav = document.querySelector('#nav')
  const paths = {
    today:
      '<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4m8-4v4M4 10h16m-11 5 2 2 5-5"/>',
    health:
      '<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
    focus: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 0v4m6 2 2-2m-8 4v5l3 2"/>',
    finance:
      '<path d="M19 7V4L5 7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5"/><path d="M21 12h-5a2 2 0 0 0 0 4h5"/>',
    settings:
      '<path d="m9 3 1-1h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    food: '<path d="M3 3v6a3 3 0 0 0 6 0V3M6 3v18m13 0V3c-4 3-5 7-4 10h4"/>',
    coffee:
      '<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h18"/>',
    transit:
      '<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M9 3v8M7 21l2-3m8 3-2-3M8 15h1m6 0h1"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2"/>',
    pay: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3M3 11h18m-12 5h6m-3-3v6"/>',
    weight:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 9a5 5 0 0 1 10 0Zm5 0 2-3"/>',
    activity: '<path d="M3 7v10m3-13v16m12-16v16m3-13v10M6 12h12"/>',
    leaf: '<path d="M20 3C9 2 3 8 5 15s15 5 15-12ZM4 21 15 9"/>',
    book: '<path d="M12 5C8 2 5 3 3 4v16c3-2 6-1 9 1 3-2 6-3 9-1V4c-2-1-5-2-9 1Zm0 0v16"/>',
    drop: '<path d="M12 2c-3 5-8 10-8 14a8 8 0 0 0 16 0c0-4-5-9-8-14Z"/><path d="M8 16a4 4 0 0 0 4 4"/>',
    history: '<path d="M3 11a9 9 0 1 1 1 6M3 4v7h7m2-4v6l4 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>',
    up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M9 12h6"/>',
    chart: '<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/>',
    smoke: '<path d="M3 16h18v4H3Zm13 0v4M17 12c4-2-4-3 0-6m4 6c4-4-4-4 0-9"/>',
  }
  const icon = (name, small = false) =>
    `<svg class="icon${small ? ' small' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.check}</svg>`
  const esc = (value = '') =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    )
  const money = (n) =>
    (n / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dateLabel = (date) => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`
  const clockLabel = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const durationLabel = (seconds) => {
    const hours = Math.floor(seconds / 3600),
      minutes = Math.floor((seconds % 3600) / 60),
      remainder = seconds % 60
    return [
      hours ? hours + ' 小时' : '',
      minutes ? minutes + ' 分钟' : '',
      remainder || !seconds ? remainder + ' 秒' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  const log = (event, module = route.split('/')[0]) =>
    console.info('[LifeIndex prototype]', { event, module })
  const reply = (action) => {
    if (parent !== window) parent.postMessage({ channel: 'lifeindex-prototype', action }, '*')
  }
  const glyph = (name, color = 'blue') => `<span class="glyph ${color}">${icon(name)}</span>`
  const ib = (action, name, label, value = '', cls = '') =>
    `<button type="button" class="icon-btn ${cls}" data-action="${action}" data-value="${esc(value)}" aria-label="${esc(label)}">${icon(name)}</button>`
  const tb = (label, action, value = '') =>
    `<button type="button" class="text-btn" data-action="${action}" data-value="${esc(value)}">${label}</button>`
  const button = (label, action, value = '', cls = 'primary') =>
    `<button type="button" class="${cls}" data-action="${action}" data-value="${esc(value)}">${label}</button>`
  const row = (title, detail, action, value, symbol = '', color = 'blue', right = '') =>
    `<button type="button" class="row" data-action="${action}" data-value="${esc(value)}">${symbol ? glyph(symbol, color) : ''}<span class="row-copy"><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</span>${right || icon('right', true)}</button>`
  const head = (title, back = '', action = '') =>
    `<header class="page-head">${back ? ib('back', 'left', '返回', back, 'back') : ''}<h1 tabindex="-1">${esc(title)}</h1>${action}</header>`
  const sectionHead = (title, action = '') =>
    `<div class="section-head"><h2>${title}</h2>${action}</div>`
  const empty = (symbol, title, detail, action = '') =>
    `<div class="empty">${icon(symbol)}<h2>${title}</h2><p>${detail}</p>${action}</div>`
  const stat = (label, value) => `<div><small>${label}</small><strong>${value}</strong></div>`
  const field = (label, name, value = '', type = 'text', attrs = '') =>
    `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}/></label>`
  const options = (items, selected) =>
    items
      .map(
        ([v, t]) =>
          `<option value="${esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${esc(t)}</option>`,
      )
      .join('')
  const selectField = (label, name, items, selected) =>
    `<label class="field">${label}<select name="${name}">${options(items, selected)}</select></label>`
  const noteField = (value) => field('备注（可选）', 'note', value, 'text', 'maxlength="280"')
  const whenField = (date = TODAY, time = '12:30') =>
    `<div class="form-grid">${field('日期', 'date', date, 'date', `required max="${TODAY}"`)}${field('时间', 'time', time, 'time', 'required')}</div>`
  let data,
    sequence = 200,
    route = 'today',
    selectedDate = TODAY,
    month = '2026-09',
    habitDay = TODAY
  let categoryGroup = 'expense',
    showArchived = false,
    focusRange = 'today'
  let reportMonth = '2026-09',
    reportType = 'expense'
  let focusDraft = { minutes: 25, custom: false, title: '', category: 'reading', note: '' }
  let session = null,
    focusBusy = false,
    focusError = '',
    focusInvalid = '',
    failNext = false,
    sheet = null,
    confirmState = null
  let restoreStage = 'choose',
    restoreBusy = false,
    restoreError = '',
    exportDone = false,
    appearance = 'dark'
  let noticeTimer,
    checkBusy = false
  const scrolls = new Map()
  const routeOrigins = new Map()
  let lastSavedTransaction = null

  function makeSample(kind = 'sample') {
    const categories = [
      {
        id: 'food',
        name: '餐饮',
        group: 'expense',
        icon: 'food',
        color: 'orange',
        children: [
          { id: 'lunch', name: '正餐' },
          { id: 'coffee', name: '咖啡茶饮' },
        ],
      },
      {
        id: 'transit',
        name: '交通',
        group: 'expense',
        icon: 'transit',
        color: 'blue',
        children: [
          { id: 'metro', name: '公共交通' },
          { id: 'taxi', name: '打车' },
        ],
      },
      {
        id: 'shopping',
        name: '购物',
        group: 'expense',
        icon: 'bag',
        color: 'purple',
        children: [
          { id: 'daily', name: '日用品' },
          { id: 'clothes', name: '服饰' },
        ],
      },
      {
        id: 'other',
        name: '其他',
        group: 'expense',
        icon: 'finance',
        color: 'green',
        children: [],
      },
      {
        id: 'salary',
        name: '工资',
        group: 'income',
        icon: 'pay',
        color: 'green',
        children: [{ id: 'wage', name: '月薪' }],
      },
      {
        id: 'refund',
        name: '其他收入',
        group: 'income',
        icon: 'finance',
        color: 'blue',
        children: [],
      },
      { id: 'reading', name: '阅读', group: 'focus', icon: 'book', color: 'purple', children: [] },
      { id: 'work', name: '工作', group: 'focus', icon: 'pay', color: 'blue', children: [] },
      {
        id: 'walk',
        name: '步行',
        group: 'activity',
        icon: 'activity',
        color: 'green',
        children: [],
      },
      {
        id: 'run',
        name: '跑步',
        group: 'activity',
        icon: 'activity',
        color: 'orange',
        children: [],
      },
    ]
    const result = {
      categories,
      transactions: [],
      weights: [],
      activities: [],
      habits: [],
      focus: [],
      events: [],
      confirmations: [],
      target: null,
      plan: null,
      hidden: false,
      plans: [],
    }
    if (kind === 'empty') return result
    for (let day = 1; day <= 19; day++)
      result.transactions.push({
        id: day,
        date: `2026-09-${String(day).padStart(2, '0')}`,
        time: '12:20',
        type: 'expense',
        amount: [4200, 2800, 8600, 5900, 3200][day % 5],
        category: 'food',
        child: 'lunch',
        note: '',
      })
    result.transactions.push(
      {
        id: 40,
        date: TODAY,
        time: '08:10',
        type: 'expense',
        amount: 2400,
        category: 'food',
        child: 'coffee',
        note: '晨间咖啡',
      },
      {
        id: 41,
        date: TODAY,
        time: '12:30',
        type: 'expense',
        amount: 3800,
        category: 'food',
        child: 'lunch',
        note: '',
      },
      {
        id: 42,
        date: TODAY,
        time: '09:20',
        type: 'expense',
        amount: 600,
        category: 'transit',
        child: 'metro',
        note: '',
      },
      {
        id: 43,
        date: '2026-09-05',
        time: '09:00',
        type: 'income',
        amount: 1280000,
        category: 'salary',
        child: 'wage',
        note: '',
      },
    )
    ;[68.9, 68.7, 68.8, 68.5, 68.6, 68.3, 68.4].forEach((value, i) =>
      result.weights.push({
        id: 50 + i,
        value,
        date: `2026-09-${14 + i}`,
        time: '07:30',
        note: '',
      }),
    )
    result.target = 65
    result.activities = [
      {
        id: 61,
        category: 'walk',
        minutes: 35,
        intensity: '适中',
        date: TODAY,
        time: '07:10',
        note: '沿河散步',
      },
      {
        id: 62,
        category: 'run',
        minutes: 25,
        intensity: '较强',
        date: '2026-09-18',
        time: '18:30',
        note: '',
      },
    ]
    result.habits = [
      {
        id: 71,
        name: '阅读 20 分钟',
        icon: 'book',
        color: 'purple',
        start: '2026-08-01',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        paused: false,
        note: '',
        checks: ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'],
      },
      {
        id: 72,
        name: '晨间喝水',
        icon: 'drop',
        color: 'blue',
        start: '2026-08-01',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        paused: false,
        note: '',
        checks: ['2026-09-17', '2026-09-18', '2026-09-19', TODAY],
      },
    ]
    result.focus = [
      {
        id: 81,
        title: '读完一章',
        category: 'reading',
        note: '',
        seconds: 1500,
        date: TODAY,
        time: '08:30',
        kind: '完成',
      },
      {
        id: 82,
        title: '整理本周笔记',
        category: 'work',
        note: '',
        seconds: 3000,
        date: '2026-09-19',
        time: '15:00',
        kind: '完成',
      },
    ]
    result.plan = { id: 91, start: '2026-09-08', reason: '想把呼吸和生活慢慢找回来', ended: false }
    result.events = [
      {
        id: 92,
        kind: 'craving',
        date: '2026-09-19',
        time: '15:10',
        intensity: '中等',
        trigger: '工作间隙',
        response: '喝水',
        note: '',
      },
      {
        id: 93,
        kind: 'smoking',
        date: '2026-09-16',
        time: '18:00',
        count: 1,
        trigger: '饭后',
        note: '',
      },
    ]
    result.confirmations = ['2026-09-18', '2026-09-19']
    if (kind === 'long') {
      result.habits[0].name = '每天睡前阅读二十分钟并留下今天最喜欢的一段文字'
      result.transactions[0].note = '长备注合成样本：检查换行、编辑面板和返回后的滚动位置。'
      result.focus[0].title = '整理过去一周的阅读笔记，重新思考下一阶段的个人学习计划'
      result.categories[0].name = '餐饮与饮品及日常聚餐的长分类名称'
      result.transactions.find((t) => t.id === 40).amount = 1234567890
    }
    return result
  }
  data = makeSample()
  const category = (id) => data.categories.find((c) => c.id === id)
  const currentHabit = () => data.habits.find((h) => h.id === Number(route.split('/')[2]))
  const activePlan = () => data.plan && !data.plan.ended
  // The larger creation id wins equal timestamps, consistently across summary, chart and history.
  const sorted = (values) =>
    [...values].sort(
      (a, b) =>
        `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`) ||
        Number(b.id) - Number(a.id),
    )
  const due = (habit, date = TODAY) =>
    !habit.paused &&
    date >= habit.start &&
    habit.weekdays.includes(new Date(`${date}T12:00:00`).getDay())
  const sum = (values, key) => values.reduce((total, item) => total + item[key], 0)

  function announce(message) {
    const notice = document.querySelector('#notice')
    notice.textContent = message
    notice.classList.add('visible')
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => notice.classList.remove('visible'), 3400)
  }
  function render(options = {}) {
    const top = screen.scrollTop
    const views = {
      today: renderToday,
      health: renderHealth,
      focus: renderFocus,
      finance: renderFinance,
      settings: renderSettings,
    }
    screen.innerHTML = views[route.split('/')[0]]()
    nav.innerHTML = [
      ['today', '今天'],
      ['health', '健康'],
      ['focus', '专注'],
      ['finance', '记账'],
      ['settings', '设置'],
    ]
      .map(
        ([id, name]) =>
          `<button type="button" data-action="route" data-value="${id}" ${route.split('/')[0] === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${name}</span></button>`,
      )
      .join('')
    screen.scrollTop = options.top ?? top
    if (options.focus) screen.querySelector('h1')?.focus({ preventScroll: true })
    updateTimer()
  }
  function navigate(next, options = {}) {
    if (sheet || confirmation.open) return
    // Initial presentation never claims focus; explicit navigation records its actual source and trigger.
    if (!options.initial && !options.returning && next !== route && next.includes('/')) {
      routeOrigins.set(next, { route, anchor: focusAnchor(document.activeElement) })
    }
    scrolls.set(route, screen.scrollTop)
    route = next
    render({ top: scrolls.get(next) || 0, focus: !options.initial && !options.returning })
    log(options.initial ? 'navigation.initial' : 'navigation.open')
  }
  function goBack(fallback) {
    const origin = routeOrigins.get(route)
    navigate(origin?.route || fallback, { returning: true })
    returnFocus(origin?.anchor)
    log('navigation.returned')
  }
  function habitRows(habits, date = TODAY) {
    return habits
      .map(
        (h) =>
          `<div class="row-action">${row(h.name, h.paused ? '已暂停 · 历史保留' : `${h.checks.includes(date) ? '已完成' : due(h, date) ? '今天待完成' : '今天无计划'} · ${h.weekdays.length === 7 ? '每天' : '每周 ' + h.weekdays.length + '天'}`, 'route', `health/habit/${h.id}`, h.icon, h.color)}${!h.paused && due(h, date) ? `<button type="button" class="check-btn" data-action="check-habit" data-value="${h.id}" aria-label="${esc(h.name)}${h.checks.includes(date) ? '撤销打卡' : '打卡'}" aria-pressed="${h.checks.includes(date)}">${h.checks.includes(date) ? icon('check') : icon('plus')}</button>` : ''}</div>`,
      )
      .join('')
  }
  function transactionRows(values) {
    return sorted(values)
      .map((t) => {
        const cat = category(t.category)
        const child = cat?.children.find((c) => c.id === t.child)
        return row(
          child?.name || cat?.name || '已归档分类',
          `${t.time} · ${t.note || cat?.name || '账目'}`,
          'edit-transaction',
          t.id,
          cat?.icon || 'finance',
          cat?.color,
          `<span class="row-value ${t.type === 'income' ? 'green' : ''}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>`,
        )
      })
      .join('')
  }
  function renderToday() {
    const habits = data.habits.filter((h) => due(h))
    const complete = habits.filter((h) => h.checks.includes(TODAY)).length
    const transactions = data.transactions.filter((t) => t.date === TODAY)
    const focus = data.focus.filter((f) => f.date === TODAY)
    return (
      head('今天') +
      '<p class="page-subtitle">9月20日，星期日</p>' +
      `<section class="today-lead"><h2>${habits.length ? (complete === habits.length ? '今天的习惯，都已完成。' : '给今天留一点自己的节奏。') : '从一条小小的记录开始。'}</h2><p>${habits.length ? `${complete} / ${habits.length} 项习惯已完成` : '体重、习惯、专注和账目，在这里相遇。'}</p></section>` +
      `<section class="section">${sectionHead('今日习惯', tb('全部', 'route', 'health/habits'))}${habits.length ? habitRows(habits) : empty('leaf', '建立一个小习惯', '从你愿意每天做的一件事开始。', button('创建习惯', 'new-habit', '', 'secondary'))}</section>` +
      `<button class="focus-shortcut" type="button" data-action="route" data-value="focus">${icon(session ? 'focus' : 'play')}<span class="row-copy"><strong>${session ? (session.status === 'running' ? '专注正在进行' : '本次专注待保存') : '留 25 分钟给自己'}</strong><small>${session ? '返回计时与本次状态' : '进入专注，选好事项再开始'}</small></span>${icon('right', true)}</button>` +
      `<section class="section">${sectionHead('今天的记录')}<div class="stat-strip">${stat(
        '支出',
        money(
          sum(
            transactions.filter((t) => t.type === 'expense'),
            'amount',
          ),
        ),
      )}${stat(
        '收入',
        money(
          sum(
            transactions.filter((t) => t.type === 'income'),
            'amount',
          ),
        ),
      )}${stat('今日专注', durationLabel(sum(focus, 'seconds')))}</div><p class="meta">本周专注 ${durationLabel(sum(weekFocus(), 'seconds'))} · 仅统计已完成</p>${button(icon('plus') + '记一笔', 'new-transaction', 'today', 'primary full quick-ledger')}${savedTransactionNotice()}</section>` +
      `<section class="section">${sectionHead('最近账目', tb('日历', 'route', 'finance'))}${transactions.length ? transactionRows(transactions.slice(-3)) : '<p class="plain-note">今天还没有账目，记下第一笔就会显示在这里。</p>'}</section>`
    )
  }
  function trend(weights) {
    if (!weights.length) return ''
    const values = sorted(weights).reverse().slice(-7)
    const low = Math.min(...values.map((w) => w.value)) - 0.2,
      high = Math.max(...values.map((w) => w.value)) + 0.2
    const points = values.map((w, i) => [
      32 + (i * 260) / Math.max(1, values.length - 1),
      88 - ((w.value - low) / (high - low)) * 70,
    ])
    return `<svg class="trend" viewBox="0 0 320 116" role="img" aria-label="最近${values.length}次体重，${values.map((w) => w.value + '公斤').join('、')}"><path class="grid-line" d="M32 18H304M32 53H304M32 88H304"/><text x="0" y="21">${high.toFixed(1)}</text><text x="0" y="91">${low.toFixed(1)}</text><polyline class="data-line" points="${points.map((p) => p.join(',')).join(' ')}"/>${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}<text x="32" y="113">${dateLabel(values[0].date)}</text><text x="260" y="113">${dateLabel(values.at(-1).date)}</text></svg>`
  }
  function renderHealth() {
    if (route.includes('/habit/')) return renderHabit()
    if (route.includes('/cessation')) return renderCessation()
    if (route === 'health/habits')
      return (
        head('习惯', 'health', ib('new-habit', 'plus', '创建习惯', '', 'add')) +
        sectionHead('正在坚持') +
        (data.habits.some((h) => !h.paused)
          ? habitRows(data.habits.filter((h) => !h.paused))
          : empty(
              'leaf',
              '从一件小事开始',
              '为每天留一个轻松的约定。',
              button('创建习惯', 'new-habit'),
            )) +
        (data.habits.some((h) => h.paused)
          ? `<section class="section">${sectionHead('已暂停')}${habitRows(data.habits.filter((h) => h.paused))}</section>`
          : '')
      )
    if (route === 'health/weight')
      return (
        head('体重历史', 'health', ib('new-weight', 'plus', '记录体重', '', 'add')) +
        (data.weights.length
          ? sorted(data.weights)
              .map((w) =>
                row(
                  `${w.value.toFixed(1)} kg`,
                  `${dateLabel(w.date)} ${w.time}${w.note ? ' · ' + w.note : ''}`,
                  'edit-weight',
                  w.id,
                  'weight',
                ),
              )
              .join('')
          : empty(
              'weight',
              '还没有体重记录',
              '记下第一条，开始了解自己的变化。',
              button('记录体重', 'new-weight'),
            ))
      )
    if (route === 'health/activity')
      return (
        head('运动历史', 'health', ib('new-activity', 'plus', '记录运动', '', 'add')) +
        (data.activities.length
          ? sorted(data.activities)
              .map((a) =>
                row(
                  category(a.category)?.name || '运动',
                  `${dateLabel(a.date)} ${a.time} · ${a.intensity}${a.note ? ' · ' + a.note : ''}`,
                  'edit-activity',
                  a.id,
                  'activity',
                  'orange',
                  `<span class="row-value">${a.minutes} 分钟</span>`,
                ),
              )
              .join('')
          : empty(
              'activity',
              '把活动也记下来',
              '散步或跑步，每一次都值得留下。',
              button('记录运动', 'new-activity'),
            ))
      )
    const latest = sorted(data.weights)[0]
    const weekActivities = data.activities.filter((a) => a.date >= '2026-09-14' && a.date <= TODAY)
    return (
      head('健康') +
      '<p class="page-subtitle">留意身体，也照顾日常。</p>' +
      `<section class="panel">${sectionHead(`${icon('weight', true)} 体重`, ib('new-weight', 'plus', '记录体重', '', 'add'))}${latest ? `<div class="split"><p class="metric">${latest.value.toFixed(1)}<small>kg</small></p><span class="meta">${dateLabel(latest.date)} · ${latest.time}</span></div>${trend(data.weights)}` : empty('weight', '记录你的起点', '体重变化会在这里连成一条线。', button('记录体重', 'new-weight', '', 'secondary'))}<div class="panel-footer">${tb(`目标 ${data.target ? data.target + ' kg' : '未设置'}`, 'weight-target')}${tb('体重历史', 'route', 'health/weight')}</div></section>` +
      `<section class="section">${sectionHead('运动', ib('new-activity', 'plus', '记录运动', '', 'add'))}<div class="split"><p><strong>${sum(weekActivities, 'minutes')}</strong><span class="muted"> 分钟 · 本周 ${weekActivities.length} 次</span></p>${tb('历史', 'route', 'health/activity')}</div>${
        data.activities.length
          ? sorted(data.activities)
              .slice(0, 1)
              .map((a) =>
                row(
                  category(a.category)?.name || '运动',
                  `${dateLabel(a.date)} · ${a.minutes} 分钟 · ${a.intensity}`,
                  'edit-activity',
                  a.id,
                  'activity',
                  'orange',
                ),
              )
              .join('')
          : '<p class="plain-note">本周还没有运动记录。</p>'
      }</section>` +
      `<section class="section">${sectionHead('习惯', tb('全部', 'route', 'health/habits'))}${data.habits.length ? habitRows(data.habits.filter((h) => !h.paused)) : row('创建第一个习惯', '阅读、饮水，选择适合自己的节奏', 'new-habit', '', 'leaf', 'green')}</section>` +
      (!data.hidden
        ? `<section class="section">${sectionHead('戒烟')}${row(data.plan ? (data.plan.ended ? '计划已结束' : '计划已开始 ' + planDays() + ' 天') : '开始戒烟计划', data.plan ? '查看今天状态与记录' : '按自己的节奏，留下每一步', 'route', 'health/cessation', 'leaf', 'green')}</section>`
        : '')
    )
  }
  function renderHabit() {
    const h = currentHabit()
    if (!h) return head('习惯', 'health/habits')
    const todayChecked = h.checks.includes(TODAY),
      statistics = habitStatistics(h)
    const heatStart = shiftDate(TODAY, -97)
    const cells = Array.from({ length: 98 }, (_, i) => {
      const key = shiftDate(heatStart, i)
      return `<button type="button" class="${h.checks.includes(key) ? 'done' : !scheduled(h, key) ? 'off' : ''}" data-action="habit-date" data-value="${key}" aria-label="${key} ${habitDayStatus(h, key)}，只查看" aria-pressed="${key === habitDay}">${Number(key.slice(-2))}</button>`
    }).join('')
    return (
      head(h.name, 'health/habits', ib('edit-habit', 'edit', '编辑习惯', h.id)) +
      `<p class="page-subtitle">${h.paused ? '已暂停 · 历史记录保留' : h.weekdays.length === 7 ? '每天' : '每周 ' + h.weekdays.length + ' 天'} · ${dateLabel(h.start)}开始</p>` +
      `<section class="panel" aria-label="今天打卡"><h2>今天 · ${dateLabel(TODAY)}</h2><p class="plain-note">${todayChecked ? '今天已经完成。' : h.paused ? '恢复习惯后可以继续打卡。' : due(h) ? '留一点时间给这件小事。' : '今天不在你的计划中。'}</p>${due(h) ? `<button type="button" class="${todayChecked ? 'secondary' : 'primary'} full" data-action="check-habit" data-value="${h.id}" data-date="${TODAY}">${todayChecked ? icon('check') + '撤销今天打卡' : '完成今天'}</button>` : ''}</section>` +
      `<section class="section" aria-label="习惯统计">${sectionHead('坚持的轨迹')}<div class="stat-strip">${stat('当前连续', statistics.current + ' 天')}${stat('最长连续', statistics.longest + ' 天')}${stat('本月完成', statistics.rate + '%')}</div><div class="split meta"><span>本月次数 ${statistics.monthCompleted}/${statistics.monthScheduled}</span><span>累计 ${h.checks.length} 次</span></div></section>` +
      `<section class="section">${sectionHead('近 14 周')}<p class="meta">列为周，行从周一至周日；横向滑动查看更多。</p><div class="heatmap-scroll"><div class="heatmap" aria-label="近14周热力图，点击只查看">${cells}</div></div><div class="heat-legend">已完成 <span class="legend-cell"></span></div><label class="field section">查看日期<input id="habit-day" aria-label="查看习惯历史日期" type="date" value="${habitDay}" min="${heatStart}" max="${TODAY}"/></label><p id="habit-inspection" role="status">${habitDay} · ${habitDayStatus(h, habitDay)}</p><p class="plain-note">历史只供回顾，不补打卡、不撤销历史记录。今天的打卡在上方独立完成。</p></section>` +
      `<section class="section">${sectionHead('最近打卡')}${
        h.checks.length
          ? [...h.checks]
              .sort()
              .reverse()
              .slice(0, 8)
              .map((d) => row(dateLabel(d), '已完成', 'habit-date', d, 'check', 'green'))
              .join('')
          : '<p class="plain-note">还没有打卡记录。完成一次，日历会点亮一个格子。</p>'
      }</section>` +
      `<section class="section">${row(h.paused ? '恢复习惯' : '暂停习惯', '暂停不删除历史打卡', 'pause-habit', h.id, 'leaf', 'green')}</section>`
    )
  }
  function localKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  function shiftDate(key, days) {
    const date = new Date(key + 'T12:00:00')
    date.setDate(date.getDate() + days)
    return localKey(date)
  }
  const scheduled = (habit, key) =>
    key >= habit.start && habit.weekdays.includes(new Date(key + 'T12:00:00').getDay())
  const habitDayStatus = (habit, key) =>
    habit.checks.includes(key)
      ? '已完成'
      : key < habit.start
        ? '尚未开始'
        : scheduled(habit, key)
          ? '未完成'
          : '非计划日'
  function habitStatistics(habit) {
    // Match existing statistics: skip non-plan days and do not break the current streak for unfinished today.
    const dates = []
    for (let day = habit.start; day <= TODAY; day = shiftDate(day, 1)) {
      if (scheduled(habit, day)) dates.push(day)
    }
    let current = 0,
      longest = 0,
      run = 0,
      index = dates.length - 1
    if (dates[index] === TODAY && !habit.checks.includes(TODAY)) index--
    while (index >= 0 && habit.checks.includes(dates[index--])) current++
    for (const day of dates) {
      run = habit.checks.includes(day) ? run + 1 : 0
      longest = Math.max(longest, run)
    }
    const monthDates = dates.filter((day) => day.startsWith(TODAY.slice(0, 7)))
    const monthCompleted = monthDates.filter((day) => habit.checks.includes(day)).length
    return {
      current,
      longest,
      monthCompleted,
      monthScheduled: monthDates.length,
      rate: monthDates.length ? Math.round((monthCompleted / monthDates.length) * 100) : 0,
    }
  }
  function inspectHabitDate(value) {
    if (!currentHabit() || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > TODAY) return
    const anchor = focusAnchor(document.activeElement)
    habitDay = value
    render()
    returnFocus(anchor)
    log('habit.history.inspected', 'health')
  }
  function planDays() {
    return Math.max(
      0,
      Math.floor(
        (new Date(TODAY + 'T12:00:00') - new Date(data.plan.start + 'T12:00:00')) / 86400000,
      ),
    )
  }
  function eventRows(events) {
    return sorted(events)
      .map((e) =>
        row(
          e.kind === 'smoking' ? `吸烟 ${e.count} 支` : `烟瘾 · ${e.intensity}`,
          `${dateLabel(e.date)} ${e.time} · ${e.trigger}${e.response ? ' · ' + e.response : ''}`,
          'edit-event',
          e.id,
          e.kind === 'smoking' ? 'smoke' : 'leaf',
          e.kind === 'smoking' ? 'orange' : 'green',
        ),
      )
      .join('')
  }
  function renderCessation() {
    if (route.endsWith('/manage'))
      return (
        head('计划管理', 'health/cessation') +
        `<div class="group"><button type="button" class="row" role="switch" aria-checked="${!data.hidden}" data-action="toggle-cessation"><span class="row-copy"><strong>在健康页显示</strong><small>隐藏入口，仍保留计划和记录</small></span><span class="switch"></span></button>${row('戒烟原因', data.plan?.reason || '写给自己的话', 'plan-reason', '', 'edit', 'green')}</div>` +
        `<section class="section">${sectionHead('当前计划')}${data.plan ? `<div class="data-preview"><p>${dateLabel(data.plan.start)}开始 · ${data.plan.ended ? '已结束' : '进行中'}</p><p class="plain-note">结束计划保留历史，之后不能向本计划新增记录。</p>${activePlan() ? button('结束本次计划', 'end-plan', '', 'secondary') : button('开始新计划', 'new-plan', '', 'primary')}</div>` : button('开始戒烟计划', 'new-plan', '', 'primary full')}</section>` +
        (data.plans.length
          ? `<section class="section">${sectionHead('过去的计划')}${data.plans.map((p) => `<div class="row"><span class="row-copy"><strong>${dateLabel(p.start)}开始</strong><small>已结束 · ${p.events.length}条记录</small></span></div>`).join('')}</section>`
          : '')
      )
    if (route.endsWith('/review'))
      return (
        head('戒烟回顾', 'health/cessation') +
        `<p class="page-subtitle">计划经过时间，不代表连续无烟。</p><div class="stat-strip">${stat(
          '记录吸烟',
          sum(
            data.events.filter((e) => e.kind === 'smoking'),
            'count',
          ) + ' 支',
        )}${stat('烟瘾记录', data.events.filter((e) => e.kind === 'craving').length + ' 次')}${stat('未吸烟确认', data.confirmations.length + ' 天')}</div><section class="section">${sectionHead('记录明细')}${data.events.length ? eventRows(data.events) : empty('leaf', '还没有事件记录', '未吸烟确认会单独列在下面。')}</section><section class="section">${sectionHead('截至当时未吸烟')}${
          data.confirmations.length
            ? data.confirmations
                .slice()
                .sort()
                .reverse()
                .map(
                  (d) =>
                    `<div class="row"><span class="row-copy"><strong>${dateLabel(d)}</strong><small>截至确认时未吸烟，不等同全天</small></span>${icon('check')}</div>`,
                )
                .join('')
            : '<p class="plain-note">暂无确认。</p>'
        }</section>`
      )
    const hasSmoke = data.events.some((e) => e.kind === 'smoking' && e.date === TODAY)
    return (
      head('戒烟', 'health', ib('route', 'settings', '管理戒烟计划', 'health/cessation/manage')) +
      (data.plan
        ? `<section class="panel"><h2>${data.plan.ended ? '这段计划已结束' : '按自己的节奏继续'}</h2><p class="metric">${planDays()}<small>天 · 计划经过</small></p><p class="plain-note">${esc(data.plan.reason)}</p><p class="meta">不代表连续无烟。每次记录都是事实的一部分。</p></section>`
        : empty(
            'leaf',
            '从这一刻开始',
            '不追求完美，先记下你想改变的理由。',
            button('开始戒烟计划', 'new-plan'),
          )) +
      (activePlan()
        ? `<section class="section">${sectionHead('今天')}<p class="plain-note">${hasSmoke ? '今天有吸烟记录。一次反复，不会抹去之前的努力。' : data.confirmations.includes(TODAY) ? '已确认截至现在未吸烟。' : '今天的状态还没有记录。'}</p>${!hasSmoke ? button(data.confirmations.includes(TODAY) ? icon('check') + '已确认 · 撤销' : '截至现在未吸烟', 'confirm-smoke-free', '', 'primary full') : ''}<div class="group section">${row('记录烟瘾', '记下强度、诱因与应对', 'new-craving', '', 'leaf', 'green')}${row('记录吸烟', '如实记录，继续往前', 'new-smoking', '', 'smoke', 'orange')}</div></section>`
        : '') +
      `<section class="section">${sectionHead('最近记录', tb('回顾', 'route', 'health/cessation/review'))}${data.events.length ? eventRows(data.events.slice(-3)) : '<p class="plain-note">记录后，可以回看当时的感受与情境。</p>'}</section>`
    )
  }
  function renderFocus() {
    if (route === 'focus/history') {
      const sessions =
        focusRange === 'week'
          ? weekFocus()
          : data.focus.filter((f) => focusRange === 'all' || f.date === TODAY)
      return (
        head('专注历史', 'focus') +
        focusSummary() +
        `<div class="segment section" aria-label="历史范围">${[
          ['today', '今天'],
          ['week', '本周'],
          ['all', '全部'],
        ]
          .map(
            ([v, t]) =>
              `<button type="button" data-action="focus-range" data-value="${v}" aria-pressed="${focusRange === v}">${t}</button>`,
          )
          .join(
            '',
          )}</div><p class="plain-note">所选范围 · ${sessions.length} 次 · ${durationLabel(sum(sessions, 'seconds'))}</p>${focusRows(sessions)}`
      )
    }
    const running = session?.status === 'running',
      pending = session?.status === 'pending'
    return (
      head('专注') +
      `<p class="page-subtitle">一次，只做一件事。</p><section class="focus-area"><div class="focus-dial ${pending ? 'pending' : ''}"><svg viewBox="0 0 260 260" aria-hidden="true"><circle class="track" cx="130" cy="130" r="120"/><circle id="timer-progress" class="progress" cx="130" cy="130" r="120" pathLength="100" stroke-dasharray="100 100"/></svg><div class="dial-content"><span class="meta">${pending ? '本次结果 · ' + (focusBusy ? '正在保存' : '待保存') : running ? '剩余时间' : '目标时长'}</span><span id="timer-value" class="timer">${clockLabel(focusDraft.minutes * 60)}</span><button type="button" class="play-button" data-action="${pending ? 'save-focus' : running ? 'end-focus' : 'start-focus'}" aria-label="${pending ? '重试保存本次专注' : running ? '提前结束专注' : '开始专注'}" ${focusBusy ? 'disabled' : ''}>${icon(pending ? 'check' : running ? 'stop' : 'play')}</button><span class="play-label">${focusBusy ? (pending ? '正在保存…' : '正在开始…') : pending ? '重试保存' : running ? '提前结束' : '开始专注'}</span></div></div>` +
      (session
        ? `<h2>${esc(session.title)}</h2><div class="focus-facts"><span class="muted">${pending ? '未用时间' : '已专注'}<strong id="focus-elapsed">00:00</strong></span><span class="muted">目标<strong>${durationLabel(session.planned)}</strong></span></div>${pending ? '<p class="plain-note">本次已结束，保存成功后才计入汇总。</p>' : tb('取消本次专注', 'cancel-focus')}`
        : `<fieldset class="focus-fields" ${focusBusy ? 'disabled' : ''}><div class="segment" aria-label="目标时长">${[25, 50, 'custom'].map((v) => `<button type="button" data-action="focus-duration" data-value="${v}" aria-pressed="${v === 'custom' ? focusDraft.custom : !focusDraft.custom && focusDraft.minutes === v}">${v === 'custom' ? '自定义' : v + ' 分钟'}</button>`).join('')}</div>${focusDraft.custom ? `<div class="section">${field('自定义分钟（1–240）', 'focusMinutes', focusDraft.minutes, 'number', `min="1" max="240" step="1" ${focusInvalid === 'minutes' ? 'aria-invalid="true" aria-describedby="focus-error"' : ''}`)}</div>` : ''}<label for="focus-title" class="meta">专注事项</label><input id="focus-title" class="focus-title" value="${esc(focusDraft.title)}" maxlength="100" required aria-required="true" ${focusInvalid === 'title' ? 'aria-invalid="true" aria-describedby="focus-error"' : ''} placeholder="这段时间，想做什么？"/><details class="quiet-details"><summary>分类与备注（可选）</summary>${selectField('分类', 'focusCategory', [['', '未分类'], ...data.categories.filter((c) => c.group === 'focus' && !c.archived).map((c) => [c.id, c.name])], focusDraft.category)}${field('备注', 'focusNote', focusDraft.note, 'text', 'maxlength="280"')}</details></fieldset>`) +
      `<p id="focus-error" class="error" role="alert">${focusError}</p></section><section class="section">${sectionHead('专注记录', tb('历史', 'route', 'focus/history'))}${focusSummary()}${focusRows(sorted(data.focus.filter((f) => f.date === TODAY)).slice(0, 2))}</section>`
    )
  }
  function weekFocus() {
    const monday = shiftDate(TODAY, -((new Date(TODAY + 'T12:00:00').getDay() + 6) % 7))
    return data.focus.filter((f) => f.date >= monday && f.date <= TODAY)
  }
  function focusSummary() {
    // Both views sum completed, saved records only; running/pending/cancelled sessions are kept outside this collection.
    const today = data.focus.filter((f) => f.date === TODAY),
      week = weekFocus()
    return `<div class="stat-strip two" aria-label="专注汇总">${stat('今日专注', durationLabel(sum(today, 'seconds')))}${stat('本周专注', durationLabel(sum(week, 'seconds')))}</div><p class="meta">仅统计已完成 · 今日 ${today.length} 次 / 本周 ${week.length} 次</p>`
  }
  function focusRows(values) {
    return values.length
      ? sorted(values)
          .map((f) =>
            row(
              f.title,
              `${dateLabel(f.date)} ${f.time} · ${f.kind} · ${category(f.category)?.name || '未分类'}`,
              'edit-focus',
              f.id,
              'focus',
              'purple',
              `<span class="row-value duration-value">${durationLabel(f.seconds)}</span>`,
            ),
          )
          .join('')
      : empty('focus', '还没有完成的专注', '开始一段时间，保存后就能在这里回看。')
  }
  function elapsedSeconds() {
    return session
      ? Math.min(
          session.planned,
          Math.max(0, Math.floor(((session.endedAt || Date.now()) - session.startedAt) / 1000)),
        )
      : 0
  }
  function updateTimer() {
    // Timestamp differences are authoritative; repaint intervals do not accumulate elapsed time.
    const elapsed = elapsedSeconds()
    const remaining = session
      ? Math.max(0, session.planned - elapsed)
      : Number(focusDraft.minutes) * 60
    const timer = document.querySelector('#timer-value'),
      progress = document.querySelector('#timer-progress')
    const pending = session?.status === 'pending',
      mainSeconds = pending ? elapsed : remaining
    if (timer) {
      timer.textContent = clockLabel(Number.isFinite(mainSeconds) ? mainSeconds : 0)
      timer.setAttribute(
        'aria-label',
        durationLabel(Number.isFinite(mainSeconds) ? mainSeconds : 0),
      )
    }
    if (progress)
      progress.setAttribute(
        'stroke-dasharray',
        `${pending ? 100 : session ? Math.max(0, (1 - elapsed / session.planned) * 100) : 100} 100`,
      )
    const readout = document.querySelector('#focus-elapsed')
    if (readout) readout.textContent = clockLabel(pending ? remaining : elapsed)
    if (session?.status === 'running' && remaining === 0) {
      session.endedAt = session.startedAt + session.planned * 1000
      session.status = 'pending'
      session.kind = '完成'
      log('focus.completed', 'focus')
      render()
      void saveFocus()
    }
  }
  function monthShift(delta) {
    const date = new Date(`${month}-15T12:00:00`)
    date.setMonth(date.getMonth() + delta)
    month = localKey(date).slice(0, 7)
    selectedDate = month + '-01'
    render()
  }
  function calendarAmount(minor) {
    const amount = Math.abs(minor) / 100,
      sign = minor < 0 ? '−' : minor > 0 ? '+' : ''
    return (
      sign +
      (amount >= 10000
        ? (amount / 10000).toFixed(1) + '万'
        : amount >= 1000
          ? (amount / 1000).toFixed(1) + '千'
          : Number(amount.toFixed(2)).toString())
    )
  }
  function savedTransactionNotice() {
    if (!lastSavedTransaction || !data.transactions.some((t) => t.id === lastSavedTransaction.id))
      return ''
    return `<div class="saved-record" role="status"><span>${dateLabel(lastSavedTransaction.date)}的账目已保存</span>${tb('查看记录', 'view-saved-transaction')}</div>`
  }
  function dailyExpenseChart(
    entries,
    start = [shiftDate(selectedDate, -6), month + '-01'].sort().at(-1),
    end = selectedDate,
    type = 'expense',
  ) {
    log('finance.trend.render.started', 'finance')
    const label = type === 'income' ? '收入' : '支出'
    const caption = `<figcaption><span>每日${label}</span><span>${dateLabel(start)} — ${dateLabel(end)}</span></figcaption>`
    const rangeEntries = entries.filter((t) => t.type === type && t.date >= start && t.date <= end)
    // Absence is not a zero-valued series: use records in the displayed range/type, never the total amount, to choose an empty state.
    if (!rangeEntries.length) {
      log('finance.trend.render.empty', 'finance')
      return `<figure class="daily-expense" aria-label="每日${label}">${caption}<p class="plain-note">暂无记录，无法形成趋势</p></figure>`
    }
    // Once this range contains records, fill missing days with zero. Ledger and report keep their existing seven-day/month windows.
    const series = []
    for (let date = start; date <= end; date = shiftDate(date, 1))
      series.push({
        date,
        amount: sum(
          rangeEntries.filter((t) => t.date === date),
          'amount',
        ),
      })
    const maximum = Math.max(0, ...series.map((d) => d.amount))
    const points = series.map((d, i) => ({
      ...d,
      x: series.length === 1 ? 160 : 16 + (i * 288) / (series.length - 1),
      y: 68 - (d.amount / Math.max(maximum, 1)) * 48,
    }))
    log('finance.trend.render.data', 'finance')
    return `<figure class="daily-expense" aria-label="每日${label}">${caption}<svg class="trend" viewBox="0 0 320 82" role="img" aria-label="${series.map((d) => d.date + label + ' ' + money(d.amount) + ' 元').join('；')}"><path class="grid-line" d="M16 20H304M16 44H304M16 68H304"/>${points.length > 1 ? `<polyline class="data-line" points="${points.map((p) => p.x + ',' + p.y).join(' ')}"/>` : ''}${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3"/>`).join('')}</svg><p class="meta">${maximum ? '最高 ' + money(maximum) + ' 元' : '每日合计均为 0 元'} · 起点为 0 元</p></figure>`
  }
  function renderFinance() {
    if (route === 'finance/report') return renderFinanceReport()
    const monthEntries = data.transactions.filter((t) => t.date.startsWith(month))
    const expense = sum(
        monthEntries.filter((t) => t.type === 'expense'),
        'amount',
      ),
      income = sum(
        monthEntries.filter((t) => t.type === 'income'),
        'amount',
      )
    const first = (new Date(month + '-01T12:00:00').getDay() + 6) % 7
    const [year, m] = month.split('-').map(Number),
      total = new Date(year, m, 0).getDate()
    return (
      head(
        '记账',
        '',
        `<div class="head-actions">${button(icon('chart', true) + '报表', 'finance-report', '', 'text-btn report-link')}${ib('new-transaction', 'plus', '记一笔', '', 'add')}</div>`,
      ) +
      savedTransactionNotice() +
      `<section><div class="calendar-head">${ib('month', 'left', '上个月', '-1')}<h2>${year}年${m}月</h2>${ib('month', 'right', '下个月', '1')}</div><div class="calendar" aria-label="账目日历">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from(
        { length: total },
        (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`,
            entries = monthEntries.filter((t) => t.date === date),
            spent = sum(
              entries.filter((t) => t.type === 'expense'),
              'amount',
            ),
            received = sum(
              entries.filter((t) => t.type === 'income'),
              'amount',
            ),
            balance = received - spent
          return `<button type="button" class="${date === TODAY ? 'today' : ''}" data-action="date" data-value="${date}" aria-pressed="${selectedDate === date}" aria-label="${date}${entries.length ? '，' + entries.length + '笔账目，净额 ' + money(balance) + ' 元，支出 ' + money(spent) + ' 元，收入 ' + money(received) + ' 元' : '，无账目'}"><span>${i + 1}</span><small class="calendar-amount ${balance > 0 ? 'green' : ''}" aria-hidden="true">${entries.length ? calendarAmount(balance) : ''}</small></button>`
        },
      ).join(
        '',
      )}</div><div class="stat-strip calendar-summary" aria-label="本月账目汇总">${stat('本月结余', money(income - expense))}${stat('支出', money(expense))}${stat('收入', money(income))}</div></section>` +
      dailyExpenseChart(monthEntries) +
      `<section class="section">${sectionHead(`${dateLabel(selectedDate)}${selectedDate === TODAY ? ' · 今天' : ''}`, selectedDate !== TODAY ? tb('回到今天', 'date', TODAY) : '')}${monthEntries.some((t) => t.date === selectedDate) ? transactionRows(monthEntries.filter((t) => t.date === selectedDate)) : empty('finance', '这一天还没有账目', '记录会自动归入选中的日期。', button('记一笔', 'new-transaction', '', 'secondary'))}</section>`
    )
  }
  function renderFinanceReport() {
    const entries = data.transactions.filter(
      (t) => t.date.startsWith(reportMonth) && t.type === reportType,
    )
    const total = sum(entries, 'amount'),
      label = reportType === 'income' ? '收入' : '支出'
    const [year, m] = reportMonth.split('-').map(Number),
      start = reportMonth + '-01'
    const end = reportMonth === TODAY.slice(0, 7) ? TODAY : localKey(new Date(year, m, 0))
    // Unordered categories use bars. Child transactions aggregate into their parent once, including archived references.
    const grouped = new Map()
    for (const entry of entries) {
      const group = grouped.get(entry.category) || {
        category: category(entry.category),
        amount: 0,
        count: 0,
      }
      group.amount += entry.amount
      group.count++
      grouped.set(entry.category, group)
    }
    const groups = [...grouped.values()].sort((a, b) => b.amount - a.amount)
    return (
      head('报表', 'finance') +
      `<div class="calendar-head" aria-label="报表月份">${ib('report-month', 'left', '报表上个月', '-1')}<h2>${year}年${m}月</h2>${ib('report-month', 'right', '报表下个月', '1')}</div><div class="segment" aria-label="报表收支类型">${[
        ['expense', '支出'],
        ['income', '收入'],
      ]
        .map(
          ([value, text]) =>
            `<button type="button" data-action="report-type" data-value="${value}" aria-pressed="${reportType === value}">${text}</button>`,
        )
        .join(
          '',
        )}</div><div class="stat-strip two" aria-label="报表月汇总">${stat('本月' + label, money(total) + ' 元')}${stat('记录', entries.length + ' 笔')}</div><section>${sectionHead(label + '分类')}<p class="meta">按一级分类汇总，包含二级记录</p>${
        total
          ? `<ul class="report-categories">${groups
              .map((group) => {
                const c = group.category,
                  share = (group.amount / total) * 100,
                  percentage = share < 0.1 ? '不足 0.1%' : share.toFixed(1) + '%'
                return `<li class="report-category"><div class="split">${glyph(c?.icon || 'finance', c?.color || 'blue')}<span class="report-name">${esc(c?.name || '历史分类')}${c?.archived ? ' <small>已归档</small>' : ''}</span><small>${group.count} 笔</small></div><div class="report-values"><strong>${money(group.amount)} 元</strong><span>${percentage}</span></div><svg class="report-bar ${c?.color || 'blue'}" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="${esc(c?.name || '历史分类')}，${money(group.amount)} 元，占比${percentage}"><rect class="report-track" width="100" height="8" rx="2"/><rect width="${share}" height="8" rx="2" fill="currentColor"/></svg></li>`
              })
              .join('')}</ul>`
          : empty(
              'chart',
              '本月暂无' + label,
              '可以切换月份或收支类型。已有记录后，分类分布会显示在这里。',
            )
      }</section><section class="section">${sectionHead('每日趋势')}${dailyExpenseChart(entries, start, end, reportType)}</section>`
    )
  }
  function renderSettings() {
    if (route.includes('/categor')) return renderCategories()
    if (route === 'settings/appearance')
      return (
        head('外观', 'settings') +
        `<p class="page-subtitle">选择日常看起来舒服的明暗。</p>${[
          ['light', '浅色', '雾蓝白'],
          ['dark', '深色', '深海蓝'],
          ['system', '跟随系统', '随设备明暗切换'],
        ]
          .map(
            ([id, name, desc]) =>
              `<button type="button" class="theme-option" aria-pressed="${appearance === id}" data-action="theme" data-value="${id}"><span class="theme-swatch ${id}"></span><span class="row-copy"><strong>${name}</strong><small>${desc}</small></span>${appearance === id ? icon('check') : ''}</button>`,
          )
          .join('')}`
      )
    if (route === 'settings/export')
      return (
        head('导出备份', 'settings') +
        `<p class="plain-note">正式产品会将全部本地记录导出为一份备份。建议在更换设备或恢复前备份。</p><div class="data-preview"><h2>备份内容</h2><dl><div><dt>账目</dt><dd>${data.transactions.length} 笔</dd></div><div><dt>专注</dt><dd>${data.focus.length} 次</dd></div><div><dt>健康与习惯</dt><dd>体重、运动、习惯、戒烟</dd></div><div><dt>分类与设置</dt><dd>一并包含</dd></div></dl></div><p class="plain-note">设计稿模拟：不会生成、下载或分享文件。</p>${exportDone ? `<section class="panel"><h2>导出流程已演示</h2><p class="plain-note">没有创建真实备份文件。</p>${tb('再次演示', 'export')}</section>` : button('模拟导出', 'export', '', 'primary full')}`
      )
    if (route === 'settings/restore') return renderRestore()
    if (route === 'settings/about')
      return (
        head('关于 LifeIndex', 'settings') +
        `<div class="panel stack">${icon('health')}<h2>LifeIndex</h2><p>Index your life.</p><p class="plain-note">记录金钱、时间和日常习惯，留下一份属于自己的生活索引。</p></div><section class="section"><dl><div><dt>设计依据</dt><dd>生产 3.0.0</dd></div><div><dt>本页</dt><dd>操作体验提案</dd></div><div><dt>数据与备份</dt><dd>V4 · 本地优先</dd></div></dl><p class="plain-note">本原型仅合成内存状态，不代表生产实现、离线持久化或物理 iPhone 验收已完成。</p></section>`
      )
    return (
      head('设置') +
      '<p class="page-subtitle">按自己的方式，记录生活。</p>' +
      `<section>${sectionHead('分类')}<div class="group">${row('分类管理', '支出、收入、专注与运动', 'route', 'settings/categories', 'bag', 'orange')}</div></section><section class="section">${sectionHead('外观')}<div class="group">${row('主题外观', appearance === 'dark' ? '深海蓝' : appearance === 'light' ? '雾蓝白' : '跟随系统', 'route', 'settings/appearance', 'sun')}</div></section><section class="section">${sectionHead('数据与安全')}<div class="group">${row('导出备份', '为自己的记录留一份副本', 'route', 'settings/export', 'download', 'green')}${row('从备份恢复', '先检查内容，再确认替换', 'route', 'settings/restore', 'upload')}</div><p class="plain-note">数据仅存本机，请定期备份。</p></section><section class="section">${sectionHead('其他')}<div class="group">${row('戒烟计划', data.hidden ? '健康入口已隐藏' : '计划与入口管理', 'route', 'health/cessation/manage', 'leaf', 'green')}${row('关于 LifeIndex', '', 'route', 'settings/about', 'info', 'purple')}</div></section>`
    )
  }
  function renderCategories() {
    const labels = { expense: '支出', income: '收入', focus: '专注', activity: '运动' }
    if (route.startsWith('settings/category/')) {
      const parent = category(route.split('/')[2])
      if (!parent) return head('分类管理', 'settings')
      if (!allowsChildren(parent))
        return (
          head(
            parent.name,
            'settings/categories',
            ib('category-menu', 'more', '管理一级分类', parent.id),
          ) +
          `<p class="page-subtitle">${labels[parent.group]}一级分类${parent.archived ? ' · 已归档' : ''}</p><div class="split">${glyph(parent.icon, parent.color)}<span class="muted">${labels[parent.group]}仅使用一级分类。</span></div><section class="section">${row('编辑分类', '名称、图标与颜色', 'edit-category', parent.id, 'edit', parent.color)}</section>`
        )
      return (
        head(
          parent.name,
          'settings/categories',
          ib('category-menu', 'more', '管理一级分类', parent.id),
        ) +
        `<p class="page-subtitle">${labels[parent.group]}一级分类${parent.archived ? ' · 已归档' : ''}</p><div class="split">${glyph(parent.icon, parent.color)}<span class="muted">二级只保留名称，选择更轻。</span></div><section class="section">${sectionHead('二级分类', ib('new-child', 'plus', '新增二级分类', parent.id, 'add'))}${parent.children.length ? parent.children.map((c) => `<div class="row-action">${row(c.name, c.archived ? '已归档' : '', 'edit-child', parent.id + ':' + c.id)}${ib('archive-child', 'more', '管理二级分类', parent.id + ':' + c.id)}</div>`).join('') : empty('bag', '还没有二级分类', '直接使用一级分类，或添加更细的名称。', button('新增二级分类', 'new-child', parent.id, 'secondary'))}</section>`
      )
    }
    const cats = data.categories.filter(
      (c) => c.group === categoryGroup && (showArchived || !c.archived),
    )
    return (
      head('分类管理', 'settings') +
      `<div class="segment" aria-label="分类分组">${Object.entries(labels)
        .map(
          ([v, t]) =>
            `<button type="button" data-action="category-group" data-value="${v}" aria-pressed="${categoryGroup === v}">${t}</button>`,
        )
        .join(
          '',
        )}</div><section class="section">${sectionHead(labels[categoryGroup], ib('new-category', 'plus', '新增一级分类', '', 'add'))}${cats.map((c) => `<div class="row-action">${row(c.name, c.archived ? '已归档' : allowsChildren(c) ? c.children.length + ' 个二级分类' : '一级分类', 'route', 'settings/category/' + c.id, c.icon, c.color)}${ib('category-menu', 'more', '管理' + c.name, c.id)}</div>`).join('')}${!cats.length ? empty('bag', '暂无分类', '新增一个适合自己的分类。') : ''}</section>${tb(showArchived ? '隐藏已归档' : '查看已归档', 'toggle-archived')}`
    )
  }
  const allowsChildren = (parent) => Boolean(parent && ['expense', 'income'].includes(parent.group))
  function renderRestore() {
    return (
      head('从备份恢复', 'settings') +
      `<p class="plain-note">恢复会替换全部现有数据，不会合并。请先保留当前备份。</p><p class="meta">设计稿模拟：仅使用内置样本，不读取本机文件。</p><section class="section">` +
      (restoreStage === 'choose'
        ? `<div class="panel"><h2>检查一份备份</h2><p class="plain-note">先检查格式、版本和记录，再决定是否替换。</p>${button('选择模拟备份', 'restore-check', '', 'primary full')}${tb('演示不兼容备份', 'restore-invalid')}</div>`
        : restoreStage === 'checking'
          ? '<div class="panel"><h2>正在检查备份…</h2><p class="plain-note">检查格式、版本与记录完整性。当前数据没有变化。</p></div>'
          : restoreStage === 'invalid'
            ? `<div class="panel"><h2>这份备份无法恢复</h2><p class="error" role="alert">模拟样本版本不受支持。当前数据没有变化。</p>${button('重新选择', 'restore-reset', '', 'secondary full')}</div>`
            : restoreStage === 'done'
              ? `<div class="panel"><h2>模拟恢复完成</h2><p class="plain-note">已替换本原型的合成内存数据。没有访问设备存储。</p>${button('查看今天', 'route', 'today', 'primary full')}${tb('返回设置', 'route', 'settings')}</div>`
              : `<div class="data-preview"><h2>检查通过 · 恢复预览</h2><dl><div><dt>样本日期</dt><dd>2026年9月20日</dd></div><div><dt>版本</dt><dd>V4</dd></div><div><dt>账目</dt><dd>23 笔</dd></div><div><dt>专注</dt><dd>2 次</dd></div><div><dt>健康、习惯、分类</dt><dd>包含</dd></div></dl></div><p class="plain-note">下一步需要确认覆盖。返回或取消不会改变当前样本。</p>${button('继续恢复', 'restore-confirm', '', 'primary full')}${tb('换一份模拟备份', 'restore-reset')}`) +
      `<p class="error" role="alert">${restoreError}</p></section>`
    )
  }

  const snapshot = () => JSON.stringify([...new FormData(form).entries()])
  function focusAnchor(element) {
    if (!element) return null
    return {
      element,
      id: element.id,
      action: element.dataset?.action,
      value: element.dataset?.value,
    }
  }
  function returnFocus(anchor) {
    // Rendering replaces list nodes, so restore by the stable action key before falling back to the page heading.
    const replacement = anchor?.element?.isConnected
      ? anchor.element
      : (anchor?.id ? document.getElementById(anchor.id) : null) ||
        [...document.querySelectorAll('[data-action]')].find(
          (el) => el.dataset.action === anchor?.action && el.dataset.value === anchor?.value,
        )
    ;(replacement || screen.querySelector('h1') || screen).focus({ preventScroll: true })
  }
  function openEditor(config) {
    const origin = sheet?.origin || focusAnchor(document.activeElement)
    sheet = { ...config, origin, busy: false }
    form.innerHTML = `<div class="sheet-head"><h2 id="editor-title">${config.title}</h2>${ib('close-editor', 'close', '关闭编辑面板')}</div><div class="sheet-body"><fieldset class="sheet-fields">${config.body}</fieldset><p id="form-error" class="error" role="alert" tabindex="-1"></p></div>${config.save ? `<div class="sheet-footer"><button type="submit" class="primary">${config.saveLabel || '保存'}</button>${config.remove ? button('删除这条记录', 'delete-record', '', 'text-btn danger') : ''}</div>` : ''}`
    sheet.initial = snapshot()
    if (!editor.open) editor.showModal()
    editor.querySelector('.sheet-body').scrollTop = 0
    ;(
      form.querySelector('input:not([type="hidden"]), select') || form.querySelector('button')
    ).focus({ preventScroll: true })
    log('editor.open')
  }
  function closeEditor(force = false) {
    if (!sheet || sheet.busy) return
    if (!force && sheet.save && snapshot() !== sheet.initial) {
      log('draft.discard.requested')
      ask({
        title: '放弃未保存的修改？',
        description: '这次输入还没有保存。你可以返回继续编辑。',
        label: '放弃修改',
        cancel: '继续编辑',
        danger: true,
        action: () => closeEditor(true),
      })
      return
    }
    const origin = sheet.origin
    sheet = null
    editor.close()
    returnFocus(origin)
    log('editor.closed')
  }
  function setEditorBusy(busy) {
    if (!sheet) return
    sheet.busy = busy
    form.querySelector('fieldset').disabled = busy
    form
      .querySelectorAll('.sheet-head button,.sheet-footer button')
      .forEach((b) => (b.disabled = busy))
    const submit = form.querySelector('[type="submit"]')
    if (submit) submit.textContent = busy ? '正在保存…' : sheet.saveLabel || '保存'
    form.setAttribute('aria-busy', String(busy))
  }
  function revealSheetElement(element) {
    const body = form.querySelector('.sheet-body')
    if (!body?.contains(element)) return
    // Move only the content pane; focus must not scroll the modal or the containing review board.
    const viewport = body.getBoundingClientRect(),
      target = element.getBoundingClientRect()
    if (target.top < viewport.top + 12) body.scrollTop += target.top - viewport.top - 12
    else if (target.bottom > viewport.bottom - 12)
      body.scrollTop += Math.min(
        target.bottom - viewport.bottom + 12,
        target.top - viewport.top - 12,
      )
    editor.scrollTop = 0
    form.scrollTop = 0
  }
  function formError(message, name = '') {
    const error = form.querySelector('#form-error')
    error.textContent = message
    const input = name ? form.elements.namedItem(name) : null
    const target = input instanceof HTMLElement ? input : error
    if (input instanceof HTMLElement) {
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-describedby', 'form-error')
    }
    target.focus({ preventScroll: true })
    revealSheetElement(target)
    log('validation.failed')
  }
  form.addEventListener('focusin', (event) => revealSheetElement(event.target))
  async function simulateWrite(module) {
    log('write.started', module)
    await new Promise((resolve) => setTimeout(resolve, 550))
    if (failNext) {
      failNext = false
      log('write.failed', module)
      throw new Error('simulated')
    }
    log('write.completed', module)
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!sheet?.save || sheet.busy) return
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'))
    const draftData = new FormData(form)
    const values = Object.fromEntries(draftData)
    // Capture repeated selections before disabling the fieldset: disabled controls do not enter FormData.
    values.weekdays = draftData.getAll('weekday').map(Number)
    const invalid = sheet.validate?.(values)
    if (invalid) {
      formError(invalid[0], invalid[1])
      return
    }
    const invalidNative = [...form.elements].find((el) => el.willValidate && !el.checkValidity())
    if (invalidNative) {
      formError('请补全此项，并使用有效的范围或日期。', invalidNative.name)
      return
    }
    const config = sheet
    form.querySelector('#form-error').textContent = ''
    setEditorBusy(true)
    try {
      await simulateWrite(config.module || route.split('/')[0])
      config.save(values)
      setEditorBusy(false)
      render()
      closeEditor(true)
      announce(config.success || '已保存')
    } catch {
      setEditorBusy(false)
      formError('这次保存没有成功，输入已保留。请直接重试。')
    }
  })
  function ask(config) {
    if (confirmation.open) return
    confirmState = { ...config, origin: focusAnchor(document.activeElement), busy: false }
    confirmation.innerHTML = `<h2 id="confirm-title">${config.title}</h2><p>${config.description}</p><p id="confirm-error" class="error" role="alert"></p><div class="confirm-actions">${button(config.label, 'confirm-yes', '', config.danger ? 'destructive' : 'primary')}${button(config.cancel || '取消', 'confirm-no', '', 'secondary')}</div>`
    confirmation.showModal()
    confirmation.querySelector('[data-action="confirm-no"]').focus()
    log('confirmation.open')
  }
  function closeConfirm() {
    if (!confirmState || confirmState.busy) return
    const origin = confirmState.origin
    confirmState = null
    confirmation.close()
    returnFocus(origin)
  }
  async function confirmYes() {
    if (!confirmState || confirmState.busy) return
    const config = confirmState
    config.busy = true
    confirmation.querySelectorAll('button').forEach((b) => (b.disabled = true))
    try {
      if (config.write) await simulateWrite(config.module || route.split('/')[0])
      // Close the top dialog before its action closes or replaces the editor below it.
      config.busy = false
      closeConfirm()
      await config.action()
    } catch {
      if (confirmation.open) {
        config.busy = false
        confirmation.querySelectorAll('button').forEach((b) => (b.disabled = false))
        confirmation.querySelector('#confirm-error').textContent =
          '操作未完成，现有数据未变。可以重试。'
      }
      log('confirmation.failed')
    }
  }
  // Keep native cancellation on the existing guarded close paths; explicit branches also satisfy the production lint gate.
  ;[editor, confirmation].forEach((dialog) =>
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      if (dialog === editor) closeEditor()
      else closeConfirm()
    }),
  )
  editor.addEventListener('click', (event) => {
    if (event.target === editor) {
      const box = editor.getBoundingClientRect()
      if (event.clientY < box.top || event.clientX < box.left || event.clientX > box.right)
        closeEditor()
    }
  })
  function deleteRecord() {
    if (!sheet?.remove || sheet.busy) return
    const config = sheet
    ask({
      title: '删除这条记录？',
      description: '删除后无法撤销。其他记录不受影响。',
      label: '删除记录',
      danger: true,
      write: true,
      module: config.module,
      action: () => {
        config.remove()
        render()
        closeEditor(true)
        announce('记录已删除')
        log('record.deleted')
      },
    })
  }
  function dateValid(values) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || values.date > TODAY)
      return ['请选择不晚于今天的有效日期。', 'date']
    if (!/^\d{2}:\d{2}$/.test(values.time)) return ['请选择记录时间。', 'time']
    return null
  }
  function categoryPicker(type, root = '', child = '') {
    const categories = data.categories.filter((c) => c.group === type && !c.archived)
    const parent = category(root)
    return `<div id="finance-picker"><span class="meta">分类</span><input type="hidden" name="category" value="${esc(root)}"/><input type="hidden" name="child" value="${esc(child)}"/><div class="category-picker">${categories.map((c) => `<button type="button" class="category-pick" data-action="pick-category" data-value="${c.id}" aria-pressed="${c.id === root}"><span class="${c.color}">${icon(c.icon)}</span>${esc(c.name)}</button>`).join('')}</div>${
      parent
        ? `<p class="meta">${esc(parent.name)} · 二级分类</p><div class="children-picker"><button type="button" class="chip" data-action="pick-child" data-value="" aria-pressed="${!child}">仅${esc(parent.name)}</button>${parent.children
            .filter((c) => !c.archived)
            .map(
              (c) =>
                `<button type="button" class="chip" data-action="pick-child" data-value="${c.id}" aria-pressed="${c.id === child}">${esc(c.name)}</button>`,
            )
            .join('')}</div>`
        : ''
    }${!categories.length ? '<p class="plain-note">此分组没有可选分类，请先去设置中新增或恢复分类。</p>' : ''}</div>`
  }
  function refreshPicker(root, child = '') {
    const type = form.elements.namedItem('type').value
    form.querySelector('#finance-picker').outerHTML = categoryPicker(type, root, child)
  }
  function editTransaction(id, todayDefault = false) {
    const item = data.transactions.find((t) => t.id === Number(id))
    const type = item?.type || 'expense'
    openEditor({
      title: item ? '编辑账目' : '记一笔',
      module: 'finance',
      body: `<input type="hidden" name="type" value="${type}"/><div class="segment" aria-label="交易类型">${['expense', 'income'].map((v, i) => `<button type="button" data-action="transaction-type" data-value="${v}" aria-pressed="${type === v}">${i ? '收入' : '支出'}</button>`).join('')}</div><div class="amount-field section">${field('金额（元）', 'amount', item ? money(item.amount).replaceAll(',', '') : '', 'text', 'inputmode="decimal" required placeholder="0.00"')}</div>${categoryPicker(type, item?.category, item?.child)}${whenField(item?.date || (todayDefault ? TODAY : selectedDate), item?.time)}${noteField(item?.note)}`,
      validate: (v) => {
        if (!/^\d{1,9}(\.\d{1,2})?$/.test(v.amount) || Number(v.amount) <= 0)
          return ['请输入大于 0、最多两位小数的金额。', 'amount']
        if (!v.category) return ['请选择一个分类。']
        return dateValid(v)
      },
      save: (v) => {
        // Integer minor units keep the calendar, monthly projection and edited row in agreement.
        const value = {
          id: item?.id || ++sequence,
          date: v.date,
          time: v.time,
          type: v.type,
          amount: Math.round(Number(v.amount) * 100),
          category: v.category,
          child: v.child,
          note: v.note,
        }
        if (item) Object.assign(item, value)
        else data.transactions.push(value)
        // Saving never changes the browsed day/month. The persistent result link is the only jump.
        lastSavedTransaction = { id: value.id, date: value.date }
        log('finance.saved.in.context', 'finance')
      },
      remove: item
        ? () => {
            data.transactions = data.transactions.filter((t) => t.id !== item.id)
          }
        : null,
    })
  }
  function editWeight(id) {
    const item = data.weights.find((w) => w.id === Number(id))
    openEditor({
      title: item ? '编辑体重' : '记录体重',
      module: 'health',
      body:
        field(
          '体重（kg）',
          'value',
          item?.value || '',
          'number',
          'inputmode="decimal" min="20" max="500" step="0.1" required',
        ) +
        whenField(item?.date, item?.time || '07:30') +
        noteField(item?.note),
      validate: (v) =>
        Number(v.value) < 20 || Number(v.value) > 500
          ? ['体重需在 20–500 kg 之间。', 'value']
          : dateValid(v),
      save: (v) => {
        const value = {
          id: item?.id || ++sequence,
          value: Number(v.value),
          date: v.date,
          time: v.time,
          note: v.note,
        }
        if (item) Object.assign(item, value)
        else data.weights.push(value)
      },
      remove: item
        ? () => {
            data.weights = data.weights.filter((w) => w.id !== item.id)
          }
        : null,
    })
  }
  function editTarget() {
    openEditor({
      title: '体重目标',
      module: 'health',
      body:
        field(
          '目标体重（kg）',
          'value',
          data.target || '',
          'number',
          'min="20" max="500" step="0.1" required',
        ) + '<p class="plain-note">作为个人记录目标，不提供健康建议。</p>',
      validate: (v) =>
        Number(v.value) < 20 || Number(v.value) > 500
          ? ['目标需在 20–500 kg 之间。', 'value']
          : null,
      save: (v) => {
        data.target = Number(v.value)
      },
      remove: data.target
        ? () => {
            data.target = null
          }
        : null,
    })
  }
  function editActivity(id) {
    const item = data.activities.find((a) => a.id === Number(id))
    openEditor({
      title: item ? '编辑运动' : '记录运动',
      module: 'health',
      body:
        selectField(
          '运动类型',
          'category',
          data.categories
            .filter((c) => c.group === 'activity' && (!c.archived || c.id === item?.category))
            .map((c) => [c.id, c.name]),
          item?.category,
        ) +
        field(
          '时长（分钟）',
          'minutes',
          item?.minutes || '',
          'number',
          'inputmode="numeric" min="1" max="1440" step="1" required',
        ) +
        selectField(
          '体感强度',
          'intensity',
          [
            ['轻松', '轻松'],
            ['适中', '适中'],
            ['较强', '较强'],
          ],
          item?.intensity || '适中',
        ) +
        whenField(item?.date, item?.time || '18:30') +
        noteField(item?.note),
      validate: (v) => (!v.category ? ['请先在设置中建立运动分类。'] : dateValid(v)),
      save: (v) => {
        const value = {
          id: item?.id || ++sequence,
          category: v.category,
          minutes: Number(v.minutes),
          intensity: v.intensity,
          date: v.date,
          time: v.time,
          note: v.note,
        }
        if (item) Object.assign(item, value)
        else data.activities.push(value)
      },
      remove: item
        ? () => {
            data.activities = data.activities.filter((a) => a.id !== item.id)
          }
        : null,
    })
  }
  function editHabit(id) {
    const item = data.habits.find((h) => h.id === Number(id))
    const weekdays = item?.weekdays || [0, 1, 2, 3, 4, 5, 6]
    openEditor({
      title: item ? '编辑习惯' : '创建习惯',
      module: 'health',
      body:
        field(
          '习惯名称',
          'name',
          item?.name || '',
          'text',
          'required maxlength="60" placeholder="例如：阅读 20 分钟"',
        ) +
        `<div class="form-grid">${selectField(
          '标记',
          'icon',
          [
            ['book', '阅读'],
            ['drop', '饮水'],
            ['activity', '运动'],
            ['moon', '睡眠'],
            ['check', '完成'],
          ],
          item?.icon || 'book',
        )}${selectField(
          '颜色',
          'color',
          [
            ['purple', '紫色'],
            ['blue', '蓝色'],
            ['green', '绿色'],
            ['orange', '橙色'],
          ],
          item?.color || 'purple',
        )}</div><span class="meta">计划日 · 全选代表每天</span><div class="weekday-picker">${[1, 2, 3, 4, 5, 6, 0].map((d, i) => `<label><input name="weekday" type="checkbox" value="${d}" ${weekdays.includes(d) ? 'checked' : ''}/>周${['一', '二', '三', '四', '五', '六', '日'][i]}</label>`).join('')}</div>` +
        field('开始日期', 'start', item?.start || TODAY, 'date', `required max="${TODAY}"`) +
        noteField(item?.note),
      validate: (v) =>
        !v.name.trim()
          ? ['请填写习惯名称。', 'name']
          : !v.weekdays.length
            ? ['至少选择一个计划日。']
            : null,
      save: (v) => {
        const value = {
          id: item?.id || ++sequence,
          name: v.name.trim(),
          icon: v.icon,
          color: v.color,
          start: v.start,
          weekdays: v.weekdays,
          note: v.note,
          paused: item?.paused || false,
          checks: item?.checks || [],
        }
        if (item) Object.assign(item, value)
        else data.habits.push(value)
      },
    })
  }
  let retryAction = null
  async function directWrite(action, success, module = route.split('/')[0]) {
    if (checkBusy) return
    checkBusy = true
    document
      .querySelectorAll('[data-action="check-habit"],[data-action="confirm-smoke-free"]')
      .forEach((el) => (el.disabled = true))
    try {
      await simulateWrite(module)
      action()
      retryAction = null
      render()
      announce(success)
    } catch {
      retryAction = () => directWrite(action, success, module)
      render()
      const error = document.createElement('div')
      error.className = 'error'
      error.setAttribute('role', 'alert')
      error.innerHTML = '保存失败，当前记录未变。' + tb('重试', 'retry')
      screen.prepend(error)
    } finally {
      checkBusy = false
      document
        .querySelectorAll('[data-action="check-habit"],[data-action="confirm-smoke-free"]')
        .forEach((el) => (el.disabled = false))
    }
  }
  function checkHabit(id, day = TODAY) {
    // History selection is never a write target, even if a stale or synthetic control asks for another day.
    if (day !== TODAY) {
      log('habit.history.write.blocked', 'health')
      return
    }
    const h = data.habits.find((h) => h.id === Number(id))
    if (!h || !due(h, day)) return
    const checked = h.checks.includes(day)
    void directWrite(
      () => {
        h.checks = checked ? h.checks.filter((d) => d !== day) : [...h.checks, day]
        log('habit.check.changed', 'health')
      },
      checked ? '已撤销打卡' : '今天又完成一件小事',
      'health',
    )
  }
  function newPlan() {
    openEditor({
      title: '开始戒烟计划',
      module: 'health',
      body:
        field('开始日期', 'start', TODAY, 'date', `max="${TODAY}" required`) +
        field(
          '戒烟原因（可选）',
          'reason',
          '',
          'text',
          'maxlength="280" placeholder="写一句想对自己说的话"',
        ) +
        '<p class="plain-note">计划天数只表达经过时间，不代表连续未吸烟。</p>',
      save: (v) => {
        if (data.plan) {
          data.plans.push({ ...data.plan, events: structuredClone(data.events) })
        }
        data.plan = { id: ++sequence, start: v.start, reason: v.reason, ended: false }
        data.events = []
        data.confirmations = []
        log('cessation.plan.started', 'health')
      },
    })
  }
  function editEvent(kind, id) {
    const item = data.events.find((e) => e.id === Number(id))
    kind = item?.kind || kind
    if (!activePlan() && !item) return
    openEditor({
      title: (item ? '编辑' : '记录') + (kind === 'smoking' ? '吸烟' : '烟瘾'),
      module: 'health',
      body:
        (kind === 'smoking'
          ? field(
              '吸烟数量（支）',
              'count',
              item?.count || 1,
              'number',
              'min="1" max="200" step="1" required',
            )
          : selectField(
              '烟瘾强度',
              'intensity',
              [
                ['轻微', '轻微'],
                ['中等', '中等'],
                ['强烈', '强烈'],
              ],
              item?.intensity || '中等',
            )) +
        selectField(
          '当时的诱因',
          'trigger',
          [
            ['饭后', '饭后'],
            ['工作间隙', '工作间隙'],
            ['情绪变化', '情绪变化'],
            ['社交场合', '社交场合'],
            ['其他', '其他'],
          ],
          item?.trigger || '工作间隙',
        ) +
        (kind === 'craving'
          ? selectField(
              '如何应对',
              'response',
              [
                ['喝水', '喝水'],
                ['走一走', '走一走'],
                ['等待片刻', '等待片刻'],
                ['尚未应对', '尚未应对'],
              ],
              item?.response || '喝水',
            )
          : '') +
        whenField(item?.date, item?.time || '14:30') +
        noteField(item?.note) +
        (kind === 'smoking'
          ? '<p class="plain-note">保存吸烟记录，会撤销同一天的未吸烟确认。</p>'
          : ''),
      validate: (v) =>
        v.date < data.plan.start ? ['记录日期不能早于计划开始。', 'date'] : dateValid(v),
      save: (v) => {
        const value = {
          id: item?.id || ++sequence,
          kind,
          date: v.date,
          time: v.time,
          note: v.note,
          trigger: v.trigger,
          ...(kind === 'smoking'
            ? { count: Number(v.count) }
            : { intensity: v.intensity, response: v.response }),
        }
        if (item) Object.assign(item, value)
        else data.events.push(value)
        if (kind === 'smoking') data.confirmations = data.confirmations.filter((d) => d !== v.date)
      },
      remove: item
        ? () => {
            data.events = data.events.filter((e) => e.id !== item.id)
          }
        : null,
      success: kind === 'smoking' ? '已记录吸烟；同日未吸烟确认已撤销。' : '烟瘾与应对已记录',
    })
  }
  function editFocus(id) {
    const item = data.focus.find((f) => f.id === Number(id))
    if (!item) return
    openEditor({
      title: '专注详情',
      module: 'focus',
      body: `<div class="data-preview"><strong>${durationLabel(item.seconds)}</strong><p class="meta">${dateLabel(item.date)} ${item.time} · ${item.kind}</p></div><div class="section">${field('专注事项', 'title', item.title, 'text', 'required maxlength="100"')}${selectField('分类', 'category', [['', '未分类'], ...data.categories.filter((c) => c.group === 'focus' && (!c.archived || c.id === item.category)).map((c) => [c.id, c.name])], item.category)}${noteField(item.note)}</div>`,
      validate: (v) => (!v.title.trim() ? ['请填写专注事项，不能只输入空格。', 'title'] : null),
      save: (v) =>
        Object.assign(item, { title: v.title.trim(), category: v.category, note: v.note }),
      remove: () => {
        data.focus = data.focus.filter((f) => f.id !== item.id)
      },
    })
  }
  async function startFocus() {
    if (session || focusBusy) return
    const minutes = Number(focusDraft.minutes)
    // Keep the production non-empty title contract at both start and description-edit boundaries.
    if (!focusDraft.title.trim()) {
      focusInvalid = 'title'
      focusError = '请填写专注事项，不能只输入空格。'
      render()
      document.querySelector('#focus-title')?.focus({ preventScroll: true })
      log('focus.title.invalid', 'focus')
      return
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      focusInvalid = 'minutes'
      focusError = '自定义时长需为 1–240 的整数分钟。'
      render()
      document.querySelector('[name="focusMinutes"]')?.focus({ preventScroll: true })
      log('focus.duration.invalid', 'focus')
      return
    }
    focusBusy = true
    focusError = ''
    focusInvalid = ''
    const draft = { ...focusDraft, title: focusDraft.title.trim() }
    render()
    try {
      await simulateWrite('focus')
      session = {
        status: 'running',
        startedAt: Date.now(),
        planned: minutes * 60,
        title: draft.title,
        category: draft.category,
        note: draft.note,
        kind: '完成',
      }
      log('focus.started', 'focus')
    } catch {
      focusError = '专注尚未开始，设置已保留。请重试。'
    } finally {
      focusBusy = false
      render()
    }
  }
  async function saveFocus() {
    if (!session || session.status !== 'pending' || focusBusy) return
    focusBusy = true
    focusError = ''
    render()
    try {
      await simulateWrite('focus')
      data.focus.push({
        id: ++sequence,
        title: session.title,
        category: session.category,
        note: session.note,
        seconds: elapsedSeconds(),
        date: TODAY,
        time: '现在',
        kind: session.kind,
      })
      session = null
      log('focus.saved', 'focus')
      announce('本次专注已保存，已计入汇总')
    } catch {
      focusError = '本次专注尚未保存。计时结果已保留，点按圆环内的重试保存。'
      log('focus.pending', 'focus')
    } finally {
      focusBusy = false
      render()
    }
  }
  function endFocus() {
    if (session?.status !== 'running') return
    ask({
      title: '提前结束这次专注？',
      description: '按实际经过时间保存。确认前计时仍会继续。',
      label: '结束并保存',
      cancel: '继续专注',
      action: () => {
        if (!session || session.status !== 'running') return
        session.endedAt = Date.now()
        session.status = 'pending'
        session.kind = '提前结束'
        log('focus.ended.early', 'focus')
        void saveFocus()
      },
    })
  }
  function cancelFocus() {
    if (!session) return
    ask({
      title: '取消这次专注？',
      description: '这次计时将被丢弃，不计入专注历史。',
      label: '取消本次专注',
      cancel: '继续专注',
      danger: true,
      action: () => {
        session = null
        focusError = ''
        render()
        log('focus.cancelled', 'focus')
        announce('本次专注已取消')
      },
    })
  }
  function editCategory(id, parentId = '', childId = '') {
    const parent = category(parentId)
    const item = parent ? parent.children.find((c) => c.id === childId) : category(id)
    // A shared editor must not expand finance's two-level contract into focus/activity.
    if (parentId && !allowsChildren(parent)) {
      log('category.child.blocked', 'settings')
      return
    }
    const isChild = Boolean(parent)
    const symbols = [
      ['food', '餐饮'],
      ['coffee', '咖啡'],
      ['transit', '交通'],
      ['bag', '购物'],
      ['pay', '工作'],
      ['book', '阅读'],
      ['activity', '运动'],
      ['leaf', '生活'],
    ]
    openEditor({
      title: item
        ? '编辑' + (isChild ? '二级' : '一级') + '分类'
        : '新增' + (isChild ? '二级' : '一级') + '分类',
      module: 'settings',
      body:
        (parent ? `<p class="plain-note">${esc(parent.name)} / 二级分类</p>` : '') +
        field('分类名称', 'name', item?.name || '', 'text', 'required maxlength="30"') +
        (isChild
          ? ''
          : `<div class="form-grid">${selectField('图标', 'icon', symbols, item?.icon || 'bag')}${selectField(
              '颜色',
              'color',
              [
                ['orange', '橙色'],
                ['blue', '蓝色'],
                ['green', '绿色'],
                ['purple', '紫色'],
              ],
              item?.color || 'orange',
            )}</div>`),
      validate: (v) =>
        !v.name.trim()
          ? ['请填写分类名称。', 'name']
          : (isChild
                ? parent.children
                : data.categories.filter((c) => c.group === (item?.group || categoryGroup))
              ).some((c) => c.id !== item?.id && c.name === v.name.trim())
            ? ['同组已有这个名称，请换一个。', 'name']
            : null,
      save: (v) => {
        if (isChild && !allowsChildren(parent)) {
          log('category.child.write.blocked', 'settings')
          throw new Error('unsupported-child')
        }
        const value = {
          id: item?.id || 'custom-' + ++sequence,
          name: v.name.trim(),
          ...(isChild
            ? {}
            : {
                icon: v.icon,
                color: v.color,
                group: item?.group || categoryGroup,
                children: item?.children || [],
              }),
        }
        if (item) Object.assign(item, value)
        else if (isChild) parent.children.push(value)
        else data.categories.push(value)
      },
    })
  }
  function categoryMenu(id) {
    const item = category(id)
    if (!item) return
    const first = data.categories.find((c) => c.group === item.group)?.id === id
    // This is a compact action list, not three competing primary submissions. Text keeps each icon unambiguous.
    openEditor({
      title: item.name,
      body: `<div class="category-actions" aria-label="分类操作">${button(icon('edit') + '<span>编辑名称与图标</span>', 'edit-category', id, 'menu-row')}<button type="button" class="menu-row" data-action="move-category" data-value="${id}" ${first ? 'disabled' : ''}>${icon('up')}<span>向前移动</span>${first ? '<small>已在首位</small>' : ''}</button>${button(icon(item.archived ? 'upload' : 'archive') + '<span>' + (item.archived ? '恢复分类' : '归档分类') + '</span>', 'archive-category', id, 'menu-row')}</div><p class="plain-note">归档后不出现在新增选择中，历史记录保留原分类。</p>`,
    })
  }
  function archiveCategory(id) {
    const item = category(id)
    if (!item) return
    ask({
      title: item.archived ? '恢复这个分类？' : '归档这个分类？',
      description: '包括二级分类的历史引用都会保留，不删除账目。',
      label: item.archived ? '恢复分类' : '归档分类',
      write: true,
      module: 'settings',
      action: () => {
        item.archived = !item.archived
        render()
        closeEditor(true)
        announce(item.archived ? '分类已归档' : '分类已恢复')
      },
    })
  }
  function setTheme(value) {
    appearance = value
    document.documentElement.dataset.theme =
      value === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : value
    render()
    log('appearance.changed', 'settings')
  }
  const actions = {
    route: navigate,
    back: goBack,
    'close-editor': () => closeEditor(),
    'confirm-no': closeConfirm,
    'confirm-yes': () => void confirmYes(),
    'delete-record': deleteRecord,
    'new-transaction': (value) => editTransaction(null, value === 'today'),
    'edit-transaction': editTransaction,
    'transaction-type': (value) => {
      form.elements.namedItem('type').value = value
      form
        .querySelectorAll('[data-action="transaction-type"]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)))
      refreshPicker('')
      log('finance.type.changed', 'finance')
    },
    'pick-category': (value) => refreshPicker(value),
    'pick-child': (value) => refreshPicker(form.elements.namedItem('category').value, value),
    'new-weight': () => editWeight(),
    'edit-weight': editWeight,
    'weight-target': editTarget,
    'new-activity': () => editActivity(),
    'edit-activity': editActivity,
    'new-habit': () => editHabit(),
    'edit-habit': editHabit,
    'check-habit': (value, control) => checkHabit(value, control?.dataset.date || TODAY),
    'habit-date': inspectHabitDate,
    'pause-habit': (value) => {
      const h = data.habits.find((h) => h.id === Number(value))
      if (h)
        void directWrite(
          () => {
            h.paused = !h.paused
          },
          h.paused ? '习惯已恢复' : '习惯已暂停，历史保留',
          'health',
        )
    },
    month: (value) => monthShift(Number(value)),
    date: (value) => {
      selectedDate = value
      month = value.slice(0, 7)
      render()
      log('finance.date.selected', 'finance')
    },
    'finance-report': () => {
      reportMonth = month
      navigate('finance/report')
      log('finance.report.opened', 'finance')
    },
    'report-month': (value) => {
      const cursor = new Date(reportMonth + '-15T12:00:00')
      cursor.setMonth(cursor.getMonth() + Number(value))
      reportMonth = localKey(cursor).slice(0, 7)
      render({ top: 0 })
      log('finance.report.month.changed', 'finance')
    },
    'report-type': (value) => {
      if (!['expense', 'income'].includes(value)) return
      reportType = value
      render()
      log('finance.report.type.changed', 'finance')
    },
    'view-saved-transaction': () => {
      if (!lastSavedTransaction) return
      selectedDate = lastSavedTransaction.date
      month = selectedDate.slice(0, 7)
      lastSavedTransaction = null
      navigate('finance')
      render({ top: 0 })
      log('finance.saved.record.opened', 'finance')
    },
    'new-plan': newPlan,
    'new-smoking': () => editEvent('smoking'),
    'new-craving': () => editEvent('craving'),
    'edit-event': (value) => editEvent('', value),
    'toggle-cessation': () =>
      void directWrite(
        () => {
          data.hidden = !data.hidden
        },
        data.hidden ? '健康入口已恢复' : '健康入口已隐藏，历史保留',
        'health',
      ),
    'plan-reason': () => {
      if (!data.plan) {
        newPlan()
        return
      }
      openEditor({
        title: '戒烟原因',
        body: field('写给自己的话', 'reason', data.plan.reason, 'text', 'maxlength="280"'),
        save: (v) => {
          data.plan.reason = v.reason
        },
      })
    },
    'end-plan': () =>
      ask({
        title: '结束本次计划？',
        description: '结束后保留历史，但不能再向本计划新增记录。',
        label: '结束计划',
        write: true,
        module: 'health',
        action: () => {
          data.plan.ended = true
          render()
          announce('计划已结束，历史保留')
        },
      }),
    'confirm-smoke-free': () => {
      if (!activePlan() || data.events.some((e) => e.kind === 'smoking' && e.date === TODAY)) return
      const exists = data.confirmations.includes(TODAY)
      void directWrite(
        () => {
          data.confirmations = exists
            ? data.confirmations.filter((d) => d !== TODAY)
            : [...data.confirmations, TODAY]
        },
        exists ? '已撤销确认' : '已确认截至现在未吸烟',
        'health',
      )
    },
    'focus-duration': (value) => {
      focusDraft.custom = value === 'custom'
      if (value !== 'custom') focusDraft.minutes = Number(value)
      focusError = ''
      render()
    },
    'start-focus': () => void startFocus(),
    'end-focus': endFocus,
    'cancel-focus': cancelFocus,
    'save-focus': () => void saveFocus(),
    'edit-focus': editFocus,
    'focus-range': (value) => {
      focusRange = value
      render()
    },
    theme: setTheme,
    'category-group': (value) => {
      categoryGroup = value
      render()
    },
    'toggle-archived': () => {
      showArchived = !showArchived
      render()
    },
    'new-category': () => editCategory(),
    'edit-category': (value) => editCategory(value),
    'new-child': (value) => editCategory('', value),
    'edit-child': (value) => {
      const [p, c] = value.split(':')
      editCategory('', p, c)
    },
    'category-menu': categoryMenu,
    'archive-category': archiveCategory,
    'move-category': (value) => {
      const index = data.categories.findIndex((c) => c.id === value),
        previous = data.categories
          .slice(0, index)
          .findLastIndex((c) => c.group === category(value).group)
      if (previous < 0) {
        announce('已经是本组第一项')
        return
      }
      const item = data.categories.splice(index, 1)[0]
      data.categories.splice(previous, 0, item)
      render()
      closeEditor(true)
      log('category.reordered', 'settings')
    },
    'archive-child': (value) => {
      const [p, c] = value.split(':'),
        parent = category(p)
      if (!allowsChildren(parent)) {
        log('category.child.blocked', 'settings')
        return
      }
      const item = parent.children.find((ca) => ca.id === c)
      if (!item) return
      ask({
        title: item.archived ? '恢复二级分类？' : '归档二级分类？',
        description: '历史记录仍然保留这个名称。',
        label: item.archived ? '恢复分类' : '归档分类',
        write: true,
        module: 'settings',
        action: () => {
          item.archived = !item.archived
          render()
        },
      })
    },
    export: () =>
      void directWrite(
        () => {
          exportDone = true
        },
        '导出流程已演示；没有创建真实文件',
        'settings',
      ),
    'restore-reset': () => {
      if (restoreBusy) return
      restoreStage = 'choose'
      restoreError = ''
      render()
    },
    'restore-invalid': () => {
      restoreStage = 'invalid'
      render()
      log('restore.validation.failed', 'settings')
    },
    'restore-check': async () => {
      if (restoreBusy) return
      restoreBusy = true
      restoreStage = 'checking'
      render()
      log('restore.validation.started', 'settings')
      await new Promise((resolve) => setTimeout(resolve, 650))
      restoreStage = 'preview'
      restoreBusy = false
      render()
      log('restore.validation.completed', 'settings')
    },
    'restore-confirm': () => {
      if (restoreStage !== 'preview') return
      ask({
        title: '替换全部当前数据？',
        description:
          '将用已检查的模拟备份替换当前原型全部记录，不会合并。正式产品操作前需确认已有备份。',
        label: '替换并恢复（模拟）',
        cancel: '返回预览',
        danger: true,
        write: true,
        module: 'settings',
        action: () => {
          data = makeSample()
          session = null
          lastSavedTransaction = null
          restoreStage = 'done'
          render()
          log('restore.completed', 'settings')
        },
      })
    },
    retry: () => retryAction?.(),
  }
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-action]')
    if (!control || control.disabled) return
    const action = actions[control.dataset.action]
    if (!action) return
    log('control.activated')
    action(control.dataset.value, control)
  })
  document.addEventListener('input', (event) => {
    const input = event.target
    if (input.id === 'focus-title') focusDraft.title = input.value
    if (input.name === 'focusMinutes') {
      focusDraft.minutes = input.value
      updateTimer()
    }
    if (input.name === 'focusCategory') focusDraft.category = input.value
    if (input.name === 'focusNote') focusDraft.note = input.value
    if (input.id === 'habit-day') inspectHabitDate(input.value)
  })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (appearance === 'system') setTheme('system')
  })
  window.addEventListener('message', (event) => {
    // The review shell is the sole permitted command sender; only fixed presentation scenarios are accepted.
    if (parent === window || event.source !== parent || event.data?.channel !== 'lifeindex-review')
      return
    const { action, value } = event.data
    if (action === 'theme' && ['dark', 'light'].includes(value)) {
      setTheme(value)
      reply('theme')
    }
    if (action === 'view' && ['today', 'health', 'focus', 'finance', 'settings'].includes(value))
      navigate(value, { initial: true })
    if (action === 'failure') {
      failNext = true
      reply('failure')
      log('review.failure.armed', 'review')
    }
    if (action === 'sample' && ['sample', 'empty', 'long'].includes(value)) {
      if (sheet?.busy || confirmState?.busy || checkBusy || focusBusy || restoreBusy) {
        reply('busy')
        return
      }
      const reset = () => {
        data = makeSample(value)
        session = null
        focusError = ''
        focusInvalid = ''
        failNext = false
        restoreStage = 'choose'
        exportDone = false
        restoreError = ''
        selectedDate = TODAY
        month = '2026-09'
        habitDay = TODAY
        focusDraft = { minutes: 25, custom: false, title: '', category: 'reading', note: '' }
        retryAction = null
        lastSavedTransaction = null
        routeOrigins.clear()
        scrolls.clear()
        route = route.split('/')[0]
        if (sheet) closeEditor(true)
        render({ top: 0 })
        reply('reset')
        log('review.sample.reset', 'review')
      }
      if (sheet && snapshot() !== sheet.initial)
        ask({
          title: '重置演示样本？',
          description: '这会丢弃当前草稿和本次演示修改，仅影响此原型。',
          label: '重置样本',
          danger: true,
          action: reset,
        })
      else reset()
    }
    if (action === 'finish') {
      if (session?.status !== 'running') {
        reply('idle')
        return
      }
      session.startedAt = Date.now() - session.planned * 1000
      reply('finish')
      log('review.timer.advanced', 'review')
      updateTimer()
    }
  })
  // Only the fixed interval repaints. Returning to the tab derives the same result from its timestamps.
  setInterval(updateTimer, 250)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateTimer()
  })
  render({ top: 0 })
  log('app.open', 'app')
  reply('ready')
})()
