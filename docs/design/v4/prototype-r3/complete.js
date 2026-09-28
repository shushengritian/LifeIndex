/* global state, today, trace, safe, icon, pageHeading, money, sum, recordRows, openModal, dialogHeader, body, closeModal, restoreOrigin, render, toast, showConfirm, editorError */
// Complete-state extensions share only synthetic in-memory state. No user storage is opened.
globalThis.R3 = {
  consumeWriteFailure() {
    if (state.scenario !== 'save-failed') return false
    state.scenario = 'ready'
    document.querySelector('#scenario').value = 'ready'
    trace('review.failureconsumed', { nextAttempt: 'enabled' })
    return true
  },
  validDate(date) {
    const d = new Date(`${date}T12:00:00`)
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(+d) &&
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` ===
        date
    )
  },
  weekday(date) {
    return new Date(`${date}T12:00:00`).getDay() || 7
  },
  sorted(kind) {
    return state.records
      .filter((r) => r.kind === kind)
      .sort((a, b) => b.date.localeCompare(a.date) || this.recordOrder(a, b))
  },
  recordOrder(a, b) {
    return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id)
  },
  normalizeRecords() {
    // Seed timestamps describe synthetic entry order, never an invented time of the underlying fact.
    for (const r of state.records) {
      r.createdAt ||= `${r.date}T${r.time || '12:00'}:00.000+08:00`
      r.timePrecision = r.kind === 'focus' ? 'instant' : 'day'
      if (r.timePrecision === 'day') delete r.time
      r.categoryId ||= state.categories.find(
        (c) => c.name === r.category && c.domain === (r.kind === 'finance' ? r.type : r.kind),
      )?.id
    }
    trace('records.precisionnormalized', { source: 'synthetic-fixture' })
  },
  habitFacts() {
    return state.habitChecks.flatMap((check) => {
      const habit = state.habits.find((item) => item.id === check.habitId)
      if (!habit) return []
      return [
        {
          id: `check-${check.habitId}-${check.date}`,
          kind: 'habit',
          habitId: habit.id,
          title: habit.title,
          date: check.date,
          timePrecision: check.timePrecision || 'day',
          time: check.time,
          createdAt: check.createdAt || `${check.date}T12:00:00.000+08:00`,
        },
      ]
    })
  },
  empty(title, copy, action = '') {
    return `<div class="empty-block"><h2>${title}</h2><p>${copy}</p>${action}</div>`
  },
  failure(domain) {
    return `<div class="failure-block" role="alert"><h2>${domain === 'weight' ? '体重' : '记账'}暂时读不到</h2><p>记录没有被清空，其他区域仍可使用。</p><button class="button secondary" type="button" data-retry-read>重新读取</button></div>`
  },
  normalizeHabits() {
    // Current schedules never manufacture historical missed days. Checks are independent facts.
    state.habitChecks ||= []
    for (const h of state.habits) {
      h.weekdays ||= h.subtitle === '工作日' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7]
      h.paused ||= false
      if (h.done && !state.habitChecks.some((c) => c.habitId === h.id && c.date === today))
        state.habitChecks.push({ habitId: h.id, date: today })
      delete h.done
    }
  },
  initialize() {
    state.financeMonth = today.slice(0, 7)
    state.weightRange = 30
    state.targetGrams = 62000
    state.habitMonth = today.slice(0, 7)
    state.habitDay = today
    state.generation = 1
    state.revision = 1
    state.shellState = 'ready'
    state.categoryDomain = 'expense'
    state.categories = [
      ['expense', '餐饮', 'cup'],
      ['expense', '咖啡', 'cup'],
      ['expense', '日用', 'bag'],
      ['expense', '交通', 'arrow'],
      ['expense', '其他', 'finance'],
      ['income', '工资', 'finance'],
      ['income', '其他收入', 'finance'],
      ['activity', '步行', 'leaf'],
      ['activity', '跑步', 'activity'],
      ['activity', '力量训练', 'health'],
      ['focus', '自由专注', 'focus'],
      ['focus', '阅读', 'book'],
    ].map(([domain, name, glyph], i) => ({
      id: `cat-${i}`,
      domain,
      name,
      icon: glyph,
      archived: false,
    }))
    for (const [i, date, grams] of [
      [2, '2026-09-25', 63400],
      [3, '2026-09-21', 63800],
      [4, '2026-09-14', 64100],
    ])
      state.records.push({
        id: `w${i}`,
        kind: 'weight',
        title: '体重记录',
        category: '体重',
        date,
        time: '07:30',
        grams,
        note: '',
      })
    this.normalizeRecords()
    this.normalizeHabits()
    state.habitChecks.push(
      { habitId: 'h1', date: '2026-09-27' },
      { habitId: 'h1', date: '2026-09-25' },
    )
    document.addEventListener('click', (e) => this.handleClick(e))
    document.addEventListener('change', (e) => this.handleChange(e))
    document.addEventListener('input', (e) => {
      if (state.modal === 'editor' && e.target.closest('form') && state.editor)
        state.editor.dirty = true
    })
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'aux-form') {
        e.preventDefault()
        void this.saveAux(e.target)
      }
    })
    trace('complete.initialized', { storage: 'synthetic-memory' })
  },
  checked(id, date = today) {
    return state.habitChecks.some((c) => c.habitId === id && c.date === date)
  },
  schedule(h) {
    return h.paused
      ? '已暂停 · 可手动记录'
      : h.weekdays.length === 7
        ? '每天'
        : h.weekdays.length === 5 && h.weekdays.join('') === '12345'
          ? '周一至周五'
          : `每周${h.weekdays.map((n) => '一二三四五六日'[n - 1]).join('、')}`
  },
  habitRows(items) {
    return items
      .map(
        (h) =>
          `<div class="habit-row"><button class="habit-name" type="button" data-habit-detail="${h.id}"><span class="habit-orbit">${icon(h.icon, 19)}</span><span><strong>${safe(h.title)}</strong><small>${this.schedule(h)}${!h.paused && !h.weekdays.includes(this.weekday(today)) ? ' · 今天非计划日' : ''}</small></span></button><button class="habit-tick" type="button" data-habit="${h.id}" aria-label="${this.checked(h.id) ? '撤销完成' : '完成'}${safe(h.title)}" aria-pressed="${this.checked(h.id)}">${icon(this.checked(h.id) ? 'check' : 'add', 19)}</button></div>`,
      )
      .join('')
  },
  habitStation(full = false) {
    const scheduled = state.habits.filter(
      (h) => !h.paused && h.weekdays.includes(this.weekday(today)),
    )
    const items = full ? state.habits : scheduled.slice(0, 2)
    return `<section class="habit-station ${full ? 'habit-list-full' : ''}"><div class="section-heading"><h2>${full ? '你的习惯' : '今天，慢慢养成'}</h2><span>${scheduled.filter((h) => this.checked(h.id)).length}/${scheduled.length} 今日</span></div>${items.length ? this.habitRows(items) : `<p class="station-note">${state.habits.length ? '今天没有计划中的习惯。' : '从一件小事开始，按自己的频率重复。'}</p>`}<div class="habit-footer"><span class="station-note">${full ? '今日计数仅含计划项；可手动补记' : `今日 ${scheduled.length} 项 · 不必一次全部完成`}</span><button class="text-button" type="button" ${full ? 'data-entry="habit"' : 'data-page="health"'}>${full ? '新建习惯' : '查看习惯'} ${icon('arrow', 14)}</button></div></section>`
  },
  toggleHabit(id, date, fromDetail = false) {
    if (!this.validDate(date) || date > today) return
    const checked = this.checked(id, date)
    if (checked)
      state.habitChecks = state.habitChecks.filter((c) => !(c.habitId === id && c.date === date))
    else {
      // A present-day tap supplies a known completion time; retrospective checks only supply a date.
      const now = new Date()
      state.habitChecks.push({
        habitId: id,
        date,
        createdAt: now.toISOString(),
        timePrecision: date === today ? 'instant' : 'day',
        ...(date === today ? { time: now.toTimeString().slice(0, 5) } : {}),
      })
    }
    state.revision++
    trace('habit.checkchanged', { completed: !checked, retrospective: date !== today })
    if (fromDetail) this.habitDetail(id)
    else {
      render()
      document.querySelector(`[data-habit="${id}"]`)?.focus({ preventScroll: true })
    }
  },
  calendar(month, selected, attr, marker) {
    const [year, m] = month.split('-').map(Number)
    const count = new Date(year, m, 0).getDate()
    const start = (new Date(year, m - 1, 1).getDay() + 6) % 7
    return `<div class="calendar-grid">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span aria-hidden="true">${d}</span>`).join('')}${'<i></i>'.repeat(start)}${Array.from(
      { length: count },
      (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`
        return `<button type="button" data-${attr}="${date}" aria-label="${date}${marker(date) ? '，有记录' : ''}" aria-pressed="${selected === date}" ${date > today ? 'disabled' : ''}>${i + 1}${marker(date) ? '<span aria-hidden="true"></span>' : ''}</button>`
      },
    ).join('')}</div>`
  },
  habitDetail(id) {
    const h = state.habits.find((v) => v.id === id)
    if (!h) return
    state.activeHabit = id
    const day = state.habitDay
    openModal(
      'habit-detail',
      dialogHeader(safe(h.title), '关闭') +
        `<div class="detail-content"><p>${this.schedule(h)} · 计划变更从今天起生效</p><div class="split-actions"><button class="button secondary" type="button" data-habit-edit="${id}">编辑计划</button><button class="text-button" type="button" data-habit-pause="${id}">${h.paused ? '恢复习惯' : '暂停习惯'}</button></div><label class="field-row"><span>完成日历</span><input aria-label="习惯月份" type="month" data-habit-month value="${state.habitMonth}" max="${today.slice(0, 7)}"></label>${this.calendar(state.habitMonth, day, 'habit-day', (date) => this.checked(id, date))}<div class="selected-day"><strong>${day}</strong><p>${this.checked(id, day) ? '已完成，可以撤销这次记录。' : '没有完成记录；历史不按当前计划推算缺勤。'}</p><button class="button" type="button" data-habit-check="${id}" ${day > today ? 'disabled' : ''}>${this.checked(id, day) ? '撤销当天完成' : '补记当天完成'}</button></div><button class="text-button danger-text" type="button" data-habit-delete="${id}">删除习惯及完成记录</button></div>`,
    )
    trace('habit.detailopened', { paused: h.paused })
  },
  openHabitEditor(h) {
    state.editor = { kind: 'habit', id: h?.id, dirty: false, generation: state.generation }
    openModal(
      'editor',
      dialogHeader(h ? '编辑习惯' : '创建习惯') +
        `<form id="aux-form" novalidate><div class="entry-content"><div id="entry-error" class="entry-error" role="alert" hidden></div><label class="field-row"><span>习惯名称</span><input name="title" maxlength="40" value="${safe(h?.title || '')}" placeholder="一个想重复的小动作"></label><fieldset class="weekday-field"><legend>每周重复 · 至少选择一天</legend><div>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<label><input type="checkbox" name="weekdays" value="${n}" ${(h?.weekdays || [1, 2, 3, 4, 5, 6, 7]).includes(n) ? 'checked' : ''}><span>周${'一二三四五六日'[n - 1]}</span></label>`).join('')}</div></fieldset><p class="tiny">计划与暂停只影响今天起的安排，已有完成记录始终保留。</p></div><footer class="entry-footer"><button class="button" type="submit">保存习惯</button></footer></form>`,
    )
    queueMicrotask(() => body.querySelector('[name=title]').focus())
  },
  healthPage() {
    const weights = this.sorted('weight')
    const latest = weights[0]
    const activities = this.sorted('activity')
    const weekStart = '2026-09-28',
      weekEnd = '2026-10-04'
    const weekly = activities.filter((r) => r.date >= weekStart && r.date <= weekEnd)
    return `${pageHeading('身体的节奏', '记录变化，也给自己留些耐心。')}<div class="two-column"><div>${state.scenario === 'weight-failed' ? this.failure('weight') : `<section class="health-top"><div class="section-heading"><h2>最近体重</h2><button class="text-button" type="button" data-entry="weight">记体重 ${icon('add', 16)}</button></div>${latest ? `<div class="weight-number numeric">${latest.grams / 1000}<small>kg</small></div><p>${latest.date} · 当日最后录入 · 共 ${weights.length} 次记录</p>` : this.empty('还没有体重记录', '留下第一条，趋势会从这里开始。')}<div class="target-line"><span>${state.targetGrams ? `目标 ${state.targetGrams / 1000} kg${latest ? ` · 相差 ${Math.abs(latest.grams - state.targetGrams) / 1000} kg` : ''}` : '暂未设置目标'}</span><button class="text-button" type="button" data-target>设置目标</button></div></section><section class="trend-section"><div class="section-heading"><h2>体重趋势</h2><button class="text-button" type="button" data-page="weight-history">全部记录 ${icon('arrow', 14)}</button></div><div class="range-tabs">${[30, 90, 0].map((n) => `<button type="button" data-weight-range="${n}" aria-pressed="${state.weightRange === n}">${n ? n + ' 天' : '全部'}</button>`).join('')}</div>${this.weightTrend(weights)}</section>`}<section class="activity-panel"><div class="section-heading"><h2>本周运动</h2><button class="text-button" type="button" data-entry="activity">记运动 ${icon('add', 16)}</button></div><div class="activity-number numeric">${weekly.reduce((n, r) => n + r.minutes, 0)}<small>分钟</small></div><p class="tiny">9 月 28 日—10 月 4 日 · ${weekly.length} 次记录</p><button class="text-button" type="button" data-page="activity-history">查看运动历史 ${icon('arrow', 14)}</button></section></div><section class="health-habits">${this.habitStation(true)}</section></div>`
  },
  weightTrend(weights) {
    const start = new Date(`${today}T12:00:00`)
    start.setDate(start.getDate() - (state.weightRange || 99999) + 1)
    const records = weights.filter(
      (r) => !state.weightRange || new Date(`${r.date}T12:00:00`) >= start,
    )
    const days = [
      ...new Map(records.map((r) => [r.date, records.find((v) => v.date === r.date)])).values(),
    ].reverse()
    if (days.length < 2)
      return this.empty(
        days.length ? '再留下一天，趋势就会出现。' : '这个范围还没有记录。',
        '每天取当日最后录入；全部记录仍保留在历史。',
      )
    const low = Math.min(...days.map((r) => r.grams)) - 200
    const high = Math.max(...days.map((r) => r.grams)) + 200
    const dates = days.map((r) => +new Date(`${r.date}T12:00:00`))
    const x = (i) => 15 + ((dates[i] - dates[0]) / (dates.at(-1) - dates[0])) * 280
    const y = (r) => 125 - ((r.grams - low) / (high - low)) * 105
    return `<p class="trend-summary"><strong>${days[0].grams / 1000} → ${days.at(-1).grams / 1000} kg</strong><span> 变化 ${((days.at(-1).grams - days[0].grams) / 1000).toFixed(1)} kg</span></p><figure class="weight-chart"><svg viewBox="0 0 310 150" role="img" aria-label="体重趋势，${days.length}个日期，从${days[0].grams / 1000}到${days.at(-1).grams / 1000}千克"><path d="M15 125H295M15 72H295M15 20H295" class="chart-grid"/><polyline points="${days.map((r, i) => `${x(i)},${y(r)}`).join(' ')}"/>${days.map((r, i) => `<circle cx="${x(i)}" cy="${y(r)}" r="4"/>`).join('')}</svg><figcaption><span>${days[0].date.slice(5)}</span><span>${days.at(-1).date.slice(5)} · kg</span></figcaption></figure><p class="tiny">每天取当日最后录入，图线只连接真实记录。点“全部记录”查看每次记录。</p>`
  },
  historyPage(kind) {
    return `${pageHeading(kind === 'weight' ? '体重记录' : '运动记录', '按记录日期排列，同日按录入顺序；不推测发生时刻。', `<button class="text-button" type="button" data-page="health">返回健康</button>`)}<button class="button" type="button" data-entry="${kind}">${icon('add', 18)}${kind === 'weight' ? '记录体重' : '记录运动'}</button><div class="history-records">${this.sorted(kind).length ? recordRows(this.sorted(kind)) : this.empty('还没有记录', '记录之后，历史会按实际日期出现在这里。')}</div>`
  },
  openTarget() {
    state.editor = { kind: 'target', dirty: false, generation: state.generation }
    openModal(
      'editor',
      dialogHeader('体重目标') +
        `<form id="aux-form" novalidate><div class="entry-content"><div id="entry-error" class="entry-error" role="alert" hidden></div><label class="field-row"><span>目标体重（kg）</span><input name="target" inputmode="decimal" value="${state.targetGrams ? state.targetGrams / 1000 : ''}" placeholder="选填"></label><p class="tiny">只展示当前记录与目标的距离，不给身体状态下评价。留空并保存可移除目标。</p></div><footer class="entry-footer"><button class="button" type="submit">保存目标</button></footer></form>`,
    )
    queueMicrotask(() => body.querySelector('[name=target]').focus())
  },
  financePage(report = false) {
    const label = state.financeMonth.replace('-', ' 年 ') + ' 月'
    const income = sum('income'),
      expense = sum('expense')
    const rows = this.sorted('finance').filter((r) => r.date.startsWith(state.financeMonth))
    const counts = new Map()
    rows
      .filter((r) => r.type === 'expense')
      .forEach((r) => counts.set(r.category, (counts.get(r.category) || 0) + r.minor))
    return `${pageHeading(report ? '收支回看' : '让每一笔，都有去处。', label, report ? '<button class="text-button" type="button" data-report-back>返回原页面</button>' : '<button class="text-button" type="button" data-report>月报表 ' + icon('arrow', 14) + '</button>')}<label class="month-picker"><span>查看月份</span><input type="month" data-finance-month value="${state.financeMonth}" max="${today.slice(0, 7)}"></label>${
      state.scenario === 'finance-failed'
        ? this.failure('finance')
        : `<div class="two-column"><div><section class="finance-stage"><h2>本月支出</h2><div class="finance-main-value numeric"><small>¥</small>${money(expense)}</div><div class="finance-meta"><div><span>本月收入</span><strong>¥ ${money(income)}</strong></div><div><span>收支结余</span><strong>¥ ${money(income - expense)}</strong></div></div></section>${
            report
              ? `<div class="section-heading"><h2>支出去向</h2><span>${rows.filter((r) => r.type === 'expense').length} 笔</span></div>${
                  counts.size
                    ? [...counts]
                        .sort((a, b) => b[1] - a[1])
                        .map(
                          ([name, value]) =>
                            `<div class="category-total"><strong>${safe(name)}</strong><span>¥ ${money(value)}</span><div><i style="width:${(value / expense) * 100}%"></i></div></div>`,
                        )
                        .join('')
                    : this.empty('本月还没有支出', '一笔记录之后，这里会展示真实去向。')
                }`
              : `<div class="today-view-switch"><button type="button" data-finance-view="list" aria-pressed="${state.financeView === 'list'}">本月流水</button><button type="button" data-finance-view="calendar" aria-pressed="${state.financeView === 'calendar'}">按日查看</button></div>${state.financeView === 'calendar' ? this.calendar(state.financeMonth, state.selectedDate, 'date', (date) => rows.some((r) => r.date === date)) : ''}`
          }</div><section><div class="section-heading"><h2>${!report && state.financeView === 'calendar' ? state.selectedDate + ' 流水' : '本月流水'}</h2>${!report ? '<button class="text-button" type="button" data-entry="finance">记一笔 ' + icon('add', 16) + '</button>' : ''}</div>${recordRows(!report && state.financeView === 'calendar' ? rows.filter((r) => r.date === state.selectedDate) : rows)}</section></div>`
    }`
  },
  domain(kind = state.editor?.kind) {
    return kind === 'finance' ? state.editor.type : kind
  },
  categoryPicker(kind, record) {
    if (!['finance', 'activity', 'focus'].includes(kind)) return ''
    const categories = state.categories.filter(
      (c) => c.domain === this.domain(kind) && (!c.archived || c.id === record?.categoryId),
    )
    const selected =
      categories.find((c) => c.id === (record?.categoryId || state.editor.categoryId)) ||
      categories[0]
    state.editor.categoryId = selected?.id
    state.editor.category = selected?.name || ''
    return `<div id="category-picker"><p class="amount-label">分类</p><div class="categories">${categories.map((c) => `<button class="category category-choice" type="button" data-category="${c.id}" aria-pressed="${selected?.id === c.id}">${icon(c.icon, 20)}<span>${safe(c.name)}${c.archived ? '（已归档）' : ''}</span></button>`).join('')}</div><p class="tiny">分类可在“设置 → 分类管理”调整。</p></div>`
  },
  selectCategory(id) {
    const c = state.categories.find((v) => v.id === id)
    if (!c || !state.editor) return
    state.editor.categoryId = id
    state.editor.category = c.name
    state.editor.dirty = true
    body
      .querySelectorAll('[data-category]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.category === id)))
    trace('entry.categorychanged', { domain: c.domain })
  },
  refreshCategories() {
    body
      .querySelector('#category-picker')
      ?.replaceWith(
        document.createRange().createContextualFragment(this.categoryPicker(state.editor.kind)),
      )
  },
  categoryPage() {
    const labels = { expense: '支出', income: '收入', activity: '运动', focus: '专注' }
    return `${pageHeading('分类，按你的方式。', '一个层级就够了。归档不改变已有记录。', '<button class="text-button" type="button" data-page="settings">返回设置</button>')}<div class="range-tabs">${Object.entries(
      labels,
    )
      .map(
        ([domain, label]) =>
          `<button type="button" data-category-domain="${domain}" aria-pressed="${state.categoryDomain === domain}">${label}</button>`,
      )
      .join(
        '',
      )}</div><button class="button" type="button" data-category-new>新增${labels[state.categoryDomain]}分类</button><ul class="settings-list">${state.categories
      .filter((c) => c.domain === state.categoryDomain)
      .map(
        (c) =>
          `<li><button type="button" data-category-edit="${c.id}">${icon(c.icon, 22)}<span><strong>${safe(c.name)}</strong><small>${c.archived ? '已归档 · 历史仍保留' : '可用于新记录'}</small></span>${icon('arrow', 16)}</button></li>`,
      )
      .join('')}</ul>`
  },
  openCategory(c) {
    state.editor = {
      kind: 'category',
      id: c?.id,
      domain: c?.domain || state.categoryDomain,
      dirty: false,
      generation: state.generation,
    }
    openModal(
      'editor',
      dialogHeader(c ? '编辑分类' : '新增分类') +
        `<form id="aux-form" novalidate><div class="entry-content"><div id="entry-error" class="entry-error" role="alert" hidden></div><label class="field-row"><span>分类名称</span><input name="title" maxlength="30" value="${safe(c?.name || '')}" placeholder="最多 30 个字"></label><p class="tiny">同一领域内名称不能重复。改名会同步分类展示，原始备注保持不变。</p>${c ? `<button class="text-button" type="button" data-category-archive="${c.id}">${c.archived ? '重新启用分类' : '归档分类'}</button><button class="text-button danger-text" type="button" data-category-delete="${c.id}">删除未使用的分类</button>` : ''}</div><footer class="entry-footer"><button class="button" type="submit">保存分类</button></footer></form>`,
    )
    queueMicrotask(() => body.querySelector('[name=title]').focus())
  },
  setFormBusy(busy) {
    body.querySelectorAll('input,select,textarea,button').forEach((el) => {
      el.disabled = busy
    })
    body.querySelector('form')?.setAttribute('aria-busy', String(busy))
    state.writeBusy = busy
    this.shell()
  },
  async saveAux(form) {
    const editor = state.editor
    if (!editor || editor.busy) return
    const f = new FormData(form),
      title = String(f.get('title') || '').trim(),
      target = String(f.get('target') || '').trim(),
      weekdays = f.getAll('weekdays').map(Number)
    if (editor.generation !== state.generation) {
      editorError('本机内容已在另一标签页恢复。输入已保留，请复制需要的内容，再关闭并重新开始。')
      return
    }
    if (['habit', 'category'].includes(editor.kind) && !title) {
      editorError('请填写名称。')
      return
    }
    if (editor.kind === 'habit' && !weekdays.length) {
      editorError('请至少选择一天。')
      return
    }
    if (
      editor.kind === 'category' &&
      state.categories.some(
        (c) => c.domain === editor.domain && c.id !== editor.id && c.name === title,
      )
    ) {
      editorError('这个领域已有同名分类，请换一个名称。')
      return
    }
    if (
      editor.kind === 'target' &&
      target &&
      (!/^\d{1,4}(\.\d{1,3})?$/.test(target) || Number(target) < 1 || Number(target) > 1000)
    ) {
      editorError('目标需在 1 至 1000 kg 之间，最多三位小数。')
      return
    }
    editor.busy = true
    this.setFormBusy(true)
    trace('aux.saving', { kind: editor.kind })
    await new Promise((resolve) => setTimeout(resolve, state.scenario === 'busy' ? 1800 : 240))
    editor.busy = false
    this.setFormBusy(false)
    if (editor.generation !== state.generation) {
      editorError('本机内容有变化，当前输入已保留。请关闭并重新开始。')
      return
    }
    if (this.consumeWriteFailure()) {
      editorError('保存失败，输入仍在。请重试。')
      return
    }
    if (editor.kind === 'target')
      state.targetGrams = target ? Math.round(Number(target) * 1000) : undefined
    if (editor.kind === 'habit') {
      const h = state.habits.find((v) => v.id === editor.id)
      if (h) Object.assign(h, { title, weekdays })
      else
        state.habits.push({ id: `h-${Date.now()}`, title, weekdays, paused: false, icon: 'leaf' })
    }
    if (editor.kind === 'category') {
      const c = state.categories.find((v) => v.id === editor.id)
      if (c) {
        c.name = title
        state.records
          .filter((r) => r.categoryId === c.id)
          .forEach((r) => {
            r.category = title
            if (['finance', 'activity'].includes(r.kind)) r.title = title
          })
      } else
        state.categories.push({
          id: `cat-${Date.now()}`,
          name: title,
          domain: editor.domain,
          icon: editor.domain === 'activity' ? 'activity' : 'bag',
          archived: false,
        })
    }
    state.revision++
    trace('aux.saved', { kind: editor.kind })
    closeModal(false)
    render()
    restoreOrigin()
    toast('已保存。')
  },
  backupData() {
    return {
      format: 'lifeindex.prototype.r3',
      version: 1,
      records: structuredClone(state.records),
      habits: structuredClone(state.habits),
      habitChecks: structuredClone(state.habitChecks),
      categories: structuredClone(state.categories),
      targetGrams: state.targetGrams ?? null,
      // Completed sessions are represented by record facts; the current persisted session is also preserved.
      focusSession: state.focus.status === 'idle' ? null : structuredClone(state.focus),
    }
  },
  validateBackup(data) {
    if (data?.format !== 'lifeindex.prototype.r3' || data.version !== 1)
      throw Error('无法识别备份格式或版本。')
    for (const key of ['records', 'habits', 'habitChecks', 'categories'])
      if (!Array.isArray(data[key])) throw Error('备份缺少必要集合。')
    for (const key of ['records', 'habits', 'categories']) {
      const ids = data[key].map((v) => v.id)
      if (ids.some((v) => typeof v !== 'string' || !v) || new Set(ids).size !== ids.length)
        throw Error('备份中存在重复或无效标识。')
    }
    const categoryIds = new Set(data.categories.map((c) => c.id))
    for (const c of data.categories)
      if (
        !['expense', 'income', 'activity', 'focus'].includes(c.domain) ||
        typeof c.name !== 'string' ||
        !c.name.trim() ||
        c.name.length > 30 ||
        typeof c.archived !== 'boolean' ||
        ![
          'today',
          'health',
          'focus',
          'finance',
          'activity',
          'weight',
          'leaf',
          'book',
          'cup',
          'bag',
          'arrow',
        ].includes(c.icon)
      )
        throw Error('分类内容无效。')
    for (const r of data.records) {
      if (
        !['finance', 'weight', 'activity', 'focus'].includes(r.kind) ||
        !this.validDate(r.date) ||
        r.date > today ||
        (r.kind === 'focus'
          ? r.timePrecision !== 'instant' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)
          : r.timePrecision !== 'day' || r.time !== undefined) ||
        typeof r.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(r.createdAt)) ||
        typeof r.title !== 'string' ||
        typeof r.note !== 'string' ||
        r.note.length > 1000
      )
        throw Error('记录日期或内容无效。')
      if (
        r.kind !== 'weight' &&
        (!categoryIds.has(r.categoryId) ||
          data.categories.find((c) => c.id === r.categoryId)?.domain !==
            (r.kind === 'finance' ? r.type : r.kind))
      )
        throw Error('记录引用的分类不存在或领域不匹配。')
      const number =
        r.kind === 'finance'
          ? r.minor
          : r.kind === 'weight'
            ? r.grams
            : r.kind === 'activity'
              ? r.minutes
              : r.seconds
      if (!Number.isSafeInteger(number) || number <= 0) throw Error('数值必须为有效正整数。')
      if (r.kind === 'finance' && !['expense', 'income'].includes(r.type))
        throw Error('收支类型无效。')
      if (
        (r.kind === 'weight' && (number < 1000 || number > 1000000)) ||
        (r.kind === 'activity' && number > 1440)
      )
        throw Error('记录数值超出范围。')
    }
    for (const h of data.habits)
      if (
        typeof h.title !== 'string' ||
        !h.title.trim() ||
        !Array.isArray(h.weekdays) ||
        !h.weekdays.length ||
        h.weekdays.some((v) => !Number.isInteger(v) || v < 1 || v > 7) ||
        typeof h.paused !== 'boolean'
      )
        throw Error('习惯计划无效。')
    const checks = new Set()
    for (const c of data.habitChecks) {
      const key = c.habitId + c.date
      if (
        checks.has(key) ||
        !data.habits.some((h) => h.id === c.habitId) ||
        !this.validDate(c.date) ||
        c.date > today
      )
        throw Error('习惯完成记录无效。')
      checks.add(key)
    }
    if (
      data.targetGrams !== null &&
      (!Number.isInteger(data.targetGrams) || data.targetGrams < 1000 || data.targetGrams > 1000000)
    )
      throw Error('体重目标无效。')
    const focus = data.focusSession
    if (
      focus !== null &&
      (!focus ||
        !['running', 'paused', 'awaiting-save'].includes(focus.status) ||
        !Number.isInteger(focus.plannedSeconds) ||
        focus.plannedSeconds < 60 ||
        !Number.isFinite(focus.elapsedSeconds) ||
        focus.elapsedSeconds < 0 ||
        focus.elapsedSeconds > focus.plannedSeconds ||
        (focus.status === 'running' && !Number.isFinite(focus.runningSince)))
    )
      throw Error('未结束专注会话无效。')
    return data
  },
  openRestore() {
    state.restoreReadToken = (state.restoreReadToken || 0) + 1
    state.restoreCandidate = undefined
    openModal(
      'restore',
      dialogHeader('从备份恢复') +
        `<div class="detail-content"><p>先在本机验证文件，再查看替换范围。此原型只接收自己的合成备份格式。</p><label class="file-picker">选择 JSON 备份<input type="file" accept=".json,application/json" data-backup-file></label><p id="restore-error" class="entry-error" role="alert" hidden></p><button class="button secondary" type="button" data-restore-preview>使用当前合成数据演示预览</button><p class="tiny">现在选择文件不会修改任何记录。恢复会替换新版数据，旧版库不在范围内。</p></div>`,
    )
  },
  previewBackup(data) {
    try {
      const candidate = this.validateBackup(data)
      state.restoreCandidate = structuredClone(candidate)
      state.restoreStamp = { generation: state.generation, revision: state.revision }
      openModal(
        'restore-preview',
        dialogHeader('确认备份内容') +
          `<div class="detail-content"><span class="preview-label">完整校验通过 · 尚未写入</span><dl class="detail-facts">${[
            ['生活记录', candidate.records.length],
            ['习惯', candidate.habits.length],
            ['完成记录', candidate.habitChecks.length],
            ['分类', candidate.categories.length],
            [
              '备份中未结束专注',
              candidate.focusSession
                ? {
                    running: '1 段 · 运行中',
                    paused: '1 段 · 已暂停',
                    'awaiting-save': '1 段 · 待保存',
                  }[candidate.focusSession.status]
                : '0 段',
            ],
            [
              '本机未结束专注',
              state.focus.status === 'idle'
                ? '0 段'
                : {
                    running: '1 段 · 运行中',
                    paused: '1 段 · 已暂停',
                    'awaiting-save': '1 段 · 待保存',
                  }[state.focus.status],
            ],
            [
              '体重目标',
              candidate.targetGrams === null ? '未设置' : candidate.targetGrams / 1000 + ' kg',
            ],
          ]
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
            .join(
              '',
            )}</dl><p>当前新版数据及未结束专注会整体替换。备份中的运行会话在确认后追平经过时间；暂停会保持暂停。取消可保留原样；建议先导出当前备份。</p><div id="restore-error" class="entry-error" role="alert" hidden></div><button class="button" type="button" data-restore-confirm>继续，确认替换</button><button class="text-button" type="button" data-simulate-write>评审：模拟另一标签页写入</button></div>`,
      )
      trace('backup.previewvalidated', {
        collections: 4,
        includesActiveSession: !!candidate.focusSession,
      })
    } catch (error) {
      const el = body.querySelector('#restore-error')
      if (el) {
        el.hidden = false
        el.textContent = error.message
      }
      trace('backup.invalid', { failureClass: 'validation' })
    }
  },
  confirmRestore() {
    if (
      state.restoreStamp.generation !== state.generation ||
      state.restoreStamp.revision !== state.revision
    ) {
      body.querySelector('#restore-error').hidden = false
      body.querySelector('#restore-error').innerHTML =
        '预览后本机内容有变化，尚未替换任何数据。<button class="text-button" type="button" data-repreview>重新预览</button>'
      trace('backup.conflict', { reason: 'revision-changed' })
      return
    }
    showConfirm(
      '替换新版的全部数据？',
      '已验证的备份将整体替换当前新版内容。旧版数据不在本次范围。',
      '确认替换',
      () => void this.applyRestore(),
      '保留当前数据',
    )
  },
  async applyRestore() {
    state.restoreBusy = true
    this.setFormBusy(true)
    trace('backup.replacing', { source: 'validated-synthetic' })
    await new Promise((resolve) => setTimeout(resolve, 350))
    state.restoreBusy = false
    this.setFormBusy(false)
    if (this.consumeWriteFailure()) {
      body.querySelector('#restore-error').hidden = false
      body.querySelector('#restore-error').textContent = '替换失败，当前数据完整保留，可重新尝试。'
      trace('backup.replacefailed', { failureClass: 'simulated' })
      return
    }
    if (
      state.restoreStamp.generation !== state.generation ||
      state.restoreStamp.revision !== state.revision
    ) {
      this.confirmRestore()
      return
    }
    const d = state.restoreCandidate
    state.records = d.records
    state.habits = d.habits
    state.habitChecks = d.habitChecks
    state.categories = d.categories
    state.targetGrams = d.targetGrams ?? undefined
    state.generation++
    state.revision++
    state.focus = d.focusSession
      ? structuredClone(d.focusSession)
      : { status: 'idle', plannedSeconds: 1500, elapsedSeconds: 0 }
    trace('backup.replaced', { generationChanged: true })
    closeModal(false)
    render()
    restoreOrigin()
    toast('恢复完成，已回到设置。')
  },
  shell() {
    let el = document.querySelector('#shell-status')
    if (!el) {
      el = document.createElement('div')
      el.id = 'shell-status'
      el.setAttribute('role', 'status')
      document.querySelector('.studio-header').after(el)
    }
    const busy = state.editor?.dirty || state.writeBusy || state.restoreBusy
    const content = {
      ready: '',
      offline: '已离线 · 已保存的本机记录仍可使用。',
      failed: '离线功能尚未就绪，保持联网可继续使用。',
      update: `新版本已准备好。${busy ? '先完成或取消当前编辑，再更新。' : ''}<button class="text-button" type="button" data-shell-later>稍后</button><button class="text-button" type="button" data-shell-update ${busy ? 'disabled' : ''}>立即更新</button>`,
    }
    el.innerHTML = content[state.shellState] || ''
    el.hidden = !el.innerHTML
    el.className = 'shell-status'
  },
  handleChange(e) {
    const el = e.target
    if (
      el.hasAttribute('data-finance-month') &&
      /^\d{4}-\d{2}$/.test(el.value) &&
      el.value <= today.slice(0, 7)
    ) {
      state.financeMonth = el.value
      state.selectedDate = `${el.value}-01`
      render()
      document.querySelector('[data-finance-month]')?.focus()
      trace('finance.monthchanged')
    }
    if (el.hasAttribute('data-habit-month') && /^\d{4}-\d{2}$/.test(el.value)) {
      state.habitMonth = el.value
      state.habitDay = `${el.value}-01`
      this.habitDetail(state.activeHabit)
    }
    if (el.hasAttribute('data-backup-file') && el.files[0]) {
      const file = el.files[0]
      // Selecting even an invalid replacement supersedes the previous asynchronous file read.
      const readToken = ++state.restoreReadToken
      if (file.size > 2000000) {
        body.querySelector('#restore-error').hidden = false
        body.querySelector('#restore-error').textContent = '文件超过原型 2 MB 验证上限。'
        return
      }
      file
        .text()
        .then((text) => {
          // A cancelled or superseded file read cannot resurrect an obsolete preview.
          if (readToken !== state.restoreReadToken || state.modal !== 'restore') {
            trace('backup.readignored', { reason: 'superseded-or-cancelled' })
            return
          }
          try {
            this.previewBackup(JSON.parse(text))
          } catch {
            const error = body.querySelector('#restore-error')
            error.hidden = false
            error.textContent = '文件不是有效 JSON；当前数据未变化。'
            trace('backup.parsefailed', { failureClass: 'invalid-json' })
          }
        })
        .catch(() => {
          if (readToken !== state.restoreReadToken || state.modal !== 'restore') return
          const error = body.querySelector('#restore-error')
          error.hidden = false
          error.textContent = '文件读取失败，请重新选择。'
          trace('backup.readfailed', { failureClass: 'file-read' })
        })
    }
    if (el.id === 'shell-scenario') {
      state.shellState = el.value
      this.shell()
      trace('shell.statechanged', { state: el.value })
    }
  },
  handleClick(e) {
    const b = e.target.closest('button')
    if (!b) return
    if (b.id === 'draft-conflict' || b.hasAttribute('data-simulate-restore')) {
      state.generation++
      trace('review.externalrestore')
      toast('已模拟其他标签页恢复，草稿保存将被拒绝。')
    }
    if (b.hasAttribute('data-target')) this.openTarget()
    if (b.hasAttribute('data-weight-range')) {
      state.weightRange = Number(b.dataset.weightRange)
      render()
      document.querySelector(`[data-weight-range="${state.weightRange}"]`)?.focus()
    }
    if (b.dataset.habitDay) {
      state.habitDay = b.dataset.habitDay
      this.habitDetail(state.activeHabit)
      body.querySelector(`[data-habit-day="${state.habitDay}"]`)?.focus()
    }
    if (b.dataset.habitCheck) {
      this.toggleHabit(b.dataset.habitCheck, state.habitDay, true)
      body.querySelector('[data-habit-check]')?.focus()
    }
    if (b.dataset.habitEdit)
      this.openHabitEditor(state.habits.find((h) => h.id === b.dataset.habitEdit))
    if (b.dataset.habitPause) {
      const h = state.habits.find((v) => v.id === b.dataset.habitPause)
      h.paused = !h.paused
      state.revision++
      trace('habit.planstatechanged', { paused: h.paused })
      render()
      this.habitDetail(h.id)
      body.querySelector('[data-habit-pause]')?.focus()
    }
    if (b.dataset.habitDelete) {
      const id = b.dataset.habitDelete
      showConfirm(
        '删除这个习惯？',
        '习惯及它的完成记录会一并删除。',
        '确认删除',
        () => {
          state.habits = state.habits.filter((h) => h.id !== id)
          state.habitChecks = state.habitChecks.filter((c) => c.habitId !== id)
          state.revision++
          trace('habit.deleted', { confirmed: true })
          closeModal(false)
          render()
          document.querySelector('[data-entry=habit]')?.focus()
        },
        '保留习惯',
      )
    }
    if (b.dataset.categoryDomain) {
      state.categoryDomain = b.dataset.categoryDomain
      render()
      document.querySelector(`[data-category-domain="${state.categoryDomain}"]`)?.focus()
    }
    if (b.hasAttribute('data-category-new')) this.openCategory()
    if (b.dataset.categoryEdit)
      this.openCategory(state.categories.find((c) => c.id === b.dataset.categoryEdit))
    if (b.dataset.categoryArchive) {
      const c = state.categories.find((v) => v.id === b.dataset.categoryArchive)
      if (
        !c.archived &&
        state.categories.filter((v) => v.domain === c.domain && !v.archived).length === 1
      ) {
        editorError('每个领域至少保留一个可用分类。')
        return
      }
      c.archived = !c.archived
      state.revision++
      trace('category.archivestatechanged', { archived: c.archived })
      closeModal(false)
      render()
      restoreOrigin()
    }
    if (b.dataset.categoryDelete) {
      const id = b.dataset.categoryDelete
      if (state.records.some((r) => r.categoryId === id)) {
        editorError('此分类已有记录，请归档以保留历史引用。')
        return
      }
      const c = state.categories.find((v) => v.id === id)
      if (
        !c.archived &&
        state.categories.filter((v) => v.domain === c.domain && !v.archived).length === 1
      ) {
        editorError('每个领域至少保留一个可用分类。')
        return
      }
      showConfirm(
        '删除未使用的分类？',
        '已有记录不会受影响。',
        '确认删除',
        () => {
          state.categories = state.categories.filter((c) => c.id !== id)
          state.revision++
          trace('category.deleted', { unused: true })
          closeModal(false)
          render()
          restoreOrigin()
        },
        '保留分类',
      )
    }
    if (b.hasAttribute('data-simulate-write')) {
      state.revision++
      toast('已模拟另一标签页写入，待确认时检查冲突。')
      trace('review.externalwrite')
    }
    if (b.hasAttribute('data-repreview')) this.previewBackup(state.restoreCandidate)
    if (b.hasAttribute('data-shell-later')) {
      state.shellState = 'ready'
      this.shell()
      trace('shell.updatedeferred')
    }
    if (b.hasAttribute('data-shell-update')) {
      if (state.editor?.dirty || state.writeBusy) return
      state.shellState = 'ready'
      this.shell()
      toast('原型：更新流程已确认；正式应用将重新载入。')
      trace('shell.updateconfirmed', { simulated: true })
    }
  },
}
