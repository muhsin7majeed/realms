// Jungle theme SVG art generator (deterministic, seeded).
//
// Outputs:
//   public/themes/jungle/canopy.svg   far silhouettes, loaded as a deferred <img>
//   src/themes/jungle/art/defs.svg    shared gradients + edge filter, inlined once
//   src/themes/jungle/art/mid.html    positioned mid-depth clusters (inline SVGs)
//   src/themes/jungle/art/fore.html   positioned near clusters + hanging vines
//   src/themes/jungle/art/sprig-*.svg section decorations
//
// Every inline cluster is its own <svg> inside an absolutely positioned wrapper
// so GSAP can sway the wrapper on the compositor while CSS rustles individual
// leaf groups. Inline art references the shared defs by id (jg-g-*, jg-rough).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const artDir = join(root, 'src/themes/jungle/art');
const publicDir = join(root, 'public/themes/jungle');
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
const rot = (x, y, deg) => {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};

// ------------------------------------------------------------------- leaves
// Leaf makers return { body, detail, pts }.
//   body   – filled paths (share the leaf gradient)
//   detail – vein/rachis strokes (class jg-vein / jg-rachis) and holes
//   pts    – hull points in leaf-local space for bounding-box estimation
// All leaves are authored with the stem at (0,0) growing towards -y.

function monstera(rand, h = 300) {
  const fingers = 7;
  const body = [];
  const detail = [];
  const pts = [];
  const bw = h * 0.3;
  body.push(
    `M0 0C${n(-bw)} ${n(-h * 0.02)} ${n(-bw * 0.9)} ${n(-h * 0.3)} ${n(-bw * 0.4)} ${n(-h * 0.42)}L${n(bw * 0.4)} ${n(-h * 0.42)}C${n(bw * 0.9)} ${n(-h * 0.3)} ${n(bw)} ${n(-h * 0.02)} 0 0Z`,
  );
  pts.push([-bw, 0], [bw, 0]);
  for (let i = 0; i < fingers; i++) {
    const t = i / (fingers - 1);
    const a = -72 + 144 * t + (rand() - 0.5) * 8;
    const centrality = 1 - Math.abs(a) / 80;
    const l = h * (0.5 + 0.5 * centrality) * (0.92 + rand() * 0.16);
    const wd = h * (0.075 + 0.05 * centrality);
    const lean = (rand() - 0.5) * wd;
    const oy = -h * 0.06;
    const blade = `M0 0C${n(-wd)} ${n(-l * 0.3)} ${n(-wd * 1.05 + lean)} ${n(-l * 0.9)} ${n(lean * 0.6)} ${n(-l)}C${n(wd * 1.05 + lean)} ${n(-l * 0.9)} ${n(wd)} ${n(-l * 0.3)} 0 0Z`;
    body.push(
      `<g transform="translate(0 ${n(oy)}) rotate(${n(a)})"><path d="${blade}"/></g>`,
    );
    detail.push(
      `<g transform="translate(0 ${n(oy)}) rotate(${n(a)})"><path class="jg-vein" d="M0 ${n(-l * 0.1)}Q${n(lean * 0.4)} ${n(-l * 0.55)} ${n(lean * 0.55)} ${n(-l * 0.9)}"/></g>`,
    );
    for (const [px, py] of [
      [lean * 0.6, -l],
      [-wd * 1.1, -l * 0.6],
      [wd * 1.1, -l * 0.6],
    ]) {
      const [rx, ry] = rot(px, py, a);
      pts.push([rx, ry + oy]);
    }
  }
  const holes = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < holes; i++) {
    const hy = -h * (0.34 + i * 0.14 + rand() * 0.05);
    const hx = (rand() > 0.5 ? 1 : -1) * h * (0.06 + rand() * 0.07);
    const rx = h * (0.028 + rand() * 0.022);
    detail.push(
      `<ellipse class="jg-hole" cx="${n(hx)}" cy="${n(hy)}" rx="${n(rx)}" ry="${n(rx * 0.42)}" transform="rotate(${n(-24 + rand() * 48)} ${n(hx)} ${n(hy)})"/>`,
    );
  }
  return { body, detail, pts };
}

