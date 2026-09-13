// Fullscreen sky shader: gradient sky, sun, layered noise clouds, god rays,
// haze and stars, all driven by altitude and a pointer wind field. Renders at
// a reduced internal resolution; the canvas is stretched by CSS.

export interface SkyState {
  time: number;
  altitude: number;
  drift: [number, number];
  pointer: [number, number];
  velocity: [number, number];
  gust: number;
}

export interface SkyRenderer {
  render(state: SkyState): void;
  resize(): void;
  destroy(): void;
}

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_alt;
uniform vec2 u_drift;
uniform vec2 u_pointer;
uniform vec2 u_vel;
uniform float u_gust;
uniform float u_quality;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
// Wind field: the pointer's velocity displaces the sampling domain around it.
vec2 wind(vec2 uv, float asp) {
  vec2 d = uv - u_pointer;
  d.x *= asp;
  float f = exp(-dot(d, d) * (16.0 - u_gust * 10.0));
  vec2 v = u_vel * 2.4 + vec2(-u_vel.y, u_vel.x) * 0.6;
  return v * f * (0.7 + u_gust * 1.2);
}
float layer(vec2 uv, float asp, float scale, float speed, float cover, vec2 seed, int octaves) {
  vec2 p = uv * vec2(asp, 1.0) * scale + seed;
  p += u_drift * speed * 0.35 + vec2(u_time * 0.012 * speed, u_time * 0.002);
  p += wind(uv, asp) * scale * 0.35;
  float q = fbm(p + vec2(1.7, 9.2), octaves);
  float n = fbm(p + 0.55 * vec2(q, -q), octaves);
  return smoothstep(cover, cover + 0.32, n);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float alt = clamp(u_alt, 0.0, 1.0);
  int oct = int(u_quality);
  int octLow = oct > 3 ? 3 : oct;

  // Sky: dawn pastel low down, deep blue-black near the top of the climb.
  vec3 low = mix(vec3(0.94, 0.82, 0.74), vec3(0.14, 0.30, 0.60), alt);
  vec3 high = mix(vec3(0.56, 0.74, 0.93), vec3(0.02, 0.05, 0.15), alt);
  vec3 col = mix(low, high, pow(uv.y, 0.85));

  // Sun drops toward the horizon as you climb past it.
  vec2 sun = vec2(0.74, mix(0.30, 0.16, alt));
  vec2 sd = uv - sun;
  sd.x *= asp;
  float sdist = length(sd);
  vec3 sunCol = mix(vec3(1.0, 0.80, 0.50), vec3(1.0, 0.94, 0.86), alt * 0.6);
  col += sunCol * (0.30 * exp(-sdist * 5.0) + 0.9 * exp(-sdist * 42.0));

  // Stars appear only in the thin air.
  float star = pow(hash(floor(uv * u_res / 2.0)), 46.0) * smoothstep(0.58, 0.95, alt) * smoothstep(0.25, 1.0, uv.y);
  col += star * 1.3;

  // Ground haze fades with altitude.
  col = mix(col, vec3(0.96, 0.92, 0.88), (1.0 - alt) * smoothstep(0.45, 0.0, uv.y) * 0.55);

  // Cloud deck: a band that slides from above the viewport to below it.
  float deckY = mix(1.25, -0.55, alt);
  float band = exp(-pow((uv.y - deckY) * 2.0, 2.0));
  float thin = layer(uv, asp, 2.0, 0.6, 0.46 - 0.10 * band, vec2(0.0), oct);
  float deck = layer(uv + vec2(0.3, 0.1), asp, 3.4, 1.0, 0.50 - 0.26 * band, vec2(3.1, 7.7), oct);
  float dens = clamp(thin * 0.45 * (0.5 + band) + deck * band * 1.15, 0.0, 1.0);

  // Lighting: sample the deck slightly toward the sun for a lit edge.
  vec2 toSun = normalize(sun - uv);
  float lit = layer(uv + vec2(0.3, 0.1) + toSun * 0.025, asp, 3.4, 1.0, 0.50 - 0.26 * band, vec2(3.1, 7.7), octLow);
  float shade = clamp((deck - lit) * 1.6, -1.0, 1.0);
  vec3 cloudCol = mix(vec3(0.62, 0.68, 0.84), vec3(1.0, 0.99, 0.97), 0.55 + 0.45 * shade);
  cloudCol = mix(cloudCol, sunCol * 1.05, 0.30 * exp(-sdist * 2.5));
  cloudCol = mix(cloudCol, vec3(0.70, 0.76, 0.94), alt * 0.35);
  col = mix(col, cloudCol, dens);

  // God rays: march toward the sun through the deck.
  float rays = 0.0;
  vec2 rp = uv;
  vec2 stepv = (sun - uv) / 6.0;
  for (int i = 0; i < 6; i++) {
    rp += stepv;
    float b = exp(-pow((rp.y - deckY) * 2.0, 2.0));
    rays += 1.0 - layer(rp + vec2(0.3, 0.1), asp, 3.4, 1.0, 0.50 - 0.26 * b, vec2(3.1, 7.7), octLow) * b;
  }
  rays /= 6.0;
  col += sunCol * rays * 0.16 * exp(-sdist * 1.4) * (1.0 - dens);

  // Break-through whiteout right at the deck.
  col = mix(col, vec3(1.0), smoothstep(0.7, 1.0, band) * 0.35 * dens);

  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`sky shader: ${log}`);
  }
  return shader;
}

export function createSky(
  canvas: HTMLCanvasElement,
  quality: { scale: number; octaves: number },
): SkyRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const context = gl;
  let program: WebGLProgram;
  try {
    program = context.createProgram()!;
    context.attachShader(
      program,
      compile(context, context.VERTEX_SHADER, VERTEX),
    );
    context.attachShader(
      program,
      compile(context, context.FRAGMENT_SHADER, FRAGMENT),
    );
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS))
      throw new Error(context.getProgramInfoLog(program) ?? 'link failed');
  } catch {
    return null;
  }
  context.useProgram(program);
  const buffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    context.STATIC_DRAW,
  );
  const position = context.getAttribLocation(program, 'a_pos');
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  const u = (name: string) => context.getUniformLocation(program, name);
  const uniforms = {
    res: u('u_res'),
    time: u('u_time'),
    alt: u('u_alt'),
    drift: u('u_drift'),
    pointer: u('u_pointer'),
    vel: u('u_vel'),
    gust: u('u_gust'),
    quality: u('u_quality'),
  };
  context.uniform1f(uniforms.quality, quality.octaves);

  const resize = () => {
    const width = Math.max(
      2,
      Math.min(1280, Math.round(canvas.clientWidth * quality.scale)),
    );
    const height = Math.max(
      2,
      Math.round(
        width * (canvas.clientHeight / Math.max(1, canvas.clientWidth)),
      ),
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.viewport(0, 0, width, height);
    context.uniform2f(uniforms.res, width, height);
  };
  resize();

  return {
    resize,
    render(state) {
      context.uniform1f(uniforms.time, state.time);
      context.uniform1f(uniforms.alt, state.altitude);
      context.uniform2f(uniforms.drift, state.drift[0], state.drift[1]);
      context.uniform2f(uniforms.pointer, state.pointer[0], state.pointer[1]);
      context.uniform2f(uniforms.vel, state.velocity[0], state.velocity[1]);
      context.uniform1f(uniforms.gust, state.gust);
      context.drawArrays(context.TRIANGLES, 0, 3);
    },
    destroy() {
      context.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
