// Isolated consistent-geometry experiment. Never installs production values.
import {cp,mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {sha256} from './wec-eligibility.mjs';
const root=process.cwd(),out=resolve('.cache/wec-consistent-rounds'),old=resolve('.cache/wec-sector-run/baseline');
const artifact=resolve('scripts/sim/results/wec-consistent-rounds-2026-11-10');
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_')));
const load=async p=>(await import(pathToFileURL(p).href)).lapsimCalibration;
const pinned = JSON.parse(await readFile('.cache/wec-consistent-inputs/verified-inputs.json', 'utf8'));
const pinnedPaths = {archive:'../lapsim-inputs.tgz',archiveGeometry:'.cache/wec-consistent-inputs/worker/lapsim/tracks-data.js',archiveTraces:'.cache/wec-consistent-inputs/.cache/lapsim/traces.json',rawWec:'.cache/wec-consistent-inputs/.cache/lapsim/wec.json',geometry:'worker/lapsim/tracks-data.js',seed:'worker/lapsim/calibration-data.js',oldB:'worker/lapsim/transfer-grip-data.js',timing71:'scripts/sim/data/t71-wec-extra.json',distanceOverride:'scripts/sim/results/wec-consistent-2026-11-10/interlagos-distance-override.json',projectionAudit:'scripts/sim/results/wec-consistent-2026-11-10/projection-audit.json',acceptedToleranceResult:'scripts/sim/results/wec-tolerance-2026-11-10/results.json',excludedWec:'.cache/wec-sector-run/baseline/.cache/lapsim/wec.json'};
for (const [name,path] of Object.entries(pinnedPaths)) assert.equal(sha256(await readFile(path)),pinned[name].sha256,`STOP: ${name} hash mismatch`);
const production=await load(resolve('.cache/wec-experiment/production.js'));
const rule=JSON.parse(await readFile('.cache/wec-tolerance/results.json','utf8'));
assert.ok(rule.proceedToCandidate,'STOP: tolerance comparison did not establish R');
const patch=JSON.parse(await readFile('scripts/sim/results/wec-consistent-2026-11-10/interlagos-distance-override.json','utf8'));
const geometry=await readFile('worker/lapsim/tracks-data.js');assert.equal(sha256(geometry),patch.geometrySha256);
const archivedTraces=await readFile(join(old,'.cache/lapsim/traces.json'));
const traces=JSON.parse(archivedTraces);
for(const row of patch.rows){
 const t=traces.find(t=>t.session_key===row.session_key&&t.driver_number===row.driver_number);
 assert.ok(t);assert.equal(sha256(JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k])=>k!=='s')))),row.measurementSha256);
 t.s=row.s;
}
const traceBytes=JSON.stringify(traces);assert.equal(sha256(traceBytes),patch.tracesSha256);
const bEnv={LAPSIM_B_TRANSFER_ONLY:'on',LAPSIM_SKIP_WEC:'1',LAPSIM_FITTER:'bcd',LAPSIM_ROUNDS:'5',LAPSIM_BCD_ITERS:'200',LAPSIM_WTIME:'20',LAPSIM_WSECTOR:'2',LAPSIM_TRACK_DRAG:'off',LAPSIM_TEAMS:'on',LAPSIM_WPRIOR:'8'};
const wecEnv={LAPSIM_ONLY:'wec',LAPSIM_ITERS:'70',LAPSIM_HOLDOUT_ITERS:'25',LAPSIM_WEC_NM_TOL:'1e-4',LAPSIM_WEC_NM_CAP:'2000',LAPSIM_WEC_TRAP_POSITION:'off',LAPSIM_WEC_SECTORS:'off'};
const inputs={geometry:sha256(geometry),traces:sha256(traceBytes),archiveTraces:sha256(archivedTraces),seed:sha256(await readFile('.cache/wec-experiment/production.js')),
 wec:sha256(await readFile(join(old,'.cache/lapsim/wec.json'))),oldB:sha256(await readFile(join(old,'worker/lapsim/transfer-grip-data.js'))),timing71:sha256(await readFile('scripts/sim/data/t71-wec-extra.json'))};
assert.equal(inputs.seed,'47e7c24a6df9bc67fd59dcd4fa0de6ffee290cfc02810d1e6742bca901f39586');
assert.equal(inputs.oldB,'b2d3bba7113685d1382415b4717bd26a6df2aa73f4664c0c88e64068d08e3705');
assert.equal(inputs.wec,'ce25a479ab6b256d2ac597fa34c5941f7f3166db3bd4112e92cd355502a11960');
assert.equal(inputs.timing71,'4852d273a360192fe0007c756c3a1e0f70d5aefeeb2cd46198c49878a7c12a76');
const manifest={at:new Date().toISOString(),inputs,bEnv,wecEnv,R:'1e-4, cap 2000',
 control:'Repository geometry + current B; current configuration refit at R, not frozen production cars',candidate:'Repository geometry + rebuilt B; refit at R',secondary:'Saved round-five B table + repository geometry; WEC R, only if no extra B run is needed',
 pass:'Raced sessions reproduce, F1 seasons/projections unchanged, pooled WEC no worse. Existing statistical gate also reported unchanged.',adopt:false,estimate:'B main fit 5–10 rounds, no held-out folds; WEC control in parallel',
 traceAudit:'40 Interlagos distance arrays replaced; every other measurement and all 845 other traces unchanged. Only three dry 2025 Interlagos rows enter the F1 fit.'};
