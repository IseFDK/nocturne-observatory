import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cameraPreset, clamp, seededRandom, zoomFactor } from './worlds.js';
import { classifyGesture, dragAngle, flightCanRun, fitDistance } from './interaction.js';
import { sphereVertex, planetFragment, ringVertex, ringFragment, starFragment, glowVertex, glowFragment, pointVertex, pointFragment } from './shaders.js';

const TAU = Math.PI * 2;
const ease = (value) => value * value * (3 - 2 * value);

export class ObservatoryScene {
  constructor(container, { onZoom, onState, reducedMotion = false } = {}) {
    this.container = container;
    this.onZoom = onZoom;
    this.onState = onState;
    this.mobile = matchMedia('(max-width: 860px)').matches;
    this.paused = reducedMotion;
    this.flight = false;
    this.immersive = false;
    this.manualUntil = 0;
    this.touchGesture = null;
    this.needsRender = true;
    this.time = 0;
    this.lastTime = 0;
    this.current = 0;
    this.frame = 0;
    this.materials = [];
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 1.75));
    this.renderer.setClearColor(0x101315, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(...cameraPreset(this.mobile).position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.enableZoom = false; // Ordinary wheel scrolling belongs to the page
    this.controls.autoRotateSpeed = .36;
    this.controls.rotateSpeed = .45;
    this.controls.zoomSpeed = .55;
    this.controls.minDistance = cameraPreset(this.mobile).minDistance;
    this.controls.maxDistance = 34;
    this.controls.minPolarAngle = .2;
    this.controls.maxPolarAngle = Math.PI - .2;
    this.controls.addEventListener('change', () => { this.needsRender = true; this.onZoom?.(zoomFactor(this.camera.position.length(), this.referenceDistance ?? 9.6)); });
    this.controls.addEventListener('start', () => { this.manualUntil = performance.now() + 2200; this.container.classList.add('is-dragging'); });
    this.controls.addEventListener('end', () => { this.manualUntil = performance.now() + 2200; this.container.classList.remove('is-dragging'); });
    this.installTouchControls();
    this.controls.update();
    this.worlds = [this.makeVesper(), this.makeSelene(), this.makeAether()];
    this.worlds.forEach((world, index) => { world.visible = index === 0; this.scene.add(world); });
    this.makeStars();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.visibilityListener = () => { if (document.hidden) cancelAnimationFrame(this.frame); else { this.lastTime = 0; this.needsRender = true; this.frame = requestAnimationFrame((t) => this.tick(t)); } };
    document.addEventListener('visibilitychange', this.visibilityListener);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.onState?.('lost'); cancelAnimationFrame(this.frame); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => { this.onState?.('ready'); this.lastTime = 0; this.frame = requestAnimationFrame((t) => this.tick(t)); });
    this.resize();
    this.frame = requestAnimationFrame((t) => this.tick(t));
    this.onState?.('ready');
  }

  shader(vertexShader, fragmentShader, uniforms = {}, options = {}) {
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uLight: { value: 1 }, ...uniforms }, ...options });
    this.materials.push(material);
    return material;
  }

  sphere(radius, kind, segments = this.mobile ? 64 : 96) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.round(segments * .65)), this.shader(sphereVertex, planetFragment, { uKind: { value: kind } }));
  }

  glow(radius, color, strength) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), this.shader(glowVertex, glowFragment, { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide }));
  }

  points(positions, sizes, color, scale = 16) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    return new THREE.Points(geometry, this.shader(pointVertex, pointFragment, { uColor: { value: new THREE.Color(color) }, uScale: { value: scale } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }

  orbitLine(radius, color = 0x8c937f, opacity = .19) {
    const curve = [];
    for (let i = 0; i <= 256; i++) { const a = i / 256 * TAU; curve.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }

  makeVesper() {
    const group = new THREE.Group();
    group.rotation.set(.1, -.3, -.31);
    const planet = this.sphere(1.5, 0);
    group.add(planet);
    group.userData.planet = planet;
    const halo = this.glow(1.515, '#af9975', .23);
    group.add(halo);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.87, 3.35, this.mobile ? 192 : 256, 1), this.shader(ringVertex, ringFragment, {}, { transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    const random = seededRandom(41), positions = [], sizes = [];
    for (let i = 0; i < (this.mobile ? 1100 : 2300); i++) { const a = random() * TAU, r = 2 + random() * 1.34; positions.push(Math.cos(a)*r,(random()-.5)*.025,Math.sin(a)*r); sizes.push(.18+random()*.65); }
    const debris = this.points(positions, sizes, '#ddbf94', 9);
    group.add(debris);
    const outerOrbit = this.orbitLine(3.79, 0xb5a27a, .1);
    outerOrbit.rotation.x = .13;
    group.add(outerOrbit);
    const moon = this.sphere(.12, 1, 24);
    group.add(moon);
    group.userData.moon = moon;
    return group;
  }

  makeSelene() {
    const group = new THREE.Group();
    group.rotation.set(.15, .4, .15);
    const moon = this.sphere(1.66, 1);
    group.add(moon, this.glow(1.679, '#9bbcc3', .37));
    group.userData.planet = moon;
    const orbital = new THREE.Group();
    orbital.rotation.set(.45, 0, -.3);
    orbital.add(this.orbitLine(2.51, 0xadc9c6, .16), this.orbitLine(2.58, 0x7a9b9b, .06));
    const random = seededRandom(82), positions = [], sizes = [];
    for (let i = 0; i < (this.mobile ? 170 : 300); i++) { const a=random()*TAU,r=2.45+random()*.16;positions.push(Math.cos(a)*r,(random()-.5)*.04,Math.sin(a)*r);sizes.push(.4+random()*.9); }
    orbital.add(this.points(positions, sizes, '#b4d2cf', 11));
    group.add(orbital);
    group.userData.orbital = orbital;
    return group;
  }

  makeAether() {
    const group = new THREE.Group();
    group.rotation.set(.35, 0, -.2);
    const primary = new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 48), this.shader(sphereVertex, starFragment, { uTime: { value: 0 }, uCool: { value: 0 } }));
    const secondary = new THREE.Mesh(new THREE.SphereGeometry(.64, 48, 32), this.shader(sphereVertex, starFragment, { uTime: { value: 0 }, uCool: { value: 1 } }));
    const first = new THREE.Group(), second = new THREE.Group();
    first.add(primary, this.glow(1.115, '#ffb269', .9), this.glow(1.23, '#e18042', .17));
    second.add(secondary, this.glow(.68, '#acd4e7', .8), this.glow(.78, '#659bcc', .16));
    group.add(first, second);
    const orbit = this.orbitLine(1.81, 0xb5a994, .16);
    const orbit2 = this.orbitLine(2.9, 0xa1a38a, .09);
    group.add(orbit, orbit2);
    const random = seededRandom(146), positions = [], sizes = [];
    for (let i = 0; i < (this.mobile ? 300 : 600); i++) { const a=random()*TAU,r=2.8+random()*.27;positions.push(Math.cos(a)*r,(random()-.5)*.15,Math.sin(a)*r);sizes.push(.15+random()*.7); }
    group.add(this.points(positions, sizes, '#d8c6ac', 13));
    group.userData.primary = first;
    group.userData.secondary = second;
    this.positionBinary(group, 0);
    return group;
  }

  positionBinary(group, time) {
    const angle = time * .085 + .32;
    group.userData.primary.position.set(-Math.cos(angle) * 1.13, 0, -Math.sin(angle) * 1.13);
    group.userData.secondary.position.set(Math.cos(angle) * 1.93, 0, Math.sin(angle) * 1.93);
  }

  makeStars() {
    const random = seededRandom(2026), positions = [], sizes = [];
    for (let i = 0; i < (this.mobile ? 400 : 900); i++) {
      const z = -8 - random() * 13;
      positions.push((random() - .5) * 44, (random() - .5) * 26, z);
      sizes.push(.25 + Math.pow(random(), 4) * 1.9);
    }
    this.stars = this.points(positions, sizes, '#cdd6c3', 31);
    this.scene.add(this.stars);
  }

  resize() {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (!width || !height) return;
    const wasMobile = this.mobile;
    this.mobile = matchMedia('(max-width: 860px)').matches;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 1.75));
    this.camera.aspect = width / height;
    this.camera.setViewOffset(width, height, -width * (this.immersive ? 0 : cameraPreset(this.mobile).horizontalOffset), 0, width, height);
    this.camera.updateProjectionMatrix();
    if (wasMobile !== this.mobile || !this.hasSized) this.reset();
    this.hasSized = true;
    this.needsRender = true;
  }

  select(index, instant = false) {
    if (index < 0 || index >= this.worlds.length) return;
    if (instant || this.paused) { this.worlds.forEach((world, i) => { world.visible=i===index; world.scale.setScalar(1); }); this.current=index; this.transition=null; }
    else {
      this.worlds.forEach((world, i) => { world.visible=i===this.current; world.scale.setScalar(1); });
      if (index !== this.current) this.transition={ from:this.current, to:index, started:performance.now(), swapped:false };
      else this.transition=null;
    }
    this.needsRender=true;
  }

  setPaused(paused) { this.paused=paused; if (paused && this.transition) this.select(this.transition.to, true); this.needsRender=true; }
  setLight(value) { const light=clamp(Number(value),.55,1.65);this.materials.forEach((material)=>{material.uniforms.uLight.value=light;});this.needsRender=true; }
  zoom(multiplier) {
    this.manualUntil = performance.now() + 2200;
    this.controls.autoRotate = false;
    this.camera.position.multiplyScalar(clamp(this.camera.position.length()*multiplier,this.controls.minDistance,this.controls.maxDistance)/this.camera.position.length());
    this.controls.update();
    this.needsRender=true;
  }
  orbit(horizontal, vertical) {
    this.manualUntil = performance.now() + 2200;
    this.controls.autoRotate = false;
    const spherical=new THREE.Spherical().setFromVector3(this.camera.position);
    spherical.theta+=horizontal;
    spherical.phi=clamp(spherical.phi+vertical,.2,Math.PI-.2);
    this.camera.position.setFromSpherical(spherical);
    this.controls.update();
    this.needsRender=true;
  }
  reset() {
    const damping = this.controls.enableDamping;
    this.controls.autoRotate = false;
    this.controls.enableDamping = false;
    this.controls.update();
    this.manualUntil = performance.now() + 2200;
    this.camera.position.set(...cameraPreset(this.mobile).position);
    if (this.mobile || this.immersive) {
      this.camera.position.setLength(fitDistance(this.camera.aspect));
    }
    this.referenceDistance = this.camera.position.length();
    this.controls.target.set(0,0,0);
    this.controls.update();
    this.controls.enableDamping = damping;
    this.needsRender=true;
  }

  setFlight(enabled) {
    this.flight = Boolean(enabled);
    this.manualUntil = 0;
    this.needsRender = true;
  }

  setImmersive(enabled) {
    if (this.immersive === Boolean(enabled)) return;
    if (enabled) {
      this.previousDistance = this.camera.position.length();
      this.previousReferenceDistance = this.referenceDistance;
    }
    this.immersive = Boolean(enabled);
    this.resize();
    this.camera.position.setLength(enabled ? fitDistance(this.camera.aspect) : (this.previousDistance ?? fitDistance(this.camera.aspect)));
    this.referenceDistance = enabled ? this.camera.position.length() : (this.previousReferenceDistance ?? this.camera.position.length());
    this.controls.update();
    this.needsRender = true;
  }

  installTouchControls() {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'pan-y pinch-zoom';
    this.touchDown = (event) => {
      if (event.pointerType !== 'touch') return;
      // Capture phase prevents OrbitControls from claiming a native page-scroll gesture.
      event.stopImmediatePropagation();
      if (this.touchGesture) { this.touchGesture = null; this.container.classList.remove('is-dragging'); return; }
      this.touchGesture = { id:event.pointerId, startX:event.clientX, startY:event.clientY, lastX:event.clientX, intent:'pending' };
    };
    this.touchMove = (event) => {
      if (event.pointerType !== 'touch') return;
      event.stopImmediatePropagation();
      const gesture = this.touchGesture;
      if (!gesture || gesture.id !== event.pointerId) return;
      if (gesture.intent === 'pending') gesture.intent = classifyGesture(event.clientX-gesture.startX,event.clientY-gesture.startY);
      if (gesture.intent === 'orbit') {
        if (event.cancelable) event.preventDefault();
        this.manualUntil = performance.now() + 2200;
        this.orbit(dragAngle(event.clientX-gesture.lastX, canvas.clientWidth), 0);
        this.container.classList.add('is-dragging');
      }
      gesture.lastX = event.clientX;
    };
    this.touchEnd = (event) => {
      if (event.pointerType !== 'touch') return;
      event.stopImmediatePropagation();
      if (this.touchGesture?.id === event.pointerId) this.touchGesture = null;
      this.container.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerdown',this.touchDown,true);
    canvas.addEventListener('pointermove',this.touchMove,{capture:true,passive:false});
    canvas.addEventListener('pointerup',this.touchEnd,true);
    canvas.addEventListener('pointercancel',this.touchEnd,true);
  }

  tick(timestamp) {
    if (document.hidden) return;
    const delta=this.lastTime?Math.min((timestamp-this.lastTime)/1000,.05):0;
    this.lastTime=timestamp;
    if (!this.paused) {
      this.time+=delta;
      const world=this.worlds[this.current];
      if (world.userData.planet) world.userData.planet.rotation.y=this.time*.018;
      if (world.userData.moon) world.userData.moon.position.set(Math.cos(this.time*.07+1)*3.79,.03,Math.sin(this.time*.07+1)*3.79);
      if (world.userData.orbital) world.userData.orbital.rotation.y=this.time*.014;
      if (world.userData.primary) this.positionBinary(world,this.time);
      this.materials.forEach((m)=>{if(m.uniforms.uTime)m.uniforms.uTime.value=this.time;});
      this.needsRender=true;
    }
    if (this.transition) {
      const t=clamp((timestamp-this.transition.started)/900,0,1);
      if (t<.5) this.worlds[this.transition.from].scale.setScalar(Math.max(.001,1-ease(t*2)));
      else { if(!this.transition.swapped){this.worlds[this.transition.from].visible=false;this.worlds[this.transition.to].visible=true;this.current=this.transition.to;this.transition.swapped=true;}this.worlds[this.transition.to].scale.setScalar(Math.max(.001,ease((t-.5)*2))); }
      if(t===1){this.worlds[this.transition.to].scale.setScalar(1);this.transition=null;}
      this.needsRender=true;
    }
    this.controls.autoRotate = flightCanRun({ enabled:this.flight, paused:this.paused, now:timestamp, manualUntil:this.manualUntil });
    this.controls.update(delta);
    if (this.needsRender) { this.renderer.render(this.scene,this.camera);this.needsRender=false; }
    this.frame=requestAnimationFrame((t)=>this.tick(t));
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange',this.visibilityListener);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.touchDown,true);
    canvas.removeEventListener('pointermove',this.touchMove,true);
    canvas.removeEventListener('pointerup',this.touchEnd,true);
    canvas.removeEventListener('pointercancel',this.touchEnd,true);
    this.controls.dispose();
    this.scene.traverse((object)=>{object.geometry?.dispose();if(object.material){(Array.isArray(object.material)?object.material:[object.material]).forEach((m)=>m.dispose());}});
    this.renderer.dispose();
  }
}
