import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────
   Liquid-crystal shader background (ported 1:1 from the prompt).

   Same WebGL2 renderer, same SDF scene (3 smooth-unioned blobs,
   same orbits), same shifting rainbow palette, same props and
   defaults as the demo (speed 0.6, radii [0.25, 0.18, 0.3],
   smoothK [0.2, 0.3]).

   Two adaptations for this page:
   - Transparent output: the original writes opaque pixels (black
     off-blobs). Here only the rainbow rim writes color+alpha, so
     insides are hollow and the page stays white. The canvas keeps
     `data-dynamic` as a direct child of the liquidglass root, so
     the rim refracts through the hero name.
   - Bare <canvas> (no wrapper div): liquidglass only accepts
     direct children.
   ───────────────────────────────────────────────────────────── */

export interface LiquidCrystalProps {
  /** Animation speed multiplier (default: 0.6, per demo) */
  speed?: number
  /** Blob radii for the three SDF circles (default: [0.25, 0.18, 0.3], per demo) */
  radii?: [number, number, number]
  /** Smooth-union K values [k12, k123] (default: [0.2, 0.3], per demo) */
  smoothK?: [number, number]
}

const DEFAULT_RADII: [number, number, number] = [0.25, 0.18, 0.3]
const DEFAULT_SMOOTH_K: [number, number] = [0.2, 0.3]

export const liquidCrystalShader = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform vec3 u_radii;    // [r1, r2, r3]
uniform vec2 u_smoothK;  // [k12, k123]
uniform float u_fade;    // mount fade-in (0..1)
uniform vec2 u_off[5];   // physics offsets from the JS spring sim
out vec4 fragColor;

