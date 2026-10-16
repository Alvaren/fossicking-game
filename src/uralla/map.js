import { ACCESS } from './locality.js';
export function drawUrallaMap(ctx,toPx,c) {
  for(const [points,width] of [[ACCESS,4],[c.reservePath,1.5],[[[-28,0],[c.cx(0)-c.halfWidth(0)-5,0]],1.5]]) {
    ctx.beginPath();ctx.strokeStyle='#876b48';ctx.lineWidth=width;ctx.setLineDash(width<2?[3,3]:[]);
    points.forEach(([x,z],i)=>{const p=toPx(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();
  }
  ctx.setLineDash([]);ctx.fillStyle='#3e5d62';ctx.font='11px Segoe UI, sans-serif';
  ctx.fillText('Rocky River',...toPx(c.cx(-93)+8,-93));
  ctx.fillStyle='#685037';ctx.fillText('Reserve access',...toPx(-91,56));
  // Solid footprints make the granite reaches legible on the same topo map.
  ctx.fillStyle='#a6a191';ctx.strokeStyle='#706d60';ctx.lineWidth=.6;
  for(const b of c.boulders) {const [x,z]=toPx(b.x,b.z);ctx.beginPath();ctx.ellipse(x,z,b.r*2.1,b.r*1.8,b.bearing,0,Math.PI*2);ctx.fill();ctx.stroke();}
}
