import type { Editor, Probe, Rect } from './protocol'
import type { Fixture } from './fixtures'

declare global {
  interface Window {
    __v4Performance: Probe
  }
}

/** Runs before application code. Measurements use renderer time, never Playwright's polling latency. */
export function installProbe(options: {
  editor: Editor
  expected: Fixture['expected']
  regionNames: readonly string[]
}) {
  const state: Probe = {
    ready: null,
    readyFirst: null,
    readyConfirmed: null,
    chooserStart: null,
    chooser: null,
    chooserConfirmed: null,
    editorStart: null,
    editor: null,
    editorConfirmed: null,
    fcp: null,
    fontsReady: null,
    fontCompletions: [],
    geometryAtReady: {},
    geometryAtFontsReady: {},
    geometryAfterFonts: null,
    fontShift: null,
    regionStates: {},
    field: null,
    resources: [],
    diagnostic: 'initializing',
    readyChecks: {},
  }
  window.__v4Performance = state
  performance.setResourceTimingBufferSize(2_000)
  const name = { expense: '记一笔', weight: '记体重', activity: '记运动' }[options.editor]
  const label = { expense: '金额', weight: '体重', activity: '运动时长' }[options.editor]
  const unit = { expense: '元', weight: 'kg', activity: '分钟' }[options.editor]
  const expectedAmount = (options.expected.expenseMinor / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const rect = (node: Element): Rect => {
    const box = node.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  }
  const visible = (node: Element | null): node is HTMLElement => {
    if (!(node instanceof HTMLElement) || !node.isConnected || node.closest('[inert]')) return false
    if (node.matches(':disabled') || node.getAttribute('aria-disabled') === 'true') return false
    for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor)
      if (
        style.display === 'none' ||
        style.visibility !== 'visible' ||
        Number(style.opacity) < 0.99 ||
        style.pointerEvents === 'none'
      )
        return false
    }
    const box = rect(node)
    return box.width > 0 && box.height > 0
  }
  const reachable = (node: Element | null): node is HTMLElement => {
    if (!visible(node)) return false
    const box = rect(node)
    if (
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.width > innerWidth + 0.5 ||
      box.y + box.height > innerHeight + 0.5
    )
      return false
    // Sample the center and edge midpoints: rounded corners are outside the painted hit area.
    // Multiple points still reject controls obscured by overlays or adjacent dock actions.
    return [
      [box.x + box.width / 2, box.y + box.height / 2],
      [box.x + 3, box.y + box.height / 2],
      [box.x + box.width - 3, box.y + box.height / 2],
      [box.x + box.width / 2, box.y + 3],
      [box.x + box.width / 2, box.y + box.height - 3],
    ].every(([x, y]) => {
      const target = document.elementFromPoint(x, y)
      return !!target && (target === node || node.contains(target))
    })
  }
  const geometry = () => {
    const output: Record<string, Rect> = {}
    for (const selector of [
      '.v4-today-title h1',
      '[data-focus-key="compose:mobile"]',
      '[data-ready-region="today-habits"]',
      '[data-ready-region="today-finance"]',
      '[data-ready-region="focus-runtime"]',
      '[data-ready-region="today-records"]',
    ]) {
      const node = document.querySelector(selector)
      if (node) output[selector] = rect(node)
    }
    return output
  }
  const distance = (left: Record<string, Rect>, right: Record<string, Rect>) => {
    if (Object.keys(left).join('|') !== Object.keys(right).join('|')) return Infinity
    return Math.max(
      0,
      ...Object.keys(left).flatMap((key) =>
        (['x', 'y', 'width', 'height'] as const).map((axis) =>
          Math.abs(left[key][axis] - right[key][axis]),
        ),
      ),
    )
  }
  const dialog = () => [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
  const buttonNamed = (parent: Element, text: string) =>
    [...parent.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === text,
    ) ?? null
  const compose = () => document.querySelector('[data-focus-key="compose:mobile"]')
  // Capture the real activation event. Programmatically focusing the input is intentionally absent.
  const activation = (event: Event) => {
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return
    if (!(event.target instanceof Element)) return
    const target = event.target.closest('button, a')
    if (target?.matches('[data-focus-key="compose:mobile"]') && state.chooserStart === null)
      state.chooserStart = performance.now()
    if (
      target?.matches('.composer-option') &&
      target.querySelector('span')?.textContent?.trim() === name &&
      state.editorStart === null
    )
      state.editorStart = performance.now()
  }
  addEventListener('pointerdown', activation, true)
  addEventListener('keydown', activation, true)
  const fontCompletion = (source: 'load-ready' | 'loading-done') => {
    state.fontsReady = performance.now()
    state.geometryAtFontsReady = geometry()
    state.fontCompletions.push({
      time: state.fontsReady,
      source,
      geometry: state.geometryAtFontsReady,
    })
    console.info('[LifeIndex performance] probe.fonts-completed', { source })
    if (state.ready !== null)
      requestAnimationFrame(() => {
        state.geometryAfterFonts = geometry()
        state.fontShift = distance(state.geometryAtReady, state.geometryAfterFonts)
      })
  }
  // Lazy-rendered text can request a font after window load's fonts.ready already resolved.
  // Observe every later completed load as well, preserving evidence instead of reporting early zero shift.
  document.fonts.addEventListener('loadingdone', () => fontCompletion('loading-done'))
  addEventListener(
    'load',
    () => void document.fonts.ready.then(() => fontCompletion('load-ready')),
    {
      once: true,
    },
  )
  let readyFrames = 0,
    chooserFrames = 0,
    editorFrames = 0
  let chooserFirst = 0,
    editorFirst = 0
  let priorGeometry: Record<string, Rect> = {},
    chooserGeometry: Record<string, Rect> = {},
    editorGeometry: Record<string, Rect> = {}
  let lastDiagnostic = state.diagnostic
  const frame = () => {
    state.fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null
    if (state.ready === null) {
      for (const region of options.regionNames)
        state.regionStates[region] =
          document.querySelector(`[data-ready-region="${region}"]`)?.getAttribute('data-state') ??
          null
      const regionsReady = options.regionNames.every((key) => state.regionStates[key] === 'ready')
      const themeReady = document.documentElement.dataset.themeState === 'ready'
      const nav = document.querySelector('[data-v4-dock]')
      const controls = nav ? [...nav.querySelectorAll('button, a')] : []
      const mode = document.querySelector('[aria-label="今天的视图"]')
      const modes = mode ? [...mode.querySelectorAll('button')] : []
      const finance = document.querySelector('[data-ready-region="today-finance"]')
      const habits = document.querySelector('[data-ready-region="today-habits"]')
      const recent = document.querySelector('[data-ready-region="today-records"]')
      const habitActions = habits ? [...habits.querySelectorAll('.v4-habit-surface')] : []
      const focus = document.querySelector('[data-ready-region="focus-runtime"]')
      const summary = finance?.textContent?.replace(/\s/g, '') ?? ''
      const realData =
        summary.includes(`${options.expected.transactionCount}笔收支记录`) &&
        summary.includes(expectedAmount) &&
        (options.expected.scheduled === 0 ||
          (habits?.textContent?.replace(/\s/g, '') ?? '').includes(
            `${options.expected.completed}/${options.expected.scheduled}今日`,
          )) &&
        (recent?.querySelectorAll('.record-row').length ?? 0) === options.expected.recentCount
      // Persist individual readiness gates so a timeout identifies the actual failing contract.
      state.readyChecks = {
        identity: !!document.querySelector('[data-lifeindex-version="4"]'),
        regions: regionsReady,
        theme: themeReady,
        compose: reachable(compose()),
        navigation: controls.length === 5 && controls.every(reachable),
        modes: modes.length === 2 && modes.every(reachable),
        habits: habitActions.every(reachable),
        settings: reachable(document.querySelector('.v4-settings')),
        focus: focus?.querySelector('.v4-entry-time')?.textContent?.trim() === '25:00',
        content: realData,
        unobstructed: !document.querySelector('dialog[open], .v4-startup, [role="alert"]'),
      }
      const allUsable = Object.values(state.readyChecks).every(Boolean)
      const current = geometry()
      if (allUsable) {
        if (readyFrames > 0 && distance(priorGeometry, current) <= 0.5) readyFrames++
        else {
          readyFrames = 1
          state.readyFirst = performance.now()
        }
        if (readyFrames >= 3) {
          // Publish only after two confirming frames, retaining the first jointly usable frame as the metric.
          state.ready = state.readyFirst
          state.readyConfirmed = performance.now()
          state.geometryAtReady = current
          state.diagnostic = 'ready'
        }
      } else {
        readyFrames = 0
        state.diagnostic = !regionsReady
          ? 'regions-pending'
          : !themeReady
            ? 'theme-pending'
            : !realData
              ? 'content-mismatch'
              : 'controls-unreachable'
      }
      priorGeometry = current
    }
    if (state.ready !== null && state.fontsReady !== null && state.geometryAfterFonts === null) {
      state.geometryAfterFonts = geometry()
      state.fontShift = distance(state.geometryAtReady, state.geometryAfterFonts)
    }
    if (state.chooserStart !== null && state.chooser === null) {
      const layer = dialog(),
        choices = layer ? [...layer.querySelectorAll<HTMLButtonElement>('.composer-option')] : []
      const current = Object.fromEntries(choices.map((node, index) => [String(index), rect(node)]))
      if (
        layer?.querySelector('h2')?.textContent === '想留下什么？' &&
        choices.length === 3 &&
        choices.every(reachable)
      ) {
        chooserFrames = distance(chooserGeometry, current) <= 0.5 ? chooserFrames + 1 : 1
        if (chooserFrames === 1) chooserFirst = performance.now()
        if (chooserFrames >= 2) {
          state.chooser = chooserFirst
          state.chooserConfirmed = performance.now()
        }
      } else chooserFrames = 0
      chooserGeometry = current
    }
    if (state.editorStart !== null && state.editor === null) {
      const layer = dialog(),
        input = layer?.querySelector<HTMLInputElement>('.record-editor input[data-initial-focus]'),
        save = layer ? buttonNamed(layer, '保存记录') : null,
        cancel = layer ? buttonNamed(layer, '取消') : null
      const wrapper = input?.closest('label'),
        categories = layer?.querySelectorAll('.category-choice')
      state.field = {
        label: wrapper?.querySelector('span')?.textContent === label,
        unit: wrapper?.querySelector('strong')?.textContent === unit,
        focused: !!input && document.activeElement === input,
        editable: !!input && !input.disabled && !input.readOnly,
      }
      const current: Record<string, Rect> =
        input && save && cancel
          ? { input: rect(input), save: rect(save), cancel: rect(cancel) }
          : {}
      if (
        layer?.querySelector('h2')?.textContent === name &&
        Object.values(state.field).every(Boolean) &&
        reachable(input ?? null) &&
        reachable(save) &&
        reachable(cancel) &&
        (options.editor === 'weight' || (categories?.length ?? 0) > 0)
      ) {
        editorFrames = distance(editorGeometry, current) <= 0.5 ? editorFrames + 1 : 1
        if (editorFrames === 1) editorFirst = performance.now()
        if (editorFrames >= 2) {
          state.editor = editorFirst
          state.editorConfirmed = performance.now()
          state.diagnostic = 'editor-ready'
        }
      } else {
        editorFrames = 0
        state.diagnostic = 'editor-not-editable-focused-or-reachable'
      }
      editorGeometry = current
    }
    if (state.diagnostic !== lastDiagnostic) {
      // Log only fixed state names, never page text or business values.
      console.info('[LifeIndex performance] probe.state', { state: state.diagnostic })
      lastDiagnostic = state.diagnostic
    }
    // Stop the hot loop after the measured path; resource entries are copied after input verification.
    if (state.editor === null) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
