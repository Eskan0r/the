import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   BlackHoleRenderer — full numerical geodesic integration
   
   Previous versions used a single analytical deflection per ray. That cannot
   produce the lensed top arc because rays that need to bend 180°+ around the
   BH only get one approximated kick and miss the far disk entirely.
   
   This version marches each ray step-by-step through curved Schwarzschild
   spacetime, applying the geodesic acceleration at every step and sampling
   the disk volume as it goes. The top arc, near-side disk, and shadow all
   emerge naturally from the same march — no separate "lensing pass" needed.

   Geodesic equation (null ray, Schwarzschild):
     d²r/dλ² = L²/r³ - (3/2)RS·L²/r⁴
   
   In 3D Cartesian vector form the extra (relativistic) acceleration is:
     a⃗ = -(3/2)·RS·|pos×vel|² / r⁵  ·  r̂
   
   The centrifugal 1/r³ term is automatically captured by integrating in
   Cartesian coords (it comes "for free" from the straight-line propagation
   component). We only need to add the relativistic correction beyond flat space.
   
   Verification: circular orbit condition  a_centripetal = v²/r
     → 1.5·RS·h²/r⁴ = h²/r³  →  r = 1.5·RS  (photon sphere ✓)
   ───────────────────────────────────────────────────────────────────────────── */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;

#define PI     3.14159265359
#define TAU    6.28318530718
#define RS     1.0
#define R_ISCO    3.0
#define R_OUTER  18.0
#define R_ESCAPE 44.0
#define R_CAP     1.06

/* ── Hash & layered noise ─────────────────────────────────────────────── */
float H(vec2 p) {
  p  = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float N(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(H(i),         H(i+vec2(1,0)), f.x),
             mix(H(i+vec2(0,1)),H(i+vec2(1,1)),f.x), f.y);
}
float fbm2(vec2 p) {
  return 0.500*N(p)
       + 0.250*N(p*2.17 + vec2(1.3, 0.8))
       + 0.125*N(p*4.51 + vec2(3.1, 2.4));
}
float fbm5(vec2 p) {
  float v=0.0, a=0.5;
  for (int i=0; i<5; i++) {
    v += a*N(p);
    p  = p*2.1 + vec2(1.7,0.9)*float(i);
    a *= 0.5;
  }
  return v;
}

/* ── Procedural star field + Milky Way ───────────────────────────────── */
vec3 starField(vec3 d) {
  float phi   = atan(d.z, d.x);
  float theta = acos(clamp(d.y, -1.0, 1.0));
  vec2  uv    = vec2((phi+PI)/TAU, theta/PI);

  vec3 col = vec3(0.002, 0.004, 0.013);

  float band = exp(-d.y*d.y*2.8);
  float mwT  = fbm5(uv*5.8 + vec2(uTime*0.001, 0.0));
  col += vec3(0.07,0.11,0.24)*band*(0.3 + mwT*3.2);
  col += vec3(0.025,0.045,0.095)*exp(-d.y*d.y*10.0);

  for (int L=0; L<4; L++) {
    float sc = 58.0 + float(L)*54.0;
    float lf = float(L);
    vec2  c  = floor(uv*sc);
    vec2  f  = fract(uv*sc);
    for (int ix=0; ix<3; ix++) {
    for (int iy=0; iy<3; iy++) {
      vec2  nb = c + vec2(float(ix)-1.0, float(iy)-1.0);
      float rr = H(nb + lf*14.1);
      if (rr > 0.70) {
        vec2  sp = vec2(H(nb+0.3), H(nb+0.6));
        vec2  dv = f - (sp + vec2(float(ix)-1.0,float(iy)-1.0));
        float sz = 0.00028 + H(nb+1.1)*0.0014;
        float br = pow(rr-0.70, 1.7)*5.5;
        float st = br * exp(-dot(dv,dv)/(sz*sz));
        float ct = H(nb+2.3);
        vec3 sc2 = ct>0.80 ? vec3(0.75,0.88,1.00) :
                   ct>0.55 ? vec3(1.00,0.97,0.90) :
                   ct>0.30 ? vec3(1.00,0.85,0.65) :
                             vec3(1.00,0.60,0.37);
        if (br > 1.9) {
          float sp1 = exp(-abs(dv.x)*sc*0.55)*exp(-abs(dv.y)*sc*3.8);
          float sp2 = exp(-abs(dv.y)*sc*0.55)*exp(-abs(dv.x)*sc*3.8);
          col += sc2*(sp1+sp2)*br*0.45;
        }
        col += sc2*st;
      }
    }}
  }
  return col;
}

