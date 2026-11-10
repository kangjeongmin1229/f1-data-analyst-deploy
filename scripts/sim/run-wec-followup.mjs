// Independent WEC arms at the same yardstick; never installs candidate values.
import {readFile,writeFile,mkdir,cp,copyFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nightIntegrity} from './night-integrity.mjs';
const root=process.cwd(),out=resolve('.cache/night-session/wec-fit');
const state=JSON.parse(await readFile('.cache/night-session/state.json'));
const deadline=Date.parse(state.blocks[3].startedAt)+100*60000;
const sentinel=await nightIntegrity();
assert.ok(Date.now()<deadline);
await mkdir(out);
const common={LAPSIM_ONLY:'wec',LAPSIM_ITERS:'70',LAPSIM_HOLDOUT_ITERS:'25',LAPSIM_WEC_NM_TOL:'1e-4',LAPSIM_WEC_NM_CAP:'2000',LAPSIM_WEC_TRAP_POSITION:'off',LAPSIM_WEC_SECTORS:'off'};
const variants={control:{},bop:{LAPSIM_WEC_MODEL_BOP:'on'},sector2:{LAPSIM_WEC_SECTORS:'on',LAPSIM_WEC_SECTOR_WEIGHT:'2'}};
const inputs={};for(const p of ['scripts/sim/data/wec-model-identities.json','scripts/sim/data/wec-bop-verified-2025.json'])inputs[p]=createHash('sha256').update(await readFile(p)).digest('hex');
const manifest={startedAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),sentinel,common,variants,inputs,baseline:'Current production, repository geometry, current B; refit at R',pass:'Pooled gate accepts; no class-season worse; no cap hits; exact dry reproduction; F1 unchanged',bop:'Existing relative mass/power formula, forced for the independent experimental arm in 2025; official exact car model join; no numeric 2026 BoP assumed',sector:'One allowed retest of sector weight 2 at R, production-frozen eligibility'};
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for(const arm of Object.keys(variants)){
 const dir=join(out,arm);await mkdir(dir);
 await cp('scripts/sim',join(dir,'scripts/sim'),{recursive:true,filter:p=>!p.replaceAll('\\','/').includes('/scripts/sim/results')});
 await cp('worker',join(dir,'worker'),{recursive:true});await cp('tests',join(dir,'tests'),{recursive:true});
 await mkdir(join(dir,'.cache/lapsim'),{recursive:true});await mkdir(join(dir,'docs'));
 await copyFile('package.json',join(dir,'package.json'));
 for(const file of ['traces.json','wec.json'])await copyFile(join('.cache/wec-consistent-rounds/control/.cache/lapsim',file),join(dir,'.cache/lapsim',file));
 await copyFile('.cache/no-external-network.mjs',join(dir,'.cache/no-external-network.mjs'));
}
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),children=new Set();let timedOut=false;
async function run(arm,label,args,extra={}){
 const started=Date.now();
 const status=await new Promise((done,reject)=>{
  const child=spawn(process.execPath,args,{cwd:join(out,arm),env:{...clean,...common,...variants[arm],...extra},stdio:['ignore','pipe','pipe']});children.add(child);
  child.stdout.pipe(createWriteStream(join(out,`${arm}-${label}.log`)));child.stderr.pipe(createWriteStream(join(out,`${arm}-${label}.stderr`)));
  child.on('error',reject);child.on('close',(code,signal)=>{children.delete(child);done({arm,label,code,signal,seconds:(Date.now()-started)/1000});});
 });if(status.code!==0)throw Error(JSON.stringify(status));return status;
}
await run('control','eligibility',['scripts/sim/prepare-wec-eligibility.mjs',join(out,'eligibility.json')]);
manifest.eligibilitySha256=createHash('sha256').update(await readFile(join(out,'eligibility.json'))).digest('hex');
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const timer=setTimeout(()=>{timedOut=true;for(const child of children)child.kill('SIGTERM');},Math.max(1,deadline-Date.now()));
const production=(await import(pathToFileURL(join(root,'worker/lapsim/calibration-data.js')))).lapsimCalibration;
const statuses=await Promise.all(Object.keys(variants).map(async arm=>{
 try{
  const fit=await run(arm,'calibrate',['scripts/sim/calibrate.mjs'],{LAPSIM_WEC_ELIGIBILITY:join(out,'eligibility.json'),LAPSIM_OBJECTIVE_LOG:join(out,arm+'-objective.jsonl')});
  const file=join(out,arm+'.js');await copyFile(join(out,arm,'worker/lapsim/calibration-data.js'),file);
  const cal=(await import(pathToFileURL(file))).lapsimCalibration;assert.deepEqual(cal.seasons,production.seasons);assert.deepEqual(cal.projections,production.projections);
  await run(arm,'validate',['scripts/sim/validate.mjs',arm]);await copyFile(join(out,arm,`probe-out/validate-${arm}.json`),join(out,`validate-${arm}.json`));
  await run(arm,'reproduction',['scripts/sim/verify-wec-reproduction.mjs','.',join(out,arm+'-reproduction.json')]);
  await run(arm,'runtime-reproduction',['--import','./.cache/no-external-network.mjs','--test','--test-name-pattern=reproduc','tests/lapsim.test.mjs'],{KONGBODA_FEATURES:'all'});
  return {...fit,complete:true};
 }catch(e){return {arm,complete:false,error:e.message};}
}));
clearTimeout(timer);await writeFile(join(out,'status.json'),JSON.stringify({at:new Date().toISOString(),timedOut,statuses,complete:statuses.every(s=>s.complete),integrity:await nightIntegrity()},null,2)+'\n');console.log(JSON.stringify(statuses));
