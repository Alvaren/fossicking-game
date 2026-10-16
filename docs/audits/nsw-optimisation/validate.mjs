// Serial GPU checks: never run alongside profile.mjs.
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const root='docs/audits/nsw-optimisation/',report={started:new Date().toISOString(),checks:[]};
const jobs=[
 ['resources.mjs',['baseline'],{}],['resources.mjs',['candidate'],{}],
 ['capture.mjs',['baseline'],{OPT_MODES:'low,ultra,touch'}],['capture.mjs',['candidate'],{OPT_MODES:'low,ultra,touch'}],
 ['motion.mjs',['baseline'],{}],['motion.mjs',['candidate'],{}],
 ['profile.mjs',['baseline-passes'],{OPT_SECONDS:'48',OPT_RUNS:'1',OPT_DIAG:'1',OPT_PASS_GPU:'1'}],
 ['profile.mjs',['candidate-passes'],{OPT_SECONDS:'48',OPT_RUNS:'1',OPT_DIAG:'1',OPT_PASS_GPU:'1'}],
 ['../../../tests/newengland-suite.mjs',['environment.offline.mjs','facilities.game.mjs','panning.game.mjs'],{}],
];
for(const [file,args,env] of jobs){
 const check={file,args,env,started:new Date().toISOString()};console.log('CHECK',file,args.join(' '));let output='';
 const child=spawn(process.execPath,[root+file,...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{const s=b.toString();output+=s;process.stdout.write(s);});
 check.exit=await new Promise(r=>child.on('exit',r));check.finished=new Date().toISOString();report.checks.push(check);
 await writeFile(root+'validation.json',JSON.stringify(report,null,2)+'\n');
 await writeFile(root+'check-'+report.checks.length+'.txt',output);
 if(check.exit!==0){process.exitCode=1;break;}
}
