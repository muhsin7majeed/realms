import { gsap } from 'gsap';
import * as medieval from '../themes/medieval/motion';
import * as metro from '../themes/metro/motion';
import * as cyberpunk from '../themes/cyberpunk/motion';

const worlds = {
  metro: {
    ...metro,
    color: '#151b17',
    fonts: [
      '400 32px "Russo One"',
      '400 16px "DM Sans"',
      '400 12px "IBM Plex Mono"',
    ],
  },
  medieval: {
    ...medieval,
    color: '#eee7d6',
    fonts: [
      '500 32px "Cormorant Garamond"',
      '400 20px "Cormorant Garamond"',
      'italic 400 20px "Cormorant Garamond"',
    ],
  },
  cyberpunk: {
    ...cyberpunk,
    color: '#090f13',
    fonts: [
      '700 32px "Barlow Condensed"',
      '600 24px "Barlow Condensed"',
      '400 12px "IBM Plex Mono"',
      '400 16px "DM Sans"',
    ],
  },
};
type World = keyof typeof worlds;
const root = document.documentElement;
let active = root.dataset.theme as World;
const scenes = Object.fromEntries(
  Object.keys(worlds).map((world) => [
    world,
    document.querySelector<HTMLElement>(`[data-scene="${world}"]`)!,
  ]),
) as Record<World, HTMLElement>;
const overlay = document.querySelector<HTMLElement>('.world-transition')!;
const shutter = document.querySelector<HTMLElement>(
  '.world-transition-shutter',
)!;
const bulkhead = overlay.querySelectorAll<HTMLElement>(
  '.world-transition-bulkhead > div',
);
const status = document.querySelector<HTMLElement>('[data-theme-status]')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let userPaused = false;
try {
  userPaused = localStorage.getItem('portfolio-motion') === 'paused';
} catch {}
let ambient: gsap.core.Timeline | undefined;
let entrance: gsap.core.Timeline | undefined;
let transition: gsap.core.Timeline | undefined;
let request = 0;

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function clearEntrance() {
  entrance?.kill();
  entrance = undefined;
  gsap.set(scenes[active].querySelectorAll('[data-reveal]'), {
    clearProps: 'transform,opacity',
  });
}

function updateMotion() {
  const paused = userPaused || reducedMotion.matches || document.hidden;
  root.dataset.motion = paused ? 'paused' : 'running';
  ambient?.paused(paused);
  if (paused) clearEntrance();
  document
    .querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')
    .forEach((button) => {
      button.disabled = reducedMotion.matches;
      button.setAttribute(
        'aria-pressed',
        String(userPaused || reducedMotion.matches),
      );
      const label = paused
        ? button.dataset.motionPaused!
        : button.dataset.motionRunning!;
      const purpose = reducedMotion.matches
        ? 'Ambient motion disabled by reduced-motion preference'
        : userPaused
          ? 'Resume ambient motion'
          : 'Pause ambient motion';
      button.setAttribute('aria-label', `${label} — ${purpose}`);
      button.querySelector('.motion-label')!.textContent = label;
      button.querySelector('span')!.textContent = paused ? '▷' : 'Ⅱ';
    });
}

async function prepare(world: World) {
  const images = Array.from(
    scenes[world].querySelectorAll<HTMLImageElement>('img[data-lazy-src]'),
  );
  images.forEach((image) => {
    image.src = image.dataset.lazySrc!;
    image.removeAttribute('data-lazy-src');
  });
  await Promise.all([
    ...Array.from(scenes[world].querySelectorAll<HTMLImageElement>('img'))
      .filter((image) => image.loading !== 'lazy')
      .map((image) => image.decode().catch(() => {})),
    ...worlds[world].fonts.map((font) =>
      document.fonts.load(font).catch(() => []),
    ),
  ]);
}

function syncControls() {
  document
    .querySelectorAll<HTMLButtonElement>('[data-theme-choice]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.themeChoice === active),
      ),
    );
  document.querySelector<HTMLAnchorElement>('.skip-link')!.href =
    `#${active}-home`;
  document
    .querySelector('meta[name="theme-color"]')!
    .setAttribute('content', worlds[active].color);
}

function activate(next: World) {
  const previous = scenes[active];
  const focused = document.activeElement as HTMLElement | null;
  const focusInScene = focused && previous.contains(focused);
  const region = Array.from(
    previous.querySelectorAll<HTMLElement>('main > section'),
  ).findLast((section) => section.getBoundingClientRect().top <= 80);
  const regionIndex = region
    ? Array.from(previous.querySelectorAll('main > section')).indexOf(region)
    : -1;
  const offset = region ? -region.getBoundingClientRect().top : 0;
  clearEntrance();
  ambient?.kill();
  gsap.set(previous.querySelectorAll('[data-ambient]'), {
    clearProps: 'transform,opacity',
  });
  active = next;
  root.dataset.theme = next;
  remember('portfolio-world', next);
  syncControls();
  ambient = worlds[next].ambient(scenes[next]);
  updateMotion();
  if (focusInScene) {
    let destination: HTMLElement | undefined;
    if (focused.dataset.themeChoice)
      destination = scenes[next].querySelector<HTMLElement>(
        `[data-theme-choice="${focused.dataset.themeChoice}"]`,
      )!;
    else if (focused.hasAttribute('data-motion-toggle'))
      destination = scenes[next].querySelector<HTMLElement>(
        '[data-motion-toggle]',
      )!;
    else if (focused instanceof HTMLAnchorElement)
      destination = Array.from(scenes[next].querySelectorAll('a')).find(
        (link) => link.getAttribute('href') === focused.getAttribute('href'),
      );
    if (!destination) {
      destination = scenes[next].querySelector('main')!;
      destination.tabIndex = -1;
    }
    destination.focus({ preventScroll: true });
  }
  if (regionIndex >= 0) {
    const counterpart =
      scenes[next].querySelectorAll<HTMLElement>('main > section')[regionIndex];
    window.scrollTo({
      top:
        window.scrollY +
        counterpart.getBoundingClientRect().top +
        Math.min(offset, counterpart.offsetHeight - 80),
      behavior: 'instant',
    });
  }
  if (location.hash.endsWith('-home'))
    history.replaceState(null, '', `#${next}-home`);
  status.textContent = `${scenes[next].dataset.worldName} world selected.`;
}

