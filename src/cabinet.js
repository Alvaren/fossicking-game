import * as THREE from 'three';
import { PRIZES, rosette } from './gemshow.js';

// The collection cabinet at camp: a glass-fronted case with a soft light at
// the back, where your collection pieces sit on little stands and turn slowly
// when you come up to look.

const COLS = 5, ROWS = 3;
const W = 1.3, H = 1.55, D = 0.42;
const SLOT = 0.11; // each piece is shown at about this size

export class Cabinet {
  constructor(scene, spot, faceTo, makeMesh) {
    this.makeMesh = makeMesh;
    this.group = new THREE.Group();
    this.group.position.set(spot.x, spot.y, spot.z);
    this.group.rotation.y = Math.atan2(faceTo.x - spot.x, faceTo.z - spot.z); // front (+z) toward camp
    scene.add(this.group);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.7 });
    const box = (w, h, d, x, y, z, mat = wood) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    box(W, 0.06, D, 0, 0.3, 0);                  // floor of the case
    box(W, 0.05, D, 0, 0.3 + H, 0);              // top
    box(0.05, H + 0.35, D, -W / 2, (H + 0.35) / 2, 0);
    box(0.05, H + 0.35, D, W / 2, (H + 0.35) / 2, 0);
    // A warm lit back panel: makes the stones glow, the way a jeweller's case does.
    box(W, H, 0.02, 0, 0.3 + H / 2, -D / 2 + 0.01, new THREE.MeshBasicMaterial({ color: 0xe9dcc4 }));
    this.shelfY = [];
    for (let r = 0; r < ROWS; r++) {
      const y = 0.3 + 0.08 + r * (H / ROWS);
      if (r) box(W - 0.06, 0.025, D - 0.04, 0, y - 0.02, 0, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0, roughness: 0.05, transparent: true, opacity: 0.25 }));
      this.shelfY.push(y);
    }
    // Glass front.
    box(W - 0.06, H, 0.008, 0, 0.3 + H / 2, D / 2 - 0.01, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }));
    this.stands = [];
    this.sig = '';
    this.contents = new THREE.Group();
    this.group.add(this.contents);
  }

  // Rebuild the display when the collection's changed (and you're near enough to see).
  refresh(items) {
    const sig = items.map((i) => i.label + i.value + (i.ribbons?.length || 0)).join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    this.contents.traverse(o => o.userData.dispose?.());
    this.contents.clear();
    this.stands = [];
    const standGeo = new THREE.CylinderGeometry(0.03, 0.036, 0.025, 20);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.4 });
    items.slice(0, COLS * ROWS).forEach((it, i) => {
      const row = ROWS - 1 - Math.floor(i / COLS), col = i % COLS; // fill from the top shelf
      const x = -W / 2 + 0.13 + col * ((W - 0.26) / (COLS - 1));
      const y = this.shelfY[row];
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.set(x, y + 0.0125, 0.02);
      this.contents.add(stand);
      // The best ribbon it's won, pinned to the front of its stand.
      const best = PRIZES.find((p) => it.ribbons?.some((r) => r.title === p.title));
      if (best) {
        const ros = rosette(best.colour);
        ros.scale.setScalar(0.32);
        ros.position.set(x + 0.045, y + 0.012, 0.062);
        this.contents.add(ros);
      }
      const piece = this.makeMesh(it);
      // Size every piece to suit its slot, whatever its real size.
      const box = new THREE.Box3().setFromObject(piece);
      const size = box.getSize(new THREE.Vector3());
      const k = SLOT / Math.max(size.x, size.y, size.z, 1e-4);
      // Blown up for show, light would travel that much further through a stone
      // and turn it black, so the colour depth grows with it.
      piece.traverse((m) => {
        if (m.isMesh && m.material?.transmission > 0 && Number.isFinite(m.material.attenuationDistance)) {
          m.material = m.material.clone();
          m.material.attenuationDistance *= k;
        }
      });
      const holder = new THREE.Group();
      piece.position.sub(box.getCenter(new THREE.Vector3()));
      holder.add(piece);
      holder.scale.setScalar(k);
      holder.position.set(x, y + 0.025 + (size.y * k) / 2, 0.02);
      this.contents.add(holder);
      this.stands.push(holder);
    });
  }

  update(dt, playerPos, items) {
    const d = Math.hypot(playerPos.x - this.group.position.x, playerPos.z - this.group.position.z);
    this.contents.visible = d < 14;
    if (!this.contents.visible) return;
    this.refresh(items);
    if (d < 4) for (const h of this.stands) h.rotation.y += dt * 0.5;
  }

  near(pos) {
    return Math.hypot(pos.x - this.group.position.x, pos.z - this.group.position.z) < 2.2;
  }
}
