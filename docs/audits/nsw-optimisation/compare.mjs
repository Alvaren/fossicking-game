import {readFile,writeFile} from 'node:fs/promises';
const root='docs/audits/nsw-optimisation/';
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const result={date:new Date().toISOString(),runs:{},typical:{},sites:{}};
for(const label of ['baseline','candidate']){
  result.runs[label]=[];for(let n=1;n<=3;n++)result.runs[label].push(JSON.parse(await readFile(root+label+'/run-'+n+'.json','utf8')));
  const rows=result.runs[label];result.typical[label]={};
  for(const field of ['frameMs','cpuMs','gpuMs','calls','triangles'])result.typical[label][field]=Object.fromEntries(['median','p95','p99'].map(k=>[k,median(rows.map(r=>r[field][k]))]));
  result.sites[label]={};for(const site of Object.keys(rows[0].sites)){
    result.sites[label][site]={};for(const field of ['frameMs','cpuMs','gpuMs','calls','triangles'])result.sites[label][site][field]=Object.fromEntries(['median','p95','p99'].map(k=>[k,median(rows.map(r=>r.sites[site][field][k]))]));
  }
}
result.reductions={};for(const f of ['cpuMs','gpuMs','calls','triangles'])result.reductions[f]=Object.fromEntries(['median','p95','p99'].map(k=>[k,100*(1-result.typical.candidate[f][k]/result.typical.baseline[f][k])]));
await writeFile(root+'comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({typical:result.typical,reductions:result.reductions,sites:result.sites},null,2));
