// Space theme SVG art generator (deterministic, seeded).
//
// Outputs:
//   public/themes/space/starfield.svg     far stars + galactic band, deferred <img>
//   src/themes/space/art/defs.svg         shared gradients + filters, inlined once
//   src/themes/space/art/mid.html         positioned planets, moons and asteroids
//   src/themes/space/art/fore.html        near, out-of-focus rocks and debris
//   src/themes/space/art/constellation-*.svg  section decorations
//
// Every inline body is its own <svg> inside an absolutely positioned wrapper so
// GSAP can drift or tumble the wrapper on the compositor while CSS pulses the
// object on hover. Inline art references the shared defs by id (sp-g-*, sp-*).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const artDir = join(root, 'src/themes/space/art');
const publicDir = join(root, 'public/themes/space');
mkdirSync(artDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

// ---------------------------------------------------------------- utilities
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (v) => {
  const r = Math.round(v * 10) / 10;
  return (Object.is(r, -0) ? 0 : r).toString();
};
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
let clipCount = 0;
const uniqueId = (prefix) => `${prefix}-${(clipCount += 1)}`;

// ------------------------------------------------------------------ colors
// Radial planet gradients, lit from the upper left: highlight -> body -> limb.
const GRADS = {
  violet: ['#d7c6ff', '#7a5cf0', '#1a0f4a'],
  ember: ['#ffc3a0', '#d9583a', '#3a0f18'],
  ice: ['#f0fbff', '#6fc3ec', '#0f2f52'],
  rose: ['#ffd0ea', '#e35aa6', '#43103a'],
  sand: ['#fff0c8', '#dca75f', '#4a2a12'],
  teal: ['#c6fff5', '#37c1ab', '#093638'],
  ink: ['#7d829f', '#353a55', '#0b0c17'],
  shadow: ['#262a3d', '#0e1020', '#04040a'],
};

function gradientDefs(prefix) {
  let s = '';
  for (const [name, [a, b, c]] of Object.entries(GRADS)) {
    s += `<radialGradient id="${prefix}-g-${name}" cx="0.34" cy="0.3" r="0.78"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  }
  s += `<radialGradient id="${prefix}-g-terminator" cx="0.3" cy="0.28" r="0.9"><stop offset=".5" stop-color="#03030a" stop-opacity="0"/><stop offset="1" stop-color="#03030a" stop-opacity=".9"/></radialGradient>`;
  s += `<radialGradient id="${prefix}-g-star" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#cfefff" stop-opacity=".55"/><stop offset="1" stop-color="#8fd8ff" stop-opacity="0"/></radialGradient>`;
  s += `<linearGradient id="${prefix}-g-ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff5e6" stop-opacity=".05"/><stop offset=".3" stop-color="#ffe2b8" stop-opacity=".7"/><stop offset=".5" stop-color="#c9b4ff" stop-opacity=".35"/><stop offset=".7" stop-color="#ffe2b8" stop-opacity=".7"/><stop offset="1" stop-color="#fff5e6" stop-opacity=".05"/></linearGradient>`;
  return s;
}
const filterDefs = (prefix) =>
  `<filter id="${prefix}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>` +
  `<filter id="${prefix}-soft" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="1.8"/></filter>` +
  `<filter id="${prefix}-rough" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter>`;

// ------------------------------------------------------------------- bodies
// Makers return { svg, extent } with the body centred on (0,0).

function planet(rand, { r, palette, kind = 'gas', rings = false, tilt = -18 }) {
  const P = 'sp';
  const clip = uniqueId('sp-clip');
  let detail = '';
  if (kind === 'gas') {
    const bands = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < bands; i++) {
      const y = -r + (2 * r * (i + 0.5)) / bands + (rand() - 0.5) * r * 0.1;
      const h = (2 * r) / bands / (1.6 + rand() * 1.2);
      const light = rand() > 0.5;
      detail += `<rect x="${n(-r * 1.1)}" y="${n(y - h / 2)}" width="${n(r * 2.2)}" height="${n(h)}" rx="${n(h / 2)}" fill="${light ? '#fff' : '#000'}" opacity="${n(light ? 0.07 + rand() * 0.07 : 0.14 + rand() * 0.12)}"/>`;
    }
    detail += `<ellipse cx="${n(r * 0.28)}" cy="${n(r * 0.22)}" rx="${n(r * 0.24)}" ry="${n(r * 0.11)}" fill="#fff" opacity=".12"/>`;
  } else if (kind === 'rock') {
    const craters = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < craters; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * r * 0.7;
      const cx = Math.cos(a) * d;
      const cy = Math.sin(a) * d;
      const cr = r * (0.06 + rand() * 0.11);
      detail += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(cr)}" ry="${n(cr * 0.82)}" fill="#000" opacity=".3"/><ellipse cx="${n(cx - cr * 0.25)}" cy="${n(cy - cr * 0.25)}" rx="${n(cr * 0.7)}" ry="${n(cr * 0.55)}" fill="#fff" opacity=".08"/>`;
    }
  } else {
    detail += `<ellipse cx="0" cy="${n(-r * 0.8)}" rx="${n(r * 0.55)}" ry="${n(r * 0.18)}" fill="#fff" opacity=".28"/>`;
    detail += `<ellipse cx="0" cy="${n(r * 0.84)}" rx="${n(r * 0.45)}" ry="${n(r * 0.14)}" fill="#fff" opacity=".16"/>`;
    for (let i = 0; i < 3; i++) {
      const y = -r * 0.4 + i * r * 0.36;
      detail += `<rect x="${n(-r * 1.1)}" y="${n(y)}" width="${n(r * 2.2)}" height="${n(r * 0.08)}" rx="${n(r * 0.04)}" fill="#fff" opacity=".06"/>`;
    }
  }
  const spin = kind === 'gas' ? -12 : 0;
  const rx = r * 1.85;
  const ry = r * 0.3;
  const stroke = r * 0.22;
  const ringBack = rings
    ? `<g transform="rotate(${n(tilt)})"><path d="M${n(-rx)} 0A${n(rx)} ${n(ry)} 0 0 1 ${n(rx)} 0" fill="none" stroke="url(#${P}-g-ring)" stroke-width="${n(stroke)}" opacity=".8"/><path d="M${n(-rx * 0.86)} 0A${n(rx * 0.86)} ${n(ry * 0.86)} 0 0 1 ${n(rx * 0.86)} 0" fill="none" stroke="#050308" stroke-width="${n(stroke * 0.12)}" opacity=".5"/></g>`
    : '';
  const ringFront = rings
    ? `<g transform="rotate(${n(tilt)})"><path d="M${n(-rx)} 0A${n(rx)} ${n(ry)} 0 0 0 ${n(rx)} 0" fill="none" stroke="url(#${P}-g-ring)" stroke-width="${n(stroke)}"/><path d="M${n(-rx * 0.86)} 0A${n(rx * 0.86)} ${n(ry * 0.86)} 0 0 0 ${n(rx * 0.86)} 0" fill="none" stroke="#050308" stroke-width="${n(stroke * 0.12)}" opacity=".6"/></g>`
    : '';
  const svg =
    `<g class="sp-object" data-body="planet"><g class="sp-core">` +
    `<circle r="${n(r * 1.16)}" fill="url(#${P}-g-${palette})" opacity=".42" filter="url(#${P}-glow)"/>` +
    ringBack +
    `<clipPath id="${clip}"><circle r="${n(r)}"/></clipPath>` +
    `<circle r="${n(r)}" fill="url(#${P}-g-${palette})"/>` +
    `<g clip-path="url(#${clip})" transform="rotate(${n(spin)})">${detail}</g>` +
    `<circle r="${n(r)}" fill="url(#${P}-g-terminator)"/>` +
    ringFront +
    `</g></g>`;
  return { svg, extent: rings ? rx * 1.04 : r * 1.3 };
}

