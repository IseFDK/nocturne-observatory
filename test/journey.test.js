import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourney, reduceJourney, nextJourneyWorld, completedLegs } from '../src/journey.js';

test('A route only begins with Start and always starts at Vesper', () => {
  const idle = createJourney('aether');
  assert.equal(idle.status, 'idle');
  assert.equal(idle.index, 2);
  assert.deepEqual(idle.visited, []);
  const started = reduceJourney(idle, { type: 'start' });
  assert.equal(started.status, 'active');
  assert.equal(started.index, 0);
  assert.deepEqual(started.visited, ['vesper']);
  assert.equal(nextJourneyWorld(started).id, 'selene');
});
test('Next follows the ordered route and marks each completed path leg', () => {
  let state = reduceJourney(createJourney(), { type: 'start' });
  assert.deepEqual(completedLegs(state), [false, false]);
  state = reduceJourney(state, { type: 'next' });
  assert.equal(state.index, 1);
  assert.equal(nextJourneyWorld(state).id, 'aether');
  assert.deepEqual(completedLegs(state), [true, false]);
  state = reduceJourney(state, { type: 'next' });
  assert.equal(state.status, 'complete');
  assert.deepEqual(state.visited, ['vesper', 'selene', 'aether']);
  assert.deepEqual(completedLegs(state), [true, true]);
  assert.equal(nextJourneyWorld(state), null);
});
test('Repeated Next cannot overrun or silently restart a completed route', () => {
  let state = reduceJourney(createJourney(), { type: 'start' });
  for (let i = 0; i < 20; i++) state = reduceJourney(state, { type: 'next' });
  assert.equal(state.index, 2);
  assert.equal(state.status, 'complete');
  assert.equal(state.visited.length, 3);
});
test('Stopping keeps the trace and disables advancement until a restart', () => {
  let state = reduceJourney(createJourney(), { type: 'start' });
  state = reduceJourney(state, { type: 'next' });
  state = reduceJourney(state, { type: 'stop' });
  assert.equal(state.status, 'stopped');
  assert.deepEqual(state.visited, ['vesper', 'selene']);
  assert.equal(nextJourneyWorld(state), null);
  assert.equal(reduceJourney(state, { type: 'next' }), state);
  state = reduceJourney(state, { type: 'restart' });
  assert.deepEqual(state, { status: 'active', index: 0, visited: ['vesper'] });
});
test('Manual selection coherently ends the route and resets visited paths', () => {
  const running = reduceJourney(createJourney(), { type: 'start' });
  const manual = reduceJourney(running, { type: 'manual', worldId: 'selene' });
  assert.deepEqual(manual, { status: 'idle', index: 1, visited: [] });
  assert.deepEqual(completedLegs(manual), [false, false]);
});
test('Browser history restoration returns to free exploration', () => {
  const complete = { status: 'complete', index: 2, visited: ['vesper', 'selene', 'aether'] };
  assert.deepEqual(reduceJourney(complete, { type: 'history', worldId: 'vesper' }), createJourney('vesper'));
});
test('Unknown worlds and unrelated actions have a safe stable fallback', () => {
  const state = createJourney('unknown');
  assert.deepEqual(state, createJourney('vesper'));
  assert.equal(reduceJourney(state, { type: 'unknown' }), state);
  assert.equal(reduceJourney(state, { type: 'next' }), state);
  assert.equal(reduceJourney(state, { type: 'stop' }), state);
});
test('Reducer does not mutate previously rendered route state', () => {
  const state = { status: 'active', index: 1, visited: ['vesper', 'selene'] };
  const stopped = reduceJourney(state, { type: 'stop' });
  stopped.visited.push('aether');
  assert.deepEqual(state.visited, ['vesper', 'selene']);
  assert.equal(state.status, 'active');
});
