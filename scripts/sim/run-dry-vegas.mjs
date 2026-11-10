// Paired, isolated dry-geometry experiment. No production files are installed.
import {readFile,writeFile,mkdir,cp,copyFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {nightIntegrity} from './night-integrity.mjs';
const root=process.cwd(),out=resolve('.cache/night-session/vegas-fit'),source=resolve('.cache/night-session/vegas');
const state=JSON.parse(await readFile('.cache/night-session/state.json'));
const deadline=Date.parse(state.blocks[2].startedAt)+90*60000;
assert.ok(Date.now()<deadline,'Block 2 time box already ended');
const manifest=JSON.parse(await readFile(join(source,'manifest.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [path,expected]of Object.entries(manifest.inputs))assert.equal(hash(await readFile(join(source,path))),expected,`HARD STOP: geometry input hash mismatch ${path}`);
const sentinel=await nightIntegrity();
await mkdir(out);
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),LAPSIM_SKIP_WEC:'1',LAPSIM_FITTER:'bcd',LAPSIM_ROUNDS:'5',LAPSIM_BCD_ITERS:'200',LAPSIM_WTIME:'20',LAPSIM_WSECTOR:'2',LAPSIM_TRACK_DRAG:'on',LAPSIM_TEAMS:'on',LAPSIM_WPRIOR:'8',LAPSIM_BCD_CONVERGENCE:'on'};
await writeFile(join(out,'manifest.json'),JSON.stringify({startedAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),sentinel,source:manifest,settings:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('LAPSIM_'))),control:'Repository geometry and pinned matching traces',candidate:'Only Las Vegas geometry and distance projections from session 9640',pass:'No worse held-out F1 2025 or 2026, no worse dry Vegas rows, exact raced reproduction, every main/fold converged; no cap hits'},null,2)+'\n');
for(const arm of ['control','candidate']){
 const dir=join(out,arm);await mkdir(dir);
 await cp('scripts/sim',join(dir,'scripts/sim'),{recursive:true,filter:p=>!p.replaceAll('\\','/').includes('/scripts/sim/results')});
 await cp('worker',join(dir,'worker'),{recursive:true});
 await cp('tests',join(dir,'tests'),{recursive:true});
 await mkdir(join(dir,'.cache/lapsim'),{recursive:true});await mkdir(join(dir,'docs'));
 await copyFile('package.json',join(dir,'package.json'));
 await copyFile('.cache/wec-consistent-rounds/control/.cache/lapsim/traces.json',join(dir,'.cache/lapsim/traces.json'));
 if(arm==='candidate'){
  await copyFile(join(source,'candidate-tracks.js'),join(dir,'worker/lapsim/tracks-data.js'));
  await copyFile(join(source,'candidate-traces.json'),join(dir,'.cache/lapsim/traces.json'));
 }
}
const children=new Set();let timedOut=false;
const timer=setTimeout(()=>{timedOut=true;for(const child of children)child.kill('SIGTERM');},Math.max(1,deadline-Date.now()));
const statuses=await Promise.all(['control','candidate'].map(arm=>new Promise((done,reject)=>{
 const child=spawn(process.execPath,['scripts/sim/calibrate.mjs'],{cwd:join(out,arm),env,stdio:['ignore','pipe','pipe']});children.add(child);
 child.stdout.pipe(createWriteStream(join(out,arm+'.log')));child.stderr.pipe(createWriteStream(join(out,arm+'.stderr')));
 child.on('error',reject);child.on('close',(code,signal)=>{children.delete(child);done({arm,code,signal});});
})));
clearTimeout(timer);
await writeFile(join(out,'status.json'),JSON.stringify({at:new Date().toISOString(),timedOut,statuses,complete:statuses.every(s=>s.code===0),integrity:await nightIntegrity()},null,2)+'\n');
console.log(JSON.stringify({timedOut,statuses}));
