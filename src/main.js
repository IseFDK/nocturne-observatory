import './style.css';
import { worlds, getWorld } from './worlds.js';
import { ObservatoryScene } from './scene.js';

const $ = (selector) => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches;
let selected = getWorld(new URL(location.href).searchParams.get('world'));
let scene;
let flight = false;
let quiet = false;
let flightPriorPause = paused;
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
  document.body.classList.toggle('flight-active', flight && !paused);
  for (const selector of ['#flight-toggle', '#quiet-flight']) {
    $(selector).setAttribute('aria-pressed', String(flight));
    $(`${selector} span`).textContent = flight ? 'End flight' : (selector === '#quiet-flight' ? 'Start flight' : 'Take a flight');
  }
  $('#quiet-flight-status').textContent = flight ? '· Flight in progress' : '';
  $('#render-status').textContent = scene
    ? (paused ? '3D / motion held' : flight ? '3D / slow flight' : '3D / local render')
    : (flight ? 'Illustrated / slow flight' : 'Illustrated fallback');
}

function toggleFlight() {
  flight = !flight;
  if (flight) { flightPriorPause = paused; paused = false; }
  else paused = flightPriorPause;
  scene?.setPaused(paused);
  scene?.setFlight(flight);
  syncMotionUI();
  announce(flight ? (scene ? 'Slow flight started. Drag to steer. Hide the interface for a quiet view.' : 'Illustrated flight started. Hide the interface for a quiet view.') : 'Flight ended.');
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

function updateWorld(world, { announceChange = true, changeURL = true } = {}) {
  const index = worlds.indexOf(world);
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
    : `Illustration of ${world.name}, an imagined ${world.type.toLowerCase()}. The 3D view is unavailable. World selection, observation notes and illustrated flight are available.`);
  $('#world-dialog .dialog-instruction').textContent = scene
    ? 'Grab the planet or the space around its orbit. On a phone, swipe sideways to turn; vertical swipes scroll the page. Use the arrows to turn and + / − to look closer.'
    : 'This browser is showing an illustrated view. Choose a world or take an illustrated flight. A WebGL-capable browser unlocks the orbital camera and lighting controls.';
  scene?.select(index);
  clearTimeout(transitionTimer);
  document.body.classList.add('world-changing');
  transitionTimer = setTimeout(() => document.body.classList.remove('world-changing'), paused ? 50 : 500);
  if (changeURL) {
    const url = new URL(location.href);
    if (world.id === 'vesper') url.searchParams.delete('world');
    else url.searchParams.set('world', world.id);
    history.replaceState(null, '', url);
  }
  if (announceChange) announce(`${world.name} selected. ${world.type}. Observation notes updated.`);
}

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

document.querySelectorAll('.world-card').forEach((button) => button.addEventListener('click', () => updateWorld(getWorld(button.dataset.world))));
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
  if (flight) flightPriorPause = paused;
  scene?.setPaused(paused);
  syncMotionUI();
  announce(paused ? 'Motion paused.' : 'Motion resumed.');
});
$('#flight-toggle').addEventListener('click', toggleFlight);
$('#quiet-flight').addEventListener('click', toggleFlight);
$('#quiet-toggle').addEventListener('click', () => setQuiet(true));
$('#quiet-exit').addEventListener('click', () => setQuiet(false));
$('#quiet-next').addEventListener('click', () => updateWorld(worlds[(worlds.indexOf(selected) + 1) % worlds.length]));
motionPreference.addEventListener('change', (event) => {
  if (flight) { flight = false; scene?.setFlight(false); }
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
    f: toggleFlight, F: toggleFlight, q: () => setQuiet(!quiet), Q: () => setQuiet(!quiet),
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
