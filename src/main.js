import './style.css';
import { worlds, getWorld } from './worlds.js';
import { ObservatoryScene } from './scene.js';

const $ = (selector) => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches;
let selected = getWorld(new URL(location.href).searchParams.get('world'));
let scene;
let announcementTimer;
let transitionTimer;

function announce(message) {
  clearTimeout(announcementTimer);
  $('#announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#announcement').textContent = message; }, 80);
}

function motionUI() {
  const button = $('#motion-toggle');
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  button.title = paused ? 'Resume motion' : 'Pause motion';
  button.innerHTML = paused ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 8 5-8 5Z"/></svg>' : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>';
  $('#render-status').textContent = scene ? (paused ? '3D / motion held' : '3D / local render') : 'Illustrated fallback';
}

function updateWorld(world, { announceChange = true, changeURL = true } = {}) {
  const index = worlds.indexOf(world);
  selected = world;
  document.body.dataset.world = world.id;
  document.documentElement.style.setProperty('--copper', world.color);
  document.querySelectorAll('[data-world]').forEach((button) => { const active = button.dataset.world === world.id; button.classList.toggle('is-selected', active); button.setAttribute('aria-pressed', String(active)); });
  $('#current-index').textContent = world.index;
  $('#current-name').textContent = world.name;
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
  $('#scene').setAttribute('aria-label', `Interactive 3D model of ${world.name}, an imagined ${world.type.toLowerCase()}. Drag to orbit. Arrow keys to orbit, plus and minus to zoom, space to pause, R to reset.`);
  scene?.select(index);
  clearTimeout(transitionTimer);
  document.body.classList.add('world-changing');
  transitionTimer = setTimeout(() => document.body.classList.remove('world-changing'), paused ? 50 : 500);
  if (changeURL) { const url = new URL(location.href); if(world.id==='vesper')url.searchParams.delete('world');else url.searchParams.set('world',world.id); history.replaceState(null, '', url); }
  if (announceChange) announce(`${world.name} selected. ${world.type}. Observation notes updated.`);
}

try {
  scene = new ObservatoryScene($('#scene'), {
    reducedMotion: paused,
    onZoom: (factor) => { $('#zoom-readout').textContent = `${factor}×`; },
    onState: (state) => {
      if (state === 'ready') { document.body.classList.add('webgl-ready'); $('#render-status').textContent = paused ? '3D / motion held' : '3D / local render'; }
      else { document.body.classList.remove('webgl-ready'); $('#render-status').textContent = 'View interrupted'; announce('The 3D view was interrupted. The illustrated fallback is available. Reload to try again.'); }
    },
  });
  scene.select(worlds.indexOf(selected), true);
} catch (error) {
  console.info('The 3D view is unavailable. Using the illustrated fallback.', error.message);
  $('#view-hint').textContent = 'Illustrated view / WebGL unavailable';
  ['#zoom-in', '#zoom-out', '#motion-toggle', '#reset-view', '#exposure'].forEach((selector) => { $(selector).disabled = true; });
}

updateWorld(selected, { announceChange: false, changeURL: false });
motionUI();
if (matchMedia('(pointer: coarse)').matches && scene) $('#view-hint').textContent = 'Drag to orbit · Pinch to zoom';

document.querySelectorAll('.world-card').forEach((button) => button.addEventListener('click', () => updateWorld(getWorld(button.dataset.world))));
$('#zoom-in').addEventListener('click', () => scene?.zoom(.88));
$('#zoom-out').addEventListener('click', () => scene?.zoom(1.14));
$('#exposure').addEventListener('input', (event) => scene?.setLight(event.target.value));
$('#reset-view').addEventListener('click', () => { scene?.reset(); announce('Camera reset to the original view.'); });
$('#motion-toggle').addEventListener('click', () => { paused = !paused; scene?.setPaused(paused); motionUI(); announce(paused ? 'Motion paused.' : 'Motion resumed.'); });
motionPreference.addEventListener('change', (event) => { paused = event.matches; scene?.setPaused(paused); motionUI(); });

$('#scene').addEventListener('keydown', (event) => {
  if (!scene) return;
  const actions = { ArrowLeft: () => scene.orbit(-.12,0), ArrowRight: () => scene.orbit(.12,0), ArrowUp: () => scene.orbit(0,-.12), ArrowDown: () => scene.orbit(0,.12), '+': () => scene.zoom(.9), '=': () => scene.zoom(.9), '-': () => scene.zoom(1.1), ' ': () => $('#motion-toggle').click(), r: () => scene.reset(), R: () => scene.reset() };
  if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
});

let lastFocused;
function openDialog(dialog) {
  if (dialog.open) return;
  lastFocused = document.activeElement;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
$('#explore-button').addEventListener('click', () => openDialog($('#world-dialog')));
document.querySelectorAll('[data-dialog]').forEach((button) => button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.dialog))));
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => { const bounds=dialog.getBoundingClientRect(); if(event.target===dialog && (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom))dialog.close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow='';lastFocused?.focus({preventScroll:true}); });
});
window.addEventListener('pagehide', (event) => { if (!event.persisted) scene?.dispose(); });
