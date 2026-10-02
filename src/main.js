import './style.css';
import { worlds, getWorld } from './worlds.js';
import { ObservatoryScene } from './scene.js';
import { createJourney, reduceJourney, nextJourneyWorld, completedLegs } from './journey.js';

const $ = (selector) => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches;
let selected = getWorld(new URL(location.href).searchParams.get('world'));
let journey = createJourney(selected.id);
let scene;
let quiet = false;
let quietPriorFocus;
let announcementTimer;
let transitionTimer;

function announce(message) {
  clearTimeout(announcementTimer);
  $('#announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#announcement').textContent = message; }, 80);
}

function syncMotionUI() {
  const button = $('#motion-toggle');
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  button.title = paused ? 'Resume motion' : 'Pause motion';
  button.innerHTML = paused ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 8 5-8 5Z"/></svg>' : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>';
  $('#render-status').textContent = scene
    ? (paused ? '3D / motion held' : '3D / local render')
    : 'Illustrated fallback';
}


function syncPageLock() {
  document.body.style.overflow = quiet || document.querySelector('dialog[open]') ? 'hidden' : '';
}

function setQuiet(enabled) {
  if (quiet === enabled) return;
  quiet = enabled;
  if (quiet) quietPriorFocus = document.activeElement;
  document.body.classList.toggle('quiet-mode', quiet);
  $('#quiet-ui').hidden = !quiet;
  for (const selector of ['.skip-link', '.masthead', '.hero-copy', '.instrument-panel', '.catalog', '.observation', 'footer']) {
    const element = $(selector);
    element.inert = quiet;
    if (quiet) element.setAttribute('aria-hidden', 'true');
    else element.removeAttribute('aria-hidden');
  }
  syncPageLock();
  scene?.setImmersive(quiet);
  if (quiet) $('#quiet-exit').focus({ preventScroll: true });
  else quietPriorFocus?.focus({ preventScroll: true });
  announce(quiet ? 'Quiet view. Use Show interface or Escape to return.' : 'Interface restored.');
}

