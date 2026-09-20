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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = (timeMs: number, fade: number) => {
      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) return
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
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    if (reducedMotion) {
      render(performance.now(), 1)
      return () => {
        window.removeEventListener('resize', resize)
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
      document.removeEventListener('visibilitychange', onVis)
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
