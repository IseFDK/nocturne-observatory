/** All names, coordinates, and material descriptions are fictional art direction. */
export const worlds = Object.freeze([
  Object.freeze({ id: 'vesper', name: 'Vesper', index: '01', type: 'Ringed world', code: 'N° 001 / RINGED WORLD', material: 'Dust & copper', palette: 'Ember / umber', mood: 'After the sun', description: 'A wide ring of fine debris catches the light before the world itself does. Turn the view slowly. The far side keeps its secrets.', coordinates: ['04h 17m 08s', '+21° 09′ 42″'], color: '#d0a37c', radius: 1.5 }),
  Object.freeze({ id: 'selene', name: 'Selene', index: '02', type: 'Frozen moon', code: 'N° 002 / FROZEN MOON', material: 'Ice & graphite', palette: 'Glacier / silver', mood: 'A held breath', description: 'An icebound surface, threaded with blue fractures. The smallest moon keeps the longest record. Look for the fault lines where the light falls away.', coordinates: ['11h 03m 29s', '−08° 14′ 06″'], color: '#adc8c8', radius: 1.66 }),
  Object.freeze({ id: 'aether', name: 'Aether', index: '03', type: 'Binary study', code: 'N° 003 / BINARY STUDY', material: 'Plasma & light', palette: 'Gold / blue', mood: 'In conversation', description: 'Two lights trace a shared path. A warm primary and a cool companion, held in a slow, unbroken conversation. Pause their orbit to study the space between.', coordinates: ['18h 42m 11s', '+36° 02′ 17″'], color: '#d9bfa3', radius: 1.4 }),
]);
export const getWorld = (id) => worlds.find((world) => world.id === id) ?? worlds[0];
export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
export const zoomFactor = (distance, reference = 9.6) => (reference / distance).toFixed(1);
export function seededRandom(seed = 417) {
  let state = seed >>> 0;
  return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
}
export function cameraPreset(mobile = false) {
  return { position: mobile ? [3.2, 2.7, 9.2] : [3.3, 2.3, 8.5], minDistance: 5.1, maxDistance: 14, horizontalOffset: mobile ? 0 : 0.16 };
}