function palm(rand, len = 260, blades = 11) {
  const body = [];
  const detail = [];
  const pts = [[0, 0]];
  const spread = 128 + rand() * 24;
  for (let i = 0; i < blades; i++) {
    const a = -spread / 2 + (spread * i) / (blades - 1);
    const centrality = 1 - Math.abs(a) / (spread / 2);
    const l = len * (0.62 + 0.38 * centrality) * (0.94 + rand() * 0.12);
    const wd = l * (0.055 + rand() * 0.02);
    const droop = (Math.abs(a) / spread) * l * 0.22 * Math.sign(a) * 0.4;
    const d = `M0 0C${n(-wd)} ${n(-l * 0.32)} ${n(-wd * 0.55)} ${n(-l * 0.82)} ${n(droop)} ${n(-l)}C${n(wd * 0.55)} ${n(-l * 0.82)} ${n(wd)} ${n(-l * 0.32)} 0 0Z`;
    body.push(`<g transform="rotate(${n(a)})"><path d="${d}"/></g>`);
    detail.push(
      `<g transform="rotate(${n(a)})"><path class="jg-vein" d="M0 ${n(-l * 0.1)}L0 ${n(-l * 0.92)}"/></g>`,
    );
    pts.push(rot(droop, -l * 1.02, a));
  }
  return { body, detail, pts };
}

function fern(rand, len = 240, pairs = 16) {
  const bend = (rand() * 0.5 + 0.45) * len;
  const dir = rand() > 0.5 ? 1 : -1;
  const px = (t) => dir * bend * t * t;
  const py = (t) => -len * t * (1.6 - 0.6 * t);
  const body = [];
  const detail = [
    `<path class="jg-rachis" d="M0 0Q${n(dir * bend * 0.18)} ${n(-len * 0.9)} ${n(px(1))} ${n(py(1))}"/>`,
  ];
  const pts = [
    [0, 0],
    [px(1), py(1)],
  ];
  for (let i = 1; i <= pairs; i++) {
    const t = i / (pairs + 1);
    const x = px(t);
    const y = py(t);
    const ang =
      (Math.atan2(py(t + 0.01) - y, px(t + 0.01) - x) * 180) / Math.PI + 90;
    const l = len * 0.34 * (1 - t * 0.85) * (0.85 + rand() * 0.3);
    const wd = l * 0.2;
    const leaflet = `M0 0Q${n(-wd)} ${n(-l * 0.42)} 0 ${n(-l)}Q${n(wd)} ${n(-l * 0.42)} 0 0Z`;
    for (const side of [-52, 52]) {
      body.push(
        `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(ang + side)})"><path d="${leaflet}"/></g>`,
      );
      const [tx, ty] = rot(0, -l, ang + side);
      pts.push([x + tx, y + ty]);
    }
  }
  return { body, detail, pts };
}

