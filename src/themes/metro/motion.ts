import { gsap } from 'gsap';

function setupSwing(scene: HTMLElement) {
  const hit = scene.querySelector<HTMLElement>('[data-lamp-hit]')!;
  const visual = scene.querySelector<HTMLElement>('[data-lamp-visual]')!;
  visual.classList.remove('is-swinging');
  if (hit.dataset.lampReady) return;
  hit.dataset.lampReady = 'true';
  hit.addEventListener('pointerenter', () => {
    if (
      document.documentElement.dataset.motion !== 'running' ||
      visual.classList.contains('is-swinging')
    )
      return;
    visual.classList.add('is-swinging');
  });
  const clearSwing = () => visual.classList.remove('is-swinging');
  visual.addEventListener('animationend', clearSwing);
  visual.addEventListener('animationcancel', clearSwing);
}

export function ambient(scene: HTMLElement) {
  setupSwing(scene);
  const glow = scene.querySelectorAll('[data-ambient="lamp-glow"]');
  return gsap
    .timeline({ repeat: -1 })
    .set(glow, { opacity: 1 })
    .to(glow, { opacity: 0.24, duration: 0.1, ease: 'none' }, 1.3)
    .to(glow, { opacity: 0.88, duration: 0.12, ease: 'none' })
    .to(glow, { opacity: 0.08, duration: 0.1, ease: 'none' })
    .to(glow, { opacity: 1, duration: 0.16, ease: 'power1.out' })
    .to(glow, { opacity: 0.52, duration: 0.1, ease: 'none' }, 1.88)
    .to(glow, { opacity: 1, duration: 0.2, ease: 'power1.out' })
    .to(glow, { opacity: 0.12, duration: 0.08, ease: 'none' }, 6.25)
    .to(glow, { opacity: 0.72, duration: 0.07, ease: 'none' })
    .to(glow, { opacity: 0.3, duration: 0.05, ease: 'none' })
    .to(glow, { opacity: 1, duration: 0.2, ease: 'power1.out' })
    .to(glow, { opacity: 1, duration: 0.01 }, 13.5);
}

export function enter(scene: HTMLElement) {
  return gsap.timeline().from(scene.querySelectorAll('[data-reveal]'), {
    y: 8,
    opacity: 0,
    duration: 0.45,
    stagger: 0.07,
    ease: 'power2.out',
    clearProps: 'transform,opacity',
  });
}
