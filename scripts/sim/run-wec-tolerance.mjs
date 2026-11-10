// Diagnostic only: pinned PR149 inputs; never installs a model.
import {cp, mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {createWriteStream, readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {eligibilityInputs, sha256} from './wec-eligibility.mjs';
const root=process.cwd(), out=resolve('.cache/wec-tolerance');
const old=resolve('.cache/wec-sector-run');
const manifest=JSON.parse(await readFile('scripts/sim/wec-timing-experiment.json','utf8'));
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_')));
const rungs=[{name:'identity70',main:70,folds:25,logging:false},{name:'loose',main:70,folds:25,logging:true,tolerance:'1e-4'},{name:'tight',main:70,folds:25,logging:true,tolerance:'1e-6'}];
const children = new Set(), deadline = Date.now() + 85 * 60e3; // Remaining part of the declared 90-minute step budget.
const load=async f=>(await import(pathToFileURL(f).href)).lapsimCalibration;
await mkdir(out); // Refuse overwriting evidence, including a previous partial run.
const declaration={at:new Date().toISOString(),inputs:manifest.inputHashes,rungs,
  cap:2000, objectiveChangeWindow:10, simplexMeasure:'max coordinate distance from best vertex in log parameters',
  objectiveMeasure:'absolute best-objective change across 10 iterations / max(1, abs(current best))',
  convergence:'Every group absolute RMS change <0.02 pp and no pooled/bop/gripSource choice flips between the two tolerances.',
  only:'wec',timingFlags:'off',weights:{lap:2,trap:0.5},adopt:false,rejudgeB2:false,
  budget:'90 minutes for step 2; this runner has 85 minutes remaining. No ladder extension.'};
await writeFile(join(out,'manifest.json'),JSON.stringify(declaration,null,2)+'\n');
for(const r of rungs){
  const dir=join(out,r.name);await mkdir(dir);
  await cp(join(root,'scripts/sim'),join(dir,'scripts/sim'),{recursive:true,filter:s=>!s.includes('scripts\\sim\\results')&&!s.includes('scripts/sim/results')});
  await cp(join(old,'baseline/worker'),join(dir,'worker'),{recursive:true});
  await cp(join(old,'baseline/.cache/lapsim'),join(dir,'.cache/lapsim'),{recursive:true});
  await copyFile(join(root,'.cache/wec-experiment/production.js'),join(dir,'worker/lapsim/calibration-data.js'));
  const hashes=eligibilityInputs(dir);for(const [k,v] of Object.entries(manifest.inputHashes))assert.equal(hashes[k],v,`${r.name}: ${k}`);
}
console.log(JSON.stringify(declaration,null,2));
async function command(r,script,args=[]){
  const stem=script.split('/').at(-1).replace('.mjs',''), started=Date.now();
  const stdout=createWriteStream(join(out,`${r.name}-${stem}.log`)),stderr=createWriteStream(join(out,`${r.name}-${stem}.stderr`));
  const env={...clean,LAPSIM_ONLY:'wec',LAPSIM_ITERS:String(r.main),LAPSIM_HOLDOUT_ITERS:String(r.folds),LAPSIM_WEC_TRAP_POSITION:'off',LAPSIM_WEC_SECTORS:'off',
    ...(r.tolerance?{LAPSIM_WEC_NM_TOL:r.tolerance,LAPSIM_WEC_NM_CAP:'2000'}:{}),
    ...(r.logging&&stem==='calibrate'?{LAPSIM_OBJECTIVE_LOG:join(out,`${r.name}-objective.jsonl`)}:{})};
  await new Promise((yes,no)=>{const child=spawn(process.execPath,[script,...args],{cwd:join(out,r.name),windowsHide:true,env,stdio:['ignore','pipe','pipe']});children.add(child);const timer=setTimeout(()=>{child.kill();no(Error('90-minute step budget reached'));},Math.max(1,deadline-Date.now()));
    child.stdout.pipe(stdout);child.stderr.pipe(stderr);child.on('error',no);child.on('close',c=>{clearTimeout(timer);children.delete(child);c===0?yes():no(Error(`${r.name}/${stem}: ${c}`));});});
  await Promise.all([stdout,stderr].map(s=>new Promise(ok=>s.writableFinished?ok():s.on('finish',ok))));
  const seconds=(Date.now()-started)/1000;console.log(`${r.name}/${stem}: ${seconds}s`);return seconds;
}
const results=await Promise.all(rungs.map(async r=>{
  const startedAt=new Date().toISOString(),seconds=await command(r,'scripts/sim/calibrate.mjs');
  await copyFile(join(out,r.name,'worker/lapsim/calibration-data.js'),join(out,`${r.name}.js`));
  const candidate=await load(join(out,`${r.name}.js`)),production=await load(join(root,'.cache/wec-experiment/production.js'));
  assert.deepEqual(candidate.seasons,production.seasons);assert.deepEqual(candidate.projections,production.projections);
  if(r.name==='identity70'){
    assert.deepEqual({...candidate,generatedAt:null},{...production,generatedAt:null},'STOP 5.3: production mismatch');
    for(const [a,b] of [[`${r.name}.js`,'baseline.js'],[`${r.name}-calibrate.log`,'baseline-calibrate.log']])assert.ok(readFileSync(join(out,a)).equals(readFileSync(join(old,b))),`Flags-off differs: ${a}`);
    await writeFile(join(out,'identity.json'),JSON.stringify({productionExactExceptDate:true,calibrationSha256:sha256(readFileSync(join(out,`${r.name}.js`))),stdoutSha256:sha256(readFileSync(join(out,`${r.name}-calibrate.log`)))},null,2)+'\n');
  }
  const validationSeconds=await command(r,'scripts/sim/validate.mjs',[r.name]);
  await copyFile(join(out,r.name,`probe-out/validate-${r.name}.json`),join(out,`validate-${r.name}.json`));
  const result={...r,startedAt,seconds,validationSeconds};await writeFile(join(out,`${r.name}-runtime.json`),JSON.stringify(result,null,2)+'\n');return result;
})).catch(e=>{for(const child of children)child.kill();throw e;});
await writeFile(join(out,'runtime.json'),JSON.stringify(results,null,2)+'\n');
