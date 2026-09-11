# Muhsin — three worlds, one portfolio

A static Astro portfolio with independently art-directed **Medieval**, **Cyberpunk**, and **Metro** experiences. Shared personal facts, theme-owned narrative copy, and separate layouts, type systems, illustrations, controls, cursor treatments, and GSAP motion.

## Goal

Make a memorable, visually rich personal website without making visitors hunt for the essentials: **who Muhsin is, what he does and can do, proof of his work, his résumé, and how to contact him**.

Each theme is a complete art direction, not a palette swap. Medieval is a cartographer’s folio; Cyberpunk is an independent signal interface; Metro is a warm underground workshop with an enamel identity plate and horizontal work records. Layout, artwork, SVGs, typography, surfaces, buttons, hover/focus/press behavior, cursors, and animation language can all differ. Future themes should have the same freedom.

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

Browser tests use `/usr/bin/chromium` by default on this machine. On another system, set `CHROMIUM_PATH` to your Chromium/Chrome executable before running checks. Set `PREVIEW_PORT=4327` to test alongside an existing dev server without reusing it. For repository-base verification, use `BASE_PATH=/portfolio-one/ PREVIEW_PORT=4327 npm run check`; restore the ordinary root build afterward. Tests include no-JavaScript content, theme switching/persistence, rapid requests, keyboard focus, reduced motion, paused motion, blocked storage, responsive overflow, asset loading, transition coverage, and axe accessibility checks. Chromium checks are not a substitute for Safari/Firefox or real-device testing.

## Edit your information

Content has two layers, both rendered at build time:

- **`src/data/profile.json` owns shared facts:** identity, contact details, capabilities, employers, dates, project names, technologies, assets, and links. Its `metadataDescription` is the neutral search/social description, independent of the selected world.
- **`src/themes/<world>/copy.json` owns that theme’s voice:** introductions, capability wording, employment narratives, project descriptions/categories, headings, button labels, captions, footer, motion labels, and transition text.

Medieval uses original, grounded Witcher-inspired language: craft, contracts, roads, and hard-earned reliability. Cyberpunk uses a concise independent-engineer voice: signals, systems, and builds. Metro uses practical workshop language: maintenance, dependable foundations, and useful things. Names, job titles, dates, and destinations stay factual; accessibility messages retain recognizable contact/résumé/motion purposes.

To rewrite a theme, edit its `copy.json`, not its component or the shared profile. Experience, capabilities, and projects are matched through stable IDs. When adding or removing a record in `profile.json`, update its entry in **every** theme’s copy maps. `npm run check` checks complete ID coverage and rendered copy. Changes to factual responsibilities should also be reflected accurately in each narrative; there is no automatic prose generator or silent fallback to another theme.

- Keep asset paths relative, without a leading slash: `projects/kadha.png`.
- Replace `public/resume.pdf` to update the downloadable résumé.
- Project screenshots live in `public/projects/`. They are actual project interfaces, not themed mockups.
- Replace `public/social-preview.png` if changing the visual branding/name; it is a static sharing image, not generated automatically by the build.
- Rebuild after editing content.

## How themes work

```text
src/data/profile.json             Shared facts and neutral metadata
src/data/theme-copy.ts            Common required copy fields
src/themes/<world>/copy.json      Theme-owned narrative and UI text
src/layouts/Portfolio.astro        Static shell, metadata, switch overlay
src/themes/medieval/               Folio composition, styles, motion
src/themes/cyberpunk/              Signal composition, styles, motion
src/themes/metro/                  Underground workshop, styles, motion
src/components/ThemeSwitcher.astro Accessible controls, styled by each theme
src/scripts/themes.ts             Selection, preparation and animation lifecycle
src/styles/global.css             Fonts and minimal shared baseline
public/themes/                    Original theme-specific SVG artwork
```

All three compositions are rendered as static HTML. CSS exposes only the selected one visually and to accessibility APIs. The default medieval page is fully readable without JavaScript. Interactive controls appear only when the controller loads. The early preference script selects a remembered world before first paint; local storage failure does not break the page.

Inactive Cyberpunk and Metro imagery is deferred until requested. Fonts are self-hosted and browser-loaded on use. The small default folio SVG is present in static HTML and may still be fetched on a remembered Cyberpunk or Metro visit. There are no analytics, external font requests, runtime API calls, or server requirements.

