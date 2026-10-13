// Use the available Windows GPU rather than Chromium's SwiftShader default.
// This wrapper runs existing suites unchanged, with their isolated saves.
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,args:[...(options?.args||[]),...(process.env.NSW_SOFTWARE ? [] : ['--use-angle=d3d11','--ignore-gpu-blocklist'])]});
for(const name of process.argv.slice(2)) {
  if(!/^[a-z0-9.-]+\.mjs$/.test(name))throw new Error('Expected a test filename');
  console.log(`Running ${name}`);
  await import(`./${name}`);
}
