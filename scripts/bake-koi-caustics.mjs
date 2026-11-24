// Rebuild the light atlas using the app's optical model in a local browser.
// Requires Vite on 5180 and a local Chromium debugging endpoint on 9336.
// node scripts/bake-koi-caustics.mjs [preview URL] [debugging port]
import { mkdir, writeFile } from 'node:fs/promises'
const url = process.argv[2] || 'http://127.0.0.1:5180'
const port = process.argv[3] || '9336'
const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let sequence = 0
const pending = new Map()
ws.onmessage = event => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const result = pending.get(message.id)
  pending.delete(message.id)
  message.error ? result.reject(message.error) : result.resolve(message.result)
}
const send = (method, params) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
try {
  await send('Page.navigate', { url })
  await new Promise(resolve => setTimeout(resolve, 1200))
  const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const { bakeCausticFrame, CAUSTIC_ATLAS: config } = await import('/src/lib/koi/optics.ts');
    const { size, frames, columns, seconds } = config;
    const canvas = document.createElement('canvas');
    canvas.width = size * columns; canvas.height = size * Math.ceil(frames / columns);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    for (let frame = 0; frame < frames; frame++) {
      const flux = bakeCausticFrame(frame / frames * seconds);
      for (let i = 0; i < flux.length; i++) {
        const value = Math.round(Math.min(4, flux[i]) / 4 * 255);
        image.data[i*4] = image.data[i*4+1] = image.data[i*4+2] = value;
        image.data[i*4+3] = 255;
      }
      ctx.putImageData(image, (frame % columns)*size, Math.floor(frame/columns)*size);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  })()` })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  const directory = new URL('../public/pond/', import.meta.url)
  await mkdir(directory, { recursive: true })
  const bytes = Buffer.from(result.result.value, 'base64')
  await writeFile(new URL('sunlight-atlas.png', directory), bytes)
  console.log(`Baked 128 caustic frames: ${bytes.length} bytes`)
} finally { ws.close() }
