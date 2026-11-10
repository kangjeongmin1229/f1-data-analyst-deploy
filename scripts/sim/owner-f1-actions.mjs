// Portable experiment-only runner. No production deployment or model adoption.
import {readFile,writeFile,mkdir,copyFile,cp,readdir,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {f1FoldStop} from './f1-fold-rule.mjs';

const root=process.cwd(),mode=process.argv[2],arm=process.argv[3];
const json=async p=>JSON.parse(await readFile(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const plan=await json('scripts/sim/owner-actions-plan.json');
const saved=resolve('.cache/owner-saved'),output=resolve('owner-output');
async function save(p,v){await mkdir(join(p,'..'),{recursive:true});await writeFile(p,JSON.stringify(v,null,2)+'\n');}
async function verifyFiles(files){for(const [p,h]of Object.entries(files))assert.equal(sha(await readFile(p)),h,'HARD STOP: input/runtime hash mismatch '+p);}
async function prepare(which){
  await verifyFiles(plan.pinnedFiles);
  assert.equal(sha(await readFile('.cache/owner-inputs.tgz')),plan.inputArchive.sha256,'HARD STOP: input archive');
  assert.equal(sha(await readFile('.cache/owner-checkpoints.tar.gz')),plan.checkpoints.sha256,'HARD STOP: checkpoint archive');
  await mkdir(saved,{recursive:true});await mkdir('.cache/lapsim',{recursive:true});await mkdir(output,{recursive:true});
  execFileSync('tar',['-xzf','.cache/owner-inputs.tgz','.cache/lapsim/traces.json','.cache/lapsim/wec.json']);
  execFileSync('tar',['-xzf','.cache/owner-checkpoints.tar.gz','-C',saved]);
  const manifest=await json('scripts/sim/owner-checkpoint-manifest.json');
  assert.equal(sha(await readFile('scripts/sim/owner-checkpoint-manifest.json')),plan.checkpoints.manifestSha256);
  for(const [name,item]of Object.entries(manifest.files))assert.equal(sha(await readFile(join(saved,name))),item.sha256,'HARD STOP: checkpoint member '+name);
  const patch=await json('scripts/sim/results/wec-consistent-2026-11-10/interlagos-distance-override.json');
  const traces=await json('.cache/lapsim/traces.json');
  for(const row of patch.rows){const t=traces.find(t=>t.session_key===row.session_key&&t.driver_number===row.driver_number);assert.ok(t);assert.equal(sha(JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k])=>k!=='s')))),row.measurementSha256);t.s=row.s;}
  await writeFile('.cache/lapsim/traces.json',JSON.stringify(traces));
  assert.equal(sha(await readFile('.cache/lapsim/traces.json')),plan.controlTracesSha256);
  const wec=await json('.cache/lapsim/wec.json'),wet=(await json('scripts/sim/data/wet-sessions.json')).wec;
  for(const row of wec)if(wet[row.year+' '+row.track]&&row.weather)row.weather.rain=true;
  await writeFile('.cache/lapsim/wec.json',JSON.stringify(wec));
  assert.equal(sha(await readFile('.cache/lapsim/wec.json')),plan.wecSha256);
  if(which==='candidate'){
    for(const [from,to,expected]of [
      ['candidate-tracks.js.gz','worker/lapsim/tracks-data.js',plan.candidateGeometrySha256],
      ['candidate-traces.json.gz','.cache/lapsim/traces.json',plan.candidateTracesSha256]]){
      const bytes=gunzipSync(await readFile('scripts/sim/results/night-session-2026-11-10/block-2/geometry/'+from));
      assert.equal(sha(bytes),expected);await writeFile(to,bytes);
    }
  }
  const prepared={...plan.pinnedFiles,'worker/lapsim/tracks-data.js':sha(await readFile('worker/lapsim/tracks-data.js')),'.cache/lapsim/traces.json':sha(await readFile('.cache/lapsim/traces.json')),'.cache/lapsim/wec.json':plan.wecSha256};
  await save('.cache/owner-prepared.json',prepared);return prepared;
}
async function loadGroups(which){
  for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];
  Object.assign(process.env,plan.f1Settings);
  const original=await readFile(join(saved,'original',which,'source/calibrate.mjs'),'utf8');
  const marker='\nif (!ONLY_WEC) {\nconst t0 = Date.now();';assert.equal(original.split(marker).length,2);
  await writeFile('scripts/sim/owner-job-groups.mjs',original.split(marker)[0]+'\nexport {groups, BCD, traces, tracks};\n');
  return import(pathToFileURL(resolve('scripts/sim/owner-job-groups.mjs')));
}
async function fold(which,year,foldNumber){
  const prepared=await prepare(which),{groups,BCD}=await loadGroups(which);
  const {fitJointBCD,bcdConverged}=await import('./joint-bcd.mjs');
  const main=await json(join(saved,'latest',which,'fit-1.json'));
  assert.ok(main.converged&&bcdConverged(main.scores));
  assert.deepEqual(main.groups,groups.map(g=>({key:g.key,laps:g.laps.length})),'HARD STOP: main training rows changed');
  const mainRounds=main.scores.length,target=groups.find(g=>g.key===year);assert.ok(target);
  const names=[...new Set(target.laps.map(l=>l.name))].sort(),hidden=new Set(names.filter((_,i)=>i%4===foldNumber));
  const train=groups.map(g=>g.key===year?{...g,laps:g.laps.filter(l=>!hidden.has(l.name))}:g);
  const number=2+([2025,2026].indexOf(year)*4)+foldNumber;
  assert.ok([2025,2026].includes(year)&&foldNumber>=0&&foldNumber<4);
  const options={...BCD,rounds:Math.max(2,BCD.rounds-1)};
  const {log,convergenceDir,workers,...settings}=options;
  const inputHash=sha(JSON.stringify({groups:train,settings}));
  const initial=join(saved,'latest',which,`fit-${number}.json`);
  let state=existsSync(initial)?await json(initial):null;
  if(state){assert.deepEqual(state.groups,train.map(g=>({key:g.key,laps:g.laps.length})));if(state.inputHash)assert.equal(state.inputHash,inputHash,'HARD STOP: fold input digest changed');}
  const dir=join(output,`${which}-${year}-${foldNumber}`);await mkdir(dir,{recursive:true});
  await save(join(dir,'provenance.json'),{arm:which,year,fold:foldNumber,fitNumber:number,mainRounds,inputHash,hiddenTracks:[...hidden],checkpointCommit:plan.checkpoints.commit,checkpointArchive:plan.checkpoints.sha256,sourceCommit:process.env.GITHUB_SHA||'local-test',preserved:!!state?.converged,startedAt:new Date().toISOString()});
  if(process.argv.includes('--check-only')){console.log(JSON.stringify({verified:true,arm:which,year,fold:foldNumber,inputHash,checkpointRounds:state?.scores.length||0,mainRounds}));return;}
  let scores=state?.scores.slice()||[];
  if(!state?.converged){
    let stopping=f1FoldStop(scores,mainRounds);
    while(!stopping.complete){
      const result=await fitJointBCD(train,{...options,convergence:false,rounds:1,workers:2,log:undefined,
        ...(state?{startX:state.xs,startFactors:state.factors,startAdj:state.adj}:{})});
      scores.push(result.score);stopping=f1FoldStop(scores,mainRounds);
      state={groups:train.map(g=>({key:g.key,laps:g.laps.length})),inputHash,scores,...stopping,capHit:false,mainRounds,
        xs:result.xs,factors:result.factors,adj:result.adj,policy:'owner-fold-rule-2026-11-11'};
      await writeFile(join(dir,`fit-${number}.json.tmp`),JSON.stringify(state,null,2)+'\n');
      await rename(join(dir,`fit-${number}.json.tmp`),join(dir,`fit-${number}.json`));
      console.log(JSON.stringify({arm:which,year,fold:foldNumber,round:scores.length,score:result.score,...stopping}));
    }
    state={...state,...stopping,mainRounds,policy:'owner-fold-rule-2026-11-11'};
  }
  await save(join(dir,`fit-${number}.json`),state);
  await verifyFiles(prepared);
  await save(join(dir,'status.json'),{complete:true,preserved:!!state.converged&&!state.policy,rounds:scores.length,mainRounds,
    numericallyConverged:state.converged,stopReason:state.stopReason||'preserved-completed-fold',inputHash,finishedAt:new Date().toISOString()});
}
async function wec(which){
  await prepare('control');
  for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];
  const dir=join(output,'wec-'+which);await mkdir(dir,{recursive:true});
  const seed=(await import('../../worker/lapsim/calibration-data.js')).lapsimCalibration;
  const before=structuredClone(seed);
  Object.assign(process.env,plan.wecSettings,plan.wecVariants[which],{LAPSIM_WEC_ELIGIBILITY:resolve(plan.wecEligibility),LAPSIM_OBJECTIVE_LOG:join(dir,'objective.jsonl')});
  try{execFileSync(process.execPath,['scripts/sim/verify-wec-reproduction.mjs','.',join(dir,'production-reproduction.json')],{stdio:'inherit'});}
  catch(error){await writeFile(join(output,'HARD_STOP'),'Production raced-session reproduction failed\n');throw error;}
  execFileSync(process.execPath,['scripts/sim/calibrate.mjs'],{stdio:'inherit'});
  await copyFile('worker/lapsim/calibration-data.js',join(dir,'calibration-data.js'));
  const after=(await import(pathToFileURL(join(dir,'calibration-data.js')))).lapsimCalibration;
  assert.deepEqual(after.seasons,before.seasons);assert.deepEqual(after.projections,before.projections);
  execFileSync(process.execPath,['scripts/sim/verify-wec-reproduction.mjs','.',join(dir,'reproduction.json')],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/sim/validate.mjs',which],{stdio:'inherit'});
  await copyFile(`probe-out/validate-${which}.json`,join(dir,'validation.json'));
  const prepared=await json('.cache/owner-prepared.json');delete prepared['worker/lapsim/calibration-data.js'];await verifyFiles(prepared);
  await save(join(dir,'status.json'),{complete:true,arm:which,settings:{...plan.wecSettings,...plan.wecVariants[which]},f1Unchanged:true,finishedAt:new Date().toISOString()});
}
try{
  if(mode==='fold')await fold(arm,Number(process.argv[4]),Number(process.argv[5]));
  else if(mode==='wec')await wec(arm);
  else if(mode==='prepare')await prepare(arm);
  else throw Error('Expected fold, wec or prepare');
}catch(error){
  if(error.code==='ERR_ASSERTION'||/HARD STOP/.test(error.message)){
    await mkdir(output,{recursive:true});await writeFile(join(output,'HARD_STOP'),error.stack+'\n');
  }
  throw error;
}
