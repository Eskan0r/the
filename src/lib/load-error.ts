export function showLoadError(error: unknown) {
  console.error('Unable to load page', error)
  document.getElementById('koi-intro')?.dispatchEvent(new Event('koi-dismiss'))
  const message = document.getElementById('load-error')
  if (message) message.hidden = false
}
