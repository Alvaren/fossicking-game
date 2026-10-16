import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Built in the original grip coordinates; every region and offline play use
// this same complete model without a separate asset download or fallback.
function finish(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
  geometry.dispose();
  return g;
}

function surfaceTexture(wood) {
  const width = wood ? 64 : 128, height = wood ? 256 : 128;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (wood) {
      const k = .88 + Math.sin(x * 1.7 + Math.sin(y * .035) * .65) * .035 + Math.sin(x * 5.3 + y * .08) * .012;
      data[i] = 162 * k; data[i + 1] = 115 * k; data[i + 2] = 68 * k;
    } else {
      const v = 235 + Math.sin(x * 15.7 + Math.sin(y * .07) * .4) * 5 + Math.pow(Math.max(0, Math.sin(x * 1.8 + y * .09)), 36) * 10;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

function bladeGeometry() {
  // Closed, curved stamped steel: round shoulders, shallow bowl and a point.
  const shape = new THREE.Shape();
  shape.moveTo(0, .145);
  shape.bezierCurveTo(.04, .145, .075, .15, .101, .131);
  shape.bezierCurveTo(.126, .108, .123, .045, .119, .006);
  shape.bezierCurveTo(.114, -.078, .053, -.154, 0, -.188);
  shape.bezierCurveTo(-.053, -.154, -.114, -.078, -.119, .006);
  shape.bezierCurveTo(-.123, .045, -.126, .108, -.101, .131);
  shape.bezierCurveTo(-.075, .15, -.04, .145, 0, .145);
  const boundary = shape.getPoints(10); boundary.pop();
  const n = boundary.length, rings = 7, positions = [], uvs = [], colours = [], indices = [];
  const dark = new THREE.Color(0x858780), bright = new THREE.Color(0xc7c7bf);
  const vertex = (x, z, r, back) => {
    const rib = .013 * Math.exp(-x * x / .00038) * THREE.MathUtils.smoothstep(z, .015, .135);
    positions.push(x, -.016 + .033 * r * r + rib - (back ? .0035 : 0), z);
    uvs.push(x / .25 + .5, (z + .19) / .34);
    const wear = THREE.MathUtils.smoothstep(r, .88, 1) * (z < .055 ? .88 : .2);
    dark.clone().lerp(bright, wear).toArray(colours, colours.length);
  };
  const stride = 1 + n * rings;
  for (let side = 0; side < 2; side++) {
    const offset = side * stride;
    vertex(0, -.012, 0, side);
    for (let row = 1; row <= rings; row++) {
      const r = row / rings;
      for (const p of boundary) vertex(p.x * r, -.012 + (p.y + .012) * r, r, side);
    }
    const triangle = (a, b, c) => side ? indices.push(offset+a, offset+c, offset+b) : indices.push(offset+a, offset+b, offset+c);
    for (let i = 0; i < n; i++) triangle(0, 1+i, 1+(i+1)%n);
    for (let row = 0; row < rings-1; row++) for (let i = 0; i < n; i++) {
      const a = 1+row*n+i, b = 1+row*n+(i+1)%n, c = a+n, d = b+n;
      triangle(a, c, b); triangle(b, c, d);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = 1+(rings-1)*n+i, b = 1+(rings-1)*n+(i+1)%n;
    indices.push(a, a+stride, b, b, a+stride, b+stride);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function makeShovelModel() {
  const group = new THREE.Group(); group.name = 'Field shovel';
  const wood = new THREE.MeshStandardMaterial({ map:surfaceTexture(true), roughness:.72 });
  const steel = new THREE.MeshStandardMaterial({ color:0x676a67, metalness:.62, roughness:.6 });
  const bladeMat = new THREE.MeshStandardMaterial({ vertexColors:true, map:surfaceTexture(false), metalness:.64, roughness:.56 });
  const metalParts = [], woodParts = [];
  const end = new THREE.Vector3(-.12, -.42, -.95), dir = end.clone().normalize(), up = new THREE.Vector3(0,1,0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const point = (along, across=0) => dir.clone().multiplyScalar(along).addScaledVector(right,across);
  function rod(a, b, r0, r1, parts, segments=24) {
    const direction = b.clone().sub(a), g = new THREE.CylinderGeometry(r1,r0,direction.length(),segments,3);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,direction.normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
    parts.push(finish(g));
  }
  // D grip with a wooden crossbar and steel cheeks, replacing the old torus.
  rod(point(0,-.052),point(0,.052),.014,.014,woodParts);
  rod(point(.13),point(end.length()-.04),.0175,.019,woodParts);
  for (const side of [-1,1]) {
    const curve = new THREE.CatmullRomCurve3([point(0,side*.057),point(.045,side*.057),point(.095,side*.038),point(.145,side*.015)]);
    metalParts.push(finish(new THREE.TubeGeometry(curve,12,.008,8,false)));
    rod(point(0,side*.057),point(0,side*.048),.012,.012,metalParts,16);
  }
  rod(point(.12),point(.185),.022,.021,metalParts);
  rod(point(end.length()-.15),point(end.length()+.015),.023,.027,metalParts);

  const center = end.clone().addScaledVector(dir,.12);
  const toEye = new THREE.Vector3(-.3,.16,.3).sub(center).normalize();
  const normal = up.clone().lerp(toEye,.22).normalize();
  const zAxis = dir.clone().addScaledVector(normal,-dir.dot(normal)).normalize().negate();
  const xAxis = new THREE.Vector3().crossVectors(normal,zAxis).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis,normal,zAxis));
  const transform = p => p.applyQuaternion(rotation).add(center);
  const blade = new THREE.Mesh(bladeGeometry(),bladeMat); blade.name = 'Pressed steel blade';
  blade.position.copy(center); blade.quaternion.copy(rotation); group.add(blade);
  // A continuous socket and pressed spine, with rolled shoulders for the boot.
  const neck = new THREE.CatmullRomCurve3([point(end.length()-.04),end.clone(),transform(new THREE.Vector3(0,.018,.115)),transform(new THREE.Vector3(0,.003,.065))]);
  metalParts.push(finish(new THREE.TubeGeometry(neck,14,.022,16,false)));
  for (const sign of [-1,1]) rod(transform(new THREE.Vector3(sign*.042,.019,.133)),transform(new THREE.Vector3(sign*.097,.023,.126)),.008,.008,metalParts,16);
  for (const distance of [end.length()-.112,end.length()-.055]) {
    rod(point(distance).addScaledVector(right,-.024),point(distance).addScaledVector(right,.024),.004,.004,metalParts,12);
  }
  for (const [name,parts,material] of [['Handle and grip',woodParts,wood],['Socket and fittings',metalParts,steel]]) {
    const geometry = mergeGeometries(parts); parts.forEach(g=>g.dispose());
    const mesh = new THREE.Mesh(geometry,material); mesh.name = name; group.add(mesh);
  }
  const dirt = new THREE.Mesh(new THREE.IcosahedronGeometry(.078,1),new THREE.MeshStandardMaterial({color:0x775036,roughness:1,flatShading:true}));
  dirt.name = 'Shovel load'; dirt.scale.set(1,.27,1.22);
  dirt.position.copy(transform(new THREE.Vector3(0,.012,-.022))); dirt.quaternion.copy(rotation);
  dirt.visible = false; group.add(dirt);
  return { group, dirt };
}
