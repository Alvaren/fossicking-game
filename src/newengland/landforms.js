import * as THREE from 'three';
import { rockMaterial, ROCK_ID } from '../rockmaterials.js';
import { smoothstep } from '../noise.js';

const noise = (x, z) => Math.sin(x * 1.7 + Math.sin(z * .8)) * .5 + Math.sin(z * 2.3 + x * .6) * .5;

export function segmentDistance(x, z, a, b) {
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
  const t=l ? Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)) : 0;
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}

// Ground-connected surfaces sampled from the saved terrain. Bank/base relief
// is centimetres; tall rock faces remain at their original solid footprints.
export function surfaceGeometry(terrain, bounds, step, sample, allowed=()=>true, closeEdges=false) {
  const positions=[],colours=[],kinds=[],support=[],edges=new Map(),topPoints=[];
  const point=(x,z)=>{
    if(!terrain.inside(x,z)||!allowed(x,z))return null;
    const ground=terrain.getHeight(x,z),s=sample(x,z,ground);
    if(!s||s.cover<=.02)return null;
    return {x,z,ground,y:ground+Math.max(.004,s.height)*smoothstep(.02,.35,s.cover),...s};
  };
  const nx=Math.ceil((bounds.x1-bounds.x0)/step),nz=Math.ceil((bounds.z1-bounds.z0)/step);
  const grid=[];
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++) {
    const p=point(bounds.x0+i*(bounds.x1-bounds.x0)/nx,bounds.z0+j*(bounds.z1-bounds.z0)/nz);
    if(p){p.id=j*(nx+1)+i;p.normal=new THREE.Vector3();}
    grid.push(p);
  }
  const emit=(a,b,c)=>{
    if(!a||!b||!c)return;
    for(const p of [a,b,c]) {
      positions.push(p.x,p.y,p.z);colours.push(...p.colour);kinds.push(p.kind??ROCK_ID.slate);
      support.push({x:p.x,z:p.z,ground:p.ground});
    }
  };
  const face=(a,b,c)=>{
    if(!a||!b||!c)return;
    emit(a,b,c);
    if(closeEdges) {
      const normal=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z).cross(new THREE.Vector3(c.x-a.x,c.y-a.y,c.z-a.z));
      for(const p of [a,b,c]){p.normal.add(normal);topPoints.push(p);}
    }
    if(closeEdges)for(const [u,v] of [[a,b],[b,c],[c,a]]) {
      const key=u.id<v.id?`${u.id}:${v.id}`:`${v.id}:${u.id}`;
      if(edges.has(key))edges.delete(key);else edges.set(key,[u,v]);
    }
  };
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++) {
    const a=grid[j*(nx+1)+i],b=grid[j*(nx+1)+i+1],c=grid[(j+1)*(nx+1)+i],d=grid[(j+1)*(nx+1)+i+1];
    if((i+j)%2) {face(a,c,b);face(b,c,d);}else {face(a,c,d);face(a,d,b);}
  }
  // Clip boundaries must meet the ground. Omitting these side faces leaves
  // saw-toothed, open silhouettes wherever a sampled edge or clearance ends.
  for(const [a,b] of edges.values()) {
    const lowA={...a,y:a.ground-.03},lowB={...b,y:b.ground-.03};
    emit(a,lowA,lowB);emit(a,lowB,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geometry.setAttribute('aAuthoredRockKind',new THREE.Float32BufferAttribute(kinds,1));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  // The regular sampling grid must not become alternating bright/dark teeth
  // on a geological face. Average only the upper surface, not boundary walls.
  for(const p of grid)if(p)p.normal.normalize();
  const normals=geometry.attributes.normal;
  topPoints.forEach((p,i)=>normals.setXYZ(i,p.normal.x,p.normal.y,p.normal.z));
  return {geometry,support};
}

export function buildLandforms(root,terrain,anchors,workingMask,{banks=true}={}) {
  const patches=[],creek=terrain.creek;
  const rock=rockMaterial('slate',{authored:true});
  const hostRock=rock.clone(),compile=rock.onBeforeCompile;
  hostRock.onBeforeCompile=shader=>{
    compile(shader);
    const reef=terrain.sources.reef;
    shader.uniforms.nswReef={value:new THREE.Vector3(reef?.x??0,reef?terrain.sampleGrid(terrain.orig,reef.x,reef.z):0,reef?.z??0)};
    shader.fragmentShader=shader.fragmentShader.replace('void main() {','uniform vec3 nswReef;\nvoid main() {')
      .replace('diffuseColor.rgb = rockAlbedo * mix(1.0,.77,rockWet);',`diffuseColor.rgb = rockAlbedo * mix(1.0,.77,rockWet);
      vec3 rp=vRockWorld-nswReef;
      float seam=abs(rp.x*.4+rp.z*.2+rp.y*.28+.07*sin(rp.x*5.0+rp.z*3.0));
      float mineral=1.0-smoothstep(.10,.15,seam);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.57,.54,.46)*(.90+.1*weather),mineral);`);
  };
  hostRock.customProgramCacheKey=()=> 'nsw-connected-quartz-v2';
  const soil=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  const add=(name,bounds,step,sample,material,closeEdges=false)=>{
    const allowed=(x,z)=>!workingMask.blocked(x,z,.10)&&terrain.sampleGrid(terrain.orig,x,z)-terrain.getHeight(x,z)<.025;
    const shape=surfaceGeometry(terrain,bounds,step,sample,allowed,closeEdges);
    if(!shape.support.length){shape.geometry.dispose();return;}
    const mesh=new THREE.Mesh(shape.geometry,material);mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);
    patches.push({mesh,support:shape.support,positions:shape.geometry.attributes.position.array.slice()});
  };
  const palettes={host:[.22,.20,.17],granite:[.35,.32,.27],basalt:[.13,.14,.135],rhyolite:[.34,.25,.205],slab:[.25,.23,.18]};
  for(const [source,family] of [['reef','host'],['basalt','basalt'],['rhyolite','rhyolite']]) {
    const centre=terrain.sources[source];if(!centre)continue;
    const reach=12,padding=4;
    const stones=anchors.filter(a=>a.family===family&&a.mass&&Math.hypot(a.x-centre.x,a.z-centre.z)<reach);
    // Small independent tiles withdraw locally after digging; never leave a
    // permanent rock skin spanning a worked pocket or reserved equipment.
    for(let x=centre.x-reach-padding;x<centre.x+reach+padding;x+=4)for(let z=centre.z-reach-padding;z<centre.z+reach+padding;z+=4) {
      add(`NSW ${family} connected exposure`,{x0:x,z0:z,x1:x+4,z1:z+4},.14,(px,pz,ground)=>{
        let d=10,body=0;
        const n=noise(px*.65,pz*.65);
        for(const a of stones) {
          const dx=px-a.x,dz=pz-a.z,ca=Math.cos(a.bearing),sa=Math.sin(a.bearing),r=a.radius;
          const u=dx*ca-dz*sa,v=dx*sa+dz*ca;
          const edge=Math.max(Math.abs(u*.92+v*.12),Math.abs(v*1.08-u*.06),(Math.abs(u)+Math.abs(v))*.74);
          const cap=Math.max(.25,a.y-ground+a.height*.95);
          const roof=Math.min(cap+u*.22+v*.07,cap*.82-u*.11-v*.24);
          const face=(r*.91-edge+n*.025)*4.5;
          body=Math.max(body,Math.min(roof,face));
          d=Math.min(d,edge-r*.91-n*.025);
        }
        // Keep a narrow, ground-height boundary around the faces. Truncating
        // the first raised sample creates vertical teeth at each grid cell.
        const cover=1-smoothstep(.01,.16,d);
        if(cover<.02)return null;
        const joint=Math.abs(Math.sin((px-centre.x)*1.5+(pz-centre.z)*.65+n*.12));
        const h=Math.max(.004,body);
        const tone=(.86+.08*n)*(.86+.14*smoothstep(.0,.045,joint));
        return {height:h,cover,colour:palettes[family].map(v=>v*tone),kind:ROCK_ID[family==='host'?'slate':family]};
      },family==='host'?hostRock:rock,true);
    }
  }
  // Layered cut-bank reaches: interrupted upper lip, rills and an embedded
  // gravel foot all follow the actual bank rather than a manufactured cliff.
  if(banks)for(let z=-96;z<103;z+=5)for(const side of [-1,1]) {
    const bx=creek.cx(z)+side*(creek.halfWidth(z)+.7)*Math.sqrt(1+creek.dcx(z)**2);
    add('NSW layered creek bank',{x0:bx-4,x1:bx+4,z0:z,z1:z+5},.16,(x,pz,h)=>{
      const p=creek.local(x,pz,{}),margin=p.d-p.w,above=h-creek.waterY(pz);
      const n=noise(x*.7,pz*.9),reach=smoothstep(-.5,.7,Math.sin(pz*.25+side*1.2));
      const cover=smoothstep(.08,.5,margin)*(1-smoothstep(.8+n*.16,1.65+n*.3,margin))*smoothstep(.05,.5,above)*reach;
      if(cover<.1)return null;
      const layer=Math.sin(h*12+n*.8),rill=smoothstep(.55,.95,Math.sin(pz*6+x*.7));
      const tone=.9+.12*n+.08*layer-.1*rill;
      const top=smoothstep(.9,1.5,margin);
      return {cover,height:.012+(.020+.012*layer)*(1-rill),colour:[(.255-top*.06)*tone,(.18-top*.035)*tone,(.115-top*.005)*tone]};
    },soil);
  }
  return {patches,update(player,revision) {
    for(const p of patches) {
      const centre=p.mesh.geometry.boundingSphere.center;
      if(Math.hypot(player.x-centre.x,player.z-centre.z)>240){p.mesh.visible=false;continue;}
      p.mesh.visible=true;
      if(Math.hypot(player.x-centre.x,player.z-centre.z)>12)continue;
      if(revision!==undefined&&p.revision===revision)continue;
      p.revision=revision;
      const pos=p.mesh.geometry.attributes.position;
      // Individual triangles vanish when any of their support is removed.
      // This leaves nearby unworked exposure intact through save/reload.
      for(let i=0;i<p.support.length;i+=3) {
        let hide=false;
        for(let k=0;k<3&&!hide;k++) {
          const s=p.support[i+k];
          hide=Math.abs(terrain.getHeight(s.x,s.z)-s.ground)>.025||workingMask.dynamic(s.x,s.z,.12);
        }
        for(let k=0;k<3;k++)pos.setY(i+k,hide?-10000:p.positions[(i+k)*3+1]);
      }
      pos.needsUpdate=true;
    }
  }};
}
