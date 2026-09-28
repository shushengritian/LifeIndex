const icons = {
  today:
    '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/>',
  health:
    '<path d="M12 20S4 15.7 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.7 12 20 12 20Z"/><path d="M7 12h3l1-3 2 6 1-3h3"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 0v3m0 8 3-3"/>',
  finance: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2M7 5V3h10"/>',
  settings:
    '<path d="m9 3-1 3-3 1v4l-2 1 2 1v4l3 1 1 3h6l1-3 3-1v-4l2-1-2-1V7l-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  play: '<path d="m9 5 10 7-10 7Z"/>',
  weight:
    '<rect x="4" y="4" width="16" height="17" rx="4"/><path d="M8 8a5 5 0 0 1 8 0m-4 0 2-2"/>',
  activity: '<path d="M3 9v6m3-8v10m12-10v10m3-8v6M6 12h12"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  leaf: '<path d="M19 4C9 2 3 7 6 14s14 5 13-10ZM5 20l10-11"/>',
  cup: '<path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Zm12 1h1a3 3 0 0 1 0 6h-1M8 3v2m5-2v2"/>',
  food: '<path d="M5 3v7m3-7v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10m12-18c-4 2-5 8-2 10h3m0-10v18"/>',
  train:
    '<rect x="6" y="2" width="12" height="16" rx="3"/><path d="M6 10h12M9 21l2-3m4 3-2-3M9 6h6m-6 8h1m4 0h1"/>',
  bag: '<path d="M5 7h14l2 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
}
const icon = (name, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.today}</svg>`
const params = new URLSearchParams(location.search)
const allowedDirections = ['day', 'coordinate', 'journal']
// Prototype state never touches business storage; only fixed, nonpersonal transitions enter the console.
const state = {
  direction: allowedDirections.includes(params.get('direction')) ? params.get('direction') : 'day',
  theme: params.get('theme') === 'dark' ? 'dark' : 'light',
  page: 'today',
  failed: false,
  returnPage: 'today',
  returnScroll: 0,
  empty: false,
  checked: true,
  running: false,
  entry: 'finance',
  transactionType: 'expense',
}
const trace = (operation, toState) =>
  console.info('[lifeindex.design-prototype]', { operation, toState, synthetic: true })
const main = document.querySelector('#main')
const dialog = document.querySelector('#entry-dialog')
const navItems = [
  ['today', '今天'],
  ['health', '健康'],
  ['focus', '专注'],
  ['finance', '记账'],
]
function navigation() {
  const links = navItems
    .map(
      ([page, label]) =>
        `<a href="#${page}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(page)}<span>${label}</span></a>`,
    )
    .join('')
  document.querySelector('.mobile-nav').innerHTML = links
  document.querySelector('.desktop-rail').innerHTML =
    `<div class="rail-wordmark">LifeIndex<span>把生活，留给自己。</span></div>${links.replaceAll('<a ', '<a class="rail-link" ')}<div class="rail-end"><a href="#settings" data-page="settings" class="rail-link" ${state.page === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}设置</a><p class="rail-status">本地优先的生活索引<br>记录只留在这台设备</p></div>`
  document.querySelector('.settings-trigger').innerHTML = icon('settings', 18) + '<span>设置</span>'
}
function heading(title, description = '9 月 28 日，星期一', action = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action || '<div class="date-block"><strong>28</strong>2026 / 09</div>'}</div>`
}
function quickActions() {
  return `<div class="quick-actions" aria-label="快速记录">${[
    ['finance', '记一笔'],
    ['weight', '记体重'],
    ['activity', '记运动'],
  ]
    .map(
      ([kind, label]) =>
        `<button type="button" class="quick-action" ${kind === 'focus' ? 'data-page="focus"' : `data-entry="${kind}"`}><span>${icon(kind)}</span>${label}</button>`,
    )
    .join('')}</div>`
}
function habits() {
  return state.empty
    ? `<div class="micro-empty">今天还没有安排习惯。<br><button class="quiet-button" data-entry="habit" type="button">${icon('add', 18)}创建第一个习惯</button></div>`
    : `<ul class="habit-list"><li><button class="habit-detail" data-habit-detail type="button"><span class="habit-icon">${icon('book')}</span><span class="habit-copy"><strong>读 20 分钟</strong><small>每天 · 给思绪留一点空间</small></span></button><button class="habit-check" aria-label="读 20 分钟，${state.checked ? '已完成，点按撤销' : '点按完成'}" aria-pressed="${state.checked}" data-check type="button">${icon(state.checked ? 'check' : 'add', 20)}</button></li><li><button class="habit-detail" data-habit-detail type="button"><span class="habit-icon">${icon('leaf')}</span><span class="habit-copy"><strong>到户外走走</strong><small>工作日</small></span></button><button class="habit-check" aria-label="到户外走走，点按完成" aria-pressed="false" data-simple-check type="button">${icon('add', 20)}</button></li></ul>`
}
function focusFeature() {
  return `<section class="focus-feature"><div><h2>${state.running ? '回到这一刻的专注' : '一次，只做一件事。'}</h2><p>${state.running ? '计时在继续 · 已进行 5 分钟' : '从 25 分钟开始'}</p><button type="button" data-page="focus">${state.running ? '继续专注' : '开始专注'} &nbsp; →</button></div><div class="focus-art" aria-hidden="true"><svg viewBox="0 0 110 110" fill="none"><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(0 55 55)" stroke="currentColor" stroke-width=".8"/><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(30 55 55)" stroke="currentColor" stroke-width=".8"/><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(60 55 55)" stroke="currentColor" stroke-width=".8"/><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(90 55 55)" stroke="currentColor" stroke-width=".8"/><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(120 55 55)" stroke="currentColor" stroke-width=".8"/><ellipse cx="55" cy="55" rx="42" ry="19" transform="rotate(150 55 55)" stroke="currentColor" stroke-width=".8"/></svg></div></section>`
}
function records(financeOnly = false) {
  return state.empty
    ? '<p class="micro-empty">第一条记录，从此刻开始。记录后会按时间出现在这里。</p>'
    : `<ul class="record-list"><li><span class="record-glyph">${icon('cup', 20)}</span><span class="record-copy"><strong>餐饮 · 咖啡</strong><span>今天 09:16</span></span><span class="record-number">− ¥ 28.00<small>支出</small></span></li>${financeOnly ? '' : `<li><span class="record-glyph">${icon('focus', 20)}</span><span class="record-copy"><strong>阅读与思考</strong><span>今天 08:30</span></span><span class="record-number">25 分钟<small>已保存</small></span></li><li><span class="record-glyph">${icon('weight', 20)}</span><span class="record-copy"><strong>体重记录</strong><span>今天 07:30</span></span><span class="record-number">63.2 kg</span></li>`}</ul>`
}
// Idle focus follows scheduled actions; only an already running session takes priority.
function dayPage() {
  return (
    heading('今天') +
    `<div class="daily-summary">${state.empty ? '<span>没有预设目标，按自己的节奏开始。</span>' : `<span>已完成 <strong>${state.checked ? '1' : '0'}/2</strong> 个习惯</span><i class="summary-divider"></i><span>专注 <strong>25 分钟</strong></span><i class="summary-divider"></i><span>支出 <strong>¥ 28</strong></span><button class="quiet-button" data-report type="button">月报 ${icon('arrow', 13)}</button>`}</div><div class="page-grid"><div>${quickActions()}${focusFeature()}<div class="section-head"><h2>今日习惯<span class="inline-count">${state.empty ? '' : `${state.checked ? '1' : '0'} / 2`}</span></h2><button type="button" class="quiet-button" data-page="health">全部 ${icon('arrow', 15)}</button></div>${habits()}</div><div><div class="section-head"><h2>今天留下的记录</h2><span class="inline-count">${state.empty ? '' : '3 条'}</span></div>${records()}<div class="section-head"><h2>生活的节奏</h2></div><p class="body-copy">${state.empty ? '每次记录，都是认识自己的一小步。无需一次填完所有信息。' : '查看健康里的体重与运动，在记账里回看本月收支。'}</p><div class="journal-note"><p>这里汇集你真实留下的记录。<br>没有综合评分，也不替生活打分。</p></div></div></div>`
  )
}
function coordinatePage() {
  return `<div class="coordinate-layout">${heading('生活坐标', '9 月 28 日，星期一 · 今天')}<div class="coordinate-summary"><section class="instrument"><div class="instrument-heading">${icon('finance', 18)}今日支出</div><div class="instrument-value">${state.empty ? '—' : '28'}<small>${state.empty ? '' : '元'}</small></div><div class="instrument-caption">${state.empty ? '尚无记录' : '1 笔 · 今天'}</div></section><section class="instrument"><div class="instrument-heading">${icon('focus', 18)}专注</div><div class="instrument-value">${state.empty ? '—' : '25'}<small>${state.empty ? '' : '分钟'}</small></div><div class="instrument-caption">${state.empty ? '尚无记录' : '1 次已保存'}</div></section><section class="instrument"><div class="instrument-heading">${icon('weight', 18)}最新体重</div><div class="instrument-value">${state.empty ? '—' : '63.2'}<small>${state.empty ? '' : 'kg'}</small></div><div class="instrument-caption">${state.empty ? '尚未测量' : '今天 07:30'}</div></section></div><div class="page-grid"><div><div class="command-strip"><div><strong>${state.running ? '专注计时中' : '下一段，专注自己'}</strong><p>${state.running ? '已进行 5 分钟' : '25 分钟 · 随时开始'}</p></div><button class="primary-button" data-page="focus" type="button">${icon('play', 17)}${state.running ? '继续' : '开始'}</button></div>${quickActions()}<div class="section-head"><h2>今日习惯</h2><span class="inline-count">${state.empty ? '' : `${state.checked ? '1' : '0'} / 2`}</span></div>${habits()}</div><div class="comparison-panel"><div class="section-head"><h2>近 7 日专注</h2><button class="quiet-button" data-page="focus" type="button">查看 ${icon('arrow', 15)}</button></div>${state.empty ? '<p class="micro-empty">完成并保存专注后显示真实记录。</p>' : `<div class="week-bars" aria-label="合成专注数据，周二25分钟，周三50分钟，周四0分钟，周五40分钟，周六25分钟，周日0分钟，周一25分钟">${[34, 68, 0, 54, 34, 0, 34].map((v, i) => `<span><i style="height:${v}px"></i>${['二', '三', '四', '五', '六', '日', '一'][i]}</span>`).join('')}</div><p class="tiny-note">只统计已完成并保存的会话 · 合成示例</p>`}<div class="section-head"><h2>最近记录</h2></div>${records()}</div></div></div>`
}
function journalPage() {
  return `<div class="page-heading"><div><h1 class="journal-title">生活书页</h1><p>2026 年 9 月 · 留下生活的纹理</p></div><button class="icon-button" data-entry="finance" type="button" aria-label="记一笔">${icon('add')}</button></div><div class="week-strip" aria-label="一周日期">${[22, 23, 24, 25, 26, 27, 28].map((d, i) => `<button type="button" class="day-chip ${i === 6 ? 'selected' : ''}" data-date="${d}" ${i === 6 ? 'aria-current="date"' : ''}><span>${['二', '三', '四', '五', '六', '日', '一'][i]}</span><strong>${d}</strong></button>`).join('')}</div><div class="journal-layout"><div><p class="journal-intro">${state.empty ? '今天还没有记录。一个数字，一段时间，都可以成为这一页的开始。' : '这一天，从照顾自己开始。<br>这里是你留下的每一个小片段。'}</p><button type="button" class="primary-button journal-compose" data-chooser>${icon('add', 19)}添一条记录</button>${state.empty ? '<div class="empty-panel"><h2 class="journal-title">新的一页。</h2><p>先记一笔支出，或留下一次体重。以后回看时，时间就有了轮廓。</p></div>' : `<ol class="timeline"><li><time>09:16 · 记账</time><h2>餐饮 · 咖啡</h2><p>餐饮 · 咖啡</p><div class="event-value">${icon('cup', 19)}¥ 28.00 支出</div></li><li><time>08:30 · 专注</time><h2>阅读与思考</h2><p>完成并保存的专注</p><div class="event-value">${icon('focus', 19)}25 分钟 · 已保存</div></li><li><time>07:30 · 健康</time><h2>今天的体重</h2><div class="event-value">${icon('weight', 19)}63.2 kg</div></li></ol>`}</div><div><div class="section-head"><h2>今天的小习惯</h2><button class="quiet-button" data-page="health" type="button">管理</button></div>${habits()}<div class="section-head"><h2>给这一刻一点留白</h2></div>${focusFeature()}<div class="journal-note"><p>日期整理真实记录。<br>记录由你决定，解释权也属于你。</p></div></div></div>`
}
function financePage() {
  return (
    heading(
      '记账',
      '2026 年 9 月',
      `<button type="button" class="primary-button" data-entry="finance">${icon('add', 18)}记一笔</button>`,
    ) +
    `<div class="page-grid"><div><section class="finance-overview"><p>本月支出</p><div class="domain-metric">${state.empty ? '尚无记录' : '¥ 1,286.00'}</div><div class="domain-metrics-row"><div><p>本月收入</p><strong>${state.empty ? '—' : '¥ 8,000.00'}</strong></div><div><p>本月结余</p><strong>${state.empty ? '—' : '¥ 6,714.00'}</strong></div></div></section><div class="domain-tabs"><button type="button" data-demo="已选择流水视图">流水</button><button type="button" data-demo="第二轮原型将展开完整月份选择">日历</button><button type="button" data-report>报表</button></div><div class="section-head"><h2>9 月 28 日<span class="inline-count">今天</span></h2></div>${records(true)}</div><div><div class="section-head"><h2>本月花在哪里</h2></div>${
      state.empty
        ? '<p class="micro-empty">有支出后，这里会按分类汇总。</p>'
        : [
            ['餐饮', '¥ 642.00'],
            ['日用', '¥ 408.00'],
            ['交通', '¥ 236.00'],
          ]
            .map(
              ([label, value]) =>
                `<div class="category-row"><i class="category-dot"></i><span>${label}</span><strong>${value}</strong></div>`,
            )
            .join('')
    }<p class="tiny-note">原型分类汇总为合成数据。此处仅展示信息结构。</p></div></div>`
  )
}
function healthPage() {
  return (
    heading('健康', '按自己的节奏，关注真实变化') +
    `<div class="health-columns"><div><section class="health-instrument"><div class="section-head"><h2>体重</h2><button type="button" class="quiet-button" data-entry="weight">${icon('add', 18)}记录</button></div><div class="domain-metric">${state.empty ? '—' : '63.2'}<small>kg</small></div><p class="tiny-note">${state.empty ? '记录后显示真实变化' : '最近记录 · 今天 07:30 · 目标 62.0 kg'}</p>${state.empty ? '' : `<svg class="health-chart" viewBox="0 0 320 100" role="img" aria-label="合成体重趋势"><path d="M0 84H320M0 20H320" stroke="currentColor" opacity=".13"/><path d="m8 30 30 9 32-7 30 15 30-4 33 12 30 1 28 11 29-6 32 11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="312" cy="72" r="4" fill="currentColor"/></svg><div class="health-chart-labels"><span>8 月 30 日</span><span>9 月 28 日</span></div>`}</section><div class="section-head"><h2>本周运动</h2><button type="button" class="quiet-button" data-entry="activity">${icon('add', 18)}记录</button></div><div class="domain-metric">${state.empty ? '—' : '3'}<small>次 · ${state.empty ? '尚无记录' : '累计 95 分钟'}</small></div></div><div><div class="section-head"><h2>习惯</h2><button type="button" class="quiet-button" data-entry="habit">${icon('add', 18)}新建</button></div>${habits()}<p class="tiny-note">点名称查看，点右侧圆钮完成或撤销。两种操作独立。</p></div></div>`
  )
}
function focusPage() {
  return (
    heading(
      '专注',
      '一次，只做一件事。',
      `<button type="button" class="quiet-button" data-demo="第二轮原型将展示专注历史">历史 ${icon('arrow', 16)}</button>`,
    ) +
    `<div class="page-grid"><div><section class="focus-workspace"><p>${state.running ? '正在专注 · 阅读与思考' : '为重要的事，留出一段时间'}</p><div class="focus-time">${state.running ? '20:00' : '25:00'}</div><div class="focus-presets" aria-label="预设专注时长" ${state.running ? 'hidden' : ''}>${[15, 25, 45].map((v) => `<button type="button" aria-pressed="${v === 25}" data-duration="${v}">${v} 分钟</button>`).join('')}</div><button class="primary-button" type="button" data-focus>${icon(state.running ? 'check' : 'play', 20)}${state.running ? '保存并结束' : '开始专注'}</button>${state.running ? '<button type="button" class="quiet-button focus-collapse" data-page="today">收起计时，继续运行</button>' : ''}<p class="tiny-note">${state.running ? '离开页面仍继续计时' : '分类、名称可在开始前补充'}</p></section></div><div><div class="section-head"><h2>今日专注</h2></div><div class="domain-metric">${state.empty ? '0' : '25'}<small>分钟 · ${state.empty ? '0' : '1'} 次已保存</small></div><p class="body-copy">计时中的会话不计入汇总。保存失败时保留会话，重试成功后再更新数据。</p></div></div>`
  )
}
function settingsPage() {
  return (
    heading('设置', '数据和选择，都由你掌握。') +
    `<div class="page-grid"><div><section class="settings-group"><h2>使用偏好</h2><button class="settings-row" type="button" data-switch-theme>${icon('sun')}<span><strong>主题外观</strong><small>${state.theme === 'light' ? '浅色' : '深色'}</small></span>${icon('arrow', 18)}</button><button class="settings-row" type="button" data-demo="第二轮原型将展示分类管理">${icon('bag')}<span><strong>分类管理</strong><small>收支、运动与专注</small></span>${icon('arrow', 18)}</button></section></div><div><section class="settings-group"><h2>数据与安全</h2><button class="settings-row" type="button" data-demo="原型不读取真实数据；正式导出流程将在第二轮审查">${icon('download')}<span><strong>导出备份</strong><small>给本机记录留一份副本</small></span>${icon('arrow', 18)}</button><button class="settings-row" type="button" data-demo="正式恢复流程：选择文件 → 校验预览 → 明确确认后原子替换">${icon('upload')}<span><strong>从备份恢复</strong><small>先检查，再确认替换</small></span>${icon('arrow', 18)}</button><p class="tiny-note">数据只保存在本机。清理浏览器或设备存储可能移除记录，请定期备份。</p></section></div></div>`
  )
}
function reportPage() {
  return `<button type="button" class="quiet-button report-return" data-report-return>← 返回${state.returnPage === 'today' ? '今天' : '记账'}</button>${heading('本月报表', '2026 年 9 月 · 仅已保存账目')}<section class="finance-overview"><p>本月支出</p><div class="domain-metric">${state.empty ? '尚无记录' : '¥ 1,286.00'}</div><p>收入 ${state.empty ? '—' : '¥ 8,000.00'} · 结余 ${state.empty ? '—' : '¥ 6,714.00'}</p></section><div class="section-head"><h2>分类支出</h2></div>${
    state.empty
      ? '<p class="micro-empty">本月还没有支出记录。</p>'
      : [
          ['餐饮', '¥ 642.00'],
          ['日用', '¥ 408.00'],
          ['交通', '¥ 236.00'],
        ]
          .map(
            ([label, value]) =>
              `<div class="category-row"><i class="category-dot"></i><span>${label}</span><strong>${value}</strong></div>`,
          )
          .join('')
  }<p class="tiny-note">原型展示合成数据及返回位置；完整日期筛选与明细将在第二轮完成。</p>`
}
function render() {
  document.body.dataset.direction = state.direction
  document.body.dataset.theme = state.theme
  document.querySelector('#direction').value = state.direction
  document.querySelector('#theme-toggle').textContent = state.theme === 'light' ? '深色' : '浅色'
  document.querySelector('#data-toggle').textContent = state.empty ? '看示例数据' : '看空状态'
  navigation()
  const pages = {
    today:
      state.direction === 'day'
        ? dayPage
        : state.direction === 'coordinate'
          ? coordinatePage
          : journalPage,
    finance: financePage,
    health: healthPage,
    focus: focusPage,
    settings: settingsPage,
    report: reportPage,
  }
  document.body.dataset.review = params.get('review') === '0' ? 'hidden' : 'visible'
  main.innerHTML = state.failed
    ? heading('本地记录') +
      '<div class="failure-banner" role="alert">记录暂时无法读取，数据没有被清空。<br>请重试读取；这里不会把读取失败显示成 0。<button type="button" class="primary-button" data-retry>重试读取</button></div>'
    : (pages[state.page] || dayPage)()
}
let feedbackTimeout
function feedback(message) {
  const element = document.querySelector('#feedback')
  element.textContent = message
  element.hidden = false
  clearTimeout(feedbackTimeout)
  feedbackTimeout = setTimeout(() => {
    element.hidden = true
  }, 3400)
}
function openEntry(kind) {
  state.entry = kind
  document.querySelector('.form-footer').hidden = false
  trace('entry.opened', kind)
  document.querySelector('#entry-title').textContent =
    { finance: '记一笔', weight: '记录体重', activity: '记录运动', habit: '创建习惯' }[kind] ||
    '记一笔'
  // The first-round form is intentionally memory-only; no prototype action can create personal records.
  document.querySelector('#entry-content').innerHTML =
    kind === 'finance'
      ? `<div class="entry-segment" aria-label="收支类型"><button type="button" data-type="expense" aria-pressed="true">支出</button><button type="button" data-type="income" aria-pressed="false">收入</button></div><label class="amount-field"><span>金额</span><span class="amount-entry"><b>¥</b><input name="amount" inputmode="decimal" aria-label="金额" required placeholder="0.00" autocomplete="off" /></span></label><span class="field-label">分类</span><div class="category-picker">${[
          ['food', '餐饮'],
          ['train', '交通'],
          ['bag', '日用'],
          ['cup', '咖啡'],
        ]
          .map(
            ([glyph, label], i) =>
              `<button type="button" data-category="${i}" aria-pressed="${i === 0}">${icon(glyph)}${label}</button>`,
          )
          .join(
            '',
          )}</div><label class="form-field"><span>日期</span><input type="date" value="2026-09-28" aria-label="日期" /></label><label class="form-field"><span>备注</span><input placeholder="选填，记下这一笔" aria-label="备注" /></label>`
      : kind === 'weight'
        ? `<label class="amount-field"><span>体重 · kg</span><span class="amount-entry"><input inputmode="decimal" required placeholder="0.0" aria-label="体重" /></span></label><label class="form-field"><span>日期</span><input type="date" value="2026-09-28" aria-label="日期" /></label><label class="form-field"><span>备注</span><input aria-label="备注" placeholder="选填" /></label>`
        : `<label class="form-field"><span>名称</span><input aria-label="名称" required placeholder="${kind === 'habit' ? '例如，每天阅读' : '例如，户外步行'}" /></label>${kind === 'activity' ? '<label class="form-field"><span>时长</span><input aria-label="运动时长" inputmode="numeric" required placeholder="分钟" /></label>' : '<p class="body-copy">第一轮展示创建入口；频率、颜色、归档和日历在第二轮完整原型补齐。</p>'}`
  if (!dialog.open) dialog.showModal()
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('button,a')
  if (!target) return
  if (target.dataset.page) {
    event.preventDefault()
    state.page = target.dataset.page
    trace('navigation.entered', state.page)
    render()
    window.scrollTo({ top: 0, behavior: 'instant' })
    return
  }
  if (target.dataset.entry) {
    openEntry(target.dataset.entry)
    return
  }
  if (target.hasAttribute('data-check')) {
    state.checked = !state.checked
    trace('habit.changed', state.checked ? 'checked' : 'unchecked')
    render()
    feedback(state.checked ? '示例习惯已完成' : '已撤销示例打卡')
    return
  }
  if (target.hasAttribute('data-simple-check')) {
    const checked = target.getAttribute('aria-pressed') !== 'true'
    target.setAttribute('aria-pressed', String(checked))
    target.innerHTML = icon(checked ? 'check' : 'add', 20)
    trace('habit.changed', checked ? 'checked' : 'unchecked')
    feedback(checked ? '示例习惯已完成' : '已撤销示例打卡')
    return
  }
  if (target.hasAttribute('data-habit-detail')) {
    feedback('查看习惯详情，不会改变打卡状态。完整日历将在第二轮展示。')
    trace('habit.detailopened', 'preview')
    return
  }
  if (target.hasAttribute('data-chooser')) {
    state.entry = 'chooser'
    document.querySelector('#entry-title').textContent = '添加记录'
    document.querySelector('.form-footer').hidden = true
    document.querySelector('#entry-content').innerHTML = quickActions()
      .replace('data-page="focus"', 'data-entry="habit"')
      .replace('去专注', '新习惯')
    dialog.showModal()
    trace('entry.chooseropened', 'types')
    return
  }
  if (target.hasAttribute('data-focus')) {
    state.running = !state.running
    trace('focus.changed', state.running ? 'running' : 'completed')
    render()
    feedback(state.running ? '原型计时已开始（展示固定剩余时间）' : '示例专注已保存')
    return
  }
  if (target.dataset.duration) {
    document
      .querySelectorAll('[data-duration]')
      .forEach((button) => button.setAttribute('aria-pressed', String(button === target)))
    document.querySelector('.focus-time').textContent = `${target.dataset.duration}:00`
    trace('focus.durationselected', 'preset')
    return
  }
  if (target.dataset.category) {
    document
      .querySelectorAll('[data-category]')
      .forEach((button) => button.setAttribute('aria-pressed', String(button === target)))
    trace('entry.categorychanged', 'selected')
    return
  }
  if (target.dataset.type) {
    state.transactionType = target.dataset.type
    document
      .querySelectorAll('[data-type]')
      .forEach((button) => button.setAttribute('aria-pressed', String(button === target)))
    trace('entry.typechanged', state.transactionType)
    return
  }
  if (target.dataset.date) {
    feedback('第一轮保留同一示例日以比较结构；第二轮支持日期浏览。')
    trace('date.previewrequested', 'synthetic')
    return
  }
  if (target.dataset.demo) {
    feedback(target.dataset.demo)
    trace('prototype.detailrequested', 'round-two')
    return
  }
  if (target.hasAttribute('data-report')) {
    state.returnPage = state.page
    state.returnScroll = window.scrollY
    state.page = 'report'
    trace('report.opened', 'current-month')
    render()
    window.scrollTo({ top: 0, behavior: 'instant' })
    return
  }
  if (target.hasAttribute('data-report-return')) {
    state.page = state.returnPage
    render()
    window.scrollTo({ top: state.returnScroll, behavior: 'instant' })
    trace('report.returned', state.returnPage)
    return
  }
  if (target.id === 'failure-toggle') {
    state.failed = !state.failed
    trace('scenario.changed', state.failed ? 'read-failed' : 'ready')
    render()
    return
  }
  if (target.hasAttribute('data-retry')) {
    state.failed = false
    trace('read.retried', 'ready')
    render()
    feedback('合成读取已恢复')
    return
  }
  if (target.id === 'theme-toggle' || target.hasAttribute('data-switch-theme')) {
    state.theme = state.theme === 'light' ? 'dark' : 'light'
    trace('appearance.changed', state.theme)
    render()
    return
  }
  if (target.id === 'data-toggle') {
    state.empty = !state.empty
    trace('scenario.changed', state.empty ? 'empty' : 'populated')
    render()
    return
  }
  if (target.id === 'cancel-entry') {
    dialog.close()
    trace('entry.closed', 'cancelled')
  }
})
document.querySelector('#direction').addEventListener('change', (event) => {
  state.direction = event.target.value
  state.page = 'today'
  trace('direction.changed', state.direction)
  render()
})
document.querySelector('#entry-form').addEventListener('submit', (event) => {
  event.preventDefault()
  trace('entry.submitted', 'synthetic-only')
  dialog.close()
  feedback('示例记录已保存 · 未写入实际数据库')
})
dialog.addEventListener('cancel', () => trace('entry.closed', 'escape'))
window.addEventListener('error', () =>
  console.warn('[lifeindex.design-prototype]', {
    operation: 'runtime.failed',
    failureClass: 'Prototype',
    synthetic: true,
  }),
)
trace('prototype.entered', state.direction)
render()
