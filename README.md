# Realms — six worlds, one portfolio

A customizable static Astro portfolio with independently art-directed **Medieval**, **Cyberpunk**, **Metro**, **Jungle**, **Space**, and **Sky** experiences. Shared portfolio content, separate layouts, type systems, illustrations, controls, cursor treatments, and GSAP motion.

## Goal

Make a memorable, visually rich portfolio without making visitors hunt for the essentials: **who the portfolio owner is, what they do and can do, proof of their work, their résumé, and how to contact them**.

Each theme is a complete art direction, not a palette swap. Medieval is a cartographer’s folio; Cyberpunk is an independent signal interface; Metro is a warm underground workshop with an enamel identity plate and horizontal work records; Jungle is an immersive rainforest understory where generated foliage frames the content in depth planes, sways in the wind, and rustles under the pointer; Space is a vibrant deep field of generated planets, moons, asteroids and constellations drifting in parallax over a nebula; Sky is a daylight ascent where scrolling climbs from dawn haze through a shader-rendered cloud deck into thin blue air, and the pointer is the wind. Layout, artwork, SVGs, typography, surfaces, buttons, hover/focus/press behavior, cursors, and animation language can all differ. Future themes should have the same freedom.

The site stays compact and naturally scrollable, with readable content before JavaScript, tasteful motion, and static GitHub Pages hosting. No backend or immersive navigation is required to access professional information.

## Run locally

Requires a current Node.js LTS release supported by Astro (Node 22.12+).

```sh
npm ci
npm run dev
```

Open the address printed by Astro, normally `http://127.0.0.1:4321`.

```sh
npm run build      # static site in dist/
npm run preview    # serve the production build locally
npm run check      # Astro/TypeScript diagnostics, build, browser tests
npm run format:check
```

Browser tests use `/usr/bin/chromium` by default on this machine. On another system, set `CHROMIUM_PATH` to your Chromium/Chrome executable before running checks. Set `PREVIEW_PORT=4327` to test alongside an existing dev server without reusing it. For repository-base verification, use `BASE_PATH=/realms/ PREVIEW_PORT=4327 npm run check`; restore the ordinary root build afterward. Tests include no-JavaScript content, theme switching/persistence, rapid requests, keyboard focus, reduced motion, paused motion, blocked storage, responsive overflow, asset loading, transition coverage, and axe accessibility checks. Chromium checks are not a substitute for Safari/Firefox or real-device testing.

## Customize the portfolio

**`src/data/profile.json` is the single source of portfolio content.** It contains the owner’s name, role, location, career start, email, intro/about prose, capabilities, tools, experience summaries, project descriptions/categories, assets, and social links. All six worlds render the same content at build time. The shared intro also supplies the neutral search/social description.

Edit portfolio copy once in `profile.json`, not in theme components. Decorative headings, artwork captions, and world labels live in each scene’s markup; they do not replace the shared biography or project descriptions. `npm run check` verifies the original shared wording across all six worlds alongside plain contact, résumé, and motion controls.

- Keep asset paths relative, without a leading slash: `projects/kadha.png`.
- Replace `public/resume.pdf` to update the downloadable résumé.
- Project screenshots live in `public/projects/`. They are actual project interfaces, not themed mockups.
- Replace `public/social-preview.png` if changing the visual branding/name; it is a static sharing image, not generated automatically by the build.
- Rebuild after editing content.

## How themes work

```text
src/data/profile.json             Shared portfolio content and metadata
src/layouts/Portfolio.astro        Static shell, metadata, switch overlay
src/themes/medieval/               Folio composition, styles, motion
src/themes/cyberpunk/              Signal composition, styles, motion
src/themes/metro/                  Underground workshop, styles, motion
src/themes/jungle/                 Rainforest understory, generated foliage, styles, motion
src/themes/space/                  Deep field, generated celestial bodies, styles, motion
scripts/generate-jungle-art.mjs    Seeded generator for the committed jungle SVG art
src/themes/sky/                    Ascent through the clouds: WebGL sky shader, wind field, flock
scripts/generate-space-art.mjs     Seeded generator for the committed space SVG art
scripts/generate-sky-art.mjs       Seeded generator for the committed sky SVG art
src/components/ThemeSwitcher.astro Accessible controls, styled by each theme
src/scripts/themes.ts             Selection, preparation and animation lifecycle
src/styles/global.css             Fonts and minimal shared baseline
public/themes/                    Original theme-specific SVG artwork
```

All six compositions are rendered as static HTML. CSS exposes only the selected one visually and to accessibility APIs. The default medieval page is fully readable without JavaScript. Interactive controls appear only when the controller loads. The early preference script selects a remembered world before first paint; local storage failure does not break the page.

Inactive Cyberpunk, Metro, Jungle, and Space imagery is deferred until requested. Jungle’s mid and near foliage and Space’s planets and asteroids are inline SVG so individual bodies can react to the pointer; their far canopy and starfield are deferred images. Fonts are self-hosted and browser-loaded on use. The small default folio SVG is present in static HTML and may still be fetched on a remembered Cyberpunk, Metro, Jungle, Space, or Sky visit. There are no analytics, external font requests, runtime API calls, or server requirements.

