// Verify the exact production bytes after the matching Pages job succeeds.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [head,run]=process.argv.slice(2);
assert.match(head||'',/^[a-f0-9]{40}$/);assert.match(run||'',/^\d+$/);
const base='https://alvaren.github.io/fossicking-game/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['index.html',...(await readdir('dist/assets')).filter(n=>/\.(js|css)$/.test(n)).map(n=>'assets/'+n),'models/newengland/environment.glb'];
const assets=[];
for(const path of files) {
  const local=await readFile('dist/'+path),response=await fetch(base+path+'?nsw-scene='+head);
  assert.equal(response.status,200,path);
  const remote=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(remote),sha(local),'Public bytes differ: '+path);
  assets.push({path,bytes:remote.length,sha256:sha(remote)});
}
const report={implementationCommit:'73b02f10bf5ae827d4a25b116a419e1599bdbac9',publishedHead:head,
  verifiedAt:new Date().toISOString(),url:base,pagesRun:`https://github.com/Alvaren/fossicking-game/actions/runs/${run}`,assets};
await writeFile('docs/audits/nsw-scene/publication.json',JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${assets.length} public files against the tested build at ${head}.`);