function banana(rand, h = 320) {
  const w = h * 0.34;
  const lean = (rand() - 0.5) * h * 0.5;
  const seg = 7;
  const cx = (t) => lean * t * t;
  const cy = (t) => -h * t;
  let dL = 'M0 0';
  let dR = '';
  const right = [];
  const pts = [[0, 0]];
  for (let i = 1; i <= seg; i++) {
    const t = i / seg;
    const half = (w / 2) * Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.92));
    const lx = cx(t) - half;
    const y = cy(t);
    if (i < seg && rand() > 0.55) {
      const jy = y + h * 0.045;
      dL += `L${n(lx * 0.98)} ${n(jy)}L${n(cx(t) - half * 0.45)} ${n(jy + 3)}L${n(lx)} ${n(y)}`;
    } else dL += `Q${n(lx)} ${n(y + h * 0.07)} ${n(lx)} ${n(y)}`;
    right.push({
      x: cx(t) + half,
      y,
      jag: i < seg && rand() > 0.55,
      cxt: cx(t),
      half,
    });
    pts.push([lx, y], [cx(t) + half, y]);
  }
  dL += `Q${n(cx(1))} ${n(-h * 1.03)} ${n(cx(1) + 2)} ${n(-h * 0.99)}`;
  pts.push([cx(1), -h * 1.04]);
  for (let i = right.length - 1; i >= 0; i--) {
    const p = right[i];
    if (p.jag) {
      const jy = p.y - h * 0.045;
      dR += `L${n(p.x * 0.98)} ${n(jy)}L${n(p.cxt + p.half * 0.45)} ${n(jy - 3)}L${n(p.x)} ${n(p.y)}`;
    } else dR += `Q${n(p.x)} ${n(p.y - h * 0.06)} ${n(p.x)} ${n(p.y)}`;
  }
  const body = [`M0 0${dL.slice(4)}${dR}Q${n(w * 0.12)} ${n(-h * 0.04)} 0 0Z`];
  const detail = [
    `<path class="jg-vein" d="M0 0Q${n(lean * 0.25)} ${n(-h * 0.5)} ${n(cx(1))} ${n(-h * 0.98)}"/>`,
  ];
  for (let i = 1; i < seg; i++) {
    const t = i / seg;
    const half =
      (w / 2) * Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.92)) * 0.92;
    detail.push(
      `<path class="jg-vein" d="M${n(cx(t))} ${n(cy(t) + h * 0.03)}L${n(cx(t) - half)} ${n(cy(t) - h * 0.012)}M${n(cx(t))} ${n(cy(t) + h * 0.03)}L${n(cx(t) + half)} ${n(cy(t) - h * 0.012)}"/>`,
    );
  }
  return { body, detail, pts };
}

function philo(rand, h = 180) {
  const w = h * (0.82 + rand() * 0.16);
  const body = [
    `M0 0C${n(-w * 0.62)} ${n(-h * 0.02)} ${n(-w * 0.72)} ${n(-h * 0.42)} ${n(-w * 0.36)} ${n(-h * 0.66)}C${n(-w * 0.18)} ${n(-h * 0.8)} ${n(-w * 0.05)} ${n(-h * 0.86)} 0 ${n(-h)}C${n(w * 0.05)} ${n(-h * 0.86)} ${n(w * 0.18)} ${n(-h * 0.8)} ${n(w * 0.36)} ${n(-h * 0.66)}C${n(w * 0.72)} ${n(-h * 0.42)} ${n(w * 0.62)} ${n(-h * 0.02)} 0 0Z`,
  ];
  const detail = [
    `<path class="jg-vein" d="M0 ${n(-h * 0.04)}L0 ${n(-h * 0.94)}"/>`,
  ];
  for (let i = 1; i <= 3; i++) {
    const y = -h * (0.16 + i * 0.18);
    const half = w * 0.34 * (1 - i * 0.16);
    detail.push(
      `<path class="jg-vein" d="M0 ${n(y)}Q${n(half * 0.6)} ${n(y - h * 0.05)} ${n(half)} ${n(y - h * 0.12)}M0 ${n(y)}Q${n(-half * 0.6)} ${n(y - h * 0.05)} ${n(-half)} ${n(y - h * 0.12)}"/>`,
    );
  }
  return {
    body,
    detail,
    pts: [
      [0, 0],
      [-w * 0.72, -h * 0.4],
      [w * 0.72, -h * 0.4],
      [0, -h * 1.02],
    ],
  };
}

const MAKERS = { monstera, palm, fern, banana, philo };
const simpleLeaf = (len) =>
  `M0 0Q${n(-len * 0.32)} ${n(-len * 0.45)} 0 ${n(-len)}Q${n(len * 0.32)} ${n(-len * 0.45)} 0 0Z`;

// ------------------------------------------------------------------ colors
// Deep understory greens. Gradients run stem (dark) -> tip (lit).
const GRADS = {
  shadow: ['#010805', '#03130b', '#061b10'],
  silhouette: ['#02100a', '#071d10', '#0b2a17'],
  deep: ['#061a0f', '#0f3520', '#17452a'],
  shade: ['#0a2416', '#174a2a', '#23673a'],
  mid: ['#0f2f1c', '#1f6034', '#2f8a47'],
  lit: ['#163f24', '#2f7f43', '#4ea85a'],
  bright: ['#1e5a30', '#4a9a52', '#7cc46a'],
  golden: ['#2c6136', '#6aa650', '#b8d46e'],
  teal: ['#082419', '#175040', '#237a5c'],
};

