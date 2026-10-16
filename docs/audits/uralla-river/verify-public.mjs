// Compare the deployed game to the exact production build tested locally.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const head=process.argv[2],run=process.argv[3];
assert.ok(head&&run,'Pass the published commit and Pages run ID');
const url='https://alvaren.github.io/fossicking-game/';
const files=['index.html',...(await readdir('dist/assets')).filter(p=>/^(main|index)-.*\.(js|css)$/.test(p)).map(p=>'assets/'+p),'models/newengland/environment.glb','models/uralla/environment.glb'];
const hash=b=>createHash('sha256').update(b).digest('hex'),assets=[];
for(const path of files) {
  const local=await readFile('dist/'+path),response=await fetch(url+path+'?verify='+head);
  assert.equal(response.status,200,path);
  const publicBytes=Buffer.from(await response.arrayBuffer()),normalise=b=>path.endsWith('.html')?Buffer.from(b.toString('utf8').replace(/\r+\n/g,'\n')):b;
  assert.deepEqual(normalise(publicBytes),normalise(local),'Live file differs: '+path);
  assets.push({path,bytes:publicBytes.length,sha256:hash(publicBytes),localSha256:hash(local),comparison:path.endsWith('.html')?'CRLF/LF normalised':'byte-identical'});
}
await writeFile(process.env.URALLA_VERIFY_OUT||'docs/audits/uralla-river/public.json',JSON.stringify({publishedHead:head,verifiedAt:new Date().toISOString(),url,pagesRun:'https://github.com/Alvaren/fossicking-game/actions/runs/'+run,assets},null,2)+'\n');
console.log(files.length+' deployed files match the tested production build');
