# QA record

## Automated checks

- `npm test`: 23 tests passed
- `npm run build`: passed
- `node --check`: passed for all source, test, configuration and verification files
- GitHub Pages export validation: passed; all script and style URLs are relative; `.nojekyll` and linked local files are present
- Production export: approximately 660 KB uncompressed including five local font files; main JavaScript approximately 133 KB gzip
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

Quiet view centers the scene, hides inactive interface elements with inert/ARIA state and provides visible return, zoom and next-world controls. Escape restores the interface and prior focus. Reduced-motion defaults remain paused.

`npm test`: 23 tests pass after this update. Production build and JavaScript syntax checks pass.

Public Chromium verification after deployment:

- Hit-testing at three points across the planet/ring reaches the scene, rather than fallback artwork
- Responsive layouts checked at 320, 375, 390 and 768 CSS pixels: document width equals viewport width
- All six mobile camera buttons measure 44 × 44 CSS pixels
- Quiet view hides/inerts inactive interface elements and provides a visible return button
- Next-world selection works inside quiet view and updates its label, illustration and URL
- Escape restores the normal interface and focus to the opening control
- Quiet-view toolbar remains within the viewport on the smallest tested phone-width layout

The final spacing/readability pass enlarges secondary mobile prose and light/touch targets, and removes the compact zoom readout below 360px so six 44-pixel camera buttons fit. Portrait framing now treats horizontal rings and vertical planet extent separately, avoiding unnecessary distance in landscape/tablet scenes. Physical touch and live GPU validation remain unavailable in this cloud browser.

## Focused simplification

Removed the separate automatic camera mode and its buttons, keyboard shortcut, renderer state, helper/test and CSS animation rules. Quiet view, manual rotation, pause/reset, touch direction gating and all mobile layout fixes are retained. The relevant remaining tests and production build are rerun for this change. Earlier public quiet-view and mobile-layout checks above apply to the preserved behavior; the removal is also checked on the deployed public UI.

## Atlas and ordered route

The collection is now an integrated schematic Atlas. Nodes select a world for free exploration. Start begins the Vesper → Selene → Aether sequence; Next marks each stop and path segment; Stop keeps the partial trace; Restart starts again at Vesper. Manual world changes and browser history restoration end the guided route and clear progress. Advancement is user-driven, with no timers or automatic movement. The chart explicitly describes separate studies and illustrative positions.

The pure route reducer adds eight passing tests covering start, ordered advancement, completion, repeated Next, stop/restart, manual interruption, history restoration, unknown inputs and non-mutating state. Hidden controls transfer focus to their next available action; quiet-view completion transfers focus to its visible exit. Native anchor navigation and unknown hashes are left intact. Reduced-motion still starts the scene paused, so route changes do not require animation.

Production export and syntax checks are rerun. Current public Atlas/mobile/navigation checks accompany the final deployment; live graphics and physical-touch limitations remain as stated above.
