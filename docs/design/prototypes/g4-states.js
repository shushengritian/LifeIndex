/* Design-only state machine: no Service Worker, storage, network, or external action payload. */
function deliveryState() {
  return {
    offline: false,
    dirty: false,
    saving: false,
    update: 'ready',
    updateFail: false,
  }
}
function deliveryTransition(s, event) {
  const next = { ...s }
  // Busy states reject competing controls; a result event alone completes the pending operation.
  if (s.update === 'busy' && event !== 'update-result') return next
  switch (event) {
    case 'network-toggle':
      next.offline = !s.offline
      break
    case 'dirty':
      next.dirty = !s.dirty
      break
    case 'saving':
      next.saving = !s.saving
      break
    case 'update-fail':
      next.updateFail = !s.updateFail
      break
    case 'update':
      if (!s.dirty && !s.saving && !s.offline && ['ready', 'failed'].includes(s.update))
        next.update = 'busy'
      break
    case 'update-result':
      if (s.update === 'busy') {
        next.update = s.updateFail ? 'failed' : 'done'
        next.updateFail = false
      }
      break
    case 'later':
      if (['ready', 'failed'].includes(s.update)) next.update = 'deferred'
      break
    case 'update-reset':
      next.update = 'ready'
      break
  }
  return next
}

// The pure model above can be tested without loading a browser or modifying any real database.
if (typeof document !== 'undefined') {
  let state = deliveryState()
  const byId = (id) => document.getElementById(id)
  const log = (event) => console.info('[G4 delivery]', event) // Fixed event names only; never log a URL or record.
  document.documentElement.dataset.theme =
    new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light'
  function renderDelivery() {
    const locked = state.update === 'busy'
    const updateBlocked = state.dirty || state.saving || state.offline
    byId('network-status').innerHTML =
      `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>${state.offline ? '<path d="m3 3 18 18"/>' : ''}</svg><span>${state.offline ? '当前离线，仍可在本机记录。' : '已连接网络，记录仍保存在本机。'}</span>`
    byId('network-toggle').textContent = state.offline ? '模拟恢复连接' : '模拟断网'
    const updateCopy = {
      ready: ['新版本已准备好', '更新会重新打开应用，不清除本机记录。'],
      busy: ['正在更新…', '请等待更新完成。'],
      failed: ['这次更新未完成', '你可以继续使用当前版本，联网后重试。无需清除数据。'],
      done: ['更新完成 · 演示', '正式版本更新后返回原页面；这里没有重载或更改应用。'],
      deferred: ['稍后更新', '可继续记录，准备好后再查看更新提示。'],
    }[state.update]
    const guard = state.saving
      ? '记录正在保存，完成后才能更新。'
      : state.dirty
        ? '有未保存的内容，请先返回表单保存或放弃草稿。'
        : state.offline
          ? '当前离线，恢复连接后再更新。'
          : updateCopy[1]
    byId('update-status').innerHTML =
      `<strong class="state-title">${updateCopy[0]}</strong><span class="state-copy">${['ready', 'failed'].includes(state.update) ? guard : updateCopy[1]}</span>`
    byId('update').textContent = state.update === 'failed' ? '重试更新' : '现在更新'
    const actionable = ['ready', 'failed'].includes(state.update)
    byId('update').hidden = byId('later').hidden = !actionable
    byId('update').disabled = locked || updateBlocked
    for (const id of ['network-toggle', 'later', 'dirty', 'saving', 'update-fail', 'update-reset'])
      byId(id).disabled = locked
    for (const [id, key] of [
      ['dirty', 'dirty'],
      ['saving', 'saving'],
      ['update-fail', 'updateFail'],
    ])
      byId(id).checked = state[key]
  }
  function send(event) {
    state = deliveryTransition(state, event)
    log(event)
    renderDelivery()
    if (event === 'update' && state.update === 'busy') {
      // Simulated latency exposes disabled/loading states. Failure consumes only the armed test flag.
      setTimeout(() => {
        send('update-result')
        const target = 'update-status'
        byId(target).tabIndex = -1
        byId(target).focus()
      }, 450)
    }
  }
  document.addEventListener('click', (e) => {
    const button = e.target.closest('button')
    if (!button) return
    if (button.id === 'theme') {
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
      log('theme-changed')
      return
    }
    send(button.id)
    // Removing an action after cancel/defer must not strand keyboard focus on the document body.
    if (button.id === 'later') {
      const target = byId('update-status')
      target.tabIndex = -1
      target.focus()
    }
  })
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type=checkbox]')) send(e.target.id)
  })
  log('review-opened')
  renderDelivery()
}
