import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/koi/tail.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { createTail, updateTail, buildSpine, lateralOffset, spinePoint, unbendPoint } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('a bend wave propagates from the body toward the tail', () => {
  const phase = 1.2, step = 0.01, s = 0.45, later = phase + step * 3.8
  const normalized = (s, phase) => lateralOffset(s, phase, 1) / (s * s)
  assert.ok(Math.abs(normalized(s, phase) - normalized(s + step, later)) < 1e-9)
})

test('head stays stable and lateral amplitude increases toward the tail', () => {
  for (let phase = 0; phase < Math.PI * 2; phase += 0.1) assert.equal(Math.abs(lateralOffset(0, phase, 2)), 0)
  const maximum = s => Math.max(...Array.from({length:200}, (_, i) => Math.abs(lateralOffset(s, i / 200 * Math.PI * 2, 2))))
  assert.ok(maximum(0.95) > maximum(0.3) * 8)
})

test('tail beats faster when swimming faster and settles while coasting', () => {
  const slow = createTail(0,0), fast = createTail(0,0)
  for (let i = 0; i < 120; i++) { updateTail(slow,1/60,0,2,0.5); updateTail(fast,1/60,0,12,0.5) }
  assert.ok(fast.frequency > slow.frequency * 2)
  assert.ok(fast.amplitude < slow.amplitude * 2)
  for (let i = 0; i < 240; i++) updateTail(fast,1/60,0,0,0.5)
  assert.ok(fast.frequency < 0.14); assert.ok(fast.amplitude < 0.2)
})

test('curved body and tail preserve every spine segment length', () => {
  for (const turn of [-1.8,0,1.8]) for (let phase=0;phase<6;phase+=0.25) {
    const tail=createTail(phase,0);updateTail(tail,1,turn,10,0.5)
    tail.amplitude=2;buildSpine(tail)
    for(let i=1;i<tail.x.length;i++) assert.ok(Math.abs(Math.hypot(tail.x[i]-tail.x[i-1],tail.y[i]-tail.y[i-1])-16.2/32)<1e-9)
  }
})

test('the tail keeps its world heading until it reaches the turn', () => {
  for (const direction of [-1, 1]) {
    const tail = createTail(0, 0)
    const steer = (dt, heading, speed, effort = 1) => {
      updateTail(tail, dt, heading, speed, 0.5, 1, effort)
      tail.amplitude = 0
      buildSpine(tail)
    }
    const worldHeading = i => tail.heading + Math.atan2(tail.y[i - 1] - tail.y[i], tail.x[i - 1] - tail.x[i])
    steer(0.5, direction * 0.6, 10)
    assert.ok(Math.abs(worldHeading(1) - tail.heading) < 0.05)
    assert.ok(Math.abs(worldHeading(32)) < 1e-9)
    steer(0.5, direction * 0.6, 0)
    assert.ok(Math.abs(worldHeading(32)) < 1e-9)
    steer(1.4, direction * 0.6, 10, 0.28)
    assert.ok(direction * worldHeading(32) > 0)
    assert.ok(direction * worldHeading(32) < 0.6)
    steer(0.3, direction * 0.6, 10, 0.28)
    assert.ok(Math.abs(worldHeading(32) - tail.heading) < 1e-9)
  }
})

test('cross-sections stay perpendicular to the spine, including the tail fin', () => {
  const tail=createTail(0,0);updateTail(tail,1,0.5,10,0.5);tail.amplitude=0;buildSpine(tail)
  const u=-10.2,center=spinePoint(tail,u),edge=spinePoint(tail,u,2)
  assert.ok(Math.abs(Math.hypot(edge.u-center.u,edge.v-center.v)-2)<1e-9)
  assert.ok(Math.abs(edge.u-center.u)>0.1)
  const next=spinePoint(tail,u+0.01)
  assert.ok(Math.abs((edge.u-center.u)*(next.u-center.u)+(edge.v-center.v)*(next.v-center.v))<1e-9)
})

test('tight turns curl the midsection and keep the curved tail sampleable', () => {
  for (const direction of [-1, 1]) {
    const tail = createTail(0, 0)
    for (let frame = 1; frame <= 60; frame++) {
      updateTail(tail, 1 / 60, direction * frame / 60 * 1.4, 3, 0.5)
    }
    assert.ok(direction * spinePoint(tail, -4).v > 2)
    const fin = spinePoint(tail, -11.3, direction * 1.5)
    const decoded = { u: 0, v: 0 }
    unbendPoint(tail, fin.u, fin.v, decoded)
    assert.ok(Math.abs(decoded.u + 11.3) < 0.12)
    assert.ok(Math.abs(decoded.v - direction * 1.5) < 0.12)
  }
})

for(let i=0;i<8;i++)test(`deformation follows orientation ${i*45} degrees`,()=>{
  const tail=createTail(1,0);updateTail(tail,1,0.3,10,0.5);tail.amplitude=1.4;buildSpine(tail)
  const angle=i*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle)
  const local=spinePoint(tail,-9.2,0.8),world={x:local.u*c-local.v*s,y:local.u*s+local.v*c}
  const decoded={u:0,v:0};unbendPoint(tail,world.x*c+world.y*s,-world.x*s+world.y*c,decoded)
  assert.ok(Math.abs(decoded.u+9.2)<0.12);assert.ok(Math.abs(decoded.v-0.8)<0.12)
})

test('heading wrap does not cause a false violent bend',()=>{
  const tail=createTail(0,Math.PI-0.001);updateTail(tail,1/60,-Math.PI+0.001,3,0.5)
  assert.ok(Math.abs(tail.heading - (Math.PI + 0.001)) < 1e-9)
  assert.ok(Math.abs(spinePoint(tail, -12).v) < 0.3)
})
