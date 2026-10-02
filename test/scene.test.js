import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ObservatoryScene } from '../src/scene.js';

function makeBuilder() {
  const builder = Object.create(ObservatoryScene.prototype);
  builder.mobile = true;
  builder.materials = [];
  builder.current = 0;
  builder.paused = true;
  builder.worlds = [builder.makeVesper(), builder.makeSelene(), builder.makeAether()];
  return builder;
}

test('Every world produces finite, renderable geometry and complete shader materials', () => {
  const builder = makeBuilder();
  for (const world of builder.worlds) {
    let geometries = 0;
    world.traverse((object) => {
      if (!object.geometry) return;
      geometries++;
      const position = object.geometry.getAttribute('position');
      assert.ok(position && position.count > 0);
      for (const value of position.array) assert.ok(Number.isFinite(value));
      if (object.material?.isShaderMaterial) {
        assert.ok(object.material.vertexShader.includes('void main'));
        assert.ok(object.material.fragmentShader.includes('void main'));
        assert.ok(object.material.uniforms.uLight);
      }
    });
    assert.ok(geometries >= 4);
  }
  builder.worlds.forEach((world) => world.traverse((object) => object.geometry?.dispose()));
  builder.materials.forEach((material) => material.dispose());
});

test('A paused view can switch worlds repeatedly without stale visibility or transition state', () => {
  const builder = makeBuilder();
  for (const index of [2, 1, 0, 2, 2, 0]) {
    builder.select(index);
    assert.equal(builder.current, index);
    assert.equal(builder.transition, null);
    builder.worlds.forEach((world, i) => { assert.equal(world.visible, i === index); assert.equal(world.scale.x, 1); });
  }
  builder.select(99);
  assert.equal(builder.current, 0);
});

test('Pausing an in-flight transition commits the latest selected world', () => {
  const builder = makeBuilder();
  builder.paused = false;
  builder.select(1);
  assert.equal(builder.transition.to, 1);
  builder.select(2);
  assert.equal(builder.transition.to, 2);
  builder.setPaused(true);
  assert.equal(builder.current, 2);
  assert.equal(builder.transition, null);
  assert.equal(builder.worlds[2].visible, true);
});

test('Scene light controls clamp every shader material to the supported range', () => {
  const builder = makeBuilder();
  builder.setLight(9);
  builder.materials.forEach((material) => assert.equal(material.uniforms.uLight.value, 1.65));
  builder.setLight(.1);
  builder.materials.forEach((material) => assert.equal(material.uniforms.uLight.value, .55));
});

test('Zoom never clips through a world, and keyboard orbits respect polar limits', () => {
  const builder = Object.create(ObservatoryScene.prototype);
  builder.camera = new THREE.PerspectiveCamera();
  builder.camera.position.set(3.3, 2.3, 8.5);
  builder.controls = { minDistance: 5.1, maxDistance: 14, update() {}, target: new THREE.Vector3() };
  for (let i = 0; i < 50; i++) builder.zoom(.88);
  assert.ok(Math.abs(builder.camera.position.length() - 5.1) < .00001);
  for (let i = 0; i < 50; i++) builder.zoom(1.14);
  assert.ok(Math.abs(builder.camera.position.length() - 14) < .00001);
  builder.orbit(20, 30);
  const polar = new THREE.Spherical().setFromVector3(builder.camera.position).phi;
  assert.ok(polar >= .2 && polar <= Math.PI - .2 + .00001);
  builder.mobile = false;
  builder.reset();
  assert.deepEqual(builder.camera.position.toArray(), [3.3, 2.3, 8.5]);
});
