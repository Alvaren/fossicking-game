import * as THREE from 'three';
import { signTexture } from './world.js';

// Small procedural camp props work offline and on Low without model downloads.
export class CampStation {
  constructor(scene, terrain, camp, colliders) {
    const flip = terrain.creek.cx(terrain.camp.z) > terrain.camp.x ? -1 : 1;
    this.spot = { x: terrain.camp.x + 6 * flip, z: terrain.camp.z };
    this.group = new THREE.Group();
    this.group.position.set(this.spot.x, terrain.getHeight(this.spot.x, this.spot.z), this.spot.z);
    this.group.rotation.y = flip < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(this.group); colliders.push({ ...this.spot, r: 1.1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x736047, roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x73908c, metalness: 0.4, roughness: 0.6 });
    const green = new THREE.MeshStandardMaterial({ color: 0x345e43, roughness: 0.8 });
    const box = (w, h, d, x, y, z, mat = wood, parent = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
    };
    box(1.9, 0.09, 0.85, 0, 0.87, 0);
    for (const x of [-0.78, 0.78]) for (const z of [-0.3, 0.3]) box(0.09, 0.85, 0.09, x, 0.43, z);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.065, 24, 1, true), green);
    pan.material.side = THREE.DoubleSide; pan.position.set(-0.38, 0.95, 0); this.group.add(pan);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 24), green); bottom.position.set(-0.38, 0.921, 0); this.group.add(bottom);
    for (let i = 0; i < 3; i++) box(0.18, 0.16, 0.2, 0.12 + i * 0.23, 0.99, 0, metal);
    box(0.07, 1.6, 0.07, -0.85, 0.8, -0.42); box(0.07, 1.6, 0.07, 0.85, 0.8, -0.42);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.54, 0.04), new THREE.MeshBasicMaterial({ map: signTexture('WASH BENCH', '#243b2b', '#ddd0a3', 48, 'Practise · recover · build') }));
    sign.position.set(0, 1.58, -0.42); this.group.add(sign);
    this.props = {};
    const tub = this.props.tub = new THREE.Group(); this.group.add(tub);
    box(0.8, 0.09, 0.65, 0.06, 0.12, 0.95, metal, tub);
    for (const x of [-0.36, 0.48]) box(0.06, 0.36, 0.7, x, 0.29, 0.95, metal, tub);
    for (const z of [0.6, 1.3]) box(0.9, 0.36, 0.06, 0.06, 0.29, z, metal, tub);
    box(0.8, 0.015, 0.64, 0.06, 0.3, 0.95, new THREE.MeshStandardMaterial({ color: 0x548b99, transparent: true, opacity: 0.75 }), tub);
    const rack = this.props.rack = new THREE.Group(); this.group.add(rack);
    for (const y of [0.15, 0.46]) { box(0.72, 0.06, 0.42, 1.38, y, 0, wood, rack); for (let i=0;i<4;i++) box(0.13, 0.15, 0.24, 1.12+i*0.17, y+0.1, 0, metal, rack); }
    for (const x of [1.04,1.72]) box(0.06,0.7,0.4,x,0.35,0,wood,rack);
    const kit = this.props.kit = new THREE.Group(); this.group.add(kit);
    box(0.45,0.28,0.3,-0.45,0.21,0,green,kit); box(0.3,0.05,0.04,-0.45,0.4,0,metal,kit);
    this.sync(camp);
  }
  sync(camp) { for (const [id, prop] of Object.entries(this.props)) prop.visible = !!camp.built[id]; }
  near(pos) { return Math.hypot(pos.x - this.spot.x, pos.z - this.spot.z) < 2.65; }
}
