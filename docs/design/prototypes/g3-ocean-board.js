'use strict'
// Review controls send only fixed simulation events to the six isolated, same-origin samples.
console.info('[LifeIndex design board]', { event: 'board.ready' })
document.querySelector('#fail').addEventListener('click', () => {
  document
    .querySelectorAll('iframe')
    .forEach((frame) => frame.contentWindow.postMessage({ type: 'fail-next' }, location.origin))
  console.info('[LifeIndex design board]', { event: 'simulation.failure_armed' })
})