function updateWorld(world, { announceChange = true, changeURL = true, origin = 'manual', historyMode = 'push' } = {}) {
  const index = worlds.indexOf(world);
  if (origin !== 'route') journey = reduceJourney(journey, { type: origin === 'history' ? 'history' : 'manual', worldId: world.id });
  selected = world;
  document.body.dataset.world = world.id;
  document.documentElement.style.setProperty('--copper', world.color);
  document.querySelectorAll('[data-world]').forEach((button) => {
    const active = button.dataset.world === world.id;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#current-index').textContent = world.index;
  $('#current-name').textContent = world.name;
  $('#quiet-world-name').textContent = `${world.index} / ${world.name.toUpperCase()}`;
  $('#scene-caption-name').textContent = world.name.toUpperCase();
  $('#scene-caption-code').textContent = world.code;
  $('.coordinate-marker>span:last-child').innerHTML = world.coordinates.join('<br>');
  $('#observation-code').textContent = `Study 0${world.index} · ${world.name}`;
  $('#observation-text').textContent = world.description;
  $('#material-value').textContent = world.material;
  $('#palette-value').textContent = world.palette;
  $('#mood-value').textContent = world.mood;
  $('#dialog-code').textContent = `Observation 0${world.index}`;
  $('#world-dialog-title').textContent = world.name;
  $('#dialog-type').textContent = world.type;
  $('#dialog-description').textContent = world.description;
  $('#scene').setAttribute('aria-label', scene
    ? `Interactive 3D model of ${world.name}, an imagined ${world.type.toLowerCase()}. Drag the planet or its orbit. On a phone, swipe sideways to turn; vertical swipes scroll. Arrow keys orbit, plus and minus zoom, space pauses, R resets.`
    : `Illustration of ${world.name}, an imagined ${world.type.toLowerCase()}. The 3D view is unavailable. World selection, observation notes and quiet view are available.`);
  $('#world-dialog .dialog-instruction').textContent = scene
    ? 'Grab the planet or the space around its orbit. On a phone, swipe sideways to turn; vertical swipes scroll the page. Use the arrows to turn and + / − to look closer.'
    : 'This browser is showing an illustrated view. Choose a world or hide the interface for a quiet view. A WebGL-capable browser unlocks the orbital camera and lighting controls.';
  scene?.select(index);
  syncJourneyUI();
  clearTimeout(transitionTimer);
  document.body.classList.add('world-changing');
  transitionTimer = setTimeout(() => document.body.classList.remove('world-changing'), paused ? 50 : 500);
  if (changeURL) {
    const url = new URL(location.href);
    if (world.id === 'vesper') url.searchParams.delete('world');
    else url.searchParams.set('world', world.id);
    if (url.href !== location.href) history[historyMode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }
  if (announceChange) announce(`${world.name} selected. ${world.type}. Free exploration; route progress reset.`);
}


function syncJourneyUI() {
  const next = nextJourneyWorld(journey);
  const active = journey.status === 'active';
  $('#atlas').classList.toggle('is-complete', journey.status === 'complete');
  $('#atlas').classList.toggle('is-stopped', journey.status === 'stopped');
  document.querySelectorAll('.atlas-node').forEach(button => {
    const world = getWorld(button.dataset.world);
    const visited = journey.visited.includes(world.id);
    button.classList.toggle('is-visited', visited);
    button.querySelector('[data-node-status]').textContent = `${world.index} / ${visited ? 'Visited' : world.type}`;
  });
  completedLegs(journey).forEach((complete, index) => document.querySelector(`[data-leg="${index}"]`).classList.toggle('is-complete', complete));
  $('#journey-count').textContent = `${String(journey.visited.length).padStart(2, '0')} / 03 visited`;
  $('#journey-status').textContent = active ? `Route / Stop ${selected.index} of 03` : journey.status === 'complete' ? 'Route complete' : journey.status === 'stopped' ? 'Route stopped' : 'Free exploration';
  $('#journey-title').innerHTML = journey.status === 'complete' ? 'Three worlds.<br><em>One trace.</em>' : selected.name;
  $('#journey-summary').textContent = active
    ? `${selected.type}. Next stop: ${next?.name ?? 'the end of the route'}. Take your time in the eyepiece.`
    : journey.status === 'complete'
      ? 'Vesper, Selene and Aether are marked on the chart. Restart the route or choose a world to explore freely.'
      : journey.status === 'stopped'
        ? `Stopped at ${selected.name}. The trace stays until you restart or choose another world.`
        : `${selected.type}. Vesper, Selene, Aether: follow the three studies in order, at your own pace.`;
  $('#journey-start').hidden = active;
  $('#journey-start').childNodes[0].textContent = journey.status === 'idle' ? 'Start the route' : 'Restart route';
  $('#journey-next').hidden = !next;
  $('#journey-stop').hidden = !active;
  $('#journey-next').textContent = next ? `Next: ${next.name}` : 'Route complete';
  $('#journey-eyepiece-next').hidden = !next;
  $('#journey-eyepiece-next').textContent = next ? `Next: ${next.name}` : '';
  $('#quiet-next-label').textContent = next ? `Next: ${next.name}` : journey.status === 'complete' ? 'Route complete' : 'Next world';
  $('#quiet-next').disabled = journey.status === 'complete';
  $('#quiet-journey-status').textContent = active ? `· Stop ${selected.index} / 03` : journey.status === 'complete' ? '· Route complete' : journey.status === 'stopped' ? '· Route stopped' : '';
  $('.current-object > .micro-label').textContent = active ? `Route / Stop ${selected.index} of 03` : journey.status === 'complete' ? 'Route complete' : 'In the eyepiece';
}

function runJourney(type) {
  const initiator = document.activeElement;
  const previous = journey;
  journey = reduceJourney(journey, { type });
  if (journey === previous) return;
  if (type === 'stop') {
    syncJourneyUI();
    announce(`Route stopped at ${selected.name}. Your trace remains on the atlas.`);
    $('#journey-start').focus({ preventScroll: true });
    return;
  }
  updateWorld(worlds[journey.index], { origin: 'route', announceChange: false });
  scene?.reset();
  announce(journey.status === 'complete'
    ? 'Route complete. All three worlds are marked on the atlas.'
    : `Stop ${selected.index} of three: ${selected.name}. ${selected.type}.`);
  if (journey.status === 'complete') {
    const target = quiet ? $('#quiet-exit') : initiator === $('#journey-eyepiece-next') ? $('#quiet-toggle') : $('#journey-start');
    target.focus({ preventScroll: true });
  } else if (initiator === $('#journey-start')) $('#journey-next').focus({ preventScroll: true });
}

function syncNavigationHistory() {
  const world = getWorld(new URL(location.href).searchParams.get('world'));
  if (world.id !== selected.id) {
    const initiator = document.activeElement;
    updateWorld(world, { origin: 'history', changeURL: false, announceChange: false });
    announce(`${world.name}. Free exploration restored; the guided route has ended.`);
    if (initiator === $('#journey-next') || initiator === $('#journey-eyepiece-next')) (quiet ? $('#quiet-exit') : $('#scene')).focus({ preventScroll: true });
  }
}
window.addEventListener('popstate', syncNavigationHistory);
window.addEventListener('hashchange', syncNavigationHistory);

try {
  scene = new ObservatoryScene($('#scene'), {
    reducedMotion: paused,
    onZoom: (factor) => { $('#zoom-readout').textContent = `${factor}×`; },
    onState: (state) => {
      document.body.classList.toggle('webgl-ready', state === 'ready');
      if (state !== 'ready') {
        $('#render-status').textContent = 'View interrupted';
        announce('The 3D view was interrupted. The illustrated fallback is available until graphics recover.');
      }
    },
  });
  scene.select(worlds.indexOf(selected), true);
} catch (error) {
  console.info('The 3D view is unavailable. Using the illustrated fallback.', error.message);
  $('#view-hint').textContent = 'Illustrated view / WebGL unavailable';
  ['#zoom-in', '#zoom-out', '#orbit-left', '#orbit-right', '#motion-toggle', '#reset-view', '#exposure', '#quiet-zoom-in', '#quiet-zoom-out'].forEach((selector) => { $(selector).disabled = true; });
}

updateWorld(selected, { announceChange: false, changeURL: false });
syncMotionUI();
if (matchMedia('(pointer: coarse)').matches && scene) $('#view-hint').textContent = 'Swipe sideways to turn · Vertical swipes scroll';

document.querySelectorAll('.atlas-node').forEach((button) => button.addEventListener('click', () => {
  const world = getWorld(button.dataset.world);
  if (world.id !== selected.id) updateWorld(world);
}));
$('#zoom-in').addEventListener('click', () => scene?.zoom(.88));
$('#zoom-out').addEventListener('click', () => scene?.zoom(1.14));
$('#quiet-zoom-in').addEventListener('click', () => scene?.zoom(.88));
$('#quiet-zoom-out').addEventListener('click', () => scene?.zoom(1.14));
$('#orbit-left').addEventListener('click', () => scene?.orbit(-.18, 0));
$('#orbit-right').addEventListener('click', () => scene?.orbit(.18, 0));
$('#exposure').addEventListener('input', (event) => scene?.setLight(event.target.value));
$('#reset-view').addEventListener('click', () => { scene?.reset(); announce('Camera reset to the original view.'); });
$('#motion-toggle').addEventListener('click', () => {
  paused = !paused;
  scene?.setPaused(paused);
  syncMotionUI();
  announce(paused ? 'Motion paused.' : 'Motion resumed.');
});
$('#quiet-toggle').addEventListener('click', () => setQuiet(true));
$('#quiet-exit').addEventListener('click', () => setQuiet(false));
$('#quiet-next').addEventListener('click', () => {
  if (journey.status === 'active') runJourney('next');
  else updateWorld(worlds[(worlds.indexOf(selected) + 1) % worlds.length]);
});
$('#journey-start').addEventListener('click', () => runJourney('start'));
$('#journey-next').addEventListener('click', () => runJourney('next'));
$('#journey-eyepiece-next').addEventListener('click', () => runJourney('next'));
$('#journey-stop').addEventListener('click', () => runJourney('stop'));
motionPreference.addEventListener('change', (event) => {
  paused = event.matches;
  scene?.setPaused(paused);
  syncMotionUI();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && quiet && !document.querySelector('dialog[open]')) { event.preventDefault(); setQuiet(false); }
});
$('#scene').addEventListener('keydown', (event) => {
  const actions = {
    ArrowLeft: () => scene?.orbit(-.12, 0), ArrowRight: () => scene?.orbit(.12, 0),
    ArrowUp: () => scene?.orbit(0, -.12), ArrowDown: () => scene?.orbit(0, .12),
    '+': () => scene?.zoom(.9), '=': () => scene?.zoom(.9), '-': () => scene?.zoom(1.1),
    ' ': () => $('#motion-toggle').click(), r: () => scene?.reset(), R: () => scene?.reset(),
    q: () => setQuiet(!quiet), Q: () => setQuiet(!quiet),
  };
  if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
});

let lastFocused;
function openDialog(dialog) {
  if (dialog.open) return;
  lastFocused = document.activeElement;
  dialog.showModal();
  syncPageLock();
}
$('#explore-button').addEventListener('click', () => openDialog($('#world-dialog')));
document.querySelectorAll('[data-dialog]').forEach((button) => button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.dialog))));
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { syncPageLock(); lastFocused?.focus({ preventScroll: true }); });
});
window.addEventListener('pagehide', (event) => { if (!event.persisted) scene?.dispose(); });
