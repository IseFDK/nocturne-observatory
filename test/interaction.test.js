import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGesture, dragAngle, fitDistance } from '../src/interaction.js';

test('Tiny touch movements do not spin the world or claim a scroll', () => {
  assert.equal(classifyGesture(3, 5), 'pending');
  assert.equal(classifyGesture(8, 8), 'pending');
});
test('Sideways drags orbit and vertical gestures are left to native scrolling', () => {
  for (const dx of [-40, 40]) assert.equal(classifyGesture(dx, 7), 'orbit');
  for (const dy of [-40, 40]) assert.equal(classifyGesture(7, dy), 'scroll');
  assert.equal(classifyGesture(15, 15), 'pending');
});
test('Touch rotation remains proportional to the view on phone and desktop', () => {
  assert.equal(dragAngle(100, 400), dragAngle(200, 800));
  assert.ok(dragAngle(15, 320) < 0);
  assert.ok(dragAngle(-15, 320) > 0);
  assert.ok(Number.isFinite(dragAngle(15, 0)));
});
test('Narrow portrait views get enough distance to keep the ring in frame', () => {
  assert.ok(fitDistance(.4) > fitDistance(1.2));
  assert.ok(fitDistance(.4) <= 32);
  for (const aspect of [.35, .4, .8, 1, 2]) assert.ok(Number.isFinite(fitDistance(aspect)));
});

test('Fallback artwork and decorative grab cues cannot intercept pointer input', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.fallback-world,\.fallback-world \*\{pointer-events:none!important\}/);
  assert.match(css, /\.grab-zone\{[^}]*pointer-events:none/);
  assert.match(css, /\.scene canvas\{[^}]*pointer-events:auto/);
});
