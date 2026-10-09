import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Models built in Blender (see blender/build_assets.py). Everything that uses
// them has a built-in fallback shape, so the game works before they arrive.

export const assets = { crystals: null, tools: {}, models: {} };

export function loadAssets() {
  const loader = new GLTFLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
  const base = import.meta.env.BASE_URL;
  return Promise.all([
    load(`${base}models/crystals.glb`).then((g) => {
      const map = {};
      g.scene.traverse((o) => { if (o.isMesh) map[o.name] = o.geometry; });
      assets.crystals = map;
    }),
    ...['rock_pick', 'trowel', 'brush', 'glove'].map((n) => load(`${base}models/${n}.glb`).then((g) => {
      assets.tools[n] = g.scene;
    })),
    ...['detector', 'gold_pan', 'gem_sieve', 'sluice', 'ute', 'tent'].map((n) => load(`${base}models/${n}.glb`).then((g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      assets.models[n] = g.scene;
    })),
  ]).catch((e) => console.warn('Models failed to load; using built-in shapes.', e));
}
