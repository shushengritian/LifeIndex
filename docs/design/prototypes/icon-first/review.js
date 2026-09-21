const frame = document.querySelector('#app')
const controls = ['view', 'theme', 'size'].map((id) => document.getElementById(id))
// Review controls reload only the isolated synthetic frame, never the real application.
function updatePreview() {
  const [view, theme, size] = controls.map((control) => control.value)
  const [width, height] = size.split(',')
  frame.style.width = `${width}px`
  frame.style.height = `${height}px`
  frame.src = `app.html?view=${view}&theme=${theme}`
  console.info('[design-review] preview.changed', { view, theme })
}
controls.forEach((control) => control.addEventListener('change', updatePreview))
console.info('[design-review] ready')
