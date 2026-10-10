import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try {
  process.env.ENV_BASE_URL=`http://127.0.0.1:${server.address().port}/`;
  process.env.ENV_CASES='[["new-england",false],["ne-tasmania",true]]';process.env.ENV_OFFLINE='1';
  await import('./environment.game.mjs');
}finally{await new Promise(r=>server.close(r));}
