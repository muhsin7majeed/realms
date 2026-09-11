import { gsap } from 'gsap';

export function ambient(scene: HTMLElement) {
  const timeline = gsap.timeline({ repeat: -1 });
  timeline.to(
    scene.querySelector('[data-ambient="orbit"]'),
    { rotation: 360, duration: 100, ease: 'none' },
    0,
  );
  timeline.to(
    scene.querySelector('[data-ambient="star"]'),
    {
      opacity: 0.35,
      scale: 0.86,
      duration: 5,
      repeat: 19,
      yoyo: true,
      ease: 'sine.inOut',
    },
    0,
  );
  return timeline;
}

export function enter(scene: HTMLElement) {
  return gsap.timeline().from(scene.querySelectorAll('[data-reveal]'), {
    y: 17,
    opacity: 0,
    duration: 0.65,
    stagger: 0.045,
    ease: 'power2.out',
    clearProps: 'transform,opacity',
  });
}
