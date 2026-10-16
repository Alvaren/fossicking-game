import { ACCESS } from './locality.js';
export function drawUrallaMap(ctx,toPx,c) {
  for(const [points,width] of [[ACCESS,4],[c.reservePath,1.5],[c.reserveCampPath,1.5]]) {
    ctx.beginPath();ctx.strokeStyle='#876b48';ctx.lineWidth=width;ctx.setLineDash(width<2?[3,3]:[]);
    points.forEach(([x,z],i)=>{const p=toPx(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();
  }
  ctx.setLineDash([]);ctx.fillStyle='#3e5d62';ctx.font='11px Segoe UI, sans-serif';
  const label=c.point(-75);ctx.fillText('Rocky River',...toPx(label.x+8,label.z));
  ctx.fillStyle='#685037';ctx.fillText('Reserve access',...toPx(-94,101));
  // Solid footprints make the granite reaches legible on the same topo map.
  ctx.fillStyle='#a6a191';ctx.strokeStyle='#706d60';ctx.lineWidth=.6;
  for(const b of c.boulders) {const [x,z]=toPx(b.x,b.z);ctx.beginPath();ctx.ellipse(x,z,b.r*2.1,b.r*1.8,b.bearing,0,Math.PI*2);ctx.fill();ctx.stroke();}
}