function gradientDefs(prefix, names) {
  let s = '';
  for (const name of names) {
    const [a, b, c] = GRADS[name];
    s += `<linearGradient id="${prefix}-g-${name}" x1="0" y1="1" x2="0.25" y2="0"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  }
  return s;
}
const roughFilter = (id, scale) =>
  `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.014 0.03" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}"/></filter>`;

const softFilter = (id, scale, blur) =>
  `<filter id="${id}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.014 0.03" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}"/></filter>`;

// ------------------------------------------------------------ leaf stamping
function stamp(
  rand,
  prefix,
  kind,
  { x, y, angle, scale, grad, detail = true, filter = true },
) {
  const art = MAKERS[kind](rand);
  const fill = `url(#${prefix}-g-${grad})`;
  const bodyPaths = art.body
    .map((p) => (p.startsWith('<') ? p : `<path d="${p}"/>`))
    .join('');
  const details = detail ? art.detail.join('') : '';
  const pts = art.pts.map(([px, py]) => {
    const [rx, ry] = rot(px * scale, py * scale, angle);
    return [x + rx, y + ry];
  });
  const filterAttr = filter
    ? ` filter="url(#${prefix}-${filter === true ? 'rough' : filter})"`
    : '';
  const svg =
    `<g class="jg-leaf" data-leaf="${kind}" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(scale)})"${filterAttr}>` +
    `<g class="jg-blade"><g fill="${fill}">${bodyPaths}</g>${details}</g></g>`;
  return { svg, pts };
}

// A cluster: several leaves fanning from an anchor at (0,0).
function cluster(
  rand,
  prefix,
  {
    aim,
    spread = 110,
    count = 5,
    scale = 1,
    grads,
    kinds,
    detail = true,
    filter = true,
  },
) {
  let svg = '';
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const leaf = stamp(rand, prefix, pick(rand, kinds), {
      x: (rand() - 0.5) * 30,
      y: (rand() - 0.5) * 26,
      angle: aim - spread / 2 + spread * t + (rand() - 0.5) * 14,
      scale: scale * (0.75 + rand() * 0.55),
      grad: pick(rand, grads),
      detail,
      filter,
    });
    svg += leaf.svg;
    pts.push(...leaf.pts);
  }
  return { svg, pts };
}

function bbox(pts, pad) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return {
    x: x0 - pad,
    y: y0 - pad,
    w: x1 - x0 + pad * 2,
    h: y1 - y0 + pad * 2,
  };
}

// Positioned wrapper for an inline cluster. Anchor lands on (ax%, ay%) of the
// layer; the wrapper is shifted by the anchor's fractional position inside the
// bounding box, and swings around it.
const FRAME_W = 1600;
const FRAME_H = 1000;
function placed(rand, prefix, kind, spec) {
  const { x, y, sway, cls = '' } = spec;
  const art = cluster(rand, prefix, spec);
  const b = bbox(art.pts, 24);
  const ax = -b.x / b.w;
  const ay = -b.y / b.h;
  const left = (x / FRAME_W) * 100;
  const top = (y / FRAME_H) * 100;
  const pct = (b.w / FRAME_W) * 100;
  const style =
    `left:${n(left)}%;top:${n(top)}%;--jg-pct:${n(pct)}%;--jg-w:${n(b.w)};` +
    `aspect-ratio:${n(b.w)}/${n(b.h)};translate:${n(-ax * 100)}% ${n(-ay * 100)}%;` +
    `transform-origin:${n(ax * 100)}% ${n(ay * 100)}%`;
  return (
    `<div class="jg-cluster ${cls}" data-ambient="sway" data-sway="${sway}" data-kind="${kind}" style="${style}">` +
    `<svg viewBox="${n(b.x)} ${n(b.y)} ${n(b.w)} ${n(b.h)}" aria-hidden="true" focusable="false">${art.svg}</svg></div>\n`
  );
}