function asteroid(rand, { r, palette = 'ink', soft = false }) {
  const points = 12 + Math.floor(rand() * 6);
  let d = '';
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (0.7 + rand() * 0.3);
    d += `${i ? 'L' : 'M'}${n(Math.cos(a) * rr)} ${n(Math.sin(a) * rr)}`;
  }
  d += 'Z';
  let craters = '';
  const count = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const dist = rand() * r * 0.5;
    const cr = r * (0.1 + rand() * 0.14);
    craters += `<ellipse cx="${n(Math.cos(a) * dist)}" cy="${n(Math.sin(a) * dist)}" rx="${n(cr)}" ry="${n(cr * 0.8)}" fill="#000" opacity=".32"/>`;
  }
  const filter = soft ? ' filter="url(#sp-soft)"' : ' filter="url(#sp-rough)"';
  const svg =
    `<g class="sp-object" data-body="asteroid"${filter}><g class="sp-core">` +
    `<path d="${d}" fill="url(#sp-g-${palette})"/>${craters}` +
    `<path d="${d}" fill="url(#sp-g-terminator)" opacity=".8"/>` +
    `</g></g>`;
  return { svg, extent: r * 1.08 };
}

// ------------------------------------------------------------ positioning
const FRAME_W = 1600;
const FRAME_H = 1000;
function placed(kind, art, { x, y, cls = '', tumble = false, moons = [] }) {
  const ext = Math.max(art.extent, ...moons.map((m) => m.orbit + m.r));
  const size = ext * 2;
  const style =
    `left:${n((x / FRAME_W) * 100)}%;top:${n((y / FRAME_H) * 100)}%;` +
    `--sp-pct:${n((size / FRAME_W) * 100)}%;--sp-w:${n(size)}`;
  let extras = '';
  for (const [index, moon] of moons.entries()) {
    const orbitPct = (moon.orbit / size) * 100;
    extras += `<span class="sp-orbit" data-ambient="orbit" data-orbit="${index}" style="--sp-orbit:${n(orbitPct)}%;--sp-moon:${n(((moon.r * 2) / size) * 100)}%;--sp-start:${n(moon.start)}deg"><i class="sp-moon sp-moon-${moon.palette}"></i></span>`;
  }
  const orbitRings = moons
    .map(
      (m) =>
        `<circle r="${n(m.orbit)}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1" stroke-dasharray="3 7"/>`,
    )
    .join('');
  return (
    `<div class="sp-body ${cls}" data-ambient="drift" data-kind="${kind}"${tumble ? ' data-tumble="1"' : ''} style="${style}">` +
    `<svg viewBox="${n(-ext)} ${n(-ext)} ${n(size)} ${n(size)}" aria-hidden="true" focusable="false">${orbitRings}${art.svg}</svg>${extras}</div>\n`
  );
}

