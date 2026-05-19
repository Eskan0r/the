import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;

#define PI      3.14159265359
#define TAU     6.28318530718
#define RS      1.0
#define BC      2.5981

/* Disk inner/outer radii in Schwarzschild units */
#define R_ISCO   3.0
#define R_OUTER  14.0

/* ── Hash / noise ──────────────────────────────────────────── */
float H(vec2 p) {
  p  = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float N2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(H(i),          H(i+vec2(1,0)), f.x),
             mix(H(i+vec2(0,1)),H(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += N2(p)*a; p *= 2.1; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += N2(p)*a; p *= 2.2; a *= 0.5; }
  return v;
}

/* ── Procedural star field + Milky Way ─────────────────────── */
vec3 sky(vec3 dir) {
  float phi   = atan(dir.z, dir.x);
  float theta = acos(clamp(dir.y, -1.0, 1.0));
  vec2  uv    = vec2((phi + PI) / TAU, theta / PI);

  vec3 col = vec3(0.003, 0.005, 0.014);

  float mwBand = exp(-dir.y * dir.y * 2.6);
  float mwTex  = fbm(uv * 5.5 + vec2(uTime * 0.002, 0.0))
               * fbm(uv * 12.3 + 0.74);
  col += vec3(0.09, 0.13, 0.27) * mwBand * (0.35 + mwTex * 3.0);
  col += vec3(0.03, 0.05, 0.10) * exp(-dir.y * dir.y * 9.0) * 0.55;

  for (int L = 0; L < 4; L++) {
    float s  = 55.0 + float(L) * 52.0;
    float lf = float(L);
    vec2  c0 = floor(uv * s);
    vec2  ov = fract(uv * s);
    for (int ix = 0; ix < 3; ix++) {
    for (int iy = 0; iy < 3; iy++) {
      vec2  nb = c0 + vec2(float(ix)-1.0, float(iy)-1.0);
      float r  = H(nb + lf * 13.7);
      if (r >= 0.70) {
        vec2  sp = vec2(H(nb+0.31), H(nb+0.62));
        vec2  dv = ov - (sp + vec2(float(ix)-1.0, float(iy)-1.0));
        float sz = 0.00028 + H(nb+1.1) * 0.0013;
        float br = pow(r - 0.70, 1.7) * 5.0;
        float st = br * exp(-dot(dv,dv) / (sz*sz));
        float ct = H(nb + 2.2);
        vec3 sc  = ct > 0.82 ? vec3(0.78, 0.89, 1.00) :
                   ct > 0.58 ? vec3(1.00, 0.97, 0.90) :
                   ct > 0.32 ? vec3(1.00, 0.86, 0.66) :
                               vec3(1.00, 0.60, 0.38);
        if (br > 1.85) {
          float sp1 = exp(-abs(dv.x)*s*0.55) * exp(-abs(dv.y)*s*3.8) * 0.38;
          float sp2 = exp(-abs(dv.y)*s*0.55) * exp(-abs(dv.x)*s*3.8) * 0.38;
          col += sc * (sp1+sp2) * br * 0.48;
        }
        col += sc * st;
      }
    }}
  }
  return col;
}

/* ── Schwarzschild ray deflection ──────────────────────────── */
vec3 deflect(vec3 ro, vec3 rd) {
  float b = length(cross(ro, rd));
  if (b < BC * 0.993) return vec3(0.0);
  float t0      = -dot(ro, rd);
  vec3  closest = ro + t0 * rd;
  float cLen    = length(closest);
  if (cLen < 0.001) return rd;
  vec3  perp    = -closest / cLen;
  float u = b / BC;
  float alpha;
  if (u > 3.0) {
    alpha = 2.0 * RS / b;
  } else {
    float du   = max(u - 1.0, 0.0012);
    float weak = 2.0 * RS / b;
    float stg  = min(PI * 0.72, PI * 0.068 / du);
    float bl   = smoothstep(3.0, 1.06, u);
    alpha = mix(weak, stg, bl);
  }
  return normalize(rd * cos(alpha) + perp * sin(alpha));
}

/* ── Disk blackbody colour ──────────────────────────────────
   All blue-white — hot young disk, no warm tones at all.
   tNorm = 1.0  innermost → pure white core
   tNorm = 0.0  outermost → deep cool blue                     */
vec3 diskBlackbody(float tNorm) {
  vec3 white    = vec3(1.00, 1.00, 1.00);   /* pure white core    */
  vec3 blueWhite= vec3(0.80, 0.92, 1.00);   /* blue-white         */
  vec3 blue     = vec3(0.45, 0.72, 1.00);   /* mid blue           */
  vec3 deepBlue = vec3(0.18, 0.40, 0.88);   /* deep outer blue    */
  if (tNorm > 0.75) return mix(blueWhite, white,     (tNorm - 0.75) * 4.0);
  if (tNorm > 0.42) return mix(blue,      blueWhite, (tNorm - 0.42) / 0.33);
                    return mix(deepBlue,  blue,       tNorm / 0.42);
}

/* ── Accretion disk sample ──────────────────────────────────
   Intersects the y = 0 disk plane along (ro, rd).
   nearOnly = 1.0 → only accept intersections in front of the
              BH closest-approach point (near-side disk).
   Returns vec4(rgb, opacity).                                 */
vec4 sampleDisk(vec3 ro, vec3 rd, float nearOnly) {
  if (abs(rd.y) < 0.0005) return vec4(0.0);
  float t = -ro.y / rd.y;
  if (t < 0.05) return vec4(0.0);

  /* Near-side gate: reject intersections past BH */
  if (nearOnly > 0.5) {
    float tClosest = -dot(ro, rd);
    if (t > tClosest * 0.92) return vec4(0.0);
  }

  vec3  hp = ro + t * rd;
  float r  = length(hp.xz);
  if (r < R_ISCO || r > R_OUTER) return vec4(0.0);

  float phi = atan(hp.z, hp.x);

  /* ── Relativistic Doppler boost ──────────────────────────
     Keplerian orbital velocity in geometric units (c = 1):
       v = sqrt( RS / 2r )
     Specific intensity scales as D^3 (limb-darkening omitted)  */
  float vKep   = min(sqrt(RS / max(2.0 * r, 0.01)), 0.88);
  vec3  velDir = vec3(-sin(phi), 0.0, cos(phi));   /* prograde */
  float cosPsi = dot(velDir, normalize(ro - hp));
  float lorentz = 1.0 / sqrt(max(1.0 - vKep * vKep, 0.001));
  float D       = 1.0 / (lorentz * (1.0 - vKep * cosPsi));
  float doppler = pow(clamp(D, 0.04, 7.5), 3.2);

  /* ── Novikov-Thorne radial emissivity ────────────────────
     Peaks just outside ISCO, falls as power law outward.      */
  float rn      = (r - R_ISCO) / (R_OUTER - R_ISCO);   /* 0 → 1 */
  float ntFactor = max(1.0 - sqrt(R_ISCO / r), 0.0);
  float profile  = ntFactor * pow(max(1.0 - rn, 0.0), 2.2)
                 / max(r * r * 0.011, 0.001);
  profile = clamp(profile, 0.0, 5.0);

  /* ── ISCO inner glow ─────────────────────────────────────
     Extra luminosity spike right at the marginally stable orbit  */
  float iscoGlow = exp(-max(r - R_ISCO, 0.0) * 1.1) * 2.6;

  /* ── Animated turbulence ─────────────────────────────────
     phi advances at approximate Keplerian angular rate so
     hot-spots orbit visually with the disk.                   */
  float omega    = pow(max(r, 0.1), -1.5) * 0.50;
  float phiAnim  = phi - uTime * omega;
  float turb1    = 0.66 + 0.34 * fbm3(vec2(r * 0.52, phiAnim * 1.9 + r * 0.14));
  float turb2    = 0.80 + 0.20 * fbm3(vec2(r * 1.15 + 4.7, phiAnim * 3.4));
  float turbFinal = turb1 * turb2;

  /* ── Colour temperature ──────────────────────────────────
     Hottest at ISCO (tNorm = 1), cools outward.              */
  float tNorm = pow(max(1.0 - rn * 0.94, 0.0), 1.5);

  /* ── Brightness composite ────────────────────────────────  */
  float brightness = (profile + iscoGlow) * doppler * turbFinal;
  brightness = clamp(brightness, 0.0, 14.0);

  vec3 col = diskBlackbody(tNorm) * brightness * 1.7;

  /* Smooth inner/outer edge roll-off */
  col *= smoothstep(R_ISCO,  R_ISCO  + 0.45, r);
  col *= smoothstep(R_OUTER, R_OUTER - 1.80, r);

  /* ── Opacity ─────────────────────────────────────────────  */
  float alpha = clamp(profile * turbFinal * doppler * 0.80, 0.0, 0.96);
  alpha *= smoothstep(R_OUTER, R_OUTER - 2.2, r);
  alpha *= smoothstep(R_ISCO,  R_ISCO  + 0.35, r);

  return vec4(col, alpha);
}

/* ── Camera ─────────────────────────────────────────────────  */
/* Camera sits nearly in the disk plane — this is what produces
   the lensed top arc. Even y=0.22 is enough for the back disk
   to sweep dramatically over the shadow.                        */
const vec3  RO = vec3(5.2,  0.22, 1.0);
const vec3  TG = vec3(-4.8,  0.02,-2.0);
const float FV = 0.82;

vec3 camRay(vec2 fc) {
  vec2 uv  = (fc - uRes * 0.5) / uRes.y;
  vec3 fwd = normalize(TG - RO);
  vec3 rgt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up  = cross(rgt, fwd);
  return normalize(fwd + rgt * uv.x * FV + up * uv.y * FV);
}

/* ── Main ───────────────────────────────────────────────────  */
void main() {
  vec3 col = vec3(0.0);

  for (int sy = 0; sy < 2; sy++) {
  for (int sx = 0; sx < 2; sx++) {
    vec2 jt  = (vec2(float(sx), float(sy)) - 0.5) * 0.5;
    vec3 rd  = camRay(gl_FragCoord.xy + jt);
    float b  = length(cross(RO, rd));
    vec3 def = deflect(RO, rd);

    vec3 px;

    if (length(def) < 0.1) {
      /* ── Event horizon — pure void ─────────────────────── */
      px = vec3(0.0);
      /* Near-side disk can still appear in front of the shadow */
      vec4 dkFront = sampleDisk(RO, rd, 1.0);
      px += dkFront.rgb * clamp(dkFront.a * 1.5, 0.0, 1.0);

    } else {
      /* ── Lensed background ──────────────────────────────── */
      px = sky(def);

      /* Photon ring — blue-white to pure white */
      float dB   = (b - BC) / BC;
      float ring = exp(-dB * dB * 88.0) * 3.4;
      vec3 ringC = mix(vec3(0.55, 0.80, 1.00),
                       vec3(1.00, 1.00, 1.00),
                       clamp(dB * 8.0, 0.0, 1.0));
      px += ringC * ring;

      /* Disk along deflected ray — far side + lensed geometry */
      vec4 dkFar = sampleDisk(RO, def, 0.0);
      px = mix(px, px + dkFar.rgb, clamp(dkFar.a * 1.25, 0.0, 1.0));

      /* Near-side disk — between camera and BH */
      vec4 dkNear = sampleDisk(RO, rd, 1.0);
      px = mix(px, px + dkNear.rgb, clamp(dkNear.a * 1.25, 0.0, 1.0));
    }

    col += px;
  }}
  col *= 0.25;

  /* Reinhard tone map + gamma */
  col  = col / (col + 0.78);
  col  = pow(max(col, 0.0), vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}
`

export default function BlackHoleRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    const gl = cv.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) {
      console.error('WebGL not available')
      return
    }

    cv.width  = cv.offsetWidth
    cv.height = cv.offsetHeight
    gl.viewport(0, 0, cv.width, cv.height)

    const mkSh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error('Shader error:', gl.getShaderInfoLog(s))
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, mkSh(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, mkSh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error('Link error:', gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1,  1,-1,  -1,1,  1,1]),
      gl.STATIC_DRAW,
    )

    const aP = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)

    const uRes  = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    gl.uniform2f(uRes, cv.width, cv.height)

    let raf: number
    const frame = (t: number) => {
      gl.uniform1f(uTime, t * 0.001)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display:    'block',
        position:   'fixed',
        inset:       0,
        width:      '100%',
        height:     '100%',
        background: '#000',
      }}
    />
  )
}