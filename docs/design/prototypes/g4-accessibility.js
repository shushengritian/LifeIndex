/* Prototype-only focus continuity across innerHTML renders. Never infer record identity from text. */
;(() => {
  let lastFocused = null,
    returnKey = null
  const main = document.querySelector('#screen')
  function identity(element) {
    const attributes = [...element.attributes].filter(
      (a) => a.name === 'id' || a.name.startsWith('data-'),
    )
    return attributes.length
      ? element.tagName.toLowerCase() +
          attributes.map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('')
      : null
  }
  document.addEventListener('focusin', (event) => {
    lastFocused = event.target
    if (main.contains(lastFocused)) returnKey = identity(lastFocused)
  })
  // Safari may not focus buttons on pointer activation; remember the source before handlers render.
  document.addEventListener(
    'click',
    (event) => {
      const source = event.target.closest('button')
      if (source && main.contains(source)) {
        lastFocused = source
        returnKey = identity(source)
      }
    },
    true,
  )
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab') return
      const modal = [...document.querySelectorAll('dialog[open]')].at(-1)
      if (!modal) return
      // Explicitly wrap at the topmost sheet's boundaries; some browser hosts otherwise
      // move to browser chrome. Do not intercept intermediate native input/radio navigation.
      const controls = [
        ...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]'),
      ].filter(
        (el) =>
          !el.disabled &&
          el.tabIndex >= 0 &&
          el.getClientRects().length &&
          getComputedStyle(el).visibility !== 'hidden' &&
          (el.type !== 'radio' || el.checked),
      )
      const first = controls[0],
        last = controls.at(-1),
        active = document.activeElement
      if (
        first &&
        ((event.shiftKey && (active === first || active === modal)) ||
          (!event.shiftKey && active === last))
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        console.info('[G4 accessibility]', 'dialog-focus-wrapped')
      }
    },
    true,
  )
  // Native dialogs already contain focus. Only repair orphaned focus after a render/close;
  // preserve explicit controller focus, scrolling, and controls still present in the DOM.
  new MutationObserver(() => {
    if (
      document.querySelector('dialog[open]') ||
      document.activeElement !== document.body ||
      !lastFocused ||
      lastFocused.isConnected
    )
      return
    const replacement = returnKey ? main.querySelector(returnKey) : null
    ;(replacement && !replacement.disabled ? replacement : main).focus({ preventScroll: true })
    console.info('[G4 accessibility]', replacement ? 'focus-restored' : 'focus-returned-to-content')
  }).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open'],
  })
  console.info('[G4 accessibility]', 'focus-guard-ready')
})()