/* ── Disk blackbody — fully blue-white, no warm tones ───────────────── */
vec3 diskColor(float tN) {
  /* tN=1 → hottest (ISCO inner edge), tN=0 → coolest (outer rim) */
  vec3 white = vec3(1.00, 1.00, 1.00);
  vec3 bw    = vec3(0.82, 0.93, 1.00);
  vec3 blue  = vec3(0.46, 0.73, 1.00);
  vec3 dblue = vec3(0.19, 0.41, 0.90);
  if (tN > 0.75) return mix(bw,    white, (tN-0.75)*4.0);
  if (tN > 0.40) return mix(blue,  bw,   (tN-0.40)/0.35);
                 return mix(dblue, blue,   tN/0.40);
}

/* ── Volumetric disk sample at world point pos ───────────────────────
   ray  = current photon direction (used for local Doppler observer)
   Returns vec4(emission_rgb, density).
   
   Key physics:
   • Vertical Gaussian: thin-disk scale height H(r) = 0.09r
   • Novikov-Thorne radial emissivity: peaks just outside ISCO, r⁻² falloff
   • Relativistic Keplerian Doppler: one side boosted, other suppressed (D³)
   • Animated FBM turbulence orbiting at Keplerian angular speed            */
vec4 diskSample(vec3 pos, vec3 ray) {
  float r = length(pos.xz);
  if (r < R_ISCO*0.88 || r > R_OUTER+2.5) return vec4(0.0);

  float phi = atan(pos.z, pos.x);

  /* Vertical falloff */
  float Hs   = 0.09 * r;
  float vert = exp(-0.5 * pos.y*pos.y / (Hs*Hs));
  if (vert < 0.001) return vec4(0.0);

  /* Radial emissivity (Novikov-Thorne) */
  float rn  = clamp((r-R_ISCO)/(R_OUTER-R_ISCO), 0.0, 1.0);
  float nt  = max(1.0 - sqrt(R_ISCO/max(r, R_ISCO+0.01)), 0.0);
  float rad = nt * pow(max(1.0-rn, 0.0), 2.2) / max(r*r*0.007, 0.001);
  rad = clamp(rad, 0.0, 7.0);

  /* ISCO inner glow spike */
  float isco = exp(-max(r-R_ISCO, 0.0)*0.85) * 5.5;

  /* Relativistic Keplerian Doppler
     Observer direction = where the photon is heading FROM (local frame) */
  float vk  = min(sqrt(RS / max(2.0*r, 0.01)), 0.86);
  vec3  vd  = vec3(-sin(phi), 0.0, cos(phi));   /* prograde orbital vel */
  vec3  obs = normalize(-ray);                   /* ray came from here   */
  float cp  = dot(vd, obs);
  float lor = 1.0 / sqrt(max(1.0-vk*vk, 0.001));
  float D   = 1.0 / (lor*(1.0-vk*cp));
  float dop = pow(clamp(D, 0.05, 9.0), 3.2);

  /* Animated turbulence: hot-spots orbit at Keplerian rate */
  float omega = 0.44 / max(pow(r, 1.5), 0.1);
  float pa    = phi - uTime*omega;
  float t1    = 0.55 + 0.45*fbm2(vec2(r*0.55, pa*2.3 + r*0.13));
  float t2    = 0.74 + 0.26*fbm2(vec2(r*1.35+5.2, pa*3.9));
  float turb  = t1*t2;

  /* Temperature: hotter at ISCO */
  float tN = pow(max(1.0-rn*0.91, 0.0), 1.5);

  float density  = vert*(rad + isco*0.30)*turb;
  density        = clamp(density, 0.0, 8.0);

  float bright   = (rad + isco)*dop*turb*vert;
  bright         = clamp(bright, 0.0, 32.0);

  return vec4(diskColor(tN)*bright*3.2, density);
}