async function switchWorld(next: World) {
  const ownRequest = ++request;
  transition?.kill();
  transition = undefined;
  gsap.set(overlay, { autoAlpha: 0 });
  gsap.set(shutter, { xPercent: -101 });
  gsap.set(bulkhead, { yPercent: (index) => (index === 0 ? -101 : 101) });
  clearEntrance();
  if (next === active) {
    ambient ??= worlds[active].ambient(scenes[active]);
    updateMotion();
    return;
  }
  await prepare(next);
  if (ownRequest !== request) return;
  if (reducedMotion.matches || userPaused) {
    activate(next);
    return;
  }
  overlay.dataset.destination = next;
  overlay.querySelector('[data-world-label]')!.textContent =
    scenes[next].dataset.worldTitle!;
  overlay.querySelector('[data-world-caption]')!.textContent =
    scenes[next].dataset.worldTransition!;
  if (next === 'metro') {
    const label = overlay.querySelector('.world-transition-label');
    gsap.set(overlay, { autoAlpha: 1 });
    gsap.set(label, { opacity: 0 });
    transition = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay, { autoAlpha: 0 });
        transition = undefined;
      },
    });
    transition
      .to(bulkhead, { yPercent: 0, duration: 0.32, ease: 'power2.inOut' }, 0)
      .to(label, { opacity: 1, duration: 0.12 }, 0.25)
      .call(() => activate(next), [], 0.36)
      .to(label, { opacity: 0, duration: 0.12 }, 0.5)
      .to(
        bulkhead,
        {
          yPercent: (index) => (index === 0 ? -101 : 101),
          duration: 0.42,
          ease: 'power2.inOut',
        },
        0.6,
      )
      .call(
        () => {
          if (root.dataset.motion === 'running')
            entrance = worlds[next].enter(scenes[next]);
        },
        [],
        0.75,
      );
    return;
  }
  const circles = overlay.querySelectorAll('[data-transition-orbit]');
  const traces = overlay.querySelectorAll('[data-transition-trace]');
  gsap.set(overlay, { autoAlpha: 1 });
  gsap.set(overlay.querySelector('svg'), { opacity: 0 });
  gsap.set(overlay.querySelector('.world-transition-label'), { opacity: 0 });
  gsap.set(circles, {
    transformOrigin: 'center',
    scale: next === 'cyberpunk' ? 1.25 : 0.65,
  });
  gsap.set(traces, {
    strokeDasharray: 1500,
    strokeDashoffset: next === 'cyberpunk' ? 1500 : 0,
  });
  transition = gsap.timeline({
    onComplete: () => {
      gsap.set(overlay, { autoAlpha: 0 });
      transition = undefined;
    },
  });
  transition
    .to(shutter, { xPercent: 0, duration: 0.36, ease: 'power3.inOut' }, 0)
    .to(overlay.querySelector('svg'), { opacity: 1, duration: 0.18 }, 0.18)
    .to(
      overlay.querySelector('.world-transition-label'),
      { opacity: 1, duration: 0.15 },
      0.23,
    )
    .to(
      circles,
      {
        scale: next === 'cyberpunk' ? 0.7 : 1.15,
        rotation: next === 'cyberpunk' ? 30 : -30,
        duration: 0.6,
        ease: 'power2.inOut',
      },
      0.15,
    )
    .to(
      traces,
      {
        strokeDashoffset: next === 'cyberpunk' ? 0 : 1500,
        duration: 0.55,
        ease: 'power2.inOut',
      },
      0.13,
    )
    .call(
      () => {
        activate(next);
      },
      [],
      0.4,
    )
    .to(
      overlay.querySelector('.world-transition-label'),
      { opacity: 0, duration: 0.16 },
      0.52,
    )
    .to(overlay.querySelector('svg'), { opacity: 0, duration: 0.2 }, 0.56)
    .to(shutter, { xPercent: 101, duration: 0.4, ease: 'power3.inOut' }, 0.57)
    .call(
      () => {
        if (root.dataset.motion === 'running')
          entrance = worlds[next].enter(scenes[next]);
      },
      [],
      0.67,
    );
}

root.dataset.js = 'true';
syncControls();
updateMotion();
document
  .querySelectorAll<HTMLButtonElement>('[data-theme-choice]')
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => void switchWorld(button.dataset.themeChoice as World),
    );
  });
document
  .querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      userPaused = !userPaused;
      remember('portfolio-motion', userPaused ? 'paused' : 'running');
      if (userPaused && transition)
        void switchWorld(overlay.dataset.destination as World);
      updateMotion();
    });
  });
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && transition) {
    const destination = overlay.dataset.destination as World;
    void switchWorld(destination);
  }
  updateMotion();
});
document.addEventListener('visibilitychange', updateMotion);
void prepare(active).then(() => {
  if (request !== 0) return;
  ambient = worlds[active].ambient(scenes[active]);
  updateMotion();
  if (root.dataset.motion === 'running')
    entrance = worlds[active].enter(scenes[active]);
});
