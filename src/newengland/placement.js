// Decoration-only clearance. It must never move a deposit, source or collider.
// Static footprints are indexed once; dynamic equipment/digs are queried live.
export function placementMask({ camp, circles = [], overlays = () => [], equipment = () => [] }) {
  const cells = new Map(), size = 8;
  for (const c of circles) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.z)) continue;
    const r = c.r || 0;
    for (let x = Math.floor((c.x-r)/size); x <= Math.floor((c.x+r)/size); x++) {
      for (let z = Math.floor((c.z-r)/size); z <= Math.floor((c.z+r)/size); z++) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(c);
      }
    }
  }
  const dynamic = (x, z, r = 0) => overlays().some(o => x+r > o.x0 && x-r < o.x1 && z+r > o.z0 && z-r < o.z1)
    || equipment().some(c => Math.hypot(x-c.x,z-c.z) < r+c.r);
  const blocked = (x, z, r = 0) => {
    if (Math.abs(x)+r > 108 || Math.abs(z)+r > 108 || Math.hypot(x-camp.x,z-camp.z) < 17+r || dynamic(x,z,r)) return true;
    for (let cx = Math.floor((x-r)/size); cx <= Math.floor((x+r)/size); cx++) {
      for (let cz = Math.floor((z-r)/size); cz <= Math.floor((z+r)/size); cz++) {
        if ((cells.get(`${cx},${cz}`) || []).some(c => Math.hypot(x-c.x,z-c.z) < r+(c.r||0))) return true;
      }
    }
    return false;
  };
  return { blocked, dynamic };
}