// SDF for a circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// Smooth union of two distances
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Build scene SDF
float mapScene(vec2 uv) {
  float t = u_time * u_speed;

  // Fit the whole composition inside the viewport. Wide screens get
  // exactly 1.0 (unchanged); narrow/portrait screens scale orbits
  // AND blob sizes down together about screen center so no rim can
  // leave the screen on any side.
  float aspect = u_resolution.x / u_resolution.y;
  float zoom = min((aspect * 0.5 - 0.03) / 0.65, 1.0);
  zoom = max(zoom, 0.3);
  vec2 p1 = vec2(cos(t * 0.5), sin(t * 0.5)) * 0.3;
  vec2 p2 = vec2(cos(t * 0.7 + 2.1), sin(t * 0.6 + 2.1)) * 0.4;
  vec2 p3 = vec2(cos(t * 0.4 + 4.2), sin(t * 0.8 + 4.2)) * 0.35;

  // Two small satellite blobs on faster, wider orbits. They regularly
  // pinch off from the main mass and swing back to merge into it.
  // (Vertical component pre-compressed like the big blobs below.)
  vec2 p4 = vec2(cos(t * 1.1 + 1.0), sin(t * 0.9 + 0.5) * 0.45) * 0.48;
  vec2 p5 = vec2(cos(t * 0.85 + 4.0), sin(t * 1.05 + 2.6) * 0.45) * 0.52;
  float r4 = 0.095 + 0.02 * sin(t * 1.3 + 2.0);
  float r5 = 0.065 + 0.015 * sin(t * 1.7 + 4.0);

  // Keep rims on-screen vertically (uv y spans -0.5..0.5): compress
  // the vertical orbits, then clamp as a backstop so no blob edge
  // can cross the top/bottom regardless of radii props.
  p1.y *= 0.45;
  p2.y *= 0.45;
  p3.y *= 0.45;
  p1 *= zoom;
  p2 *= zoom;
  p3 *= zoom;
  p4 *= zoom;
  p5 *= zoom;
  float r1 = u_radii.x * zoom;
  float r2 = u_radii.y * zoom;
  float r3 = u_radii.z * zoom;
  r4 *= zoom;
  r5 *= zoom;
  // physics offsets from the JS spring sim (mouse velocity), applied
  // before clamps so screen containment always holds
  p1 += u_off[0];
  p2 += u_off[1];
  p3 += u_off[2];
  p4 += u_off[3];
  p5 += u_off[4];
  float lim1 = max(0.5 - r1 - 0.01, 0.0);
  float lim2 = max(0.5 - r2 - 0.01, 0.0);
  float lim3 = max(0.5 - r3 - 0.01, 0.0);
  p1.y = clamp(p1.y, -lim1, lim1);
  p2.y = clamp(p2.y, -lim2, lim2);
  p3.y = clamp(p3.y, -lim3, lim3);
  float lim4 = max(0.5 - r4 - 0.01, 0.0);
  float lim5 = max(0.5 - r5 - 0.01, 0.0);
  p4.y = clamp(p4.y, -lim4, lim4);
  p5.y = clamp(p5.y, -lim5, lim5);

  float b1 = sdCircle(uv - p1, r1);
  float b2 = sdCircle(uv - p2, r2);
  float b3 = sdCircle(uv - p3, r3);
  float b4 = sdCircle(uv - p4, r4);
  float b5 = sdCircle(uv - p5, r5);

  float u12 = opSmoothUnion(b1, b2, u_smoothK.x);
  float u123 = opSmoothUnion(u12, b3, u_smoothK.y);
  float u1234 = opSmoothUnion(u123, b4, 0.15);
  return opSmoothUnion(u1234, b5, 0.12);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float d = mapScene(uv);
  float ad = abs(d);

  // Crisp rainbow outline, hollow everywhere else: a thin solid line
  // with pixel-AA edges (fwidth), bright core, zero glow/wash.
  float w = max(fwidth(ad), 1e-5);
  float outer = 1.0 - smoothstep(0.005 - w, 0.005 + w, ad);
  float inner = 1.0 - smoothstep(0.0016 - w, 0.0016 + w, ad);

  // Shifting color palette over time (same as the original)
  vec3 pha = 0.5 + 0.5 * cos(u_time * 0.5 + uv.xyx + vec3(0.0, 1.0, 2.0));
  vec3 col = pha * (0.45 + 0.7 * inner);
  float alpha = outer * u_fade;
  fragColor = vec4(col, alpha);
}
`

const VERT_SRC = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

export default function AnimatedBubbles({
  speed = 0.6,
  radii = DEFAULT_RADII,
  smoothK = DEFAULT_SMOOTH_K,
}: LiquidCrystalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvasOrNull = canvasRef.current
    if (!canvasOrNull) return
    const canvas: HTMLCanvasElement = canvasOrNull

    // NOTE: preserveDrawingBuffer is REQUIRED — liquidglass snapshots
    // this canvas via drawImage, which reads back blank from a WebGL
    // canvas whose buffer isn't preserved.
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
      depth: false,
      stencil: false,
    })
    if (!gl) {
      console.error('[AnimatedBubbles] WebGL2 not supported — leaving background transparent')
      return
    }

    // ── compile ──
    const compile = (type: GLenum, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[AnimatedBubbles] shader error:', gl.getShaderInfoLog(s))
        gl.deleteShader(s)
        return null
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, liquidCrystalShader)
    if (!vs || !fs) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[AnimatedBubbles] link error:', gl.getProgramInfoLog(prog))
      return
    }

    // ── fullscreen quad ──
    const quadVerts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1])
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'u_resolution')!
    const uTime = gl.getUniformLocation(prog, 'u_time')!
    const uSpeed = gl.getUniformLocation(prog, 'u_speed')!
    const uRadii = gl.getUniformLocation(prog, 'u_radii')!
    const uK = gl.getUniformLocation(prog, 'u_smoothK')!
    const uFade = gl.getUniformLocation(prog, 'u_fade')!
    const uOff = gl.getUniformLocation(prog, 'u_off[0]')!

    const resize = () => {
      // lighter backing store on phones; lines stay crisp via fwidth AA
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
    }
    window.addEventListener('resize', resize)
    resize()

    const onContextLost = (e: Event) => e.preventDefault()
    canvas.addEventListener('webglcontextlost', onContextLost)

    // cursor tracking in uv units (y-up); smoothed each frame in render().
    // Starts offscreen with push 0, so output is identical until first move.
    let tmx = 10
    let tmy = 10
    let smx = 10
    let smy = 10
    let pushTarget = 0
    let spush = 0
    let prevMs = -1
    const onPointerMove = (e: PointerEvent) => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      tmx = (e.clientX - vw / 2) / vh
      tmy = (vh / 2 - e.clientY) / vh
      pushTarget = 1
    }
    const onPointerLeave = () => {
      pushTarget = 0
    }
    window.addEventListener('pointermove', onPointerMove)
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    // touch end: finger lifted, so stop pushing (mouse cursor stays put)
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') pushTarget = 0
    }
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    // Spring sim state: per-blob offset + velocity + smoothed push dir.
    // The cursor injects velocity; a damped spring pulls offsets home.
    interface SimBlob { ox: number; oy: number; vx: number; vy: number; dx: number; dy: number }
    const simBlobs: SimBlob[] = Array.from({ length: 5 }, () => ({ ox: 0, oy: 0, vx: 0, vy: 0, dx: 1, dy: 0 }))
    const offArr = new Float32Array(10)

    // Mirror of mapScene's orbits (same formulas) so the sim knows each
    // blob's anchor. t is already scaled by speed. Returns anchors + zoom.
    const computeAnchors = (t: number, vw: number, vh: number) => {
      const aspect = vw / vh
      let zoom = Math.min((aspect * 0.5 - 0.03) / 0.65, 1)
      zoom = Math.max(zoom, 0.3)
      const raw = [
        { x: Math.cos(t * 0.5) * 0.3, y: Math.sin(t * 0.5) * 0.3 * 0.45, r: radii[0] },
        { x: Math.cos(t * 0.7 + 2.1) * 0.4, y: Math.sin(t * 0.6 + 2.1) * 0.4 * 0.45, r: radii[1] },
        { x: Math.cos(t * 0.4 + 4.2) * 0.35, y: Math.sin(t * 0.8 + 4.2) * 0.35 * 0.45, r: radii[2] },
        { x: Math.cos(t * 1.1 + 1.0) * 0.48, y: Math.sin(t * 0.9 + 0.5) * 0.45 * 0.48, r: 0.095 + 0.02 * Math.sin(t * 1.3 + 2.0) },
        { x: Math.cos(t * 0.85 + 4.0) * 0.52, y: Math.sin(t * 1.05 + 2.6) * 0.45 * 0.52, r: 0.065 + 0.015 * Math.sin(t * 1.7 + 4.0) },
      ]
      return {
        zoom,
        blobs: raw.map((p) => {
          const x = p.x * zoom
          const r = p.r * zoom
          const lim = Math.max(0.5 - r - 0.01, 0)
          return { x, y: Math.min(Math.max(p.y * zoom, -lim), lim) }
        }),
      }
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = (timeMs: number, fade: number) => {
      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) return
      // smooth cursor: fast follow for position, slow fade for strength
      const dt = prevMs < 0 ? 0 : Math.min((timeMs - prevMs) / 1000, 0.05)
      prevMs = timeMs
      const k = 1 - Math.exp(-dt * 10)
      smx += (tmx - smx) * k
      smy += (tmy - smy) * k
      spush += (pushTarget - spush) * (1 - Math.exp(-dt * 3))

      // spring physics: mouse injects velocity along a smoothed
      // direction (frozen near the core to avoid flip jitter),
      // spring + damping pull the offset home with a slight overshoot
      const t = (timeMs / 1000) * speed
      const sim = computeAnchors(t, window.innerWidth, window.innerHeight)
      const maxOff = 0.12 * sim.zoom
      for (let i = 0; i < 5; i++) {
        const b = simBlobs[i]
        const a = sim.blobs[i]
        const ddx = a.x + b.ox - smx
        const ddy = a.y + b.oy - smy
        const dist = Math.hypot(ddx, ddy)
        if (dist > 0.03) {
          const s = 1 - Math.exp(-dt * 12)
          b.dx += (ddx / dist - b.dx) * s
          b.dy += (ddy / dist - b.dy) * s
        }
        const fall = Math.exp(-((dist * dist) / (0.3 * 0.3)))
        const f = 5.0 * fall * spush
        b.vx += (-18 * b.ox - 5 * b.vx + b.dx * f) * dt
        b.vy += (-18 * b.oy - 5 * b.vy + b.dy * f) * dt
        b.ox += b.vx * dt
        b.oy += b.vy * dt
        const m = Math.hypot(b.ox, b.oy)
        if (m > maxOff) {
          b.ox *= maxOff / m
          b.oy *= maxOff / m
        }
        offArr[i * 2] = b.ox
        offArr[i * 2 + 1] = b.oy
      }
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform2f(uRes, w, h)
      gl.uniform1f(uTime, timeMs * 0.001)
      gl.uniform1f(uSpeed, speed)
      gl.uniform3fv(uRadii, radii)
      gl.uniform2fv(uK, smoothK)
      gl.uniform1f(uFade, fade)
      gl.uniform2fv(uOff, offArr)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    if (reducedMotion) {
      render(performance.now(), 1)
      return () => {
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
        document.documentElement.removeEventListener('pointerleave', onPointerLeave)
        canvas.removeEventListener('webglcontextlost', onContextLost)
      }
    }

    let rafId = 0
    let running = true
    const startMs = performance.now()

    const animate = (now: number) => {
      if (!running) return
      render(now, Math.min(1, (now - startMs) / 1200))
      rafId = requestAnimationFrame(animate)
    }

    // pause when the hero scrolls out of view (canvas is fixed,
    // so observe the hero section instead). u_time stays absolute
    // so motion resumes seamlessly.
    const hero = document.querySelector('.hero-section')
    let inView = true
    let observer: IntersectionObserver | null = null
    if (hero && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const vis = entries[0]?.isIntersecting ?? true
          if (vis && !inView) {
            inView = true
            rafId = requestAnimationFrame(animate)
          } else if (!vis && inView) {
            inView = false
            cancelAnimationFrame(rafId)
          }
        },
        { threshold: 0 },
      )
      observer.observe(hero)
    }

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(rafId)
      } else if (inView && !running) {
        running = true
        rafId = requestAnimationFrame(animate)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    rafId = requestAnimationFrame(animate)

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('visibilitychange', onVis)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      observer?.disconnect()
      // NOTE: no loseContext() here — under StrictMode (dev) the remount
      // reuses this canvas's context object, so killing it blanks the
      // background permanently.
    }
  }, [speed, radii, smoothK])

  return (
    <canvas
      ref={canvasRef}
      data-dynamic
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
