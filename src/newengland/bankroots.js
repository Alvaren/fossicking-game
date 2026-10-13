import * as THREE from 'three';

// Surface roots follow the authoritative ground at every ring. They are
// partially buried, taper into the soil, and add no collision or saved state.
export function bankRootGeometry(terrain, start, end, radius, phase=0) {
  const length=Math.hypot(end.x-start.x,end.z-start.z),segments=Math.max(8,Math.ceil(length/.08)),sides=7;
  if(!Number.isFinite(length)||length<.001||!Number.isFinite(radius)||radius<=0)throw new RangeError('Root needs distinct endpoints and a positive radius');
  const positions=[],colors=[],indices=[],centres=[];
  const dx=(end.x-start.x)/length,dz=(end.z-start.z)/length;
  for(let i=0;i<=segments;i++) {
    const t=i/segments,wiggle=Math.sin(t*Math.PI)*Math.sin(t*7+phase)*.07;
    const x=start.x+(end.x-start.x)*t-dz*wiggle,z=start.z+(end.z-start.z)*t+dx*wiggle;
    const r=radius*Math.pow(1-t*.97,1.15),ground=terrain.getHeight(x,z);
    centres.push({x,z,ground,r});
  }
  const up=new THREE.Vector3(0,1,0),tangent=new THREE.Vector3(),side=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<=segments;i++) {
    const a=centres[Math.max(0,i-1)],b=centres[Math.min(segments,i+1)],c=centres[i];
    tangent.set(b.x-a.x,b.ground-a.ground,b.z-a.z).normalize();
    side.crossVectors(tangent,up).normalize();normal.crossVectors(side,tangent).normalize();
    for(let j=0;j<sides;j++) {
      const angle=j/sides*Math.PI*2,s=Math.sin(angle),co=Math.cos(angle);
      positions.push(c.x+c.r*(side.x*co+normal.x*s),c.ground-c.r*.18+c.r*normal.y*s,c.z+c.r*(side.z*co+normal.z*s));
      const tone=.8+.14*(.5+.5*s)+.06*Math.sin(i*.65+phase);
      colors.push(.20*tone,.155*tone,.10*tone);
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++) {
    const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return {geometry,centres};
}

export function newEnglandBankRoots(root,terrain,world,mask,workingMask) {
  const creek=terrain.creek,matrix=new THREE.Matrix4(),branches=[];
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  for(const batch of world.lod.batches.filter(b=>b.source.userData.tree))for(let i=0;i<batch.source.count;i++) {
    batch.source.getMatrixAt(i,matrix);
    if(!matrix.elements[0]&&!matrix.elements[2])continue;
    const x=matrix.elements[12],z=matrix.elements[14],local=creek.local(x,z,{}),margin=local.d-local.w;
    if(Math.abs(z)>104||margin<.6||margin>3.4||workingMask.blocked(x,z,.2))continue;
    const h=terrain.getHeight(x,z),wy=creek.surfaceY(z);
    if(h-wy<.3||h-wy>2.5||branches.length>=90)continue;
    const side=Math.sign(x-creek.cx(z));
    for(let k=0;k<3;k++) {
      const ez=z+(k-1)*(.55+margin*.3),ex=creek.cx(ez)+side*(creek.halfWidth(ez)+.18)*Math.sqrt(1+creek.dcx(ez)**2);
      const start={x,z},end={x:ex,z:ez};
      if(Math.hypot(ex-x,ez-z)<.35)continue;
      const shape=bankRootGeometry(terrain,start,end,k===1?.075:.045,k+x);
      if(shape.centres.some(p=>terrain.sampleGrid(terrain.orig,p.x,p.z)-p.ground>.02||
        workingMask.blocked(p.x,p.z,.07)||(Math.hypot(p.x-x,p.z-z)>.8&&mask.blocked(p.x,p.z,.04)))) {
        shape.geometry.dispose();continue;
      }
      const mesh=new THREE.Mesh(shape.geometry,material);mesh.name='NSW bank root';
      mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      branches.push({mesh,centres:shape.centres,x,z});
    }
  }
  return {branches,update(player,low) {
    for(const b of branches)b.mesh.visible=Math.hypot(player.x-b.x,player.z-b.z)<(low?24:64)&&b.centres.every(p=>
      Math.abs(terrain.getHeight(p.x,p.z)-p.ground)<.015&&!workingMask.dynamic(p.x,p.z,.06));
  }};
}
