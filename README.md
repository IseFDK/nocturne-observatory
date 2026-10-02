# NOCTURNE

An interactive atlas of three imagined worlds. A small observatory built for the slow look.

**Live:** https://isefdk.github.io/nocturne-observatory/

## The experience

- **Vesper** — a banded giant with a layered ring of dust, individual particles and a small orbiting moon
- **Selene** — a frozen moon with procedural fault lines and a sparse debris belt
- **Aether** — a warm and cool binary pair with textured surfaces and soft coronas

Grab the planet or the space around its orbit. On touchscreens, swipe sideways to turn; vertical gestures keep scrolling the page and pinch remains native browser zoom. Dedicated 44-pixel touch controls turn the camera and zoom the world. Select a world, adjust the light, hold the motion, or return to the original camera.

**Take a flight** starts a slow camera orbit that yields to manual steering. **Quiet view** hides the interface and centers the world, with a visible exit, flight toggle, zoom and next-world controls. Escape always exits quiet view. Flight is an explicit motion opt-in, including for reduced-motion users. In browsers without WebGL, flight is clearly labeled as an illustrated motion study. Open the field notes for the fictional observation book.

No photographs, remote textures, astronomy feeds, accounts, analytics, cookies, or paid APIs. All world names, coordinates, and descriptions are fictional. Three-dimensional surfaces and particles are rendered locally in the browser. Fonts are self-hosted.

## Run locally

Node.js 20.19+ or 22.12+ (tested with Node 24).

```sh
npm ci
npm run dev
```

## Test and build

```sh
npm test
npm run build
npm run preview
```

The build command creates and checks `docs/`. Asset references are relative, so the build works under a GitHub Pages repository subpath. `docs/.nojekyll` keeps Pages from treating the export as a Jekyll project.

GitHub Pages setup: **Settings → Pages → Deploy from a branch → main → /docs**.

## Architecture

- `src/main.js` — selection, controls, accessible dialogs, keyboard interaction and route state
- `src/scene.js` — Three.js scene, orbital camera, procedural geometry, responsive rendering and lifecycle handling
- `src/shaders.js` — original GLSL planet textures, ice fractures, dusty rings, stars, coronas and particles
- `src/worlds.js` — fictional world descriptions and deterministic scene utilities
- `src/interaction.js` — tested touch direction gating, proportional rotation, flight conditions and portrait camera fitting
- `src/style.css` — responsive editorial layout and illustrated WebGL fallback
- `test/*.test.js` — content, routing, geometry, transition, zoom, random and camera tests
- `scripts/verify-build.mjs` — relative-asset and static export checks

Built with vanilla JavaScript, Three.js 0.180 and Vite 7. Fonts: Manrope and Cormorant Garamond, licensed under the SIL Open Font License. Third-party license notices are in `THIRD_PARTY_NOTICES.md`.

## Accessibility and resilience

Semantic controls, labeled inputs, keyboard-operated camera, native modal dialogs with focus restoration, a skip link and selection announcements. A reduced-motion preference starts the scene paused, removes transition animation and smooth scrolling. Motion can still be resumed explicitly.

On mobile, geometry density and pixel ratio are reduced. Rendering stops while the page is hidden. If WebGL is unavailable, an illustrated CSS view keeps the world selector, observation notes and project information usable. A lost graphics context shows an interrupted-view status and restores the renderer when the browser restores the context.

Keyboard controls when the 3D world has focus: arrows to orbit, `+` / `-` to zoom, space to pause/resume, `R` to reset. The rest of the site works with ordinary Tab / Enter / Escape controls.

## QA

`npm test`: 16 tests for content integrity, safe unknown-world routes, finite renderable geometry, repeated selection, interrupted transitions, shader light limits, zoom boundaries, keyboard orbit limits, seeded particle layout responsive camera presets, touch intent classification, rotation scaling, flight pause/interaction rules and portrait framing and pointer-transparent fallback/decoration layers.

`npm run build`: production bundle generation plus static export validation, including relative script/style paths and the presence of every HTML-linked local file.

Interactive browser checks and any remaining limits are recorded in `QA.md`.