GSAP owns the coordinated world transition and each theme’s ambient timeline. Metro opens through a two-part bulkhead rather than the other worlds’ orbit/trace shutter, and its task-light ambient effect stays inside the illustration. Jungle layers fixed depth planes behind and in front of the content; a small requestAnimationFrame loop eases them with scroll progress and fine-pointer position, GSAP sways each foliage cluster and drifts the light, and one-shot CSS animations rustle individual leaves on hover. The loop and the hover targets switch off whenever motion is paused or another world is active. Space follows the same depth-plane model with orbiting moons, tumbling asteroids, comets and dust, and celestial bodies that pulse on hover. Sky is the one world with a GPU dependency: its far and mid clouds, sun, god rays and stars are a single fullscreen WebGL fragment shader rendered at reduced resolution, fed by scroll altitude and a pointer wind field; near clouds, balloons, a kite and a small boids flock are DOM so they can overlap the type. If WebGL is unavailable the shader is replaced by a CSS gradient sky, and paused or reduced motion renders one still frame that follows scroll. CSS owns hover/focus/press effects. The controller stops the old world's animation on exit, pauses ambient motion when the page is hidden, and respects the visitor's motion preference. The motion button pauses ambient effects and suppresses animated world switches; reduced-motion system settings take precedence. Native image cursors are restricted to fine pointers; text and interactive controls retain familiar cursors.

### Add another art direction

1. Add `src/themes/<name>/Scene.astro`, `theme.css`, and `motion.ts`. Import shared `profile.json`; render its portfolio content unchanged in an independent composition rather than reskinning an existing scene.
2. Give the scene `data-scene="<name>"`, `data-world-name`, `data-world-title`, and `data-world-transition` attributes. Pass its theme name into `ThemeSwitcher`. Use unique heading/anchor IDs and the same three semantic content regions (introduction, capabilities/experience, work), which preserve reading position during switches.
3. Add original artwork under `public/themes/<name>/`. Use `data-lazy-src` for inactive images, and `loading="lazy"` for below-the-fold images. Resolve paths through `import.meta.env.BASE_URL`.
4. Export `ambient(scene)` and `enter(scene)` GSAP timelines. Mark entrance targets `data-reveal` and ambient targets `data-ambient`. Keep essential content visible without animations.
5. Render the scene in `src/pages/index.astro`; add its visible-state selector to `global.css`; register its motion and fonts in `themes.ts`; extend the switcher choices and early preference validation in `Portfolio.astro`.
6. Add the world to content and browser coverage, compare screenshots in grayscale, and inspect copy wrapping and hover/switch recordings at desktop and mobile sizes.

The registry is deliberately small and explicit, not a plugin system. Existing theme presentations do not need rewriting to add a world.

Scenes retain their own markup while reading the same portfolio content. World titles and transition text are emitted as scene data attributes for the controller. The shared switcher and controller use plain “Motion on/off” labels; each theme styles those controls independently.

## GitHub Pages

No backend is needed. Deploy the contents of **`dist/`**, not the source tree.

Before deploying, set `site` in `astro.config.mjs` to the portfolio’s public origin. Configure custom domains separately in GitHub Pages; this project does not modify DNS or deploy anything automatically.

For a repository URL such as `https://<user>.github.io/realms/`:

1. Set `site` in `astro.config.mjs` to `https://<user>.github.io`.
2. Build with the repository path (including its trailing slash):

   ```sh
   BASE_PATH=/realms/ npm run build
   ```

3. Use GitHub Pages Actions to install dependencies (`npm ci`), build, and upload `dist` as the Pages artifact, or publish that directory using your existing deployment process. `public/.nojekyll` is copied into the build for branch-based hosting.

No workflow, push, deployment, or custom-domain change has been performed.

## Development conventions

See [`AGENTS.md`](AGENTS.md) for contributor and coding-agent guidance, architectural constraints, and the verification checklist.

- Share portfolio content and necessary behavior, not a universal visual design. Keep presentation scoped to its theme.
- Keep changes focused; add packages or abstractions only for a demonstrated need.
- Write a failing regression test before changing behavior, then run `npm run check` and `npm run format:check`.
- Inspect all six themes visually after presentation changes, including mobile layouts, keyboard focus, reduced motion, and all thirty directed transitions between them. Passing tests alone does not establish visual quality.
- Keep `.scratch/`, generated builds, dependencies, and test artifacts out of Git. Commit source, original assets, license notices, and `package-lock.json`.
- Use focused Conventional Commits. Publishing, pushing, deployment, and DNS changes require explicit approval.

## Assets and licenses

- The folio island, transmission-city, and underground workshop SVGs were created for this portfolio. Metro’s workshop and grain texture are original illustrations, not franchise artwork.
- The Kadha screenshot and résumé are project-specific assets retained from the original portfolio. The World's on Fire preview was captured from its live site at desktop dimensions.
- The jungle foliage (canopy, clusters, vines, and sprigs) is original SVG produced by the seeded `scripts/generate-jungle-art.mjs`; run `npm run art:jungle` after editing it and commit the regenerated files under `public/themes/jungle/` and `src/themes/jungle/art/`. The space starfield, planets, asteroids and constellations come from `scripts/generate-space-art.mjs` and `npm run art:space` in the same way; the sky’s near clouds, balloon and kite come from `scripts/generate-sky-art.mjs` and `npm run art:sky`.
- Cormorant Garamond, DM Sans, Barlow Condensed, IBM Plex Mono, Fraunces, Space Grotesk, Outfit, and Russo One are provided by Fontsource. Russo One’s Latin WOFF2 is vendored under `public/fonts/` from `@fontsource/russo-one` 5.3.0; the other fonts use npm packages. Their license notices are included in `public/licenses/`.
- GSAP and other packages retain their respective licenses in their distributions.
