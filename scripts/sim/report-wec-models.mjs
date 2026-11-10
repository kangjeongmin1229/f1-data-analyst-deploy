// Report completed hidden-track/model folds. Partial folds never become acceptance evidence.
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gate} from './gate.mjs';
import {boundHits} from './exp-physics.mjs';
import {nightIntegrity} from './night-integrity.mjs';
const out=resolve(process.argv[2]||'.cache/night-session/models-fit'),json=p=>JSON.parse(readFileSync(p));
const status=json(join(out,'status.json')),manifest=json(join(out,'manifest.json'));
for(const [p,expected]of Object.entries(manifest.inputs))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),expected,'HARD STOP: model input hash mismatch '+p);
const rms=a=>a.length?Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length):null;
const summary={},pooledBase=[],pooledModels=[];
const prodLog=join(out,'production-objective.jsonl'),productionEvents=existsSync(prodLog)?readFileSync(prodLog,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const production={complete:status.control?.code===0,groups:productionEvents.filter(e=>e.event==='group'),capHits:productionEvents.filter(e=>e.event==='end'&&e.capHit).length};
if(production.complete){
 const c=(await import(pathToFileURL(join(out,'production/worker/lapsim/calibration-data.js')))).lapsimCalibration;
 const p=(await import(pathToFileURL(resolve('worker/lapsim/calibration-data.js')))).lapsimCalibration;
 const r=(await import(pathToFileURL(resolve('scripts/sim/results/wec-consistent-rounds-2026-11-10/control.js')))).lapsimCalibration;
 assert.deepEqual(c.seasons,p.seasons);assert.deepEqual(c.projections,p.projections);assert.deepEqual(c.series,r.series);production.f1Unchanged=true;production.identicalEarlierR=true;
 const file=join(out,'production-reproduction.json');if(existsSync(file)){production.reproduction=json(file);assert.ok(production.reproduction.pass&&production.reproduction.maxAbsErrorSec===0,'HARD STOP: production raced reproduction failed');}
}
for(const dir of readdirSync(out).filter(x=>/^lm(h|dh|gt3)-\d+$/.test(x)).sort()){
 const path=join(out,dir,'result.json');if(!existsSync(path)){summary[dir]={complete:false,parked:'No completed main checkpoint'};continue;}
 const r=json(path),eventsFile=join(out,dir,'objectives.jsonl'),events=readFileSync(eventsFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const s=summary[dir]={group:r.group,complete:r.complete,parked:r.parked||(!r.complete?'Time box ended':null),nCars:r.nCars,nTracks:r.nTracks,settings:r.settings,capHits:events.filter(e=>e.event==='end'&&e.capHit).length,capDetails:events.filter(e=>e.event==='end'&&e.capHit).map(({label,arm,iteration,objective,simplexSize,relativeObjectiveChange})=>({label,arm,iteration,objective,simplexSize,relativeObjectiveChange})),completedFolds:r.folds.filter(f=>f.pass).length,main:r.main?{base:r.main.control.car,models:r.main.model?.modelCars,classBase:r.main.model?.car,baseScore:r.main.control.score,modelScore:r.main.model?.score,convergence:r.main.ends,bounds:{base:boundHits(r.group,r.main.control.car),classBase:r.main.model?boundHits(r.group,r.main.model.car):null,models:Object.fromEntries(Object.entries(r.main.model?.modelCars||{}).map(([model,car])=>[model,boundHits(r.group,car)]))}}:null};
 for(const fold of r.folds){if(fold.kind==='model'){assert.ok(!fold.trainModels.includes(fold.hidden));assert.ok(fold.errors.every(e=>e.base.model===fold.hidden&&e.models.model===fold.hidden));}else assert.ok(fold.errors.every(e=>e.base.track===fold.hidden&&e.models.track===fold.hidden));}
 if(!r.complete)continue;
 const tracks=r.folds.filter(f=>f.kind==='track'),pairs=tracks.flatMap(f=>f.errors),classPairs=pairs.filter(p=>p.base.classBest);
 const clusters=tracks.map(f=>({track:f.hidden,base:rms(f.errors.map(p=>p.base.pct)),models:rms(f.errors.map(p=>p.models.pct)),nModels:f.errors.length}));
 const p=production.groups.find(p=>p.group===r.group),baseClass=rms(classPairs.map(p=>p.base.pct)),modelsClass=rms(classPairs.map(p=>p.models.pct));
 if(p)assert.deepEqual(classPairs.map(x=>x.base.track).sort(),p.heldout.errors.map(x=>x.name).sort());
 s.trackTest={n:clusters.length,modelTrackCells:pairs.length,baseRmsPct:rms(clusters.map(c=>c.base)),modelsRmsPct:rms(clusters.map(c=>c.models)),gate:gate(clusters.map(c=>c.base),clusters.map(c=>c.models)),clusters,classBest:{n:classPairs.length,baseRmsPct:baseClass,modelsRmsPct:modelsClass,productionRmsPct:p?.heldout.rmsPct??null},errors:pairs};
 s.models=[...new Set(pairs.map(p=>p.base.model))].sort().map(model=>{
  const a=pairs.filter(p=>p.base.model===model),baseRms=rms(a.map(p=>p.base.pct)),modelRms=rms(a.map(p=>p.models.pct)),g=gate(a.map(p=>p.base.pct),a.map(p=>p.models.pct));
  return {model,n:a.length,baseRmsPct:baseRms,modelRmsPct:modelRms,gainPP:baseRms-modelRms,gate:g,eligibleOwnValues:g.accept&&(!(a.length===5||a.length===6)||baseRms-modelRms>=.1)};
 });
 const modelFolds=r.folds.filter(f=>f.kind==='model'),hidden=modelFolds.flatMap(f=>f.errors);
 s.hiddenModelTest={modelFolds:modelFolds.length,modelTrackCells:hidden.length,baseRmsPct:rms(hidden.map(p=>p.base.pct)),modelsRmsPct:rms(hidden.map(p=>p.models.pct)),errors:hidden,note:'Every hidden model receives the fitted class base; no model offset exists for it'};
 if(!r.group.startsWith('wec-lmgt3/')){pooledBase.push(...clusters.map(c=>c.base));pooledModels.push(...clusters.map(c=>c.models));}
}
const required=['lmh-2025','lmh-2026','lmdh-2025','lmdh-2026'],allComplete=required.every(k=>summary[k]?.complete),completeGroups=Object.values(summary).filter(s=>s.complete);
const hypercarGroups=required.map(k=>summary[k]).filter(Boolean);
const pooled=gate(pooledBase,pooledModels),checks={allHypercarComplete:allComplete,productionComplete:production.complete&&production.groups.length===6,pooledAccepted:allComplete&&pooled.accept,noClassSeasonWorse:allComplete&&hypercarGroups.every(s=>s.trackTest.modelsRmsPct<=s.trackTest.baseRmsPct&&s.trackTest.classBest.modelsRmsPct<=s.trackTest.classBest.baseRmsPct&&s.trackTest.classBest.productionRmsPct!=null&&s.trackTest.classBest.modelsRmsPct<=s.trackTest.classBest.productionRmsPct),noCapHits:hypercarGroups.every(s=>s.capHits===0)&&production.capHits===0,f1Unchanged:production.f1Unchanged===true,dryProductionReproduction:production.reproduction?.pass===true};
const gt3=Object.values(summary).filter(s=>s.group?.startsWith('wec-lmgt3/'));
const optionalLmgt3={complete:gt3.length===2&&gt3.every(s=>s.complete),groups:gt3.map(s=>s.group),note:'Separate optional extension; cannot change the declared Hypercar gate'};
if(optionalLmgt3.complete){optionalLmgt3.pooled=gate(gt3.flatMap(s=>s.trackTest.clusters.map(c=>c.base)),gt3.flatMap(s=>s.trackTest.clusters.map(c=>c.models)));optionalLmgt3.pass=optionalLmgt3.pooled.accept&&gt3.every(s=>s.capHits===0&&s.trackTest.modelsRmsPct<=s.trackTest.baseRmsPct&&s.trackTest.classBest.modelsRmsPct<=s.trackTest.classBest.baseRmsPct&&s.trackTest.classBest.modelsRmsPct<=s.trackTest.classBest.productionRmsPct);}
const result={manifest,status,production,groups:summary,pooled,optionalLmgt3,checks,pass:Object.values(checks).every(Boolean),adopted:false,integrity:await nightIntegrity()};
writeFileSync(join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
const f=v=>v==null?'':v.toFixed(6),lines=['# WEC model hierarchy — 2026-11-10','','Both all-car arms use the same rows and verified event corrections. The fresh production arm is a separate reference with its normal top-three data. Partial results are not acceptance evidence. A group or model gain below 0.1 pp at n of 5 or 6 is not established.','','| Fixed setting | Value |','|---|---:|','| Tolerance / iteration cap | 0.0001 / 2000 |','| Shrink strength / log difference scale | 8 / 0.1 |','| Optimizer step | 0.08 |','','| Group | Status | Cars | Tracks | Completed folds | Cap hits |','|---|---|---:|---:|---:|---:|'];
for(const [name,s]of Object.entries(summary))lines.push(`| ${s.group||name} | ${s.complete?'complete':s.parked} | ${s.nCars??''} | ${s.nTracks??''} | ${s.completedFolds??0} | ${s.capHits??''} |`);
lines.push('','| Group | Hidden-track n | All-model base RMS, % | All-model candidate RMS, % | Class-best base RMS, % | Class-best candidate RMS, % | Production class-best RMS, % |','|---|---:|---:|---:|---:|---:|---:|');
for(const s of completeGroups){const t=s.trackTest;lines.push(`| ${s.group} | ${t.n} | ${f(t.baseRmsPct)} | ${f(t.modelsRmsPct)} | ${f(t.classBest.baseRmsPct)} | ${f(t.classBest.modelsRmsPct)} | ${f(t.classBest.productionRmsPct)} |`);}
lines.push('','| Pooled test | Track groups, n | Base RMS, % | Candidate RMS, % | Gate |','|---|---:|---:|---:|---|',`| Hypercar${allComplete?'':' — incomplete'} | ${pooled.n} | ${f(pooled.rmsCur)} | ${f(pooled.rmsNew)} | ${allComplete?pooled.reason:'not evaluated for acceptance'} |`);
if(optionalLmgt3.complete){const g=optionalLmgt3.pooled;lines.push(`| Optional LMGT3 | ${g.n} | ${f(g.rmsCur)} | ${f(g.rmsNew)} | ${g.reason} |`);}
lines.push('','| Group / main car | Drag cdA | Downforce clA | Grip muY | Bound hits |','|---|---:|---:|---:|---|');
for(const s of Object.values(summary).filter(s=>s.main)){
 const cars={control:s.main.base,...(s.main.classBase?{'hierarchy class base':s.main.classBase}:{}),...s.main.models};
 for(const [name,car]of Object.entries(cars)){const b=name==='control'?s.main.bounds.base:name==='hierarchy class base'?s.main.bounds.classBase:s.main.bounds.models[name];lines.push(`| ${s.group} / ${name} | ${f(car.cdA)} | ${f(car.clA)} | ${f(car.muY)} | ${b.hits.map(h=>h.parameter+' '+h.side).join('; ')||'none'} |`);}
}
lines.push('','| Group / model | Hidden-track n | Base RMS, % | Candidate RMS, % | Gain, pp | Own values supported |','|---|---:|---:|---:|---:|---|');
for(const s of completeGroups)for(const m of s.models)lines.push(`| ${s.group} / ${m.model} | ${m.n} | ${f(m.baseRmsPct)} | ${f(m.modelRmsPct)} | ${f(m.gainPP)} | ${m.eligibleOwnValues} |`);
lines.push('','| Group | Hidden-model folds | Model-track cells | Base RMS, % | Candidate RMS, % |','|---|---:|---:|---:|---:|');
for(const s of completeGroups){const h=s.hiddenModelTest;lines.push(`| ${s.group} | ${h.modelFolds} | ${h.modelTrackCells} | ${f(h.baseRmsPct)} | ${f(h.modelsRmsPct)} |`);}
lines.push('','The pass checks below apply to Hypercar and its production control. Optional LMGT3 is assessed separately.','','| Pass check | Result |','|---|---|',...Object.entries(checks).map(([k,v])=>`| ${k} | ${v} |`),'','No per-model values were adopted. The car values above are fitted effective values, not measured physical facts. The experiment branch retains the main car values, every bound hit, fold memberships, errors, source hashes and objective diagnostics. The displayed Hypercar model remains class-level.');
lines.push('','| Capped group / fit | Iterations | Final objective | Simplex size | Required size below |','|---|---:|---:|---:|---:|');
for(const s of Object.values(summary))for(const c of s.capDetails||[])lines.push(`| ${s.group} / ${c.label} / ${c.arm} | ${c.iteration} | ${f(c.objective)} | ${c.simplexSize.toPrecision(8)} | 0.0001 |`);
if(status.snapshot)lines.push('',status.snapshot);
writeFileSync(join(out,'report.md'),lines.join('\n')+'\n');console.log(JSON.stringify({checks,pass:result.pass,pooled,integrity:result.integrity}));
