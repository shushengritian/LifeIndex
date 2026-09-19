'use strict'

// Review fixtures deliberately use one fixed zone; production's multi-zone/DST engine is unchanged.
const cessationZone = 'Asia/Shanghai'
const cessationNow = Date.parse('2026-09-18T12:00:00+08:00')
let cessationSelected = '2026-09-18',
  cessationMonth = '2026-09',
  cessationManage = false
let cessationHidden = false,
  cessationPlanId = 1,
  cessationNextId = 20,
  cessationDraftId = null
let cessationRestDeadline = 0
const cessationPlans = [
  {
    id: 1,
    start: Date.parse('2026-09-07T08:00:00+08:00'),
    end: null,
    reason: '给自己的日常多一点空间',
    baseline: { daily: 10, pack: 20, price: 3000 },
  },
]
const cessationEvents = [
  {
    id: 1,
    planId: 1,
    kind: 'smoking',
    at: Date.parse('2026-09-11T13:00:00+08:00'),
    count: 2,
    trigger: 'meal',
  },
  {
    id: 2,
    planId: 1,
    kind: 'smoking',
    at: Date.parse('2026-09-14T18:00:00+08:00'),
    count: 1,
    trigger: 'stress',
  },
  {
    id: 3,
    planId: 1,
    kind: 'craving',
    at: Date.parse('2026-09-17T15:00:00+08:00'),
    outcome: 'relieved',
    trigger: 'boredom',
  },
]
const cessationDays = ['08', '09', '12', '15', '16'].map((day) => ({
  planId: 1,
  date: '2026-09-' + day,
  kind: 'fullDay',
}))
const cessationTriggers = {
  meal: '饭后',
  stress: '压力',
  social: '社交',
  boredom: '无聊',
  other: '其他',
}
// URL values select fixed synthetic scenarios only, never private dates or record payloads.
const cessationScenario = new URLSearchParams(location.search).get('cessation')
if (cessationScenario === 'empty') {
  cessationPlans.length = 0
  cessationEvents.length = 0
  cessationDays.length = 0
}
if (cessationScenario === 'future') {
  cessationPlans[0].start = Date.parse('2026-09-20T08:00:00+08:00')
  cessationEvents.length = 0
  cessationDays.length = 0
}
if (cessationScenario === 'ended') cessationPlans[0].end = Date.parse('2026-09-17T20:00:00+08:00')
function cessationDate(at) {
  return new Date(at + 8 * 3600000).toISOString().slice(0, 10)
}
function cessationInput(at) {
  return new Date(at + 8 * 3600000).toISOString().slice(0, 16)
}
function cessationBoundary(date) {
  return Date.parse(date + 'T00:00:00+08:00')
}
function cessationPlan() {
  return cessationPlans.find((plan) => plan.id === cessationPlanId) || cessationPlans.at(-1)
}
function cessationState(plan) {
  return !plan
    ? '尚未开始'
    : plan.end !== null
      ? plan.end === plan.start
        ? '已取消'
        : '已结束'
      : plan.start > cessationNow
        ? '准备中'
        : '进行中'
}
function cessationSmoking(plan, date) {
  return cessationEvents.filter(
    (e) => e.planId === plan.id && e.kind === 'smoking' && cessationDate(e.at) === date,
  )
}
function cessationStatus(plan, date) {
  if (date > cessationDate(cessationNow)) return '未来日期'
  if (
    plan.end === plan.start ||
    cessationBoundary(habitDate(date, 1)) <= plan.start ||
    cessationBoundary(date) > Math.min(cessationNow, plan.end ?? cessationNow)
  )
    return '计划范围外'
  if (cessationSmoking(plan, date).length) return '有吸烟记录'
  const day = cessationDays.find((d) => d.planId === plan.id && d.date === date)
  if (day?.kind === 'fullDay') return '全天未吸烟'
  if (day?.kind === 'snapshot')
    return date === cessationDate(cessationNow) ? '截至确认时未吸烟' : '快照待确认'
  return '尚未确认'
}
function cessationFullEligible(plan, date) {
  const start = cessationBoundary(date),
    end = cessationBoundary(habitDate(date, 1))
  return (
    start >= plan.start &&
    end <= Math.min(cessationNow, plan.end ?? cessationNow) &&
    !cessationSmoking(plan, date).length
  )
}
function cessationSummary(plan) {
  const end = Math.min(cessationNow, plan.end ?? cessationNow),
    days = cessationDays.filter((d) => d.planId === plan.id),
    events = cessationEvents.filter((e) => e.planId === plan.id)
  const full = days.filter((d) => d.kind === 'fullDay').length
  const covered = new Set([...days.map((d) => d.date), ...events.map((e) => cessationDate(e.at))])
    .size
  // Starting now reaches a partial first day; only future/cancelled plans have no reached dates.
  const reached =
    end < plan.start || plan.end === plan.start
      ? 0
      : Math.round(
          (cessationBoundary(cessationDate(end)) - cessationBoundary(cessationDate(plan.start))) /
            86400000,
        ) + 1
  const lastSmoke = events.filter((e) => e.kind === 'smoking').sort((a, b) => b.at - a.at)[0]
  return {
    full,
    covered,
    reached,
    elapsed: Math.max(0, Math.floor((end - (lastSmoke?.at ?? plan.start)) / 3600000)),
    lastSmoke,
    estimate: plan.baseline
      ? Math.round((full * plan.baseline.daily * plan.baseline.price) / plan.baseline.pack)
      : null,
  }
}
function cessationCard() {
  if (cessationHidden) return ''
  // The health summary prioritizes the ongoing plan, independent of which archive was inspected.
  const plan = cessationPlans.find((p) => p.end === null) || cessationPlans.at(-1)
  return `<section class="health-group"><button class="setting-row" data-cessation="open">${glyph('leaf', 'green')}<span class="meta"><strong>戒烟</strong><small>${plan ? cessationState(plan) + ' · ' + cessationStatus(plan, cessationDate(cessationNow)) : '按需开启，记录自己的节奏'}</small></span>${icon('right', true)}</button></section>`
}
function cessationPage() {
  if (cessationManage) {
    cessationManagement()
    return
  }
  const plan = cessationPlan(),
    active = cessationState(plan) === '进行中'
  const head = `<header class="detail-head"><button class="iconbtn" data-cessation="back" aria-label="返回健康">${icon('left')}</button><h1>戒烟</h1><button class="iconbtn push-right" data-cessation="manage" aria-label="管理戒烟计划">${icon('settings')}</button></header>`
  if (!plan) {
    screen.innerHTML =
      head +
      `<section class="cessation-empty">${glyph('leaf', 'green')}<h2>从一个开始时间出发</h2><p class="detail-copy">按需记录，不用一次准备好所有事情。</p><button class="primary" data-cessation="new-plan">${icon('plus')} 开始计划</button></section><p class="helper">原型只保存合成内存记录，不提供医学判断。</p>`
    return
  }
  const summary = cessationSummary(plan),
    status = cessationStatus(plan, cessationSelected)
  const selectedEvents = cessationEvents
    .filter((e) => e.planId === plan.id && cessationDate(e.at) === cessationSelected)
    .sort((a, b) => b.at - a.at)
  const week = Array.from({ length: 7 }, (_, i) => habitDate(cessationDate(cessationNow), i - 6))
  screen.innerHTML =
    head +
    `<section class="cessation-intro"><div class="row between"><h2>${cessationState(plan)}</h2>${glyph('leaf', 'green')}</div><p>${plan.start > cessationNow ? '开始于 ' + cessationInput(plan.start).replace('T', ' ') : `${summary.lastSmoke ? '距最近一次已记录吸烟' : '距计划开始'} ${Math.floor(summary.elapsed / 24)} 天 ${summary.elapsed % 24} 小时`}</p><p class="helper">按记录计算，不等于连续无烟天数。${plan.end !== null ? '已停止向此计划新增记录。' : ''}</p>${plan.reason ? `<p class="cessation-reason">${escapeHTML(plan.reason)}</p>` : ''}<p class="helper">日历与输入时区：${cessationZone} · 演示时间 9 月 18 日 12:00</p></section>
  ${active ? `<section class="cessation-primary"><button class="primary" data-cessation="snapshot" ${cessationSmoking(plan, cessationDate(cessationNow)).length ? 'disabled' : ''}>${icon('check', true)} 截至现在未吸烟</button><p class="helper">只记录此刻，不代表全天。</p><div class="cessation-action-pair"><button class="secondary" data-cessation="smoking">${icon('plus', true)} 记录吸烟</button><button class="secondary" data-cessation="craving">${icon('leaf', true)} 记录烟瘾</button></div></section>` : ''}
  <section><div class="sectionhead"><h2>最近 7 天</h2><button class="subtle-button" data-cessation="calendar">月历 ${icon('right', true)}</button></div><div class="cessation-week">${week.map((date) => `<button data-cessation="day" data-date="${date}" aria-pressed="${date === cessationSelected}" aria-label="${date}，${cessationStatus(plan, date)}"><span>${Number(date.slice(-2))}</span><small>${{ 全天未吸烟: '全天', 有吸烟记录: '吸烟', 截至确认时未吸烟: '快照', 快照待确认: '待确认' }[cessationStatus(plan, date)] || '未确认'}</small></button>`).join('')}</div><div id="cessation-calendar" ${cessationCalendarOpen ? '' : 'hidden'}>${cessationCalendar(plan)}</div></section>
  <section class="cessation-day"><div class="sectionhead"><h2>${cessationSelected.slice(5).replace('-', ' 月 ')} 日</h2><small>${status}</small></div>${cessationFullEligible(plan, cessationSelected) && status !== '全天未吸烟' ? '<button class="secondary full" data-cessation="full-day">确认这一天全天未吸烟</button>' : ''}${cessationDays.some((d) => d.planId === plan.id && d.date === cessationSelected) ? '<button class="subtle-button" data-cessation="undo-day">撤销这一天的确认</button>' : ''}${selectedEvents.map((e) => `<button class="record" data-cessation="edit-event" data-id="${e.id}">${glyph(e.kind === 'smoking' ? 'activity' : 'leaf', e.kind === 'smoking' ? 'orange' : 'green')}<span class="meta"><strong>${e.kind === 'smoking' ? '吸烟 · ' + e.count + ' 支' : '烟瘾 · ' + (e.outcome === 'relieved' ? '缓解了' : '还想抽')}</strong><small>${cessationInput(e.at).slice(11)} · ${cessationTriggers[e.trigger] || '未填写诱因'}</small></span>${icon('right', true)}</button>`).join('') || '<p class="empty">这一天没有事件记录。没有记录不等于未吸烟。</p>'}</section>
  <dl class="habit-stats cessation-stats"><div><dt>确认完整无烟日</dt><dd>${summary.full}<small> 天</small></dd></div><div><dt>记录覆盖</dt><dd>${summary.covered}<small> / ${summary.reached} 天</small></dd></div>${summary.estimate !== null ? `<div><dt>按完整日估算节省</dt><dd><small>¥ </small>${money(summary.estimate)}</dd></div>` : ''}</dl><p class="helper">估算不写入记账。未记录和过去的快照不算完整无烟日。</p><details class="focus-demo"><summary>原型验证工具</summary><button class="subtle-button" data-action="fail-write">演示下一次写入失败</button></details>`
}
let cessationCalendarOpen = false
function cessationCalendar(plan) {
  const [y, m] = cessationMonth.split('-').map(Number),
    offset = (new Date(y, m - 1, 1).getDay() + 6) % 7,
    count = new Date(y, m, 0).getDate()
  return `<div class="monthbar"><strong>${y} 年 ${m} 月</strong><div class="monthbuttons"><button class="iconbtn" data-cessation="month" data-step="-1" aria-label="戒烟上个月">${icon('left')}</button><button class="iconbtn" data-cessation="month" data-step="1" aria-label="戒烟下个月">${icon('right')}</button></div></div><div class="weekdays">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span>${d}</span>`).join('')}</div><div class="days">${'<span></span>'.repeat(offset)}${Array.from(
    { length: count },
    (_, i) => {
      const date = cessationMonth + '-' + String(i + 1).padStart(2, '0')
      return `<button class="day" data-cessation="day" data-date="${date}" aria-pressed="${date === cessationSelected}" aria-label="月历 ${date}，${cessationStatus(plan, date)}"><span>${i + 1}</span><small>${{ 全天未吸烟: '全天', 有吸烟记录: '吸烟', 截至确认时未吸烟: '快照' }[cessationStatus(plan, date)] || '·'}</small></button>`
    },
  ).join('')}</div>`
}
function cessationManagement() {
  const plan = cessationPlan(),
    open = cessationPlans.some((p) => p.end === null)
  screen.innerHTML = `<header class="detail-head"><button class="iconbtn" data-cessation="overview" aria-label="返回戒烟">${icon('left')}</button><h1>计划管理</h1></header><p class="detail-copy">结束与隐藏都保留历史，不代表戒烟结果。</p><label class="field"><span>查看计划</span><select id="cessation-plan-select">${cessationPlans.map((p) => `<option value="${p.id}" ${p.id === plan?.id ? 'selected' : ''}>${cessationInput(p.start).replace('T', ' ')} · ${cessationState(p)}</option>`).join('') || '<option>尚无计划</option>'}</select></label>${plan ? `<dl class="backup-facts"><div><dt>开始</dt><dd>${cessationInput(plan.start).replace('T', ' ')}</dd></div><div><dt>时区</dt><dd>${cessationZone}</dd></div><div><dt>状态</dt><dd>${cessationState(plan)}</dd></div></dl><button class="setting-row" data-cessation="reason">${glyph('book', 'purple')}<span class="meta"><strong>编辑戒烟原因</strong><small>开始时间、时区与估算基线固定</small></span>${icon('right', true)}</button>${plan.end === null ? `<button class="secondary full danger" data-cessation="end">${plan.start > cessationNow ? '取消未来计划' : '结束当前计划'}</button>` : ''}` : ''}${!open ? '<button class="primary full" data-cessation="new-plan">开始新计划</button>' : ''}<button class="secondary full" data-cessation="hide">${cessationHidden ? '恢复健康页入口' : '隐藏健康页入口'}</button><p class="helper">隐藏不结束计划、不删除历史；可从设置的“其他”再次打开。</p><button class="subtle-button" data-action="fail-write">演示下一次写入失败</button>`
}
function openCessationEditor(kind, entry = null) {
  const plan = cessationPlan()
  draftKind = 'cessation-' + kind
  editingId = entry?.id ?? null
  cessationDraftId = entry?.id ?? ++cessationNextId
  editorScroll = screen.scrollTop
  cessationRestDeadline = 0
  let body
  const reason = `<label class="field"><span>为什么想戒烟 · 可选</span><input name="reason" maxlength="80" value="${escapeHTML(kind === 'reason' ? plan?.reason || '' : '')}"></label>`
  if (kind === 'plan')
    body = `<p class="detail-copy">只需要一个开始时间，其他可选。保存后起点与估算基线固定。</p><label class="field"><span>开始日期与时间 · ${cessationZone}</span><input name="at" type="datetime-local" value="${cessationInput(cessationNow)}"></label><details class="focus-extras"><summary>原因与估算 · 可选</summary>${reason}<label class="field"><span>原日均支数</span><input name="daily" inputmode="numeric" placeholder="1–100"></label><label class="field"><span>每包支数</span><input name="pack" inputmode="numeric" placeholder="1–100"></label><label class="field"><span>每包价格 · 元</span><input name="price" inputmode="decimal" placeholder="最多两位小数"></label><p class="helper">估算仅使用确认完整日，不生成账目。</p></details>`
  else if (kind === 'reason') body = reason
  else {
    body =
      kind === 'smoking'
        ? '<p class="detail-copy">一次记录不会清空历史。保存或移动记录会撤销目的日期的无烟确认。</p><label class="field"><span>这次吸了几支</span><input name="count" inputmode="numeric" value="' +
          (entry?.count || 1) +
          '"></label>'
        : `<section class="cessation-rest"><h3>先给自己一点空间</h3><p id="cessation-rest-clock" role="timer">03:00</p><button type="button" class="secondary" data-cessation="rest">开始 3 分钟小休息</button><p class="helper">可随时记录感受，不是治疗或效果保证。</p></section><label class="field"><span>这次的感受</span><select name="outcome"><option value="relieved" ${entry?.outcome === 'relieved' ? 'selected' : ''}>缓解了</option><option value="still" ${entry?.outcome === 'still' ? 'selected' : ''}>还想抽</option></select></label>`
    body += `<label class="field"><span>日期与时间 · ${cessationZone}</span><input name="at" type="datetime-local" value="${cessationInput(entry?.at ?? cessationNow)}" ${kind === 'craving' ? 'readonly' : ''}></label><label class="field"><span>诱因 · 可选</span><select name="trigger"><option value="">不填写</option>${Object.entries(
      cessationTriggers,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}" ${entry?.trigger === id ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select></label>${entry ? '<button type="button" class="subtle-button danger" data-cessation="delete-event">删除这条记录</button>' : ''}`
  }
  form.innerHTML = `<div class="sheet-header"><h2 id="editor-title">${{ plan: '开始戒烟计划', reason: '编辑戒烟原因', smoking: '吸烟记录', craving: '烟瘾记录' }[kind]}</h2><button type="button" class="iconbtn" data-action="close-editor" aria-label="关闭表单">${icon('close')}</button></div><div class="sheet-body">${body}<p id="form-error" class="error" role="alert"></p><p class="helper">原型固定时区输入 · 仅内存保存</p><button type="button" class="subtle-button" data-action="fail-write">演示下一次写入失败</button></div><div class="sheet-footer"><button class="primary" type="submit">${kind === 'plan' ? '开始计划' : '保存记录'}</button></div>`
  initialDraft = draftSnapshot()
  editor.showModal()
  ;(form.querySelector('input:not([readonly])') || form.querySelector('select')).focus()
  log('cessation.editor_opened', draftKind)
}
async function cessationWrite(operation, mutate) {
  if (busy) {
    log('cessation.busy', 'health')
    return false
  }
  busy = true
  const controls = [...document.querySelectorAll('button,input,select')]
  controls.forEach((e) => (e.disabled = true))
  log('cessation.' + operation + '.started', 'health')
  try {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (failNext) {
      failNext = false
      throw new Error('preview_failure')
    }
    mutate()
    log('cessation.' + operation + '.saved', 'health')
    return true
  } catch {
    if (editor.open) error('未能保存，记录和输入已保留。请重试。')
    else toast('操作未完成，原记录保持不变。请重试。')
    log('cessation.' + operation + '.failed', 'health')
    return false
  } finally {
    busy = false
    controls.forEach((e) => (e.disabled = false))
  }
}
function applyCessationEvent(candidate) {
  const index = cessationEvents.findIndex((e) => e.id === candidate.id)
  if (index < 0) cessationEvents.push(candidate)
  else cessationEvents[index] = candidate
  // Moving/deleting never recreates an old assertion. Only destination smoking revokes a confirmation.
  if (candidate.kind === 'smoking')
    for (let i = cessationDays.length - 1; i >= 0; i--)
      if (
        cessationDays[i].planId === candidate.planId &&
        cessationDays[i].date === cessationDate(candidate.at)
      )
        cessationDays.splice(i, 1)
}
async function saveCessation(data) {
  const kind = draftKind.slice(10),
    plan = cessationPlan(),
    at = Date.parse((data.at || '') + ':00+08:00')
  let baseline = null
  if (kind === 'plan' || kind === 'smoking' || kind === 'craving') {
    if (!Number.isFinite(at) || cessationInput(at) !== data.at) {
      error('请选择有效日期与时间。', 'at')
      return
    }
    if (
      kind !== 'plan' &&
      (!plan ||
        at < plan.start ||
        at > Math.min(cessationNow, plan.end ?? cessationNow) ||
        (editingId === null && cessationState(plan) !== '进行中'))
    ) {
      error('记录须位于计划范围内且不能晚于演示当前时间。', 'at')
      return
    }
  }
  if (kind === 'plan') {
    // A cancelled future plan has an empty interval, so it cannot block a new plan starting now.
    if (
      cessationPlans.some((p) => p.end === null) ||
      cessationPlans.some((p) => p.end !== p.start && p.end > at)
    ) {
      error('已有未结束计划，或开始时间与历史计划重叠。', 'at')
      return
    }
    if (data.daily || data.pack || data.price) {
      const validCount = (value) =>
        /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 100
      if (
        !validCount(data.daily) ||
        !validCount(data.pack) ||
        !/^\d{1,4}(\.\d{1,2})?$/.test(data.price || '') ||
        Number(data.price) <= 0
      ) {
        error('估算需要完整填写：日均/每包 1–100 支，价格 0.01–9999.99 元。')
        return
      }
      const [whole, fraction = ''] = data.price.split('.')
      baseline = {
        daily: Number(data.daily),
        pack: Number(data.pack),
        price: Number(whole) * 100 + Number(fraction.padEnd(2, '0')),
      }
    }
  }
  if (
    kind === 'smoking' &&
    (!/^\d{1,3}$/.test(data.count) || Number(data.count) < 1 || Number(data.count) > 100)
  ) {
    error('请输入 1–100 的整数支数。', 'count')
    return
  }
  const save = async () => {
    form.querySelector('[type=submit]').textContent = '保存中…'
    const saved = await cessationWrite(kind, () => {
      if (kind === 'plan') {
        cessationPlans.push({
          id: cessationDraftId,
          start: at,
          end: null,
          reason: data.reason.trim(),
          baseline,
        })
        cessationPlanId = cessationDraftId
        cessationManage = false
      } else if (kind === 'reason') plan.reason = data.reason.trim()
      else
        applyCessationEvent({
          id: cessationDraftId,
          planId: plan.id,
          kind,
          at,
          trigger: data.trigger,
          ...(kind === 'smoking' ? { count: Number(data.count) } : { outcome: data.outcome }),
        })
    })
    if (saved) {
      editor.close()
      draftKind = ''
      cessationRestDeadline = 0
      if (kind === 'smoking' || kind === 'craving') {
        cessationSelected = cessationDate(at)
        cessationMonth = cessationSelected.slice(0, 7)
      }
      render()
      screen.scrollTop = editorScroll
      toast('已保存 · 仅当前原型有效')
    } else form.querySelector('[type=submit]').textContent = '重试保存'
  }
  if (
    kind === 'smoking' &&
    cessationDays.some((d) => d.planId === plan.id && d.date === cessationDate(at))
  )
    ask(
      '撤销这一天的无烟确认？',
      '这条吸烟记录与目的日期确认冲突。保存成功后会撤销该日确认；失败保持原状。',
      '保存并撤销确认',
      save,
      '返回编辑',
    )
  else await save()
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-cessation]')
  if (!button || button.disabled || busy) return
  const action = button.dataset.cessation,
    plan = cessationPlan()
  log('cessation.ui.' + action, 'health')
  if (action === 'open') {
    healthOverviewScroll = screen.scrollTop
    view = 'health'
    healthSection = 'cessation'
    cessationManage = false
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
  if (action === 'manage' || action === 'overview') {
    cessationManage = action === 'manage'
    render()
    screen.scrollTop = 0
    return
  }
  if (action === 'new-plan') {
    openCessationEditor('plan')
    return
  }
  if (action === 'reason' || action === 'smoking' || action === 'craving') {
    openCessationEditor(action)
    return
  }
  if (action === 'rest') {
    cessationRestDeadline = Date.now() + 180000
    button.textContent = '重新计时'
    form.insertAdjacentHTML('beforeend', '<input type="hidden" name="restStarted" value="true">')
    log('cessation.rest_started', 'health')
    return
  }
  if (action === 'edit-event') {
    const entry = cessationEvents.find((e) => e.id === Number(button.dataset.id))
    if (entry) openCessationEditor(entry.kind, entry)
    return
  }
  if (action === 'calendar') {
    cessationCalendarOpen = !cessationCalendarOpen
    render()
    return
  }
  if (action === 'day') {
    cessationSelected = button.dataset.date
    render()
    return
  }
  if (action === 'month') {
    const next = new Date(cessationMonth + '-15T12:00:00')
    next.setMonth(next.getMonth() + Number(button.dataset.step))
    cessationMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    render()
    return
  }
  if (action === 'snapshot' || action === 'full-day') {
    const date = action === 'snapshot' ? cessationDate(cessationNow) : cessationSelected
    if (
      !plan ||
      cessationSmoking(plan, date).length ||
      (action === 'snapshot'
        ? cessationState(plan) !== '进行中'
        : !cessationFullEligible(plan, date))
    ) {
      toast('当前日期不符合确认条件')
      log('cessation.confirm_ineligible', 'health')
      return
    }
    ask(
      action === 'snapshot' ? '截至现在未吸烟？' : '确认全天未吸烟？',
      action === 'snapshot'
        ? '仅确认今天截至演示当前时刻，不能算作完整无烟日。'
        : '仅当这一天已完整结束且在计划范围内，才确认全天。',
      '确认记录',
      async () => {
        if (
          await cessationWrite('confirm', () => {
            const existing = cessationDays.find((d) => d.planId === plan.id && d.date === date)
            if (existing) existing.kind = action === 'snapshot' ? 'snapshot' : 'fullDay'
            else
              cessationDays.push({
                planId: plan.id,
                date,
                kind: action === 'snapshot' ? 'snapshot' : 'fullDay',
              })
          })
        ) {
          cessationSelected = date
          render()
          toast('已确认 · 合成记录')
        }
      },
      '返回',
    )
    return
  }
  if (action === 'end')
    ask(
      plan.start > cessationNow ? '取消未来计划？' : '结束当前计划？',
      '停止向该计划新增记录，保留所有历史，不代表医学成功。',
      plan.start > cessationNow ? '取消计划' : '结束计划',
      async () => {
        if (
          await cessationWrite('end', () => {
            plan.end = Math.max(cessationNow, plan.start)
          })
        ) {
          render()
          toast('计划状态已更新，历史保留')
        }
      },
      '继续计划',
    )
  if (action === 'hide')
    ask(
      cessationHidden ? '恢复健康页入口？' : '隐藏健康页入口？',
      '只改变入口显示，计划和历史都保留。可从设置的其他分组再次打开。',
      '确认',
      async () => {
        if (
          await cessationWrite('visibility', () => {
            cessationHidden = !cessationHidden
          })
        ) {
          render()
          toast('入口显示已更新')
        }
      },
      '返回',
    )
  if (action === 'undo-day')
    ask(
      '撤销这一天的确认？',
      '撤销后按现有事件显示状态，不自动认定全天未吸烟。',
      '撤销确认',
      async () => {
        if (
          await cessationWrite('undo', () => {
            const i = cessationDays.findIndex(
              (d) => d.planId === plan.id && d.date === cessationSelected,
            )
            if (i >= 0) cessationDays.splice(i, 1)
          })
        ) {
          render()
          toast('确认已撤销')
        }
      },
      '保留确认',
    )
  if (action === 'delete-event')
    ask(
      '删除这条记录？',
      '删除不可撤销；删除吸烟记录不会自动恢复无烟确认。未保存的编辑将放弃。',
      '删除记录',
      async () => {
        if (
          await cessationWrite('delete', () => {
            const i = cessationEvents.findIndex((e) => e.id === editingId)
            if (i < 0) throw new Error('missing_record')
            cessationEvents.splice(i, 1)
          })
        ) {
          editor.close()
          draftKind = ''
          render()
          toast('已删除，不自动恢复无烟确认')
        }
      },
      '保留记录',
    )
})
document.addEventListener('change', (event) => {
  if (event.target.id === 'cessation-plan-select') {
    cessationPlanId = Number(event.target.value)
    render()
    log('cessation.plan_selected', 'health')
  }
})
setInterval(() => {
  const clock = document.querySelector('#cessation-rest-clock')
  if (clock && cessationRestDeadline)
    clock.textContent = focusClock(
      Math.max(0, Math.ceil((cessationRestDeadline - Date.now()) / 1000)),
    )
}, 1000)
