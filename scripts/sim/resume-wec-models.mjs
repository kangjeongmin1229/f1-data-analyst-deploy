// Resume one interrupted experiment in a new directory; never modify the old run.
import {readFile,writeFile,cp,copyFile,mkdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {nightIntegrity} from './night-integrity.mjs';
const old=resolve('.cache/night-session/models-fit'),out=resolve('.cache/night-session/models-resume');
const json=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const interruption=await json('.cache/night-session/models-interruption.json');
for(const [p,expected]of Object.entries(interruption.originalLogHashes))assert.equal(hash(await readFile(join(old,p))),expected,'Original log advanced; do not restart');
const manifest=await json(join(old,'manifest.json')),deadline=Date.parse(manifest.deadline);
assert.ok(Date.now()<deadline,'Original time box already ended');
await nightIntegrity();
for(const [p,expected]of Object.entries(manifest.inputs))assert.equal(hash(await readFile(p)),expected,'HARD STOP: pinned model input mismatch');
const productionEvents=(await readFile(join(old,'production-objective.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
assert.equal(productionEvents.filter(e=>e.event==='group').length,6);
assert.ok(!productionEvents.some(e=>e.event==='end'&&e.capHit));
for(const p of ['production-reproduction.json','production-f1-reproduction.json']){const r=await json(join(old,p));assert.ok(r.pass&&r.maxAbsErrorSec===0,'HARD STOP: production reproduction failed');}
await mkdir(out);await cp(old,out,{recursive:true});
// The only changed executable is checkpoint reuse; all fitting helpers remain copied from the original run.
await copyFile('scripts/sim/run-wec-model-group.mjs',join(out,'input/scripts/sim/run-wec-model-group.mjs'));
for(const [p,expected]of Object.entries(interruption.originalLogHashes))assert.equal(hash(await readFile(join(old,p))),expected,'Original log advanced during copy; do not restart');
manifest.resume={at:new Date().toISOString(),reason:interruption.reason,attempt:1,originalDirectory:'models-fit',originalLogs:interruption.originalLogHashes,runnerSha256:hash(await readFile('scripts/sim/run-wec-model-group.mjs')),completedFoldsPreserved:true,deadlineUnchanged:true};
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(out,'interruption.json'),JSON.stringify(interruption,null,2)+'\n');
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),children=new Set();let timedOut=false;
const timer=setTimeout(()=>{timedOut=true;for(const c of children)c.kill('SIGTERM');},deadline-Date.now());
const run=(cls,year,resume)=>new Promise((done,reject)=>{
 const label=cls+'-'+year,child=spawn(process.execPath,['scripts/sim/run-wec-model-group.mjs',cls,String(year),join(out,label)],{cwd:join(out,'input'),env:{...clean,...(resume?{LAPSIM_MODEL_RESUME:'on'}:{})},stdio:['ignore','pipe','pipe']});children.add(child);
 child.stdout.pipe(createWriteStream(join(out,'resume-'+label+'.log')));child.stderr.pipe(createWriteStream(join(out,'resume-'+label+'.stderr')));
 child.on('error',reject);child.on('close',(code,signal)=>{children.delete(child);done({label,code,signal,resumed:resume});});
});
const jobs=[['lmh',2025],['lmh',2026],['lmdh',2025],['lmdh',2026]],groups=[];
await Promise.all(jobs.map(async([c,y])=>{const r=await json(join(out,c+'-'+y,'result.json'));groups.push(r.complete?{label:c+'-'+y,code:0,preserved:true}:await run(c,y,true));}));
let gt3=[];
if(!timedOut&&(await Promise.all(jobs.map(async([c,y])=>(await json(join(out,c+'-'+y,'result.json'))).complete))).every(Boolean))gt3=await Promise.all([2025,2026].map(y=>run('lmgt3',y,false)));
clearTimeout(timer);
const status={at:new Date().toISOString(),timedOut,groups,control:{label:'production',code:0,preserved:true,completedGroups:6},gt3,interruption,integrity:await nightIntegrity()};
await writeFile(join(out,'status.json'),JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify(status));
