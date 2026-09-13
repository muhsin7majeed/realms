// Sky theme SVG art generator (deterministic, seeded).
//
// Outputs:
//   src/themes/sky/art/defs.svg      shared gradients + soft filter, inlined once
//   src/themes/sky/art/clouds.html   positioned near-plane clouds (DOM, wind-reactive)
//   src/themes/sky/art/hero-cloud.svg  the occluder that crosses the hero
//   src/themes/sky/art/balloon.svg   hot-air balloon
//   src/themes/sky/art/kite.svg      kite with tail
//
// Far and mid clouds live in the WebGL shader; these are the near objects that
// overlap the type. Each cloud is an outer wrapper (GSAP bob) around an inner
// `.sk-cloud` (JS wind spring) so no element is driven by two systems.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, '../src/themes/sky/art');
mkdirSync(artDir, { recursive: true });

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

const defs =
  `<svg class="sk-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
  `<linearGradient id="sk-g-cloud" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".62" stop-color="#f3f6fc"/><stop offset="1" stop-color="#c9d4ea"/></linearGradient>` +
  `<linearGradient id="sk-g-cloud-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#9fb0d4" stop-opacity=".55"/></linearGradient>` +
  `<linearGradient id="sk-g-balloon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a59"/><stop offset=".5" stop-color="#ffb547"/><stop offset="1" stop-color="#ff7a59"/></linearGradient>` +
  `<linearGradient id="sk-g-kite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset="1" stop-color="#ffb547"/></linearGradient>` +
  `<filter id="sk-soft" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="2.2"/></filter>` +
  `<filter id="sk-softer" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>` +
  `</defs></svg>`;

// A cumulus: a flat base with a handful of overlapping domes.
function cloud(rand, width, height, soft) {
  const domes = 5 + Math.floor(rand() * 4);
  let body = '';
  let shade = '';
  for (let i = 0; i < domes; i++) {
    const t = (i + 0.5) / domes;
    const cx = width * (0.1 + 0.8 * t) + (rand() - 0.5) * width * 0.06;
    const r = height * (0.28 + rand() * 0.22) * (1 - Math.abs(t - 0.5) * 0.8);
    const cy = height * 0.68 - r * 0.9;
    body += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
    shade += `<ellipse cx="${n(cx)}" cy="${n(cy + r * 0.35)}" rx="${n(r * 0.9)}" ry="${n(r * 0.5)}"/>`;
  }
  body += `<rect x="${n(width * 0.06)}" y="${n(height * 0.42)}" width="${n(width * 0.88)}" height="${n(height * 0.3)}" rx="${n(height * 0.15)}"/>`;
  return (
    `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">` +
    `<g filter="url(#${soft ? 'sk-softer' : 'sk-soft'})"><g fill="url(#sk-g-cloud)">${body}</g><g fill="url(#sk-g-cloud-shade)" opacity=".7">${shade}</g></g></svg>`
  );
}

function makeClouds() {
  const rand = mulberry32(9101);
  const specs = [
    {
      left: -17,
      top: 66,
      width: 30,
      depth: 1.4,
      soft: false,
      cls: 'sk-near-l',
    },
    { left: 81, top: 72, width: 34, depth: 1.8, soft: false, cls: 'sk-near-r' },
    { left: 38, top: 95, width: 46, depth: 1.1, soft: true, cls: 'sk-near-b' },
    { left: 84, top: 6, width: 24, depth: 0.9, soft: true, cls: 'sk-near-t' },
  ];
  let s = '';
  for (const spec of specs) {
    const w = 400;
    const h = 220;
    s +=
      `<div class="sk-near ${spec.cls}" data-ambient="bob" style="left:${spec.left}%;top:${spec.top}%;width:${spec.width}%">` +
      `<div class="sk-cloud" data-depth="${spec.depth}">${cloud(rand, w, h, spec.soft)}</div></div>\n`;
  }
  return s;
}

const heroCloud = cloud(mulberry32(1717), 520, 240, false);

const balloon =
  `<svg viewBox="0 0 120 200" aria-hidden="true" focusable="false">` +
  `<path d="M60 8C28 8 12 34 12 66c0 30 24 54 40 74h16c16-20 40-44 40-74C108 34 92 8 60 8Z" fill="url(#sk-g-balloon)"/>` +
  `<path d="M60 8c-10 0-18 30-18 66 0 28 10 50 18 66 8-16 18-38 18-66C78 38 70 8 60 8Z" fill="#fff" opacity=".22"/>` +
  `<path d="M52 140l-6 30M68 140l6 30" stroke="#5a3d2b" stroke-width="1.6"/>` +
  `<rect x="44" y="168" width="32" height="22" rx="5" fill="#8b5a3c"/>` +
  `<rect x="44" y="168" width="32" height="6" rx="3" fill="#b07a55"/></svg>`;

const kite =
  `<svg viewBox="0 0 160 260" aria-hidden="true" focusable="false">` +
  `<path class="sk-kite-string" d="M80 96C70 150 40 200 8 258" fill="none" stroke="#3b4a6b" stroke-width="1.2" opacity=".7"/>` +
  `<g class="sk-kite-body"><path d="M80 6 130 60 80 96 30 60Z" fill="url(#sk-g-kite)"/>` +
  `<path d="M80 6V96M30 60h100" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>` +
  `<path d="M80 96c-6 14 6 22 0 36-6 14 6 22 0 36" fill="none" stroke="#ff7a59" stroke-width="2.4"/></g></svg>`;

writeFileSync(join(artDir, 'defs.svg'), defs);
writeFileSync(join(artDir, 'clouds.html'), makeClouds());
writeFileSync(join(artDir, 'hero-cloud.svg'), heroCloud);
writeFileSync(join(artDir, 'balloon.svg'), balloon);
writeFileSync(join(artDir, 'kite.svg'), kite);
console.log('sky art written');
