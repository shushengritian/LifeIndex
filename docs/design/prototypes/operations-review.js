;(() => {
  'use strict'
  const prompts = {
    today: '今天：试试直接打卡、记一笔，再进入专注。确认你能一眼分清「执行动作」与「打开详情」。',
    health: '健康：记录体重或运动，查看历史；进入习惯和戒烟，检查打卡、详情与管理是否各有位置。',
    focus: '专注：选择时长并开始，观察已专注与剩余；试试提前结束、取消及历史入口。没有暂停功能。',
    finance:
      '记账：点日历选日，新增一笔并选二级分类，再点记录编辑。异日保存后应保留浏览日期，选择查看记录才跳转。',
    settings:
      '设置：进入一级分类再新增二级；切换外观；走一遍恢复预览及取消，检查底部导航是否稳定。',
  }
  const choices = document.querySelector('#module-choices')
  const widthChoice = document.querySelector('#phone-width')
  const heightChoice = document.querySelector('#phone-height')
  const toolsChoice = document.querySelector('#show-review-tools')
  let activeView = 'today'
  function loadPreviews() {
    // Changing the presentation shell deliberately starts new independent sample sessions.
    for (const theme of ['light', 'dark']) {
      const path = `operation-refresh/index.html?theme=${theme}&view=${activeView}`
      document.querySelector(`#${theme}-frame`).src =
        `${path}${toolsChoice.checked ? '' : '&embed=1'}`
      document.querySelector(`#${theme}-link`).href = path
    }
  }
  // The review shell only changes view-only URLs; each embedded app owns isolated memory.
  choices.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-view]')
    if (!button || !Object.hasOwn(prompts, button.dataset.view)) return
    const view = button.dataset.view
    activeView = view
    for (const item of choices.querySelectorAll('button')) {
      item.setAttribute('aria-pressed', String(item === button))
    }
    loadPreviews()
    document.querySelector('#review-instruction').textContent = prompts[view]
    console.info('[operation-review] view.changed', { view })
  })
  toolsChoice.addEventListener('change', () => {
    loadPreviews()
    console.info('[operation-review] tools.visibility.changed', { visible: toolsChoice.checked })
  })
  widthChoice.addEventListener('change', () => {
    const width = widthChoice.value
    // Allow only fixed review widths; arbitrary URL or user-provided CSS is never applied.
    if (!['320', '390', '430'].includes(width)) {
      console.warn('[operation-review] viewport.width.rejected')
      return
    }
    document.documentElement.style.setProperty('--phone-width', `${width}px`)
    console.info('[operation-review] viewport.changed', { width })
  })
  heightChoice.addEventListener('change', () => {
    // Resize the review viewport without reloading the synthetic interaction state.
    const height = heightChoice.value
    if (!['568', '844'].includes(height)) {
      console.warn('[operation-review] viewport.height.rejected')
      return
    }
    document.documentElement.style.setProperty('--phone-height', `${height}px`)
    console.info('[operation-review] viewport.height.changed', { height })
  })
  for (const frame of document.querySelectorAll('iframe')) {
    frame.addEventListener('error', () => {
      document.querySelector('#review-instruction').textContent =
        '原型未能载入，请检查本机预览服务，或使用「单独打开」。'
      console.warn('[operation-review] frame.failed')
    })
  }
  console.info('[operation-review] opened')
})()
