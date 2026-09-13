import { gsap } from 'gsap';

const root = document.documentElement;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const isActive = () => root.dataset.theme === 'jungle';
const isRunning = () => root.dataset.motion === 'running';
// Deterministic desync so identical clusters never move in lockstep.
const spread = (index: number) => ((index * 7919) % 1000) / 1000;

const SWAY: Record<string, number> = { mid: 1.6, fore: 2.2, vine: 3.4 };

// Depth planes ride a fixed stage. Scroll progress descends into the
// understory (near planes rise faster, light fades); a fine pointer adds a
// small parallax shift. One rAF/lerp loop, self-terminating when settled.
function setupParallax(scene: HTMLElement) {
  const layers = Array.from(scene.querySelectorAll<HTMLElement>('.jg-layer'));
  const depths = layers.map((layer) => Number(layer.dataset.depth));
  let frame = 0;
  let scroll = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  const clear = () => {
    layers.forEach((layer) => layer.style.removeProperty('transform'));
    scene.style.removeProperty('--jg-descent');
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
      const x = pointerX * depth * -60;
      const y = scroll * depth * -420 + pointerY * depth * -36;
      layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
    scene.style.setProperty('--jg-descent', scroll.toFixed(3));
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

// Leaves rustle around their stem on direct hover; neighbours answer softly.
// CSS owns the one-shot animation; classes clear themselves when it ends.
function setupRustle(scene: HTMLElement) {
  const settle = (event: AnimationEvent) => {
    const blade = event.target as Element;
    if (blade.classList?.contains('jg-blade'))
      blade.classList.remove('is-rustling', 'is-rustling-soft');
  };
  scene.addEventListener('animationend', settle);
  scene.addEventListener('animationcancel', settle);
  scene.addEventListener('pointerover', (event) => {
    if (!isRunning()) return;
    const leaf = (event.target as Element).closest?.('.jg-leaf');
    if (!leaf || leaf.contains(event.relatedTarget as Node | null)) return;
    const blade = leaf.querySelector('.jg-blade');
    if (!blade || blade.classList.contains('is-rustling')) return;
    blade.classList.remove('is-rustling-soft');
    blade.classList.add('is-rustling');
    for (const neighbour of [
      leaf.previousElementSibling,
      leaf.nextElementSibling,
    ]) {
      const soft = neighbour?.classList.contains('jg-leaf')
        ? neighbour.querySelector('.jg-blade')
        : null;
      if (soft && !soft.classList.contains('is-rustling'))
        soft.classList.add('is-rustling-soft');
    }
  });
}

let wakeParallax: (() => void) | undefined;

export function ambient(scene: HTMLElement) {
  if (!scene.dataset.jungleReady) {
    scene.dataset.jungleReady = 'true';
    setupRustle(scene);
    wakeParallax = setupParallax(scene);
  }
  wakeParallax?.();

  const timeline = gsap.timeline();
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="sway"]')
    .forEach((cluster, index) => {
      const amplitude = SWAY[cluster.dataset.sway ?? ''] ?? 1.8;
      const seed = spread(index);
      timeline.fromTo(
        cluster,
        { rotation: -amplitude },
        {
          rotation: amplitude,
          duration: 3.4 + seed * 2.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        seed * -6,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="vine"]')
    .forEach((vine, index) => {
      const seed = spread(index + 3);
      timeline.fromTo(
        vine,
        { rotation: -SWAY.vine },
        {
          rotation: SWAY.vine,
          duration: 4.2 + seed * 2.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        seed * -5,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="ray"]')
    .forEach((ray, index) => {
      timeline.to(
        ray,
        {
          opacity: 0.45,
          skewX: -11,
          duration: 5.5 + index * 1.3,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        index * -2.2,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="mist"]')
    .forEach((mist, index) => {
      timeline.to(
        mist,
        {
          xPercent: index ? -5 : 6,
          duration: 19 + index * 4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
        0,
      );
    });
  scene
    .querySelectorAll<HTMLElement>('[data-ambient="mote"]')
    .forEach((mote, index) => {
      const seed = spread(index + 11);
      const duration = 7 + seed * 5;
      timeline.fromTo(
        mote,
        { y: 24, x: 0, opacity: 0 },
        {
          keyframes: {
            '0%': { y: 24, x: 0, opacity: 0 },
            '22%': { opacity: 0.9 },
            '52%': { x: (seed - 0.5) * 40, opacity: 0.45 },
            '78%': { opacity: 0.85 },
            '100%': { y: -(80 + seed * 90), x: (seed - 0.5) * 60, opacity: 0 },
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
      scene.querySelectorAll('.jg-layer-inner[data-reveal]'),
      {
        opacity: 0,
        scale: 1.05,
        duration: 1.2,
        stagger: 0.12,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
      0,
    )
    .from(
      scene.querySelectorAll('[data-reveal]:not(.jg-layer-inner)'),
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
