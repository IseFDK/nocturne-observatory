# QA record

## Automated checks

- `npm test`: 10 tests passed
- `npm run build`: passed
- `node --check`: passed for all source, test, configuration and verification files
- GitHub Pages export validation: passed; all script and style URLs are relative; `.nojekyll` and linked local files are present
- Production export: approximately 644 KB uncompressed including five local font files; main JavaScript approximately 131 KB gzip
- Development server starts successfully on `127.0.0.1`

## Public browser checks

Verified on the public GitHub Pages deployment in Chromium:

- Desktop editorial layout, self-hosted fonts, illustrations and catalog
- Mobile layout at 485 and 388 CSS pixels; document width equals viewport width with no horizontal overflow
- Selection of all three worlds updates the illustration, selection state, coordinates, heading, observation text, material, palette and mood
- Selection updates the `?world=` URL state
- Observation dialog opens with the current world
- Field notes and project dialogs open and dismiss
- Escape and Close return focus to the opening control
- WebGL fallback disables unavailable camera, motion and light controls while preserving all editorial interactions

A browser review found unsupported arrow glyphs in the font fallback. They were replaced with consistent inline SVG icons. Observation guidance and accessible world labels now adapt to the illustrated fallback.

## Verification limits

This cloud Chromium environment explicitly disables its graphics renderer (`GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`), so live WebGL drawing, shader compilation and pointer/pinch camera controls could not be verified here. The renderer fails safely into the illustrated view. The actual Three.js geometry, state transitions, repeated selection, camera math and light limits pass the automated tests. Live 3D behavior remains to be checked on a graphics-enabled browser.

Reduced-motion behavior is implemented and source-checked; browser preference emulation is unavailable in this managed browser. Mobile-width screenshots validate the responsive CSS but are not physical-device touch tests.

## Mobile and interaction update

Source investigation and browser hit-testing identified an invisible overlay: the fallback planet/ring remained pointer-active after fading out. All fallback artwork and decorative grab cues are now pointer-transparent, so live canvas interactions reach the renderer across the visible planet and orbit.

Touch input now uses a nine-pixel direction gate. Horizontal swipes orbit the view; vertical swipes remain native page scrolling; pinch remains native browser zoom. Ordinary desktop wheel scrolling no longer gets claimed by the 3D canvas. Camera zoom uses dedicated controls. Reset flushes remaining damping before restoring the camera.

Mobile layout now uses a shorter, bounded scene, portrait-aware camera fitting, explicit 44-pixel rotation/zoom controls and a separate accessible light row. The tablet breakpoint also avoids the previously cramped 768-pixel desktop composition.

New flight mode slowly orbits the camera, yields to manual steering and respects pause. Quiet view centers the scene, hides inactive interface elements with inert/ARIA state and provides visible return, flight, zoom and next-world controls. Escape restores the interface and prior focus. Reduced-motion defaults remain paused; flight only starts with explicit user interaction. Graphics-free browsers get clearly labeled illustrated flight.

`npm test`: 15 tests pass after this update. Production build passes. Public browser re-verification of the updated layout and flight/quiet controls is pending deployment; physical touch and live GPU validation remain unavailable in this cloud browser.
