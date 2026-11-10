// Read-only report for the declared independent BoP and sector arms at R.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {gate} from './gate.mjs';
import {boundHits,physicalDiagnostics} from './exp-physics.mjs';
import {nightIntegrity} from './night-integrity.mjs';
const dir=resolve(process.argv[2]||'.cache/night-session/wec-fit');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const status=json(join(dir,'status.json')),manifest=json(join(dir,'manifest.json'));
const production=(await import(pathToFileURL(resolve('worker/lapsim/calibration-data.js')))).lapsimCalibration;
const arms={},choices=s=>({pooled:s.pooled?.used??null,bop:s.bop?.used??null,gripSource:s.gripSource?.used??null});
const rms=a=>a.length?Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length):null;
for(const arm of ['control','bop','sector2']){
 const log=join(dir,arm+'-objective.jsonl');
 const events=existsSync(log)?readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const groups=events.filter(e=>e.event==='group'),ends=events.filter(e=>e.event==='end');
 const state=status.statuses.find(s=>s.arm===arm);
 const r=arms[arm]={complete:!!state?.complete,groups:[],completedGroups:groups.length,fitEnds:ends.length,capHits:ends.filter(e=>e.capHit).length,status:state};
 if(!state?.complete)continue;
 const c=(await import(pathToFileURL(join(dir,arm+'.js')))).lapsimCalibration;
 assert.deepEqual(c.seasons,production.seasons);assert.deepEqual(c.projections,production.projections);r.f1Unchanged=true;
 r.reproduction=json(join(dir,arm+'-reproduction.json'));
 if(arm==='control')assert.ok(r.reproduction.pass&&r.reproduction.maxAbsErrorSec===0,'HARD STOP: production raced reproduction failed');
 r.physics=physicalDiagnostics(c,json(join(dir,'validate-'+arm+'.json')));
 for(const e of groups){
  const [kind,year]=e.group.split('/'),s=c.series.wec[kind.slice(4)][year];assert.deepEqual(s.car,e.car);
  const groupEnds=ends.filter(x=>x.group===e.group),main=groupEnds.find(x=>x.candidate==='main');
  r.groups.push({group:e.group,n:e.heldout.n,rmsPct:e.heldout.rmsPct,errors:e.heldout.errors,car:e.car,bounds:boundHits(e.group,e.car).hits,choices:choices(s),selection:{pooled:s.pooled,bop:s.bop,gripSource:s.gripSource},fittedLaps:e.fittedLaps,mainIterations:main?.iteration,capHits:groupEnds.filter(x=>x.capHit).length,trap:r.physics[e.group].trap,reproduction:r.reproduction.rows.find(x=>x.group===e.group)});
 }
 assert.equal(r.groups.length,6);r.rmsPct=rms(r.groups.flatMap(g=>g.errors.map(e=>e.pct)));r.n=r.groups.reduce((s,g)=>s+g.n,0);
 const traps=r.groups.filter(g=>/^wec-(lmh|lmdh)\/2025$/.test(g.group)).flatMap(g=>r.physics[g.group].rows.filter(x=>x.trapKph!=null).map(x=>x.trapKph));
 r.hypercar2025Trap={n:traps.length,rmsKph:rms(traps),definition:'Simulated lap maximum minus measured trap; trap positions remain unverified'};
 if(arm==='control'){
  const old=(await import(pathToFileURL(resolve('scripts/sim/results/wec-consistent-rounds-2026-11-10/control.js')))).lapsimCalibration;
  assert.deepEqual(c.series,old.series,'Flags-off R control changed');r.flagsOffSeriesIdentical=true;
 }
}
const comparisons={};
for(const arm of ['bop','sector2']){
 if(!arms.control.complete||!arms[arm].complete){comparisons[arm]={pass:false,parked:'Incomplete paired run'};continue;}
 const pairs=arms[arm].groups.map(b=>{
  const a=arms.control.groups.find(x=>x.group===b.group),before=new Map(a.errors.map(x=>[x.name,x.pct]));
  assert.deepEqual([...before.keys()].sort(),b.errors.map(x=>x.name).sort());
  const old=a.bounds.some(x=>x.parameter==='clA'),now=b.bounds.some(x=>x.parameter==='clA');
  return {group:b.group,n:b.n,deltaRmsPP:b.rmsPct-a.rmsPct,gate:gate(b.errors.map(x=>before.get(x.name)),b.errors.map(x=>x.pct)),downforceLeftBound:old&&!now,controlClA:a.car.clA,candidateClA:b.car.clA,controlAtBound:old,candidateAtBound:now,choiceFlip:JSON.stringify(a.choices)!==JSON.stringify(b.choices),gainEstablished:!(b.n<=6&&b.n>=5&&a.rmsPct-b.rmsPct<.1),baseErrors:b.errors.map(x=>before.get(x.name)),candidateErrors:b.errors.map(x=>x.pct)};
 });
 const pooled=gate(pairs.flatMap(x=>x.baseErrors),pairs.flatMap(x=>x.candidateErrors));
 const checks={pooledAccepted:pooled.accept,noClassSeasonWorse:pairs.every(x=>x.deltaRmsPP<=0),noCapHits:arms.control.capHits===0&&arms[arm].capHits===0,dryReproduction:arms[arm].reproduction.pass&&arms[arm].reproduction.maxAbsErrorSec===0,f1Unchanged:arms[arm].f1Unchanged};
 comparisons[arm]={pass:Object.values(checks).every(Boolean),checks,pooled,groups:pairs.map(({baseErrors,candidateErrors,...x})=>x)};
}
const result={manifest,status,arms,comparisons,adopted:false,integrity:await nightIntegrity()};
writeFileSync(join(dir,'results.json'),JSON.stringify(result,null,2)+'\n');
const f=x=>x==null?'':x.toFixed(6),lines=['# WEC BoP and sector follow-up — 2026-11-10','','Production remains the baseline. Each independent arm uses the same repository geometry and current transfer table at R. No settings were selected from the held-out results.','','| Group | n | Control RMS, % | Model-matched BoP RMS, % | Sector weight 2 RMS, % |','|---|---:|---:|---:|---:|'];
for(const a of arms.control.groups)lines.push(`| ${a.group} | ${a.n} | ${f(a.rmsPct)} | ${f(arms.bop.groups.find(x=>x.group===a.group)?.rmsPct)} | ${f(arms.sector2.groups.find(x=>x.group===a.group)?.rmsPct)} |`);
lines.push(`| Pooled | ${arms.control.n??''} | ${f(arms.control.rmsPct)} | ${f(arms.bop.rmsPct)} | ${f(arms.sector2.rmsPct)} |`,'','| Arm | Pass | Pooled gate | Any class-season worse | Cap hits | Exact dry rows | Largest reproduction error, s | Hypercar 2025 trap RMS, km/h |','|---|---|---|---|---:|---:|---:|---:|');
for(const [name,a]of Object.entries(arms)){const c=comparisons[name];lines.push(`| ${name} | ${name==='control'?(a.complete?'reference':'incomplete'):c.pass?'yes':'no'} | ${c?.pooled?.reason??''} | ${c?.groups?.some(g=>g.deltaRmsPP>0)??''} | ${a.capHits} | ${a.reproduction?.n??''} | ${f(a.reproduction?.maxAbsErrorSec)} | ${f(a.hypercar2025Trap?.rmsKph)} |`);}
lines.push('','The trap diagnostic compares simulated lap maximum with a measured trap. It does not verify trap position. A gain below the declared threshold at small group counts is not established. Austin wet rows are excluded by the same list as the fit.','','| Arm / group | μY | ClA, m² | CdA, m² | Bound hits | pooled / bop / grip source | Main iterations |','|---|---:|---:|---:|---|---|---:|');
for(const [name,a]of Object.entries(arms))for(const g of a.groups)lines.push(`| ${name} / ${g.group} | ${f(g.car.muY)} | ${f(g.car.clA)} | ${f(g.car.cdA)} | ${g.bounds.map(x=>x.parameter+':'+x.side).join(', ')||'none'} | ${g.choices.pooled} / ${g.choices.bop} / ${g.choices.gripSource} | ${g.mainIterations??''} |`);
lines.push('','| Candidate / group | Change in held-out RMS, pp | Downforce left bound | Group gate |','|---|---:|---|---|');
for(const [name,c]of Object.entries(comparisons))for(const g of c.groups||[])lines.push(`| ${name} / ${g.group} | ${f(g.deltaRmsPP)} | ${g.downforceLeftBound} | ${g.gate.reason}${!g.gainEstablished?'; gain not established':''} |`);
lines.push('','Full-precision errors, car fields, selections, exclusions, iteration diagnostics and source hashes are retained on the experiment branch. Production runtime files and the gate remain unchanged.');
writeFileSync(join(dir,'report.md'),lines.join('\n')+'\n');console.log(JSON.stringify({comparisons,integrity:result.integrity},null,2));
