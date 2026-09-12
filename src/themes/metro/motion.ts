import { gsap } from 'gsap';

export function ambient(scene: HTMLElement) {
  const glow = scene.querySelector('[data-ambient="lamp-glow"]');
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
