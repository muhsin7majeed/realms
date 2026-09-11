import { gsap } from 'gsap';

export function ambient(scene: HTMLElement) {
  return gsap
    .timeline({ repeat: -1, yoyo: true })
    .fromTo(
      scene.querySelector('[data-ambient="light"]'),
      { opacity: 0.35 },
      { opacity: 0.8, duration: 7, ease: 'sine.inOut' },
    );
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
