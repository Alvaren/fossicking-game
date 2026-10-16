// Verify the exact production bytes after the matching Pages job succeeds.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [head,run]=process.argv.slice(2);
assert.match(head||'',/^[a-f0-9]{40}$/);assert.match(run||'',/^\d+$/);
const base='https://alvaren.github.io/fossicking-game/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['index.html',...(await readdir('dist/assets')).filter(n=>/\.(js|css)$/.test(n)).map(n=>'assets/'+n),'models/newengland/environment.glb',...(process.env.OPT_EXTRA_ASSETS||'').split(',').filter(Boolean)];
const assets=[];
for(const path of files) {
  const local=await readFile('dist/'+path),response=await fetch(base+path+'?nsw-optimisation='+head);
  assert.equal(response.status,200,path);
  const remote=Buffer.from(await response.arrayBuffer());
  // Git checks HTML out with CRLF here and LF on the Pages Linux runner.
  // Generated JS/CSS and the GLB must still be exactly byte-identical.
  const canonical=bytes=>path.endsWith('.html')?Buffer.from(bytes.toString('utf8').replace(/\r/g,'')):bytes;
  assert.equal(sha(canonical(remote)),sha(canonical(local)),'Public content differs: '+path);
  assets.push({path,bytes:remote.length,sha256:sha(remote),localSha256:sha(local),comparison:path.endsWith('.html')?'CRLF/LF normalised':'byte-identical'});
}
const report={publishedHead:head,
  verifiedAt:new Date().toISOString(),url:base,pagesRun:`https://github.com/Alvaren/fossicking-game/actions/runs/${run}`,assets};
await writeFile(process.env.OPT_VERIFY_OUT||'docs/audits/nsw-optimisation/publication.json',JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${assets.length} public files against the tested build at ${head}; HTML line endings normalised.`);
