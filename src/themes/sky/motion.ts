import { gsap } from 'gsap';
import { createSky, type SkyRenderer, type SkyState } from './shader';

const root = document.documentElement;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const compact = matchMedia('(max-width: 760px)');
const isActive = () => root.dataset.theme === 'sky';
const isRunning = () => root.dataset.motion === 'running';
const DECK = 0.45;

interface Bird {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// One loop owns the whole ascent: it renders the sky shader, integrates the
// wind field, steers the flock, tilts panels, pulls magnetic buttons and writes
// altitude to CSS. It runs only while the world is active and motion is
// running; paused or reduced motion gets a still frame that follows scroll.
function setupAscent(scene: HTMLElement) {
  const canvas = scene.querySelector<HTMLCanvasElement>('.sk-canvas')!;
  const lowPower = compact.matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  let sky: SkyRenderer | null = null;
  try {
    sky = createSky(canvas, {
      scale: lowPower ? 0.38 : 0.5,
      octaves: lowPower ? 3 : 5,
    });
  } catch {
    sky = null;
  }
  scene.dataset.sky = sky ? 'webgl' : 'css';

  const light = scene.querySelector<HTMLElement>('.sk-light')!;
  const readout = scene.querySelector<HTMLElement>('[data-altitude]');
  const flash = scene.querySelector<HTMLElement>('.sk-flash');
  const clouds = Array.from(scene.querySelectorAll<HTMLElement>('.sk-cloud'));
  const kite = scene.querySelector<HTMLElement>('.sk-kite-body');
  const panels = Array.from(scene.querySelectorAll<HTMLElement>('[data-tilt]'));
  const magnets = Array.from(
    scene.querySelectorAll<HTMLElement>('[data-magnet]'),
  );
  const heading = scene.querySelector<HTMLElement>('h1')!;
  const birds: Bird[] = Array.from(
    scene.querySelectorAll<HTMLElement>('.sk-bird'),
  ).map((el, index) => ({
    el,
    x: (index + 1) * 120,
    y: 120 + (index % 3) * 40,
    vx: 1.2,
    vy: 0,
  }));

  const state: SkyState = {
    time: 0,
    altitude: 0,
    drift: [0, 0],
    pointer: [0.5, 0.5],
    velocity: [0, 0],
    gust: 0,
  };
  let frame = 0;
  let started = 0;
  let lastTick = 0;
  let targetAltitude = 0;
  let wind: [number, number] = [0, 0]; // decaying velocity fed by the pointer
  let offset: [number, number] = [0, 0]; // springy DOM cloud displacement
  let pointerPx: [number, number] = [-1e3, -1e3];
  let lastPointer: [number, number] | null = null;
  let lastPointerTime = 0;
  let gustHeld = false;
  let lastDeckSide = 0;
  let writtenAltitude = -1;
  let frames = 0;
  let headingRect = heading.getBoundingClientRect();
  let rectAge = 0;

  const measure = () => {
    targetAltitude = Math.min(
      1,
      Math.max(0, scrollY / Math.max(1, root.scrollHeight - innerHeight)),
    );
  };

  const writeAltitude = (force = false) => {
    if (!force && Math.abs(state.altitude - writtenAltitude) < 0.003) return;
    writtenAltitude = state.altitude;
    scene.style.setProperty('--sk-alt', state.altitude.toFixed(3));
    if (readout)
      readout.textContent = `${Math.round(state.altitude * 11000).toLocaleString('en-US')} m`;
    const side = state.altitude > DECK ? 1 : -1;
    if (lastDeckSide && side !== lastDeckSide && flash && isRunning())
      gsap.fromTo(
        flash,
        { opacity: 0 },
        {
          opacity: 0.6,
          duration: 0.22,
          yoyo: true,
          repeat: 1,
          ease: 'sine.out',
        },
      );
    lastDeckSide = side;
  };

  const renderStill = () => {
    measure();
    state.altitude = targetAltitude;
    state.velocity = [0, 0];
    state.gust = 0;
    sky?.resize();
    sky?.render(state);
    writeAltitude(true);
    frames += 1;
    canvas.dataset.frames = String(frames);
  };

  const steerBirds = (dt: number) => {
    if (!birds.length) return;
    const width = innerWidth;
    const ceiling = 70;
    const floor = innerHeight * 0.5;
    for (const bird of birds) {
      let ax = 0;
      let ay = 0;
      let count = 0;
      let cx = 0;
      let cy = 0;
      let avx = 0;
      let avy = 0;
      for (const other of birds) {
        if (other === bird) continue;
        const dx = other.x - bird.x;
        const dy = other.y - bird.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 220) {
          count += 1;
          cx += other.x;
          cy += other.y;
          avx += other.vx;
          avy += other.vy;
          if (dist < 48) {
            ax -= (dx / dist) * (1 - dist / 48) * 0.9;
            ay -= (dy / dist) * (1 - dist / 48) * 0.9;
          }
        }
      }
      if (count) {
        ax += ((cx / count - bird.x) / 220) * 0.12;
        ay += ((cy / count - bird.y) / 220) * 0.12;
        ax += (avx / count - bird.vx) * 0.08;
        ay += (avy / count - bird.vy) * 0.08;
      }
      // The pointer is a hawk: veer away.
      const px = bird.x - pointerPx[0];
      const py = bird.y - pointerPx[1];
      const pd = Math.hypot(px, py) || 1;
      if (pd < 180) {
        ax += (px / pd) * (1 - pd / 180) * 1.6;
        ay += (py / pd) * (1 - pd / 180) * 1.6;
      }
      // Keep clear of the name.
      if (
        bird.x > headingRect.left - 40 &&
        bird.x < headingRect.right + 40 &&
        bird.y > headingRect.top - 40 &&
        bird.y < headingRect.bottom + 40
      )
        ay += bird.y < (headingRect.top + headingRect.bottom) / 2 ? -0.5 : 0.5;
      if (bird.y < ceiling) ay += 0.25;
      if (bird.y > floor) ay -= 0.25;
      ax += wind[0] * 0.02 + 0.05;
      ay += wind[1] * 0.01;
      bird.vx += ax * dt;
      bird.vy += ay * dt;
      const speed = Math.hypot(bird.vx, bird.vy) || 1;
      const clamped = Math.min(2.6, Math.max(1.1, speed));
      bird.vx = (bird.vx / speed) * clamped;
      bird.vy = (bird.vy / speed) * clamped;
      bird.x += bird.vx * dt;
      bird.y += bird.vy * dt;
      if (bird.x > width + 60) bird.x = -60;
      if (bird.x < -80) bird.x = width + 40;
      const angle = (Math.atan2(bird.vy, bird.vx) * 180) / Math.PI;
      bird.el.style.transform = `translate3d(${bird.x.toFixed(1)}px, ${bird.y.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;
    }
  };

  const tick = (now: number) => {
    frame = 0;
    if (!isActive()) {
      clear();
      return;
    }
    if (!isRunning()) {
      renderStill();
      return;
    }
    const dt = Math.min(2.5, lastTick ? (now - lastTick) / 16.67 : 1);
    lastTick = now;
    state.time = (now - started) / 1000;
    measure();
    state.altitude += (targetAltitude - state.altitude) * 0.1 * dt;

    // Wind decays; drift accumulates so shader clouds keep streaming.
    wind = [wind[0] * Math.pow(0.94, dt), wind[1] * Math.pow(0.94, dt)];
    state.drift = [
      state.drift[0] + wind[0] * 0.0009 * dt,
      state.drift[1] + wind[1] * 0.0006 * dt,
    ];
    state.velocity = [
      state.velocity[0] + (wind[0] * 0.02 - state.velocity[0]) * 0.15 * dt,
      state.velocity[1] + (wind[1] * 0.02 - state.velocity[1]) * 0.15 * dt,
    ];
    state.gust += ((gustHeld ? 1 : 0) - state.gust) * 0.08 * dt;
    // DOM clouds are on a spring: pushed by wind, settling home.
    offset = [
      offset[0] + (wind[0] * 0.9 - offset[0]) * 0.06 * dt,
      offset[1] + (wind[1] * 0.5 - offset[1]) * 0.06 * dt,
    ];
    clouds.forEach((cloud) => {
      const depth = Number(cloud.dataset.depth ?? 1);
      cloud.style.transform = `translate3d(${(offset[0] * depth).toFixed(2)}px, ${(offset[1] * depth * 0.4).toFixed(2)}px, 0)`;
    });
    if (kite)
      kite.style.transform = `rotate(${(offset[0] * 0.08 - 6).toFixed(2)}deg)`;

    if (finePointer.matches) {
      for (const panel of panels) {
        const rect = panel.getBoundingClientRect();
        const near =
          pointerPx[0] > rect.left - 160 &&
          pointerPx[0] < rect.right + 160 &&
          pointerPx[1] > rect.top - 160 &&
          pointerPx[1] < rect.bottom + 160;
        const rx = near
          ? ((rect.top + rect.height / 2 - pointerPx[1]) / rect.height) * 2.4
          : 0;
        const ry = near
          ? ((pointerPx[0] - rect.left - rect.width / 2) / rect.width) * 2.4
          : 0;
        gsap.set(panel, {
          rotationX: `+=${((rx - (gsap.getProperty(panel, 'rotationX') as number)) * 0.12).toFixed(3)}`,
          rotationY: `+=${((ry - (gsap.getProperty(panel, 'rotationY') as number)) * 0.12).toFixed(3)}`,
          transformPerspective: 1100,
        });
      }
      for (const magnet of magnets) {
        const rect = magnet.getBoundingClientRect();
        const dx = pointerPx[0] - (rect.left + rect.width / 2);
        const dy = pointerPx[1] - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        const pull = dist < 110 ? (1 - dist / 110) * 10 : 0;
        const tx = dist ? (dx / dist) * pull : 0;
        const ty = dist ? (dy / dist) * pull : 0;
        gsap.set(magnet, {
          x: `+=${((tx - (gsap.getProperty(magnet, 'x') as number)) * 0.2).toFixed(3)}`,
          y: `+=${((ty - (gsap.getProperty(magnet, 'y') as number)) * 0.2).toFixed(3)}`,
        });
      }
    }

    rectAge += dt;
    if (rectAge > 45) {
      headingRect = heading.getBoundingClientRect();
      rectAge = 0;
    }
    steerBirds(dt);

    sky?.render(state);
    frames += 1;
    canvas.dataset.frames = String(frames);
    writeAltitude();
    frame = requestAnimationFrame(tick);
  };

  const clear = () => {
    clouds.forEach((cloud) => cloud.style.removeProperty('transform'));
    kite?.style.removeProperty('transform');
    birds.forEach((bird) => bird.el.style.removeProperty('transform'));
    gsap.set([...panels, ...magnets], { clearProps: 'transform' });
    scene.style.removeProperty('--sk-alt');
    writtenAltitude = -1;
    lastDeckSide = 0;
    lastTick = 0;
  };

  const start = () => {
    if (frame || !isActive()) return;
    if (!started) started = performance.now();
    frame = requestAnimationFrame(tick);
  };

  addEventListener('scroll', start, { passive: true });
  addEventListener('resize', () => {
    if (!isActive()) return;
    sky?.resize();
    headingRect = heading.getBoundingClientRect();
    start();
  });
  addEventListener(
    'pointermove',
    (event) => {
      if (!isActive()) return;
      const now = performance.now();
      pointerPx = [event.clientX, event.clientY];
      state.pointer = [
        event.clientX / innerWidth,
        1 - event.clientY / innerHeight,
      ];
      if (lastPointer && finePointer.matches) {
        const dt = Math.max(8, now - lastPointerTime);
        const vx = ((event.clientX - lastPointer[0]) / dt) * 16;
        const vy = ((event.clientY - lastPointer[1]) / dt) * 16;
        wind = [
          Math.max(-60, Math.min(60, wind[0] + vx * 0.35)),
          Math.max(-60, Math.min(60, wind[1] + vy * 0.35)),
        ];
      }
      lastPointer = [event.clientX, event.clientY];
      lastPointerTime = now;
      start();
    },
    { passive: true },
  );
  addEventListener('pointerdown', (event) => {
    if (!isActive() || !finePointer.matches) return;
    if ((event.target as Element).closest('a, button')) return;
    gustHeld = true;
  });
  addEventListener('pointerup', () => {
    gustHeld = false;
  });
  addEventListener('pointercancel', () => {
    gustHeld = false;
  });
  new MutationObserver(start).observe(root, {
    attributes: true,
    attributeFilter: ['data-motion', 'data-theme'],
  });
  return { start, renderStill, light };
}

let ascent: ReturnType<typeof setupAscent> | undefined;

export function ambient(scene: HTMLElement) {
  ascent ??= setupAscent(scene);
  ascent.start();

  const timeline = gsap.timeline();
  // The occluder cloud crosses the hero; the near clouds breathe in place.
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="traverse"]')
    .forEach((cloud, index) => {
      timeline.fromTo(
        cloud,
        { xPercent: -140 },
        { xPercent: 140, duration: 110 + index * 30, ease: 'none', repeat: -1 },
        -index * 50,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="bob"]')
    .forEach((el, index) => {
      timeline.fromTo(
        el,
        { y: -8 },
        {
          y: 8,
          duration: 5 + index * 1.7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        -index * 2,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="balloon"]')
    .forEach((el, index) => {
      timeline.fromTo(
        el,
        { y: 12, rotation: -2 },
        {
          y: -14,
          rotation: 2,
          duration: 9 + index * 3,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        -index * 4,
      );
    });
  const contrail = scene.querySelector<SVGPathElement>(
    '[data-ambient="contrail"]',
  );
  if (contrail) {
    const length = contrail.getTotalLength();
    gsap.set(contrail, { strokeDasharray: length, strokeDashoffset: length });
    timeline.to(
      contrail,
      {
        keyframes: {
          '0%': { strokeDashoffset: length, opacity: 0 },
          '6%': { opacity: 0.85 },
          '70%': { strokeDashoffset: 0, opacity: 0.85 },
          '100%': { strokeDashoffset: 0, opacity: 0 },
          easeEach: 'none',
        },
        duration: 22,
        repeat: -1,
        repeatDelay: 30,
        ease: 'none',
      },
      6,
    );
  }
  return timeline;
}

export function enter(scene: HTMLElement) {
  return gsap
    .timeline()
    .from(
      scene.querySelectorAll('.sk-layer[data-reveal]'),
      {
        opacity: 0,
        duration: 1.4,
        stagger: 0.15,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
      0,
    )
    .from(
      scene.querySelectorAll('[data-reveal]:not(.sk-layer)'),
      {
        y: 16,
        opacity: 0,
        duration: 0.6,
        stagger: 0.07,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
      0.3,
    );
}
