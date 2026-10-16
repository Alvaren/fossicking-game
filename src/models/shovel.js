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

function bladeGeometry(rake) {
  // One connected pressing: the round socket closes around the shaft, then
  // flattens and widens into the blade. There is no capped tube on its face.
  const sin = Math.sin(rake), cos = Math.cos(rake), mouthZ = .33 * cos;
  // z, centre height, half width, half depth, bowl edge lift, section tilt.
  const sections = [
    [mouthZ, .33*sin, .0215, .0215, 0, rake],
    [.275, .275*Math.tan(rake), .0215, .0215, 0, rake],
    [.235, .235*Math.tan(rake), .0215, .0215, 0, rake],
    [.207, .207*Math.tan(rake), .0215, .0215, 0, rake],
    [.19, .061, .022, .020, 0, rake*.85],
    [.17, .047, .025, .015, 0, rake*.5],
    [.155, .033, .033, .010, 0, rake*.2],
    [.145, .025, .048, .006, 0, 0],
    [.14, .019, .074, .0035, .001, 0],
    [.131, .012, .101, .002, .005, 0],
    [.113, .004, .116, .00175, .013, 0],
    [.08, -.006, .122, .00175, .023, 0],
    [.04, -.012, .122, .00175, .029, 0],
    [.006, -.015, .119, .00175, .032, 0],
    [-.04, -.014, .108, .00175, .031, 0],
    [-.08, -.010, .092, .00175, .027, 0],
    [-.12, -.001, .063, .00175, .018, 0],
    [-.15, .005, .039, .00175, .012, 0],
    [-.177, .013, .014, .00175, .004, 0],
  ];
  const around = 48, positions = [], uvs = [], colours = [], indices = [];
  const dark = new THREE.Color(0x858780), bright = new THREE.Color(0xc7c7bf);
  const vertex = (x,y,z,wear=0) => {
    const index = positions.length/3;
    positions.push(x,y,z); uvs.push(x/.25+.5,(z+.19)/.51);
    dark.clone().lerp(bright,wear).toArray(colours,colours.length);
    return index;
  };
  const ring = (section, inner=false) => {
    const [z,y,width,depth,lift,tilt] = section, start = positions.length/3;
    for (let i=0;i<around;i++) {
      const a=i/around*Math.PI*2, u=Math.sin(a), v=Math.cos(a), h=depth*v;
      const wear=inner?0:THREE.MathUtils.smoothstep(Math.abs(u),.88,1)*(z<.06?.85:.12);
      vertex(width*u,y+lift*u*u+h*Math.cos(tilt),z-h*Math.sin(tilt),wear);
    }
    return start;
  };
  const join = (a,b,reverse=false) => {
    for (let i=0;i<around;i++) {
      const j=(i+1)%around, faces=[a+i,a+j,b+i,a+j,b+j,b+i];
      if(reverse) for(let k=0;k<6;k+=3)indices.push(faces[k],faces[k+2],faces[k+1]);
      else indices.push(...faces);
    }
  };
  const interpolate = (a,b,c,d,t) => b+(c-a)*.5*t+(a-2.5*b+2*c-.5*d)*t*t+(-.5*a+1.5*b-1.5*c+.5*d)*t*t*t;
  let previous;
  for(let row=0;row<sections.length-1;row++) for(let step=0;step<3;step++) {
    const s=sections[row].map((_,k)=>interpolate(sections[Math.max(0,row-1)][k],sections[row][k],sections[row+1][k],sections[Math.min(sections.length-1,row+2)][k],step/3));
    s[3]=Math.max(.00175,s[3]); s[4]=Math.max(0,s[4]);
    const current=ring(s); if(previous!==undefined)join(previous,current); previous=current;
  }
  const last=ring(sections.at(-1));join(previous,last);
  const tip=vertex(0,.017,-.188,.88);
  for(let i=0;i<around;i++)indices.push(last+i,last+(i+1)%around,tip);

  // A real open mouth and 2 mm wall; the unchanged wood is seated 110 mm
  // inside this bore. Its hidden end stops before the closed steel throat.
  let inner;
  for(const distance of [.33,.27,.205]) {
    const current=ring([distance*cos,distance*sin,.0195,.0195,0,rake],true);
    if(inner===undefined)join(0,current,true);else join(inner,current,true);
    inner=current;
  }
  const boreEnd=vertex(0,.205*sin,.205*cos);
  for(let i=0;i<around;i++)indices.push(inner+i,boreEnd,inner+(i+1)%around);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
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

  const rake = THREE.MathUtils.degToRad(18);
  const center = end.clone().addScaledVector(dir,.18);
  const normal = up.clone().addScaledVector(dir,-up.dot(dir)).normalize().multiplyScalar(Math.cos(rake)).addScaledVector(dir,-Math.sin(rake));
  const zAxis = dir.clone().addScaledVector(normal,-dir.dot(normal)).normalize().negate();
  const xAxis = new THREE.Vector3().crossVectors(normal,zAxis).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis,normal,zAxis));
  const transform = p => p.applyQuaternion(rotation).add(center);
  const blade = new THREE.Mesh(bladeGeometry(rake),bladeMat); blade.name = 'Pressed steel blade';
  blade.position.copy(center); blade.quaternion.copy(rotation); group.add(blade);
  // Rolled shoulders sit on the blade; the socket is part of its pressing.
  for (const sign of [-1,1]) rod(transform(new THREE.Vector3(sign*.042,.019,.133)),transform(new THREE.Vector3(sign*.097,.023,.126)),.008,.008,metalParts,16);
  for (const distance of [end.length()-.10]) {
    rod(point(distance).addScaledVector(right,-.022),point(distance).addScaledVector(right,.022),.003,.003,metalParts,12);
  }
  for (const [name,parts,material] of [['Handle and grip',woodParts,wood],['Grip and fittings',metalParts,steel]]) {
    const geometry = mergeGeometries(parts); parts.forEach(g=>g.dispose());
    const mesh = new THREE.Mesh(geometry,material); mesh.name = name; group.add(mesh);
  }
  const dirt = new THREE.Mesh(new THREE.IcosahedronGeometry(.078,1),new THREE.MeshStandardMaterial({color:0x775036,roughness:1,flatShading:true}));
  dirt.name = 'Shovel load'; dirt.scale.set(1,.27,1.22);
  dirt.position.copy(transform(new THREE.Vector3(0,.012,-.022))); dirt.quaternion.copy(rotation);
  dirt.visible = false; group.add(dirt);
  return { group, dirt };
}
