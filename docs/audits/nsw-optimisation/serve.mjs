// Serve immutable baseline and current production builds on Codex's reserved port.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const roots={baseline:resolve('node_modules/.cache/nsw-optimisation-baseline'),candidate:resolve('dist')};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webm':'video/webm','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try {
  const url=new URL(req.url,'http://127.0.0.1'),base=url.pathname.startsWith('/baseline/')?'baseline':'candidate';
  const relative=decodeURIComponent(url.pathname.replace(base==='baseline'?/^\/baseline\//:/^\//,''));
  const path=resolve(roots[base],relative||'index.html');
  if(path!==roots[base]&&!path.startsWith(roots[base]+sep)){res.writeHead(403).end();return;}
  const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));
}catch{res.writeHead(404).end();}}).listen(5191,'127.0.0.1',()=>console.log('Frozen baseline /baseline/; current production /; port 5191.'));
