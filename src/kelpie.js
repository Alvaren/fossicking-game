import * as THREE from 'three';
export class Kelpie {
  constructor(scene,terrain,colliders = [], groundHeight = (x,z) => terrain.getHeight(x,z)) {
    this.groundHeight=groundHeight;this.terrain=terrain;this.colliders=colliders;this.home={x:terrain.camp.x+1,z:terrain.camp.z-1};this.group=new THREE.Group();this.group.name='camp-kelpie';scene.add(this.group);this.time=0;
    const coat=new THREE.MeshStandardMaterial({color:0x27201b,roughness:1}),tan=new THREE.MeshStandardMaterial({color:0x9a6138,roughness:1}),eye=new THREE.MeshBasicMaterial({color:0x101010});
    const oval=(x,y,z,sx,sy,sz,mat=coat,parent=this.group)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
    oval(0,.51,0,.2,.25,.43);oval(0,.62,.31,.15,.2,.17,tan);this.head=new THREE.Group();this.head.position.set(0,.76,.34);this.group.add(this.head);
    oval(0,0,0,.15,.18,.17,coat,this.head);oval(0,-.05,.16,.095,.085,.15,tan,this.head);oval(0,-.03,.28,.06,.045,.04,eye,this.head);
    for(const x of [-.1,.1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,3),coat);ear.position.set(x,.2,-.015);this.head.add(ear);oval(x*.8,.04,.145,.02,.025,.02,eye,this.head);}
    this.legs=[];for(const x of [-.13,.13])for(const z of [-.27,.27]){const g=new THREE.Group();g.position.set(x,.39,z);this.group.add(g);oval(0,-.14,0,.052,.2,.052,tan,g);oval(0,-.32,.04,.065,.045,.09,tan,g);this.legs.push(g);}
    this.tail=new THREE.Group();this.tail.position.set(0,.6,-.36);this.group.add(this.tail);const tail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.055,.42,8),coat);tail.rotation.x=-.9;tail.position.set(0,.09,-.15);this.tail.add(tail);
    this.group.position.set(this.home.x,terrain.getHeight(this.home.x,this.home.z),this.home.z);this.group.visible=false;
  }
  near(pos){return this.group.visible&&Math.hypot(pos.x-this.group.position.x,pos.z-this.group.position.z)<1.8;}
  update(dt,state,player,unsafe=false){
    const c=state.camp;this.group.visible=!!c.built.kelpie;if(!this.group.visible)return;this.time+=dt;
    const follow=c.dogMode==='follow'&&!unsafe;
    const target=follow?{x:player.x+1.6,z:player.z+1.1}:{x:this.home.x+Math.sin(this.time*.09)*.8,z:this.home.z+Math.cos(this.time*.09)*.8};
    const dx=target.x-this.group.position.x,dz=target.z-this.group.position.z,d=Math.hypot(dx,dz),speed=d>.35?Math.min(d,2.8)*dt:0;
    const nx=this.group.position.x+(d?dx/d*speed:0),nz=this.group.position.z+(d?dz/d*speed:0);
    // Companion stays out of deep water and waits safely at camp during mine/ute use.
    const clear=(x,z)=>this.terrain.getHeight(x,z)>this.terrain.creek.surfaceY(z)-.2&&this.colliders.every(c=>Math.hypot(x-c.x,z-c.z)>c.r+.17);
    if(clear(nx,nz)){this.group.position.x=nx;this.group.position.z=nz;}
    else if(speed>0){
      const a=Math.atan2(dx,dz);
      for(const turn of [.6,-.6,1.2,-1.2,1.8,-1.8]){const x=this.group.position.x+Math.sin(a+turn)*speed,z=this.group.position.z+Math.cos(a+turn)*speed;if(clear(x,z)){this.group.position.x=x;this.group.position.z=z;break;}}
    }
    this.group.position.y=this.groundHeight(this.group.position.x,this.group.position.z);
    if(speed>0)this.group.rotation.y=Math.atan2(dx,dz);
    this.legs.forEach((g,i)=>g.rotation.x=speed>0?Math.sin(this.time*10+(i%2)*Math.PI)*.45:0);
    this.tail.rotation.z=Math.sin(this.time*(this.happyUntil>this.time?18:5))*.4;this.head.rotation.z=Math.sin(this.time*1.8)*.04;
  }
  pat(camp){if(!camp.built.kelpie)return;camp.dogPats++;this.happyUntil=this.time+5;}
}
