import { CatmullRomCurve3, Vector3 } from 'three';

// Optional plan geometry for the shared Creek. Stations increase upstream;
// world coordinates remain north-up even when a reach doubles back in z.
export class RiverCourse {
  constructor(rows) {
    const knots = [...rows].reverse();
    const curve = new CatmullRomCurve3(knots.map(p => new Vector3(p[0],0,p[1])),false,'centripetal');
    curve.arcLengthDivisions = knots.length * 32;
    const length = curve.getLength(), count = Math.ceil(length / .65);
    this.min = -length / 2; this.max = length / 2; this.step = length / count;
    this.samples = []; this.cells = new Map();
    for (let i=0;i<=count;i++) {
      const u=i/count,t=curve.getUtoTmapping(u),p=curve.getPoint(t);
      const k=Math.min(knots.length-2,Math.floor(t*(knots.length-1))),f=t*(knots.length-1)-k;
      const mix=f*f*(3-2*f),a=knots[k],b=knots[k+1];
      this.samples.push({x:p.x,z:p.z,s:this.min+i*this.step,width:a[2]+(b[2]-a[2])*mix,depth:a[3]+(b[3]-a[3])*mix});
    }
    for(let i=0;i<this.samples.length;i++) {
      const p=this.samples[i],a=this.samples[Math.max(0,i-1)],b=this.samples[Math.min(count,i+1)];
      const len=Math.hypot(b.x-a.x,b.z-a.z);p.ux=(b.x-a.x)/len;p.uz=(b.z-a.z)/len;
    }
    for(let i=0;i<this.samples.length;i++) {
      const p=this.samples[i],a=this.samples[Math.max(0,i-2)],b=this.samples[Math.min(count,i+2)];
      p.k=(p.uz*(b.ux-a.ux)-p.ux*(b.uz-a.uz))/(b.s-a.s);
    }
  }
  at(s,n=0,out={}) {
    const v=Math.max(0,Math.min(this.samples.length-1,(s-this.min)/this.step));
    const i=Math.min(this.samples.length-2,Math.floor(v)),f=v-i,a=this.samples[i],b=this.samples[i+1];
    for(const k of ['x','z','ux','uz','k','width','depth'])out[k]=a[k]+(b[k]-a[k])*f;
    const len=Math.hypot(out.ux,out.uz);out.ux/=len;out.uz/=len;
    const extension=s-Math.max(this.min,Math.min(this.max,s));
    out.x+=out.ux*extension+out.uz*n;out.z+=out.uz*extension-out.ux*n;out.s=s;
    return out;
  }
  project(x,z,i,out={}) {
    const a=this.samples[i],b=this.samples[i+1],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
    let f=((x-a.x)*dx+(z-a.z)*dz)/len2;
    f=Math.max(i===0?-10000:0,Math.min(i===this.samples.length-2?10000:1,f));
    out.x=a.x+dx*f;out.z=a.z+dz*f;out.s=a.s+this.step*f;
    out.d2=(x-out.x)**2+(z-out.z)**2;return out;
  }
  local(x,z,out={}) {
    // Each spatial cell keeps every segment that could be nearest anywhere
    // in it. This also handles two nearby branches of the same hooked bend.
    const gx=Math.floor(x/8),gz=Math.floor(z/8),key=gx+','+gz;
    let candidates=this.cells.get(key);
    if(!candidates) {
      const cx=gx*8+4,cz=gz*8+4,distances=[],p={};let best=Infinity;
      for(let i=0;i<this.samples.length-1;i++) {const d=Math.sqrt(this.project(cx,cz,i,p).d2);distances.push(d);best=Math.min(best,d);}
      candidates=[];for(let i=0;i<distances.length;i++)if(distances[i]<=best+Math.SQRT2*8)candidates.push(i);
      this.cells.set(key,candidates);
    }
    let best=Infinity,station=0;const p={};
    for(const i of candidates) {this.project(x,z,i,p);if(p.d2<best){best=p.d2;station=p.s;}}
    this.at(station,0,out);
    out.n=(x-out.x)*out.uz-(z-out.z)*out.ux;out.d=Math.sqrt(best);
    return out;
  }
}
