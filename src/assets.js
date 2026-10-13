import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BufferAttribute, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Models built in Blender (see blender/build_assets.py). Everything that uses
// them has a built-in fallback shape, so the game works before they arrive.

export const assets = { crystals: null, finds: null, tools: {}, models: {} };

// Independent optional kit. A bad environment download cannot discard tools.
export async function loadNewEnglandKit() {
  const required = { gum:4, young:2, shrub:3, grass:3, sedge:2, host:4, granite:4, cobble:6, basalt:3, rhyolite:3, slab:3, root:2, branch:3 };
  const geometries = {};
  try {
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/newengland/environment.glb`);
    gltf.scene.updateMatrixWorld(true);
    for (const [kind, count] of Object.entries(required)) for (let i = 0; i < count; i++) {
      const name = `${kind}_${i}`, group = gltf.scene.getObjectByName(name), pieces = [];
      if (!group) throw new Error(`Missing environment mesh ${name}`);
      group.traverse(o => {
        if (!o.isMesh) return;
        const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
        const n = g.attributes.position.count, colours = new Float32Array(n*3), foliage = new Float32Array(n), rock = new Float32Array(n);
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        const groups = g.groups.length ? g.groups : [{ start:0, count:n, materialIndex:0 }];
        for (const part of groups) {
          const mat = materials[part.materialIndex], c = mat?.color || new Color(1,1,1);
          const leaf = /^(leaf|grass)/.test(mat?.name || '');
          const role=mat?.name?.split('_')[0],rockId={granite:0,rhyolite:1,basalt:2,quartz:3,host:5,slab:5,cobble:5}[role] ?? 5;
          for (let j = part.start; j < part.start+part.count; j++) { c.toArray(colours,j*3); foliage[j] = leaf ? 1 : 0; rock[j]=rockId; }
        }
        for (const key of Object.keys(g.attributes)) if (!['position','normal'].includes(key)) g.deleteAttribute(key);
        g.clearGroups(); g.setAttribute('color',new BufferAttribute(colours,3)); g.setAttribute('aFoliage',new BufferAttribute(foliage,1));
        g.setAttribute('aAuthoredRockKind',new BufferAttribute(rock,1));
        pieces.push(g);
      });
      if (!pieces.length) throw new Error(`Empty environment mesh ${name}`);
      const geometry = mergeGeometries(pieces);
      pieces.forEach(g => g.dispose());
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      if (!Number.isFinite(geometry.boundingSphere.radius) || geometry.boundingSphere.radius > 20) throw new Error(`Invalid environment bounds ${name}`);
      geometry.name = name; geometries[name] = geometry;
    }
    gltf.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
    return geometries;
  } catch (error) {
    Object.values(geometries).forEach(g => g.dispose());
    console.warn('New England scenery kit unavailable; retaining the original scenery.', error);
    return null;
  }
}

export function loadAssets() {
  const loader = new GLTFLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
  const base = import.meta.env.BASE_URL;
  return Promise.all([
    load(`${base}models/finds.glb`).then((g) => {
      const map = {};
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        if (o.isMesh) {
          const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
          geometry.name = o.name;
          map[o.name] = geometry;
        }
      });
      assets.finds = map;
    }).catch((e) => console.warn('Rough find models unavailable; using built-in shapes.', e)),
    load(`${base}models/crystals.glb`).then((g) => {
      const map = {};
      g.scene.traverse((o) => { if (o.isMesh) map[o.name] = o.geometry; });
      assets.crystals = map;
    }),
    ...['rock_pick', 'trowel', 'brush', 'glove'].map((n) => load(`${base}models/${n}.glb`).then((g) => {
      assets.tools[n] = g.scene;
    })),
    ...['detector', 'gold_pan', 'gem_sieve', 'sluice', 'ute', 'tent', 'kangaroo'].map((n) => load(`${base}models/${n}.glb`).then((g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      assets.models[n] = g.scene;
    })),
  ]).catch((e) => console.warn('Models failed to load; using built-in shapes.', e));
}
