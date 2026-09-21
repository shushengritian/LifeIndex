/* global document, console */
const frame = document.querySelector('#app')
// Change only the embedding viewport; the live React application and its state are not patched by the review shell.
for (const dimension of ['width', 'height']) {
  document.getElementById(dimension).addEventListener('change', (event) => {
    frame.style[dimension] = `${Number(event.target.value)}px`
    console.info('[LifeIndex development review]', { event: 'viewport.changed', dimension })
  })
}