// ---------------------------------------------------------- far starfield
function makeStarfield() {
  const rand = mulberry32(4201);
  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_W} ${FRAME_H}" preserveAspectRatio="xMidYMid slice"><defs>` +
    `<radialGradient id="band" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#cdbfff" stop-opacity=".22"/><stop offset=".55" stop-color="#7f6cff" stop-opacity=".08"/><stop offset="1" stop-color="#7f6cff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3d6" stop-opacity=".3"/><stop offset="1" stop-color="#ffb7d9" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="galaxy" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".3" stop-color="#d9c8ff" stop-opacity=".2"/><stop offset="1" stop-color="#d9c8ff" stop-opacity="0"/></radialGradient>` +
    `</defs>`;
  s += `<g transform="rotate(-22 820 470)"><ellipse cx="820" cy="470" rx="1150" ry="190" fill="url(#band)"/><ellipse cx="760" cy="460" rx="620" ry="90" fill="url(#core)"/></g>`;
  for (const [cx, cy, rx, rot] of [
    [300, 760, 26, 30],
    [1380, 180, 20, -40],
  ])
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${n(rx * 0.38)}" fill="url(#galaxy)" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const tints = [
    '#ffffff',
    '#ffffff',
    '#ffffff',
    '#cfefff',
    '#ffe6c2',
    '#ffd0ec',
  ];
  for (let i = 0; i < 720; i++) {
    const x = rand() * FRAME_W;
    const y = rand() * FRAME_H;
    const r = 0.5 + rand() * rand() * 1.7;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${pick(rand, tints)}" opacity="${n(0.3 + rand() * 0.7)}"/>`;
  }
  for (let i = 0; i < 34; i++) {
    const x = rand() * FRAME_W;
    const y = rand() * FRAME_H;
    const r = 1.6 + rand() * 1.3;
    const l = r * (3 + rand() * 3);
    const tint = pick(rand, tints);
    s += `<g opacity="${n(0.7 + rand() * 0.3)}"><circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${tint}"/><path d="M${n(x - l)} ${n(y)}H${n(x + l)}M${n(x)} ${n(y - l)}V${n(y + l)}" stroke="${tint}" stroke-width=".8" stroke-opacity=".7"/></g>`;
  }
  return `${s}</svg>`;
}

// ------------------------------------------------------- shared inline defs
const makeDefs = () =>
  `<svg class="sp-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${gradientDefs('sp')}${filterDefs('sp')}</defs></svg>`;

