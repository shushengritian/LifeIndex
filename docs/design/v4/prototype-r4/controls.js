/* global R3, state, safe, icon, icons, render, trace, today, toast, navigation: writable */
// R4 changes the task affordance itself while reusing the isolated R3 synthetic model.
const controlsVariant = new URLSearchParams(location.search).get('controls') || 'surface'
const activeVariant = ['surface', 'paper', 'slide'].includes(controlsVariant)
  ? controlsVariant
  : 'surface'
document.body.dataset.controls = activeVariant
icons.write = '<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 14Z"/><path d="M12 20h8"/>'
icons.add = icons.write
icons.check = icons.leaf
icons.today =
  '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>'

const originalNavigation = navigation
navigation = function controlNavigation() {
  originalNavigation()
  // The composer is named by its task; its drawn pen is supporting identity rather than the whole control.
  document.querySelectorAll('[data-compose]').forEach((button) => {
    button.setAttribute('aria-label', '留一笔，选择记录类型')
    if (button.classList.contains('dock-compose'))
      button.innerHTML = `${icon('write', 22)}<span>留一笔</span>`
    else if (button.classList.contains('rail-compose'))
      button.innerHTML = `${icon('write', 20)}<span>留一笔</span>`
  })
  // The wrapper provides a content-width query: large text can separate the action row from navigation without shrinking labels.
  const dock = document.querySelector('.mobile-dock')
  const grid = document.createElement('div')
  grid.className = 'dock-grid'
  grid.append(dock.querySelector('.dock-compose'), ...dock.querySelectorAll('.dock-link'))
  dock.replaceChildren(grid)
}

R3.habitRows = function controlHabitRows(items) {
  return items
    .map((habit) => {
      const completed = this.checked(habit.id)
      const name = safe(habit.title)
      const action = `${completed ? '撤销完成' : '完成'}${name}`
      const hint = completed ? '今天已记下 · 点按撤销' : '今天做过了？点按记下'
      const schedule =
        state.page === 'health'
          ? `<small class="habit-plan">${this.schedule(habit)}${!habit.paused && !habit.weekdays.includes(this.weekday(today)) ? ' · 今天非计划日' : ''}</small>`
          : ''
      if (activeVariant === 'paper')
        return `<div class="habit-row control-row" data-completed="${completed}"><button class="habit-name" type="button" data-habit-detail="${habit.id}"><span><strong>${name}</strong><small>${this.schedule(habit)}</small></span></button><button class="habit-tick paper-action" type="button" data-habit="${habit.id}" aria-pressed="${completed}" aria-label="${action}"><strong>${completed ? '已记下' : '做到了'}</strong><small>${completed ? '点按撤销' : '记录完成'}</small></button></div>`
      const sliding = activeVariant === 'slide'
      return `<div class="habit-row control-row" data-completed="${completed}"><div class="${sliding ? 'slide-track' : 'surface-track'}">${sliding ? `<span class="slide-result" aria-hidden="true">${completed ? '撤销这次' : '为今天留一笔'}</span>` : ''}<button class="habit-surface ${sliding ? 'slide-surface' : ''}" type="button" data-habit="${habit.id}" aria-pressed="${completed}" aria-label="${action}"><span class="surface-copy"><strong>${name}</strong>${schedule}<small>${sliding && !completed ? '点按，或向右轻推完成' : hint}</small></span><span class="surface-state" aria-hidden="true">${completed ? '已完成' : sliding ? '轻推' : '记下'}</span></button></div><button class="habit-info" type="button" data-habit-detail="${habit.id}" aria-label="查看${name}详情">详情</button></div>`
    })
    .join('')
}

const originalToggleHabit = R3.toggleHabit.bind(R3)
R3.toggleHabit = function controlToggleHabit(id, date, detail = false) {
  trace('control.activation', { variant: activeVariant, operationKind: 'habit-completion' })
  if (this.consumeWriteFailure()) {
    toast('这次没有记下，请重试。原来的完成状态仍保留。')
    trace('control.failed', { variant: activeVariant, failureClass: 'simulated-write' })
    return
  }
  originalToggleHabit(id, date, detail)
  const focusedAction = document.querySelector(`[data-habit="${CSS.escape(id)}"]`)
  const dock = document.querySelector('.mobile-dock')
  if (focusedAction && focusedAction === document.activeElement && dock?.getClientRects().length) {
    // Text enlargement can move a focused row behind the fixed dock after its state changes.
    const bounds = focusedAction.getBoundingClientRect()
    if (bounds.bottom > dock.getBoundingClientRect().top || bounds.top < 0)
      focusedAction.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
}

// Sliding is an optional shortcut. Pointer cancellation, vertical scrolling and simple taps never depend on it.
let controlDrag
let suppressedPointerClickUntil = 0
document.addEventListener(
  'click',
  (event) => {
    if (
      event.detail !== 0 &&
      performance.now() < suppressedPointerClickUntil &&
      event.target.closest('[data-habit]')
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  },
  true,
)
document.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('.slide-surface')
  if (!button || !event.isPrimary || event.button !== 0 || controlDrag) return
  controlDrag = {
    button,
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    distance: 0,
    captured: false,
  }
})
document.addEventListener('pointermove', (event) => {
  const drag = controlDrag
  if (!drag || drag.id !== event.pointerId) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  if (!drag.captured) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      controlDrag = undefined
      return
    }
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return
    drag.captured = true
    drag.button.setPointerCapture(event.pointerId)
    drag.button.dataset.dragging = 'true'
    trace('control.dragstarted', { variant: activeVariant })
  }
  drag.distance = Math.max(0, Math.min(88, dx))
  drag.button.style.transform = `translateX(${drag.distance}px)`
})
function finishControlDrag(event, cancelled) {
  const drag = controlDrag
  if (!drag || drag.id !== event.pointerId) return
  controlDrag = undefined
  if (drag.captured) {
    if (drag.button.hasPointerCapture(event.pointerId))
      drag.button.releasePointerCapture(event.pointerId)
    suppressedPointerClickUntil = performance.now() + 400
    delete drag.button.dataset.dragging
    drag.button.style.transform = ''
    if (!cancelled && drag.distance >= 56) {
      trace('control.dragcompleted', { variant: activeVariant })
      R3.toggleHabit(drag.button.dataset.habit, today)
    } else
      trace('control.dragcancelled', {
        variant: activeVariant,
        reason: cancelled ? 'pointer-cancel' : 'threshold',
      })
  }
}
document.addEventListener('pointerup', (event) => finishControlDrag(event, false))
document.addEventListener('pointercancel', (event) => finishControlDrag(event, true))
render()
trace('controls.entered', { variant: activeVariant, storage: 'synthetic-memory' })
