import { gemsRealistic } from './settings.js';
import { goldMaterial, nuggetGeometry } from './materials.js';
import * as THREE from 'three';
import { makeGemMesh } from './minerals.js';
import { lumpy } from './world.js';
import { mulberry32 } from './noise.js';
import { makeSluiceModel } from './sluice.js';

// First-person tool models. They live in their own scene and camera and are
// drawn after the world with a cleared depth buffer, so they never clip into
// the ground when you look down.

export class Viewmodel {
  constructor(env) {
    this.scene = new THREE.Scene();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
    this.vmHemi = new THREE.HemisphereLight(0xfff1dc, 0x7a5236, 0.7);
    this.vmSun = new THREE.DirectionalLight(0xfff0d8, 1.6);
    this.vmSun.position.set(-1, 2, 1);
    // Headlamp spill on your hands and tools at night.
    this.vmLamp = new THREE.PointLight(0xfff2dc, 0, 3, 1.5);
    this.vmLamp.position.set(0, 0.15, 0.05);
    this.scene.add(this.vmHemi, this.vmSun, this.vmLamp);

    this.tools = {
      detector: this.buildDetector(),
      shovel: this.buildShovel(),
      pan: this.buildPan(),
      sieve: this.buildSieve(),
      sluiceCarry: this.buildSluiceCarry(),
      uvtorch: this.buildUvTorch(),
      brush: this.buildBrush(),
      trowel: this.buildTrowel(),
      pick: this.buildPick(),
      hands: this.buildHands(),
    };
    for (const g of Object.values(this.tools)) {
      g.visible = false;
      this.scene.add(g);
    }
    this.current = null;
    this.pending = null;
    this.swap = 1; // 0 = lowered out of view, 1 = raised
    this.time = 0;
    this.digT = -1;
    this.sweep = 0;
  }

  setTool(name) {
    if (this.current === name && !this.pending) return;
    if (!this.current) {
      this.current = name;
      this.tools[name].visible = true;
      this.swap = 0;
      return;
    }
    this.pending = name;
  }

