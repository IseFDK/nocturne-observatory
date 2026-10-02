import { worlds, getWorld } from './worlds.js';

/** An ordered navigation route through separate fictional studies, not physical space. */
export function createJourney(worldId = worlds[0].id) {
  return { status: 'idle', index: worlds.indexOf(getWorld(worldId)), visited: [] };
}

export function reduceJourney(state, action) {
  switch (action.type) {
    case 'start':
    case 'restart':
      return { status: 'active', index: 0, visited: [worlds[0].id] };
    case 'next': {
      if (state.status !== 'active' || state.index >= worlds.length - 1) return state;
      const index = state.index + 1;
      return { status: index === worlds.length - 1 ? 'complete' : 'active', index, visited: worlds.slice(0, index + 1).map(world => world.id) };
    }
    case 'stop':
      return state.status === 'active' ? { ...state, status: 'stopped', visited: [...state.visited] } : state;
    case 'manual':
    case 'history':
      return createJourney(action.worldId);
    default:
      return state;
  }
}

export function nextJourneyWorld(state) {
  return state.status === 'active' ? worlds[state.index + 1] ?? null : null;
}

export function completedLegs(state) {
  return [worlds[1].id, worlds[2].id].map(id => state.visited.includes(id));
}