// ------------------------------------------------------------- mid plane
function makeMid() {
  const rand = mulberry32(5303);
  let s = '';
  s += placed(
    'planet',
    planet(rand, {
      r: 150,
      palette: 'violet',
      kind: 'gas',
      rings: true,
      tilt: -16,
    }),
    {
      x: 1400,
      y: 330,
      cls: 'sp-giant',
      moons: [{ orbit: 265, r: 12, start: 210, palette: 'ice' }],
    },
  );
  s += placed(
    'planet',
    planet(rand, { r: 70, palette: 'ember', kind: 'rock' }),
    {
      x: 150,
      y: 640,
      cls: 'sp-ember',
      moons: [{ orbit: 108, r: 8, start: 40, palette: 'sand' }],
    },
  );
  s += placed('planet', planet(rand, { r: 44, palette: 'ice', kind: 'ice' }), {
    x: 210,
    y: 230,
  });
  s += placed(
    'planet',
    planet(rand, {
      r: 26,
      palette: 'teal',
      kind: 'gas',
      rings: true,
      tilt: 24,
    }),
    {
      x: 1010,
      y: 175,
    },
  );
  s += placed('planet', planet(rand, { r: 92, palette: 'rose', kind: 'gas' }), {
    x: 520,
    y: 1010,
    cls: 'sp-rose',
  });
  s += placed('asteroid', asteroid(rand, { r: 48 }), {
    x: 90,
    y: 340,
    tumble: true,
  });
  for (const [x, y, r] of [
    [1450, 800, 52],
    [1540, 900, 34],
    [1360, 930, 26],
  ])
    s += placed('asteroid', asteroid(rand, { r }), { x, y, tumble: true });
  return s;
}

// -------------------------------------------------------------- near plane
function makeFore() {
  const rand = mulberry32(6007);
  let s = '';
  for (const [x, y, r, cls] of [
    [-50, -40, 200, 'sp-near-tl'],
    [1620, 560, 160, 'sp-near-r'],
    [110, 900, 130, 'sp-near-bl'],
  ])
    s += placed(
      'asteroid',
      asteroid(rand, { r, palette: 'shadow', soft: true }),
      {
        x,
        y,
        cls,
        tumble: true,
      },
    );
  for (const [x, y, r] of [
    [560, 200, 22],
    [1180, 860, 30],
    [1480, 300, 18],
    [120, 700, 24],
    [1380, 640, 26],
    [300, 880, 20],
  ])
    s += placed('asteroid', asteroid(rand, { r, palette: 'ink', soft: true }), {
      x,
      y,
      tumble: true,
    });
  return s;
}

// ------------------------------------------------------- constellations
function makeConstellation(seed, count = 7) {
  const rand = mulberry32(seed);
  const size = 320;
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: 30 + rand() * (size - 60),
      y: 30 + rand() * (size - 60),
      r: 1.8 + rand() * 2.4,
    });
  }
  stars.sort((a, b) => a.x - b.x);
  let lines = '';
  for (let i = 1; i < stars.length; i++)
    lines += `${i === 1 ? 'M' : 'L'}${n(stars[i - 1].x)} ${n(stars[i - 1].y)}L${n(stars[i].x)} ${n(stars[i].y)}`;
  let s = `<svg viewBox="0 0 ${size} ${size}" class="sp-constellation-art" aria-hidden="true" focusable="false">`;
  s += `<path d="${lines}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>`;
  for (const star of stars) {
    s += `<g class="sp-object" data-body="star" transform="translate(${n(star.x)} ${n(star.y)})"><g class="sp-core"><circle r="${n(star.r * 4.5)}" fill="url(#sp-g-star)" opacity=".55"/><circle r="${n(star.r)}" fill="#fff"/></g></g>`;
  }
  return `${s}</svg>`;
}

writeFileSync(join(publicDir, 'starfield.svg'), makeStarfield());
writeFileSync(join(artDir, 'defs.svg'), makeDefs());
writeFileSync(join(artDir, 'mid.html'), makeMid());
writeFileSync(join(artDir, 'fore.html'), makeFore());
writeFileSync(join(artDir, 'constellation-a.svg'), makeConstellation(71, 7));
writeFileSync(join(artDir, 'constellation-b.svg'), makeConstellation(83, 6));
writeFileSync(join(artDir, 'constellation-c.svg'), makeConstellation(97, 8));
writeFileSync(join(artDir, 'constellation-d.svg'), makeConstellation(113, 6));
console.log('space art written');
