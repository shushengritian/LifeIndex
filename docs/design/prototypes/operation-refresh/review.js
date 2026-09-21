'use strict'
;(() => {
  const frame = document.querySelector('#prototype')
  const status = document.querySelector('#review-status')
  // Presentation parameters are allowlisted and never accepted as business writes.
  const params = new URLSearchParams(location.search)
  const theme = params.get('theme') === 'light' ? 'light' : 'dark'
  const view = ['today', 'health', 'focus', 'finance', 'settings'].includes(params.get('view'))
    ? params.get('view')
    : 'today'
  document.documentElement.dataset.theme = theme
  document.querySelector('#review-theme').value = theme
  if (params.get('embed') === '1') document.body.classList.add('embedded')
  const send = (action, value) => {
    // Only the owned opaque-origin frame receives review commands; no user data crosses this boundary.
    frame.contentWindow.postMessage({ channel: 'lifeindex-review', action, value }, '*')
    console.info('[LifeIndex prototype]', { event: 'review.command', action })
  }
  document.querySelector('#review-theme').addEventListener('change', (event) => {
    document.documentElement.dataset.theme = event.target.value
    send('theme', event.target.value)
  })
  document
    .querySelector('#review-state')
    .addEventListener('change', (event) => send('sample', event.target.value))
  document
    .querySelector('#review-reset')
    .addEventListener('click', () => send('sample', document.querySelector('#review-state').value))
  document.querySelector('#review-failure').addEventListener('click', () => send('failure'))
  document.querySelector('#review-finish').addEventListener('click', () => send('finish'))
  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow || event.data?.channel !== 'lifeindex-prototype')
      return
    if (event.data.action === 'ready') {
      send('theme', document.querySelector('#review-theme').value)
      send('view', view)
    }
    const messages = {
      ready: '原型就绪。全部数据为合成样本，刷新重置。',
      reset: '样本已重置，未读取用户数据。',
      failure: '下一次写入将模拟失败；失败后保留输入，可直接重试。',
      finish: '已推进本次计时，按完成流程处理。',
      idle: '没有正在进行的专注。请先在专注页开始一次。',
      theme: '主题已切换，仅本次预览有效。',
      busy: '正在保存，请等待结束后再切换样本。',
    }
    if (messages[event.data.action]) status.textContent = messages[event.data.action]
  })
})()
