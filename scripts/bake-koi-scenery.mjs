// Export separate editable PNGs from the original code artwork.
// Requires Vite on 5180 and local Chromium debugging on 9336 by default.
// node scripts/bake-koi-scenery.mjs [preview URL] [debugging port]
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
  await new Promise(resolve => setTimeout(resolve, 1000))
  const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const { bakePondSprites } = await import('/src/lib/koi/artwork.ts');
    const { drawPierArtwork } = await import('/src/lib/koi/pier-artwork.ts');
    const { POND_ASSET_PATHS } = await import('/src/lib/koi/assets.ts');
    const sprites = bakePondSprites(), pier = {};
    for (const [profile, width, height] of [['desktop',1440,900],['mobile',390,844]]) {
      const canvas = document.createElement('canvas'); canvas.width=width; canvas.height=height;
      const ctx = canvas.getContext('2d'); drawPierArtwork(ctx,width,height,1);
      const rgba = ctx.getImageData(0,0,width,height).data;
      let x0=width,y0=height,x1=0,y1=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rgba[(y*width+x)*4+3]){
        x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      }
      const image=document.createElement('canvas');image.width=x1-x0+1;image.height=y1-y0+1;
      image.getContext('2d').drawImage(canvas,x0,y0,image.width,image.height,0,0,image.width,image.height);
      sprites['pier-'+profile]=image;
      const w=Math.ceil(width/4),h=Math.ceil(height/4),mobile=profile==='mobile';
      pier[profile]={bounds:{x:x0,y:y0,width:image.width,height:image.height},deck:{
        right:Math.round(Math.min(w*(mobile?.25:.235),290/4))*4,
        top:Math.round(h*(mobile?.29:.32))*4,bottom:Math.round(h*(mobile?.51:.67))*4}};
    }
    return {pier,images:Object.entries(sprites).map(([name,canvas])=>({name,path:POND_ASSET_PATHS[name],
      data:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height}))};
  })()` })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  const { images, pier } = result.result.value
  let total = 0
  for (const asset of images) {
    if (!asset.path?.startsWith('/pond/scenery/')) throw new Error(`Invalid scenery path: ${asset.name}`)
    const destination = new URL(`../public${asset.path}`, import.meta.url)
    await mkdir(new URL('.', destination), { recursive: true })
    const bytes = Buffer.from(asset.data, 'base64')
    await writeFile(destination, bytes)
    total += bytes.length
    console.log(`${asset.name}: ${asset.width}x${asset.height}, ${bytes.length} bytes`)
  }
  await writeFile(new URL('../public/pond/scenery/pier/layout.json', import.meta.url), `${JSON.stringify(pier, null, 2)}\n`)
  console.log(`Exported ${images.length} individual PNGs, ${total} bytes total`)
} finally { ws.close() }