  setAspect(a) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }

  playDig() { this.digT = 0; }

  // ---------- models ----------

  buildDetector() {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    const black = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.5 });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.3 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xc98a1c, roughness: 0.6 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.14), yellow);
    box.position.set(0, 0, 0);
    g.add(box);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x0d2a14 }),
    );
    screen.rotation.x = -Math.PI / 2 + 0.4;
    screen.position.set(0, 0.03, 0.01);
    g.add(screen);
    this.detScreen = screen;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10), black);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, -0.05, 0.1);
    g.add(grip);

    const coilPos = new THREE.Vector3(-0.16, -0.5, -1.05);
    const start = new THREE.Vector3(0, -0.02, -0.08);
    const dir = coilPos.clone().sub(start);
    const len = dir.length();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 8), shaftMat);
    shaft.position.copy(start).addScaledVector(dir, 0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    g.add(shaft);

    const coil = new THREE.Group();
    coil.position.copy(coilPos);
    coil.rotation.x = 0.12;
    g.add(coil);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.022, 32), black);
    coil.add(disc);
    this.coilRingMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffc23a, emissiveIntensity: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.007, 6, 40), this.coilRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.016;
    coil.add(ring);

    root.position.set(0.24, -0.27, -0.5);
    root.userData.base = root.position.clone();
    this.detG = g;
    return root;
  }

  buildShovel() {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5f6266, metalness: 0.5, roughness: 0.55 });

    // Handle runs from the grip (near the camera) forward and down to the blade.
    const gripPos = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(-0.12, -0.42, -0.95);
    const dir = end.clone().sub(gripPos).normalize();
    const len = end.distanceTo(gripPos);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, len, 10), wood);
    handle.position.copy(gripPos).lerp(end, 0.5);
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(handle);
    const grip = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 16), wood);
    grip.position.copy(gripPos).addScaledVector(dir, -0.04);
    grip.quaternion.copy(handle.quaternion);
    grip.rotateX(Math.PI / 2);
    g.add(grip);

    // Blade carries on along the handle, face tipped up so dirt can sit on it.
    // Turn the blade's face partly toward the eye (camera sits at -root.position)
    // so it doesn't read as a thin edge.
    const bladePos = end.clone().addScaledVector(dir, 0.12);
    const toEye = new THREE.Vector3(-0.3, 0.16, 0.3).sub(bladePos).normalize();
    const n = new THREE.Vector3(0, 1, 0).lerp(toEye, 0.65).normalize();
    const zAxis = dir.clone().addScaledVector(n, -dir.dot(n)).normalize().negate();
    const xAxis = new THREE.Vector3().crossVectors(n, zAxis).normalize();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.26), steel);
    blade.position.copy(bladePos);
    blade.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, n, zAxis));
    g.add(blade);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.08, 10), steel);
    socket.position.copy(end).addScaledVector(dir, -0.02);
    socket.quaternion.copy(handle.quaternion);
    g.add(socket);
    const dirt = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08, 0),
      new THREE.MeshStandardMaterial({ color: 0x7a3e1e, roughness: 1, flatShading: true }),
    );
    dirt.scale.set(1, 0.45, 1.2);
    dirt.position.copy(blade.position).add(new THREE.Vector3(0, 0.03, 0));
    dirt.visible = false;
    g.add(dirt);
    this.shovelDirt = dirt;

    root.position.set(0.3, -0.16, -0.3);
    root.userData.base = root.position.clone();
    this.shovelG = g;
    return root;
  }

  buildPan() {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    const profile = [
      [0, 0], [0.12, 0], [0.14, 0.006], [0.22, 0.055], [0.235, 0.06], [0.24, 0.056],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const pan = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 40),
      new THREE.MeshStandardMaterial({ color: 0x2f4f2c, roughness: 0.55, side: THREE.DoubleSide }),
    );
    g.add(pan);

    this.panDirtMat = new THREE.MeshStandardMaterial({ color: 0x6a3a1e, roughness: 1 });
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32).rotateX(-Math.PI / 2), this.panDirtMat);
    dirt.position.y = 0.018;
    g.add(dirt);
    this.panDirt = dirt;

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b8a7a, transparent: true, opacity: 0.45, roughness: 0.05 }),
    );
    water.position.y = 0.032;
    g.add(water);
    this.panWater = water;

    const specks = new THREE.Group();
    // Flakes, not balls: gold flattens out as it tumbles down the creek.
    const goldMat = goldMaterial('fine', { emissive: 0x3a2600 });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(nuggetGeometry(i + 1, { detail: 1 }), goldMat);
      s.scale.set(0.006 + Math.random() * 0.004, 0.0018, 0.005 + Math.random() * 0.004);
      s.rotation.y = Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.05;
      s.position.set(Math.cos(a) * r - 0.06, 0.02, Math.sin(a) * r + 0.02);
      specks.add(s);
    }
    specks.visible = false;
    g.add(specks);
    this.panSpecks = specks;

    g.rotation.x = 1.05;
    g.scale.setScalar(0.8);
    root.position.set(0.02, -0.25, -0.62);
    root.userData.base = root.position.clone();
    this.panG = g;
    return root;
  }

  // Round gem sieve: wooden hoop, wire mesh, a load of wash in it.
  buildSieve() {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.75, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 40, 1, true), wood));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 6, 40), wood);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.035;
    g.add(rim);
    const screen = new THREE.Mesh(
      new THREE.CircleGeometry(0.205, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        map: meshTexture(), color: 0x9a9ea2, metalness: 0.6, roughness: 0.4,
        transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
      }),
    );
    screen.position.y = -0.03;
    g.add(screen);

    // A domed pile of wash, highest in the middle.
    const r = mulberry32(42);
    const pebbleGeo = lumpy(new THREE.DodecahedronGeometry(1, 0), 0.3, r);
    this.pebbles = new THREE.InstancedMesh(pebbleGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), 90);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.18;
      const sz = 0.008 + r() * 0.014;
      q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      m4.compose(new THREE.Vector3(Math.cos(a) * rad, -0.022 + (0.18 - rad) * 0.12, Math.sin(a) * rad), q, new THREE.Vector3(sz, sz * 0.7, sz));
      this.pebbles.setMatrixAt(i, m4);
      const v = r();
      c.setRGB(0.4 + v * 0.25, 0.37 + v * 0.2, 0.32 + v * 0.18, THREE.SRGBColorSpace);
      this.pebbles.setColorAt(i, c);
    }
    this.pebbles.visible = false;
    g.add(this.pebbles);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(0.205, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b8a7a, transparent: true, opacity: 0.4, roughness: 0.05 }),
    );
    water.position.y = 0.01;
    water.visible = false;
    g.add(water);
    this.sieveWater = water;

    this.sieveFinds = new THREE.Group();
    g.add(this.sieveFinds);

    g.rotation.x = 0.95;
    g.scale.setScalar(0.85);
    root.position.set(0, -0.26, -0.6);
    root.userData.base = root.position.clone();
    this.sieveG = g;
    this.sieveResultT = 0;
    this.flipT = -1;
    return root;
  }

  // ---------- hand tools ----------

  handTool(build, pos) {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    build(g);
    root.position.copy(pos);
    root.userData.base = root.position.clone();
    root.userData.g = g;
    return root;
  }

  buildBrush() {
    const wood = new THREE.MeshStandardMaterial({ color: 0xb08050, roughness: 0.6 });
    const bristle = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 });
    return this.handTool((g) => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.2, 8), wood);
      h.rotation.x = -1.0;
      g.add(h);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.03), wood);
      head.position.set(0, -0.085, -0.055);
      head.rotation.x = -1.0;
      g.add(head);
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.03, 0.026), bristle);
      br.position.set(0, -0.105, -0.07);
      br.rotation.x = -1.0;
      g.add(br);
    }, new THREE.Vector3(0.16, -0.2, -0.42));
  }

  buildTrowel() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.6 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8e92, metalness: 0.8, roughness: 0.35 });
    return this.handTool((g) => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 10), wood);
      h.rotation.x = -1.2;
      g.add(h);
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), steel);
      shank.position.set(0, -0.04, -0.06);
      shank.rotation.x = -0.5;
      g.add(shank);
      // Pointed blade.
      const shape = new THREE.Shape();
      shape.moveTo(-0.035, 0); shape.lineTo(0.035, 0); shape.lineTo(0, 0.11); shape.closePath();
      const blade = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x8a8e92, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
      blade.rotation.x = -1.35;
      blade.position.set(0, -0.06, -0.08);
      g.add(blade);
    }, new THREE.Vector3(0.15, -0.2, -0.4));
  }

  buildPick() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.6 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5a5e62, metalness: 0.8, roughness: 0.4 });
    return this.handTool((g) => {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.3, 8), wood);
      h.rotation.x = -0.6;
      g.add(h);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.11), steel);
      head.position.set(0, 0.13, -0.085);
      head.rotation.x = -0.6;
      g.add(head);
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 6), steel);
      point.position.set(0, 0.09, -0.16);
      point.rotation.x = -0.6 - Math.PI / 2;
      g.add(point);
    }, new THREE.Vector3(0.2, -0.26, -0.42));
  }

  buildHands() {
    const glove = new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.9 });
    return this.handTool((g) => {
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.09), glove);
      palm.rotation.x = -0.6;
      g.add(palm);
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.06), glove);
        f.position.set(-0.03 + i * 0.02, -0.03, -0.07);
        f.rotation.x = -0.9;
        g.add(f);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.05), glove);
      thumb.position.set(-0.05, -0.005, -0.03);
      thumb.rotation.set(-0.6, 0.6, 0);
      g.add(thumb);
    }, new THREE.Vector3(0.14, -0.2, -0.38));
  }

  playTap() { this.tapT = 0; }

  // Light the tools for the time of day; the headlamp lights them at night.
  setLight(daylight, lamp, uv) {
    this.vmHemi.intensity = 0.12 + 0.58 * daylight;
    this.vmSun.intensity = 0.1 + 1.5 * daylight;
    this.vmLamp.intensity = lamp ? 1.4 : 0;
    this.scene.environmentIntensity = 0.04 + 0.31 * daylight;
    if (this.uvLens) this.uvLens.emissiveIntensity = uv ? 3 : 0.2;
  }

  buildUvTorch() {
    const root = new THREE.Group();
    const g = new THREE.Group();
    root.add(g);
    const body = new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: 0.6, roughness: 0.4 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.15, 20), body);
    tube.rotation.x = Math.PI / 2;
    g.add(tube);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.04, 20), body);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.09;
    g.add(head);
    this.uvLens = new THREE.MeshStandardMaterial({ color: 0x3a1a6a, emissive: 0x8a4cff, emissiveIntensity: 0.2, roughness: 0.1 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.021, 24), this.uvLens);
    lens.position.z = -0.111;
    g.add(lens);
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.02), new THREE.MeshStandardMaterial({ color: 0x8a2a2a }));
    button.position.set(0, 0.018, 0.0);
    g.add(button);
    g.rotation.set(0.12, 0.2, 0);
    root.position.set(0.17, -0.17, -0.36);
    root.userData.base = root.position.clone();
    return root;
  }

  // Swap the built-in hand tools for the Blender models once they've loaded.
  // Models have the grip at the origin and point down -Z; tip them toward the ground.
  // Gear models from Blender. The live bits (coil glow, detector screen, what's
  // in the pan and sieve) stay as they are; the models replace the shapes around them.
  applyGear(m) {
    if (m.detector) {
      this.detG.clear();
      const o = m.detector.clone(true);
      o.traverse((c) => {
        if (!c.isMesh) return;
        c.castShadow = false;
        if (c.name.startsWith('coil_ring')) c.material = this.coilRingMat;
        if (c.name.startsWith('screen')) { c.material = this.detScreen.material; this.detScreen = c; }
      });
      this.detG.add(o);
    }
    if (m.gold_pan) {
      this.panG.children[0].visible = false; // the old lathe pan
      this.panG.add(m.gold_pan.clone(true));
    }
    if (m.gem_sieve) {
      this.sieveG.children[0].visible = false; // old hoop
      this.sieveG.children[1].visible = false; // old rim
      this.sieveG.add(m.gem_sieve.clone(true));
    }
    if (m.sluice) {
      const g = this.tools.sluiceCarry.children[0];
      g.traverse((c) => { if (c.isMesh && c.userData.static) c.visible = false; });
      g.add(m.sluice.clone(true));
    }
  }

  applyModels(models) {
    // tool, model, where the grip sits in view, tilt, turn in toward the centre, scale
    const set = (tool, key, pos, tilt, turn, scale = 1) => {
      const root = this.tools[tool];
      const g = root?.userData.g;
      const m = models[key];
      if (!g || !m) return;
      g.clear();
      const o = m.clone(true);
      o.rotation.set(tilt, turn, 0, 'YXZ');
      o.scale.setScalar(scale);
      g.add(o);
      root.userData.base.set(...pos);
    };
    // The view camera looks straight ahead, so the working end points up and in
    // toward the middle of the screen, where the dig cursor is.
    set('brush', 'brush', [0.12, -0.17, -0.3], 0.3, 0.32);
    set('trowel', 'trowel', [0.12, -0.18, -0.3], 0.28, 0.32);
    set('pick', 'rock_pick', [0.16, -0.22, -0.34], 0.2, 0.32, 0.8);
    set('hands', 'glove', [0.09, -0.17, -0.34], 0.2, 0.25);
  }

  buildSluiceCarry() {
    const root = new THREE.Group();
    const m = makeSluiceModel(0.55);
    m.rotation.set(0.5, 0.35, 0.15);
    root.add(m);
    root.position.set(0.12, -0.42, -0.75);
    root.userData.base = root.position.clone();
    return root;
  }

  // After the flip the heavy stones sit in the middle of the pile, more tightly
  // the better they settled; agates are light, so they turn up anywhere.
  showSieveResult(finds, strat = 1) {
    this.sieveResultT = 3;
    this.flipT = 0;
    this.sieveFinds.clear();
    const r = Math.random;
    finds.slice(0, 16).forEach((f) => {
      const m = makeGemMesh(f, { hq: gemsRealistic('world'), world: true }); // right in front of you: worth the real thing
      m.scale.multiplyScalar(f.type === 'agate' ? 0.9 : 1.5);
      const a = r() * Math.PI * 2;
      const rad = f.type !== 'agate' ? r() * (0.025 + (1 - strat) * 0.14) : 0.05 + r() * 0.1;
      m.position.set(Math.cos(a) * rad, (0.18 - rad) * 0.12, Math.sin(a) * rad);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      this.sieveFinds.add(m);
    });
  }

  showPanResult(goldFound) {
    this.panResultT = 2.2;
    this.panSpecks.visible = goldFound;
    this.panSpecks.children.forEach((s, i) => { s.visible = i < 4 + Math.random() * 10; });
  }

  // ---------- per-frame ----------

  update(dt, s) {
    this.time += dt;

    // Tool swap: lower the old one, raise the new one.
    if (this.pending) {
      this.swap = Math.max(0, this.swap - dt * 6);
      if (this.swap === 0) {
        this.tools[this.current].visible = false;
        this.current = this.pending;
        this.pending = null;
        this.tools[this.current].visible = true;
      }
    } else {
      this.swap = Math.min(1, this.swap + dt * 5);
    }
    const root = this.tools[this.current];
    if (!root) return;

    const bobAmt = s.moving ? (s.running ? 1.6 : 1) : 0;
    this.bob = (this.bob || 0) + (bobAmt - (this.bob || 0)) * Math.min(1, dt * 8);
    const bx = Math.cos(s.stridePhase) * 0.012 * this.bob;
    const by = Math.abs(Math.sin(s.stridePhase)) * 0.016 * this.bob;
    const lower = (1 - easeOut(this.swap)) * 0.5;
    root.position.copy(root.userData.base);
    root.position.x += bx;
    root.position.y += -by - lower + s.landDip;
    // Lag behind mouse look a touch.
    root.rotation.y = THREE.MathUtils.clamp(-s.lookDX * 0.0012, -0.08, 0.08);
    root.rotation.x = THREE.MathUtils.clamp(-s.lookDY * 0.0012, -0.08, 0.08);

    if (this.current === 'detector') {
      // Lazy side-to-side sweep, the way you actually swing a detector.
      this.sweep += dt * (s.moving ? 2.4 : 1.6);
      this.detG.rotation.y = Math.sin(this.sweep) * 0.22;
      this.detG.rotation.z = Math.sin(this.sweep) * 0.05;
      this.coilRingMat.emissiveIntensity = s.signal * 4;
      this.coilRingMat.emissive.set(s.signalKind === 'iron' ? 0x8899aa : 0xffc23a);
      this.detScreen.material.color.setRGB(0.05 + s.signal * 0.3, 0.16 + s.signal * 0.6, 0.08 + s.signal * 0.1);
    }

    if (this.current === 'shovel') {
      if (this.digT >= 0) {
        this.digT += dt / 0.42;
        const t = this.digT;
        // Stab forward and down, then lever back with a load of dirt.
        const stab = t < 0.4 ? easeOut(t / 0.4) : 1 - easeInOut((t - 0.4) / 0.6);
        this.shovelG.position.set(0, -stab * 0.12, -stab * 0.22);
        this.shovelG.rotation.x = stab * 0.35 - (t > 0.4 ? Math.sin((t - 0.4) / 0.6 * Math.PI) * 0.25 : 0);
        this.shovelDirt.visible = t > 0.45 && s.dirtOnBlade;
        if (t >= 1) { this.digT = -1; this.shovelDirt.visible = false; }
      } else {
        this.shovelG.position.set(0, 0, 0);
        this.shovelG.rotation.x = 0;
      }
    }

    // Hand tools: brush sweeps, trowel scrapes, pick chops, hands reach.
    if (this.tools[this.current].userData.g) {
      const g = this.tools[this.current].userData.g;
      const w = this.time;
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
      if (this.tapT >= 0 && this.tapT < 1) {
        this.tapT += dt / 0.3;
        const k = Math.sin(Math.min(1, this.tapT) * Math.PI);
        g.rotation.x = -k * 0.7;
        g.position.z = -k * 0.05;
      } else if (s.working) {
        if (this.current === 'brush') { g.position.x = Math.sin(w * 14) * 0.03; g.rotation.z = Math.sin(w * 14) * 0.3; }
        if (this.current === 'trowel') { g.position.z = -Math.abs(Math.sin(w * 7)) * 0.05; g.rotation.x = -Math.abs(Math.sin(w * 7)) * 0.25; }
        if (this.current === 'pick') { const k = Math.abs(Math.sin(w * 9)); g.rotation.x = -k * 0.8; g.position.z = -k * 0.04; }
        if (this.current === 'hands') g.position.z = -0.04;
      }
    }

    if (this.current === 'sieve') {
      if (this.flipT >= 0 && this.flipT < 1) {
        // Slap it over onto the mat.
        this.flipT += dt / 0.35;
        const t = Math.min(1, this.flipT);
        this.sieveG.position.set(0, -Math.sin(t * Math.PI) * 0.08, 0);
        this.sieveG.rotation.set(0.95, 0, t < 1 ? t * Math.PI : 0);
      } else if (s.sieving) {
        // Jig: up-and-down strokes with a half-turn twist, under water. Harder
        // jigging means bigger, faster strokes.
        this.jigPhase = (this.jigPhase || 0) + dt * (8 + s.jig * 18);
        const w = this.jigPhase;
        const amp = 0.006 + s.jig * 0.03;
        this.sieveG.position.set(Math.sin(w / 3) * 0.01, Math.abs(Math.sin(w)) * amp - 0.03, 0);
        this.sieveG.rotation.set(0.95 + Math.sin(w) * amp * 1.5, Math.sin(w / 3) * 0.35, 0);
      } else {
        this.sieveG.position.multiplyScalar(0.85);
        this.sieveG.rotation.set(0.95, this.sieveG.rotation.y * 0.85, 0);
      }
      this.sieveWater.visible = s.sieving;
      if (this.sieveResultT > 0) {
        this.sieveResultT -= dt;
        if (this.sieveResultT <= 0) this.sieveFinds.clear();
      }
      this.pebbles.visible = s.sieving || s.sieveProgress > 0 || this.sieveResultT > 0;
    }

    if (this.current === 'pan') {
      const p = s.panProgress;
      if (s.panning) {
        const w = this.time * 7;
        this.panG.position.set(Math.cos(w) * 0.025, Math.sin(w * 2) * 0.006, Math.sin(w) * 0.02);
        this.panG.rotation.set(1.05 + Math.sin(w) * 0.1, 0, Math.cos(w) * 0.12);
      } else {
        this.panG.position.multiplyScalar(0.85);
        this.panG.rotation.set(1.05, 0, this.panG.rotation.z * 0.85);
      }
      // Light material washes out; the dirt shrinks to a streak of black sand.
      const has = p > 0 || this.panResultT > 0;
      this.panDirt.visible = has;
      this.panWater.visible = s.panning || p > 0;
      const k = 1 - p * 0.75;
      this.panDirt.scale.set(k, 1, k);
      this.panDirtMat.color.setRGB(0.42 - p * 0.33, 0.23 - p * 0.17, 0.12 - p * 0.07);
      if (this.panResultT > 0) {
        this.panResultT -= dt;
        this.panDirt.scale.set(0.25, 1, 0.25);
        this.panDirtMat.color.setRGB(0.08, 0.06, 0.05);
        if (this.panResultT <= 0) {
          this.panSpecks.visible = false;
          this.panDirt.visible = false;
        }
      }
    }
  }
}

function meshTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