// ------------------------------------------------------------- far canopy
// A single external SVG. Silhouettes only; the layer is blurred in CSS.
function makeCanopy() {
  const rand = mulberry32(1013);
  const P = 'jgc';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_W} ${FRAME_H}" preserveAspectRatio="xMidYMid slice"><defs>${gradientDefs(P, ['shadow', 'silhouette', 'deep'])}<filter id="${P}-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3"/></filter></defs><g filter="url(#${P}-blur)">`;
  const stampAt = (x, y, spec) => {
    const c = cluster(rand, P, { ...spec, filter: false, detail: false });
    s += `<g transform="translate(${n(x)} ${n(y)})">${c.svg}</g>`;
  };
  for (let i = 0; i < 11; i++) {
    const x = (FRAME_W / 10) * i + (rand() - 0.5) * 70;
    const central = 1 - Math.abs(x - FRAME_W / 2) / (FRAME_W / 2);
    stampAt(x, -30 + rand() * 40 - central * 60, {
      aim: 180 + (x < FRAME_W / 2 ? -18 : 18) + (rand() - 0.5) * 40,
      spread: 130,
      count: 3,
      scale: 1.2 + rand() * 0.8,
      grads: ['shadow', 'silhouette', 'silhouette'],
      kinds: ['palm', 'monstera', 'philo', 'banana'],
    });
  }
  for (const side of [0, FRAME_W]) {
    for (let i = 0; i < 4; i++) {
      stampAt(side + (side === 0 ? -40 : 40), 140 + i * 230 + rand() * 60, {
        aim: side === 0 ? 90 : -90,
        spread: 120,
        count: 2,
        scale: 1.1 + rand() * 0.7,
        grads: ['shadow', 'silhouette', 'deep'],
        kinds: ['palm', 'philo', 'monstera', 'banana'],
      });
    }
  }
  return `${s}</g></svg>`;
}

// ------------------------------------------------------- shared inline defs
function makeDefs() {
  return `<svg class="jg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${gradientDefs('jg', Object.keys(GRADS))}${roughFilter('jg-rough', 6)}${softFilter('jg-soft', 5, 1.5)}</defs></svg>`;
}

// ------------------------------------------------------- mid viewport frame
function makeMid() {
  const rand = mulberry32(2027);
  let s = '';
  for (const side of [0, FRAME_W]) {
    const dir = side === 0 ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      s += placed(rand, 'jg', 'side', {
        x: side - dir * 30 + dir * rand() * 40,
        y: 60 + i * 250 + rand() * 90,
        aim: dir * (52 + rand() * 42),
        spread: 105,
        count: 4,
        scale: 0.95 + rand() * 0.6,
        grads: ['shade', 'mid', 'deep', 'teal'],
        kinds: ['monstera', 'palm', 'fern', 'philo', 'banana'],
        sway: 'mid',
      });
    }
  }
  for (const x of [130, 330, 1270, 1470]) {
    const central = Math.abs(x - FRAME_W / 2) / (FRAME_W / 2);
    s += placed(rand, 'jg', 'bottom', {
      x: x + rand() * 60,
      y: FRAME_H + 50,
      aim: (rand() - 0.5) * 46,
      spread: 96,
      count: 3,
      scale: (0.75 + rand() * 0.4) * (0.7 + central * 0.5),
      grads: ['shade', 'mid', 'deep', 'teal'],
      kinds: ['fern', 'palm', 'philo', 'banana'],
      sway: 'mid',
    });
  }
  return s;
}

