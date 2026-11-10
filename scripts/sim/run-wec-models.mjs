// Coordinate independent Hypercar groups after the preceding paired WEC run ends.
import {readFile,writeFile,mkdir,cp,copyFile,access} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nightIntegrity} from './night-integrity.mjs';
const out=resolve('.cache/night-session/models-fit'),root=process.cwd();
const state=JSON.parse(await readFile('.cache/night-session/state.json')),deadline=Date.parse(state.blocks[4].startedAt)+120*60000;
await mkdir(out);
const inputs={};for(const p of ['scripts/sim/data/wec-model-identities.json','scripts/sim/data/wec-bop-verified-2025.json'])inputs[p]=createHash('sha256').update(await readFile(p)).digest('hex');
const manifest={declaredAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),inputs,settings:{tolerance:1e-4,cap:2000,shrinkLambda:8,logDifferenceScale:.1,step:.08},baseline:'Fresh production top-three R control, plus matched all-car class-only control',candidate:'Same all-car rows and fixed event inputs; class base + shrunk model differences',adopt:false};
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
while(Date.now()<deadline){try{await access('.cache/night-session/wec-fit/status.json');break;}catch{await new Promise(r=>setTimeout(r,5000));}}
if(Date.now()>=deadline){await writeFile(join(out,'status.json'),JSON.stringify({complete:false,parked:'Time box ended while waiting for Block 3'}));process.exit(0);}
manifest.preflight=await nightIntegrity();manifest.startedAt=new Date().toISOString();
for(const [p,expected]of Object.entries(inputs))if(createHash('sha256').update(await readFile(p)).digest('hex')!==expected)throw Error('HARD STOP: model input hash changed');
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for(const arm of ['input','production']){
 const dir=join(out,arm);await mkdir(dir);await cp('scripts/sim',join(dir,'scripts/sim'),{recursive:true,filter:p=>!p.replaceAll('\\','/').includes('/scripts/sim/results')});
 await cp('worker',join(dir,'worker'),{recursive:true});await cp('tests',join(dir,'tests'),{recursive:true});await copyFile('package.json',join(dir,'package.json'));
 await mkdir(join(dir,'.cache/lapsim'),{recursive:true});await mkdir(join(dir,'docs'));
 for(const file of ['wec.json','traces.json'])await copyFile(join('.cache/wec-consistent-rounds/control/.cache/lapsim',file),join(dir,'.cache/lapsim',file));
}
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),children=new Set();let timedOut=false;
const timer=setTimeout(()=>{timedOut=true;for(const c of children)c.kill('SIGTERM');},deadline-Date.now());
const run=(label,cwd,args,extra={})=>new Promise((done,reject)=>{
 const child=spawn(process.execPath,args,{cwd,env:{...clean,...extra},stdio:['ignore','pipe','pipe']});children.add(child);
 child.stdout.pipe(createWriteStream(join(out,label+'.log')));child.stderr.pipe(createWriteStream(join(out,label+'.stderr')));child.on('error',reject);child.on('close',(code,signal)=>{children.delete(child);done({label,code,signal});});
});
const jobs=[['lmh',2025],['lmh',2026],['lmdh',2025],['lmdh',2026]];
const production=run('production',join(out,'production'),['scripts/sim/calibrate.mjs'],{LAPSIM_ONLY:'wec',LAPSIM_WEC_NM_TOL:'1e-4',LAPSIM_WEC_NM_CAP:'2000',LAPSIM_ITERS:'70',LAPSIM_HOLDOUT_ITERS:'25',LAPSIM_WEC_TRAP_POSITION:'off',LAPSIM_WEC_SECTORS:'off',LAPSIM_OBJECTIVE_LOG:join(out,'production-objective.jsonl')});
const groups=await Promise.all(jobs.map(([c,y])=>run(c+'-'+y,join(out,'input'),['scripts/sim/run-wec-model-group.mjs',c,String(y),join(out,c+'-'+y)])));
const complete=async(c,y)=>JSON.parse(await readFile(join(out,c+'-'+y,'result.json')).catch(()=>'{"complete":false}')).complete;
let gt3=[];
if(!timedOut&&(await Promise.all(jobs.map(([c,y])=>complete(c,y)))).every(Boolean))gt3=await Promise.all([2025,2026].map(y=>run('lmgt3-'+y,join(out,'input'),['scripts/sim/run-wec-model-group.mjs','lmgt3',String(y),join(out,'lmgt3-'+y)])));
const control=await production;clearTimeout(timer);
await writeFile(join(out,'status.json'),JSON.stringify({at:new Date().toISOString(),timedOut,groups,control,gt3,integrity:await nightIntegrity()},null,2)+'\n');
console.log(JSON.stringify({groups,control,gt3,timedOut}));