/* ── Schwarzschild null geodesic step ───────────────────────────────
   The relativistic correction to the photon direction is:
     a⃗ = -(3/2)·RS·h²/r⁵ · r̂
   where h = pos × vel is the (approximately conserved) angular momentum.
   The Newtonian centrifugal 1/r³ term needs no explicit treatment —
   it is already implicit in the Cartesian integration.                  */
void geodStep(inout vec3 pos, inout vec3 vel, float dt) {
  float r2 = dot(pos, pos);
  float r  = sqrt(r2);
  vec3  h  = cross(pos, vel);
  float h2 = dot(h, h);
  vec3  acc = -(1.5*RS*h2 / (r2*r2*r)) * (pos/r);
  vel += acc * dt;
  pos += vel * dt;
}

/* ── Camera: near-equatorial, BH fills upper half of frame ──────────── */
void setupCam(vec2 fc, out vec3 ro, out vec3 rd) {
  ro = vec3(6.2, 0.11, 0.6);
  vec3 tgt = vec3(-5.0, 0.01, -1.8);
  float fv = 0.82;
  vec2 uv  = (fc - uRes*0.5) / uRes.y;
  vec3 fwd = normalize(tgt - ro);
  vec3 rgt = normalize(cross(fwd, vec3(0.0,1.0,0.0)));
  vec3 up  = cross(rgt, fwd);
  rd = normalize(fwd + rgt*uv.x*fv + up*uv.y*fv);
}

/* ── Main ────────────────────────────────────────────────────────────── */
void main() {
  vec3 ro, rd;
  setupCam(gl_FragCoord.xy, ro, rd);

  vec3  pos = ro;
  vec3  vel = rd;
  vec3  col = vec3(0.0);
  float T   = 1.0;      /* transmittance */

  for (int i=0; i<128; i++) {
    float r = length(pos);

    /* Event horizon capture */
    if (r < R_CAP) { T = 0.0; break; }

    /* Escaped to background — will add stars after loop */
    if (r > R_ESCAPE) break;

    /* Sample disk volume at this point, accumulate emission */
    if (T > 0.004) {
      vec4 ds = diskSample(pos, vel);
      if (ds.w > 0.001) {
        float ab  = ds.w * 0.32;
        float em  = 1.0 - exp(-ab);
        col      += T * ds.rgb * em;
        T        *= exp(-ab * 1.15);
      }
    }

    /* Adaptive step: fine near BH where curvature is high,
       coarser in empty space far from the disk               */
    float dt = 0.09 + 0.32*clamp((r-1.5)/9.0, 0.0, 1.0);
    geodStep(pos, vel, dt);
  }

  /* Background stars through remaining transmittance */
  if (T > 0.005) {
    col += T * starField(normalize(vel));

    /* Photon ring — thin bright arc at the shadow boundary.
       Analytically composited because the march may undersample
       this infinitesimally thin feature.
       b_crit = 3√3/2 · RS ≈ 2.598                             */
    float b  = length(cross(ro, rd));
    float dB = (b - 2.598) / 2.598;
    col += vec3(0.65,0.88,1.0) * exp(-dB*dB*72.0) * 4.5 * T;
  }

  /* Equatorial ambient: disk light softly illuminates surrounding space.
     Faint blue haze, stronger near the disk plane, driven by opacity seen. */
  float eq = abs(dot(normalize(rd), vec3(0.0,1.0,0.0)));
  col += vec3(0.055,0.14,0.34) * exp(-eq*eq*5.5) * 0.05 * (1.0-T);

  /* Reinhard tone map + gamma */
  col = col / (col + 0.72);
  col = pow(max(col, 0.0), vec3(1.0/2.2));

  gl_FragColor = vec4(col, 1.0);
}
`

export default function BlackHoleRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    const gl = cv.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) { console.error('WebGL not available'); return }

    /* Render at half resolution — GPU-side pixel is upscaled by CSS.
       The soft look is actually aesthetically fitting for a glowing nebula.
       Remove the /2 if you have a discrete GPU and want full sharpness.    */
    cv.width  = Math.floor(cv.offsetWidth  / 2)
    cv.height = Math.floor(cv.offsetHeight / 2)
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
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW)

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