await mkdir(out); // Refuse reuse and preserve the original interrupted run.
await mkdir(artifact,{recursive:true});
await writeFile(join(artifact,'verified-inputs.json'),JSON.stringify(pinned,null,2)+'\n');
for(const name of ['B','control','candidate','secondary']){
 const dir=join(out,name);await mkdir(dir); // Refuse reuse of an existing run.
 await cp(join(root,'scripts/sim'),join(dir,'scripts/sim'),{recursive:true,filter:p=>!p.replaceAll('\\','/').includes('/scripts/sim/results')});
 await cp(join(root,'worker'),join(dir,'worker'),{recursive:true});
 await cp(join(root,'tests'),join(dir,'tests'),{recursive:true});
 await cp(join(old,'.cache/lapsim'),join(dir,'.cache/lapsim'),{recursive:true});
 await writeFile(join(dir,'.cache/lapsim/traces.json'),traceBytes);
 await copyFile(join(root,'.cache/no-external-network.mjs'),join(dir,'.cache/no-external-network.mjs'));
 await copyFile(join(root,'.cache/wec-experiment/production.js'),join(dir,'worker/lapsim/calibration-data.js'));
 await copyFile(join(old,'worker/lapsim/transfer-grip-data.js'),join(dir,'worker/lapsim/transfer-grip-data.js'));
 await copyFile(join(root,'package.json'),join(dir,'package.json'));
 await mkdir(join(dir,'docs'),{recursive:true});
}
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(join(artifact,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
const children=new Set(),runtimes=[];
async function command(name,label,args,extra={}){
 const started=Date.now(),startedAt=new Date().toISOString();
 const stdout=createWriteStream(join(out,name+'-'+label+'.log')),stderr=createWriteStream(join(out,name+'-'+label+'.stderr'));
 await new Promise((ok,no)=>{const c=spawn(process.execPath,args,{cwd:join(out,name),env:{...clean,...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(c);c.stdout.pipe(stdout);c.stderr.pipe(stderr);c.on('error',no);c.on('close',code=>{children.delete(c);code===0?ok():no(Error(name+'/'+label+': '+code))});});
 await Promise.all([stdout,stderr].map(s=>new Promise(ok=>s.writableFinished?ok():s.on('finish',ok))));
 const result={name,label,startedAt,seconds:(Date.now()-started)/1000};runtimes.push(result);await writeFile(join(out,'runtime.json'),JSON.stringify(runtimes,null,2)+'\n');console.log(JSON.stringify(result));
}
async function wec(name){
 await command(name,'calibrate',['scripts/sim/calibrate.mjs'],{...wecEnv,LAPSIM_OBJECTIVE_LOG:join(out,name+'-objective.jsonl')});
 await copyFile(join(out,name,'worker/lapsim/calibration-data.js'),join(out,name+'.js'));
 const c=await load(join(out,name+'.js'));assert.deepEqual(c.seasons,production.seasons);assert.deepEqual(c.projections,production.projections);
 await command(name,'validate',['scripts/sim/validate.mjs',name]);
 await copyFile(join(out,name,'probe-out/validate-'+name+'.json'),join(out,'validate-'+name+'.json'));
 await command(name,'reproduction',['--import','./.cache/no-external-network.mjs','--test','--test-name-pattern=reproduc','tests/lapsim.test.mjs'],{KONGBODA_FEATURES:'all'});
 await command(name,'historical-reproduction',['scripts/sim/verify-wec-reproduction.mjs','.',join(out,name+'-historical-reproduction.json')]);
}
try{
 await Promise.all([wec('control'),(async()=>{
  await command('B','calibrate',['scripts/sim/calibrate.mjs'],bEnv);
  await copyFile(join(out,'B/worker/lapsim/calibration-data.js'),join(out,'B-repository-geometry.js'));
  await command('B','transfer',['scripts/sim/transfer-grip.mjs',join(out,'B-repository-geometry.js'),'B rebuilt on repository geometry; production F1 settings; drag off']);
  const bytes=await readFile(join(out,'B/worker/lapsim/transfer-grip-data.js'));
  await writeFile(join(out,'rebuilt-B.js'),bytes);await writeFile(join(out,'candidate/worker/lapsim/transfer-grip-data.js'),bytes);
  const bSummary=JSON.parse(await readFile(join(out,'B/.cache/b-rounds/summary.json'),'utf8'));
  await copyFile(join(out,'B/.cache/b-rounds/summary.json'),join(out,'B-rounds.json'));
  if(bSummary.secondaryAvailable){
   await command('B','transfer-round-5',['scripts/sim/transfer-grip.mjs',join(out,'B/.cache/b-rounds/round-5-calibration.js'),'B round 5 on repository geometry; saved during required rerun']);
   const round5=await readFile(join(out,'B/worker/lapsim/transfer-grip-data.js'));
   await writeFile(join(out,'round-5-B.js'),round5);await writeFile(join(out,'secondary/worker/lapsim/transfer-grip-data.js'),round5);
  }
  await Promise.all([wec('candidate'),...(bSummary.secondaryAvailable?[wec('secondary')]:[])]);
 })()]);
 await writeFile(join(out,'complete.json'),JSON.stringify({at:new Date().toISOString(),complete:true,F1Unchanged:true,adopted:false},null,2)+'\n');
}catch(e){for(const c of children)c.kill();throw e}
