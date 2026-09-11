import { gsap } from 'gsap';

export function ambient(scene: HTMLElement) {
  const timeline = gsap.timeline({ repeat: -1 });
  timeline.to(
    scene.querySelector('[data-ambient="ring"]'),
    { rotation: -360, duration: 80, ease: 'none' },
    0,
  );
  timeline.fromTo(
    scene.querySelector('[data-ambient="scan"]'),
    { y: 0, opacity: 0 },
    {
      keyframes: [
        { opacity: 0.5, duration: 1 },
        { y: 330, duration: 7, ease: 'none' },
        { opacity: 0, duration: 2 },
      ],
      repeat: 7,
    },
    0,
  );
  return timeline;
}

export function enter(scene: HTMLElement) {
  return gsap.timeline().from(scene.querySelectorAll('[data-reveal]'), {
    x: -16,
    opacity: 0,
    duration: 0.4,
    stagger: 0.055,
    ease: 'power3.out',
    clearProps: 'transform,opacity',
  });
}
