# Project guidance

## Purpose

Realms is a general, customizable multi-theme portfolio: memorable, eye-catching, and easy to understand. Visitors must be able to find who the portfolio owner is, what they do, what they can do, proof of their work, their résumé, and contact details without learning an unusual navigation system.

**The central requirement is complete art-style changes, not color themes.** Medieval, Cyberpunk, Metro, and Jungle are independently designed websites sharing portfolio content. Preserve their different layouts, imagery, SVGs, typography (including sizes and weights), surfaces, borders, controls, hover/focus/press effects, cursors, and entrance/idle/exit motion. Future themes should have equal freedom.

## Start here

Read `README.md`, the relevant source files, and any active plan in `.scratch/plans/todo/` before changing behavior. Do not overwrite unfamiliar work. For non-trivial changes, discuss the approach and write a phase-level checklist in `.scratch/plans/todo/`; implement after approval. Keep research, screenshots, reviews, and temporary scripts in gitignored `.scratch/`.

## Architecture

- **Astro static output**, TypeScript, custom CSS/SVG, GSAP. No React runtime or backend is required.
- `src/data/profile.json` is the single source of portfolio-owner facts, intro/about prose, capabilities, experience summaries, project descriptions/categories, assets, and links. All themes render the same portfolio content; do not duplicate or rewrite it in theme components. The shared intro also supplies neutral search/social descriptions.
- `src/themes/<world>/Scene.astro`, `theme.css`, and `motion.ts` own each world’s presentation and animation. Decorative headings, artwork captions, and world labels may remain in scene markup. Scene data attributes carry world names/titles/transition captions for the controller.
- `src/scripts/themes.ts` handles theme preparation, selection/persistence, focus/reading position, and animation lifecycle.
- `src/components/ThemeSwitcher.astro` shares accessible controls; each theme owns their visual treatment.
- `src/layouts/Portfolio.astro` owns the document shell, metadata, early preference selection, and transition overlay.
- `src/styles/global.css` contains fonts and the small shared baseline. Do not turn it into a universal component design system.
- `public/themes/` holds original artwork; `public/projects/` holds real project screenshots. Résumé and social-preview files are independently replaceable assets.

All four worlds render at build time, but only one is visually and accessibility-exposed. The medieval default must remain usable without JavaScript. Keep IDs unique across scenes. The controller currently maps reading position by the ordered `main > section` regions: introduction, capabilities/experience, and work. Preserve that contract, or explicitly update and test the mapping when changing it.

See the README’s theme-addition checklist when introducing another world. Keep registration explicit and small; do not build a theme/plugin framework speculatively.

## Design and content rules

- Share facts and useful semantics, not mandatory component geometry. A little theme-specific markup is better than an abstraction that makes all worlds look alike.
- A grayscale comparison with the switcher hidden should still reveal clearly different typography, composition, shapes, and artwork.
- Keep the selector recognizable and easy to find. Keep essential labels understandable: “Get in touch”, résumé links, and “Motion on/off” should retain their plain purpose. Keep real job titles, names and dates literal.
- Change art direction, not the portfolio narrative. Update shared responsibilities and project descriptions once in `profile.json`; preserve each theme’s independent composition.
- Preserve a compact page. Allow normal scrolling on short and narrow screens; do not force all content into `100vh`, lock scrolling, or hide essentials behind dialogs, games, or terminal commands.
- Project screenshots must remain truthful. Theme their presentation, not the actual product UI shown as evidence.
- Self-host fonts and assets; retain license notices. Do not add tracking, external runtime services, or a backend without an explicit requirement.

## Motion and accessibility

- Motion is deliberate and theme-specific. GSAP owns coordinated timelines; CSS owns simple hover/focus/press effects. Avoid two systems animating the same property.
- Preserve normal text selection, accurate cursor hotspots, visible keyboard focus, and touch usability. Fine-pointer cursor artwork must have native fallbacks; no lagging cursor trails.
- Honor `prefers-reduced-motion`, the motion-pause control, and page visibility. Keep body copy stable and ambient motion restrained.
- Kill superseded timelines, clean old scene styles, and let the latest requested world win. Await in-flight eager artwork even when repeated requests have already assigned its `src`.
- Keep focus and reading position meaningful after switching. Check painted focus indicators—not just `document.activeElement`. A `clip-path` can hide an external outline; use an inset indicator where necessary.
- Keep default content visible without animations. Never require a sound track, loading intro, or hover-only action to reach content.
- Prefer transform/opacity animation and modest assets. Add a package only when it materially supports an actual design or testing need; avoid speculative fallbacks and abstractions.

## Implementation and verification

Use npm and commit `package-lock.json`. Follow existing TypeScript/Astro patterns and Prettier formatting. Keep each change focused; avoid unrelated refactors.

For behavior changes, write and run the failing regression test before the fix. Tests live in `tests/` and exercise the built site with Playwright and axe. Content tests verify original shared wording across all scenes, existing decorative labels, CTA names, runtime labels, and neutral metadata; extend them when adding a world.

```sh
npm run format:check
npm run check
```

`check` runs Astro/TypeScript diagnostics, a production build, and browser tests. Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` on other systems. `npm test` alone expects an existing build. Set `PREVIEW_PORT` to an unused port when a dev server is already running. An already-running preview must serve the correct build and base path; Astro permits only one preview process per project. Never stop an unfamiliar process merely to make tests pass.

For visual or motion changes, additionally inspect:

- All four themes at narrow mobile (360px), mobile (~390px), tablet, desktop (~1440px), and short desktop heights; check overflow, copy wrapping, and readable text. After changing an emulated viewport, let Chromium apply its media-query/layout frames before measuring; do not weaken the overflow assertion to hide real layout defects.
- Hover, press, keyboard focus, all twelve directed theme switches, rapid selection, and reduced-motion behavior.
- Grayscale screenshots and interaction recordings when changing art direction. Static screenshots cannot prove smooth animation.
- No-JavaScript content, deferred assets, and hidden-scene accessibility when changing rendering or loading.

Use `import.meta.env.BASE_URL` for local asset paths; JSON asset paths stay relative without a leading slash. When changing routing or asset loading, verify both `/` and a repository base such as `/realms/`, including résumé, images, scripts, and theme switching. Restore the ordinary root build afterward.

Report checks actually run, exact failures or blockers, and untested browsers/devices. Do not claim cross-device smoothness from local headless Chromium measurements.

## Git and delivery

- Commit source, configuration, documentation, original assets, font license notices, and the npm lockfile.
- Never commit `node_modules/`, `dist/`, `.astro/`, `.scratch/`, `.pi/`, browser reports, temporary recordings, or secrets.
- Stage intended files explicitly and use concise Conventional Commits (`feat:`, `fix:`, `docs:`, etc.). Keep commits focused on one concern.
- A local implementation or commit is not authorization to push, publish, deploy, or change DNS. Obtain explicit approval for those actions.
