import { gsap } from 'gsap';

const root = document.documentElement;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const isActive = () => root.dataset.theme === 'space';
const isRunning = () => root.dataset.motion === 'running';
// Deterministic desync so bodies never move in lockstep.
const spread = (index: number) => ((index * 7919) % 1000) / 1000;

// Depth planes ride a fixed stage. Scroll progress pushes deeper into the
// field (near planes rise faster, the nebula brightens); a fine pointer adds a
// small parallax shift. One rAF/lerp loop, self-terminating when settled.
function setupParallax(scene: HTMLElement) {
  const layers = Array.from(scene.querySelectorAll<HTMLElement>('.sp-layer'));
  const depths = layers.map((layer) => Number(layer.dataset.depth));
  const light = scene.querySelector<HTMLElement>('.sp-layer-light')!;
  let frame = 0;
  let scroll = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  const clear = () => {
    layers.forEach((layer) => layer.style.removeProperty('transform'));
    light.style.removeProperty('--sp-descent');
    scroll = pointerX = pointerY = 0;
  };
  const tick = () => {
    frame = 0;
    if (!isActive()) {
      clear();
      return;
    }
    if (!isRunning()) return;
    const range = Math.max(1, root.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / range));
    const before = scroll + pointerX + pointerY;
    scroll += (progress - scroll) * 0.12;
    pointerX += (targetX - pointerX) * 0.08;
    pointerY += (targetY - pointerY) * 0.08;
    layers.forEach((layer, index) => {
      const depth = depths[index];
      const x = pointerX * depth * -70;
      const y = scroll * depth * -460 + pointerY * depth * -40;
      layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
    light.style.setProperty('--sp-descent', scroll.toFixed(3));
    if (Math.abs(scroll + pointerX + pointerY - before) > 0.0004)
      frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!frame && isActive()) frame = requestAnimationFrame(tick);
  };
  addEventListener('scroll', start, { passive: true });
  addEventListener('resize', start);
  addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches || !isActive()) return;
      targetX = event.clientX / innerWidth - 0.5;
      targetY = event.clientY / innerHeight - 0.5;
      start();
    },
    { passive: true },
  );
  return start;
}

// Bodies pulse on direct hover; neighbours in the same cluster answer softly.
// CSS owns the one-shot animation; classes clear themselves when it ends.
function setupPulse(scene: HTMLElement) {
  const settle = (event: AnimationEvent) => {
    const core = event.target as Element;
    if (core.classList?.contains('sp-core'))
      core.classList.remove('is-pulsing', 'is-pulsing-soft');
  };
  scene.addEventListener('animationend', settle);
  scene.addEventListener('animationcancel', settle);
  scene.addEventListener('pointerover', (event) => {
    if (!isRunning()) return;
    const body = (event.target as Element).closest?.('.sp-object');
    if (!body || body.contains(event.relatedTarget as Node | null)) return;
    const core = body.querySelector('.sp-core');
    if (!core || core.classList.contains('is-pulsing')) return;
    core.classList.remove('is-pulsing-soft');
    core.classList.add('is-pulsing');
    for (const neighbour of [
      body.previousElementSibling,
      body.nextElementSibling,
    ]) {
      const soft = neighbour?.classList.contains('sp-object')
        ? neighbour.querySelector('.sp-core')
        : null;
      if (soft && !soft.classList.contains('is-pulsing'))
        soft.classList.add('is-pulsing-soft');
    }
  });
}

let wakeParallax: (() => void) | undefined;

export function ambient(scene: HTMLElement) {
  if (!scene.dataset.spaceReady) {
    scene.dataset.spaceReady = 'true';
    setupPulse(scene);
    wakeParallax = setupParallax(scene);
  }
  wakeParallax?.();

  const timeline = gsap.timeline();
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="drift"]')
    .forEach((body, index) => {
      const seed = spread(index);
      const amplitude = body.classList.contains('sp-constellation') ? 4 : 10;
      timeline.fromTo(
        body,
        { y: -amplitude },
        {
          y: amplitude,
          duration: 6 + seed * 5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        seed * -8,
      );
      if (body.dataset.tumble)
        timeline.to(
          body,
          {
            rotation: seed > 0.5 ? 360 : -360,
            duration: 70 + seed * 90,
            ease: 'none',
            repeat: -1,
          },
          0,
        );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="orbit"]')
    .forEach((orbit, index) => {
      timeline.to(
        orbit,
        { rotation: 360, duration: 26 + index * 14, ease: 'none', repeat: -1 },
        0,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="nebula"]')
    .forEach((nebula, index) => {
      timeline.fromTo(
        nebula,
        { scale: 1 },
        {
          scale: 1.07,
          duration: 12 + index * 3,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        index * -4,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="comet"]')
    .forEach((comet, index) => {
      const seed = spread(index + 5);
      const angle =
        (Number(comet.style.getPropertyValue('--sp-angle').replace('deg', '')) *
          Math.PI) /
        180;
      const distance = 700 + seed * 500;
      timeline.fromTo(
        comet,
        { x: 0, y: 0, opacity: 0 },
        {
          keyframes: {
            '0%': { x: 0, y: 0, opacity: 0 },
            '12%': { opacity: 1 },
            '70%': { opacity: 0.7 },
            '100%': {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
            },
            easeEach: 'none',
          },
          duration: 1.6 + seed * 0.8,
          ease: 'none',
          repeat: -1,
          repeatDelay: 6 + seed * 9,
        },
        2 + index * 4.5,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="dust"]')
    .forEach((mote, index) => {
      const seed = spread(index + 11);
      const duration = 9 + seed * 7;
      timeline.fromTo(
        mote,
        { y: 30, x: 0, opacity: 0 },
        {
          keyframes: {
            '0%': { y: 30, x: 0, opacity: 0 },
            '25%': { opacity: 0.8 },
            '55%': { x: (seed - 0.5) * 50, opacity: 0.35 },
            '80%': { opacity: 0.75 },
            '100%': { y: -(90 + seed * 90), x: (seed - 0.5) * 70, opacity: 0 },
            easeEach: 'none',
          },
          duration,
          repeat: -1,
          ease: 'none',
        },
        -seed * duration,
      );
    });
  return timeline;
}

export function enter(scene: HTMLElement) {
  return gsap
    .timeline()
    .from(
      scene.querySelectorAll('.sp-layer-inner[data-reveal]'),
      {
        opacity: 0,
        scale: 1.06,
        duration: 1.3,
        stagger: 0.12,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
      0,
    )
    .from(
      scene.querySelectorAll('[data-reveal]:not(.sp-layer-inner)'),
      {
        y: 14,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
      0.3,
    );
}