// ----------------------------------------------------- foreground + vines
function makeFore() {
  const rand = mulberry32(3041);
  let s = '';
  const corners = [
    { x: -130, y: -100, aim: 128, count: 4, scale: 1.6, cls: 'jg-corner-tl' },
    {
      x: FRAME_W + 130,
      y: -90,
      aim: -132,
      count: 4,
      scale: 1.7,
      cls: 'jg-corner-tr',
    },
    {
      x: -170,
      y: FRAME_H * 0.62,
      aim: 74,
      count: 3,
      scale: 1.35,
      cls: 'jg-edge-l',
    },
    {
      x: FRAME_W + 170,
      y: FRAME_H * 0.58,
      aim: -76,
      count: 3,
      scale: 1.45,
      cls: 'jg-edge-r',
    },
    {
      x: -120,
      y: FRAME_H + 130,
      aim: 36,
      count: 4,
      scale: 1.7,
      cls: 'jg-corner-bl',
    },
    {
      x: FRAME_W + 120,
      y: FRAME_H + 140,
      aim: -34,
      count: 4,
      scale: 1.8,
      cls: 'jg-corner-br',
    },
  ];
  for (const c of corners) {
    s += placed(rand, 'jg', 'corner', {
      ...c,
      spread: 84,
      grads: ['shadow', 'shadow', 'silhouette', 'deep'],
      kinds: ['monstera', 'palm', 'banana', 'fern'],
      detail: false,
      filter: 'soft',
      sway: 'fore',
    });
  }
  for (const [index, vx] of [150, 330, 1130, 1380].entries()) {
    const len = 280 + rand() * 300;
    const drift = (rand() - 0.5) * 90;
    let vine = `<path class="jg-vine-stem" d="M0 0Q${n(drift)} ${n(len * 0.55)} ${n(drift * 0.4)} ${n(len)}"/>`;
    const leafN = Math.floor(len / 36);
    for (let i = 1; i <= leafN; i++) {
      const t = i / leafN;
      const lx = drift * (2 * t * (1 - t) * 0.55 + t * t * 0.4);
      const ly = len * t;
      const side = i % 2 === 0 ? 1 : -1;
      const ll = 32 * (1 - t * 0.25) * (0.8 + rand() * 0.4);
      vine += `<g class="jg-leaf" data-leaf="vine" transform="translate(${n(lx)} ${n(ly)}) rotate(${n(side * (96 + rand() * 26))})"><g class="jg-blade"><path fill="url(#jg-g-${rand() > 0.5 ? 'shade' : 'deep'})" d="${simpleLeaf(ll)}"/></g></g>`;
    }
    const w = 200;
    const h = len + 60;
    s +=
      `<div class="jg-vine" data-ambient="vine" data-vine="${index}" style="left:${n((vx / FRAME_W) * 100)}%;--jg-pct:${n((w / FRAME_W) * 100)}%;--jg-w:${w};aspect-ratio:${w}/${n(h)}">` +
      `<svg viewBox="-100 -20 ${w} ${n(h)}" aria-hidden="true" focusable="false">${vine}</svg></div>\n`;
  }
  return s;
}

// ------------------------------------------------ section anchor clusters
function makeSprig(seed, aim, kinds, grads, count = 3, scale = 1) {
  const rand = mulberry32(seed);
  const art = cluster(rand, 'jg', {
    aim,
    spread: 120,
    count,
    scale,
    grads,
    kinds,
  });
  const b = bbox(art.pts, 20);
  return `<svg viewBox="${n(b.x)} ${n(b.y)} ${n(b.w)} ${n(b.h)}" class="jg-sprig-art" aria-hidden="true" focusable="false" data-anchor="${n((-b.x / b.w) * 100)} ${n((-b.y / b.h) * 100)}">${art.svg}</svg>`;
}

writeFileSync(join(publicDir, 'canopy.svg'), makeCanopy());
writeFileSync(join(artDir, 'defs.svg'), makeDefs());
writeFileSync(join(artDir, 'mid.html'), makeMid());
writeFileSync(join(artDir, 'fore.html'), makeFore());
writeFileSync(
  join(artDir, 'sprig-a.svg'),
  makeSprig(11, 35, ['monstera', 'fern'], ['mid', 'lit', 'teal'], 4, 0.72),
);
writeFileSync(
  join(artDir, 'sprig-b.svg'),
  makeSprig(23, -40, ['palm', 'philo'], ['lit', 'bright', 'golden'], 4, 0.66),
);
writeFileSync(
  join(artDir, 'sprig-c.svg'),
  makeSprig(
    37,
    150,
    ['fern', 'philo', 'banana'],
    ['shade', 'mid', 'teal'],
    4,
    0.6,
  ),
);
writeFileSync(
  join(artDir, 'sprig-d.svg'),
  makeSprig(53, -150, ['monstera', 'palm'], ['mid', 'lit', 'golden'], 3, 0.75),
);
console.log('jungle art written');
