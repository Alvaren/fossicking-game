import { ROAD, RUBY } from './locality.js';
export function drawLocalityMap(ctx,toPx) {
  const line=(points,colour,width,dash=[])=>{ctx.beginPath();ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach(([x,z],i)=>{const p=toPx(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();ctx.setLineDash([]);};
  line(ROAD,'rgba(160,104,62,.6)',6);line(ROAD,'#775439',1,[3,3]);
  line(RUBY,'#7a817c',2,[5,4]);
  ctx.font='11px Segoe UI, sans-serif';ctx.fillStyle='#3f463f';
  ctx.fillText('Ruby Creek (dry)',...toPx(-58,-54));
  ctx.fillStyle='#61422b';ctx.fillText('Graveshill Road',...toPx(-52,62));
}