GSAP owns the coordinated world transition and each theme’s ambient timeline. Metro opens through a two-part bulkhead rather than the other worlds’ orbit/trace shutter, and its task-light ambient effect stays inside the illustration. CSS owns hover/focus/press effects. The controller stops the old world's animation on exit, pauses ambient motion when the page is hidden, and respects the visitor's motion preference. The motion button pauses ambient effects and suppresses animated world switches; reduced-motion system settings take precedence. Native image cursors are restricted to fine pointers; text and interactive controls retain familiar cursors.

### Add another art direction

1. Add `src/themes/<name>/Scene.astro`, `theme.css`, `motion.ts`, and `copy.json`. Import shared `profile.json` and your theme’s copy; check it against `ThemeCopy`. Supply every project, experience, and capability ID. Design an independent composition and voice rather than reskinning an existing scene.
2. Give the scene `data-scene="<name>"` and the copy-derived `data-world-name`, `data-world-title`, and `data-world-transition` attributes. Pass `copy.controls` into `ThemeSwitcher`. Use unique heading/anchor IDs and the same three semantic content regions (introduction, capabilities/experience, work), which preserve reading position during switches.
3. Add original artwork under `public/themes/<name>/`. Use `data-lazy-src` for inactive images, and `loading="lazy"` for below-the-fold images. Resolve paths through `import.meta.env.BASE_URL`.
4. Export `ambient(scene)` and `enter(scene)` GSAP timelines. Mark entrance targets `data-reveal` and ambient targets `data-ambient`. Keep essential content visible without animations.
5. Render the scene in `src/pages/index.astro`; add its visible-state selector to `global.css`; register its motion and fonts in `themes.ts`; extend the switcher choices and early preference validation in `Portfolio.astro`.
6. Add the world to content and browser coverage, compare screenshots in grayscale, and inspect copy wrapping and hover/switch recordings at desktop and mobile sizes.

The registry is deliberately small and explicit, not a plugin system. Existing theme presentations do not need rewriting to add a world.

Copy resources contain plain text and structured lines, never HTML or interpolation scripts. `ThemeCopy` checks the common fields while each theme can add its own decorative fields. Scenes retain their own markup and compose text with shared facts. World titles and transition text are emitted as scene data attributes; motion labels are emitted on the control. The controller reads those attributes instead of bundling a second copy of the editorial content.

## GitHub Pages

No backend is needed. Deploy the contents of **`dist/`**, not the source tree.

For the eventual custom domain `muhsi.in`, `astro.config.mjs` already has the correct `site` and root base. Configure the domain separately in GitHub Pages; this project does not modify DNS or deploy anything automatically.

For a repository URL such as `https://<user>.github.io/portfolio-one/`:

1. Set `site` in `astro.config.mjs` to `https://<user>.github.io`.
2. Build with the repository path (including its trailing slash):

   ```sh
   BASE_PATH=/portfolio-one/ npm run build
   ```

3. Use GitHub Pages Actions to install dependencies (`npm ci`), build, and upload `dist` as the Pages artifact, or publish that directory using your existing deployment process. `public/.nojekyll` is copied into the build for branch-based hosting.

No workflow, push, deployment, or custom-domain change has been performed.

## Development conventions

See [`AGENTS.md`](AGENTS.md) for contributor and coding-agent guidance, architectural constraints, and the verification checklist.

- Share facts and necessary behavior, not a universal visual design or a universal voice. Keep prose and presentation scoped to their theme.
- Keep changes focused; add packages or abstractions only for a demonstrated need.
- Write a failing regression test before changing behavior, then run `npm run check` and `npm run format:check`.
- Inspect all three themes visually after presentation changes, including mobile layouts, keyboard focus, reduced motion, and all six directed transitions between them. Passing tests alone does not establish visual quality.
- Keep `.scratch/`, generated builds, dependencies, and test artifacts out of Git. Commit source, original assets, license notices, and `package-lock.json`.
- Use focused Conventional Commits. Publishing, pushing, deployment, and DNS changes require explicit approval.

## Assets and licenses

- The folio island, transmission-city, and underground workshop SVGs were created for this portfolio. Metro’s workshop and grain texture are original illustrations, not franchise artwork.
- Kadha screenshot and résumé were retrieved from the existing `muhsi.in` website. World's on Fire preview was captured from its live site at desktop dimensions.
- Cormorant Garamond, DM Sans, Barlow Condensed, IBM Plex Mono, and Russo One are provided by Fontsource. Russo One’s Latin WOFF2 is vendored under `public/fonts/` from `@fontsource/russo-one` 5.3.0; the other fonts use npm packages. Their license notices are included in `public/licenses/`.
- GSAP and other packages retain their respective licenses in their distributions.
