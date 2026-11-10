// Replays saved BCD checkpoints only; does not perform any fit or alter candidates.
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PRIOR} from '../../worker/lapsim/cars.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {rechargeLimitMJ} from '../../worker/lapsim/energy-limits.js';
import {withGrip,realExtremes} from './calibrate-lib.mjs';
import {buildCar,lapMult,poleMult} from './joint-bcd.mjs';
import {F1_BOUNDS,boundHits} from './exp-physics.mjs';
import {nightIntegrity} from './night-integrity.mjs';
const out=resolve(process.argv[2]||'.cache/night-session/vegas-fit'),json=p=>JSON.parse(readFileSync(p,'utf8'));
const status=json(join(out,'status.json')),manifest=json(join(out,'manifest.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,expected]of Object.entries(manifest.source.inputs))assert.equal(hash(resolve('.cache/night-session/vegas',p)),expected,'HARD STOP: Vegas input hash mismatch '+p);
assert.equal(hash(join(out,'candidate/worker/lapsim/tracks-data.js')),manifest.source.inputs['candidate-tracks.js']);
assert.equal(hash(join(out,'candidate/.cache/lapsim/traces.json')),manifest.source.inputs['candidate-traces.json']);
const tau=(date,year)=>date?Math.max(0,Math.min(1.1,(Date.parse(date)-Date.UTC(year,2,1))/(Date.UTC(year,11,15)-Date.UTC(year,2,1)))):.5;
const rms=a=>a.length?Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length):null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const energy=(w,id,year)=>{const mj=year>=2026?rechargeLimitMJ(id,year):null;return mj?{...w,rechargeMJ:mj}:w;};
const arms={};
for(const arm of ['control','candidate']){
 const dir=join(out,arm),checkDir=join(dir,'.cache/f1-convergence');
 const checks=readdirSync(checkDir).filter(s=>/^fit-\d+\.json$/.test(s)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]).map(name=>({name,...json(join(checkDir,name))}));
 const main=checks[0],raw=json(join(dir,'.cache/lapsim/traces.json'));
 const {lapsimTracks:data}=await import(pathToFileURL(join(dir,'worker/lapsim/tracks-data.js')));
 const tracks=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,trackFromData(v)]));
 const groups=main.groups.map(g=>{
  const base={...structuredClone(PRIOR[g.key]),linkMu:true};
  const params=Object.keys(F1_BOUNDS).map(key=>({key,path:key,base:base[key],min:F1_BOUNDS[key][0]*(key==='pIce'?base[key]:1),max:F1_BOUNDS[key][1]*(key==='pIce'?base[key]:1)}));
  const laps=raw.filter(t=>t.year===g.key&&tracks[t.track]&&!t.weather.rain&&t.s.length>100&&t.position<=3);
  assert.equal(laps.length,g.laps,'Unexpected outlier-removal phase; do not infer fold identities');
  return {key:g.key,base,params,laps};
 });
 const cars=Object.fromEntries(groups.map(g=>[g.key,buildCar(g,main.xs[g.key]).car]));
 const r=arms[arm]={rounds:checks.map(({name,groups,scores,converged,capHit})=>({name,groups,scores,converged,capHit,lastDecreasePct:scores.length>1?100*(scores.at(-2)-scores.at(-1))/scores.at(-2):null})),mainConverged:main.converged,capHits:checks.filter(c=>c.capHit).length,heldout:[],vegas:[],factors:main.factors['las-vegas'],cars,bounds:Object.fromEntries(Object.entries(cars).map(([y,c])=>[y,boundHits('f1/'+y,c).hits])),complete:status.complete};
 let fitIndex=1;
 for(const year of [2025,2026]){
  const target=groups.find(g=>g.key===year),names=[...new Set(target.laps.map(l=>l.track))].sort(),errors=[],folds=[];
  for(let f=0;f<4;f++,fitIndex++){
   const fit=checks[fitIndex];if(!fit){folds.push({fold:f,complete:false});continue;}
   const hidden=new Set(names.filter((_,i)=>i%4===f));
   assert.deepEqual(fit.groups,groups.map(g=>({key:g.key,laps:g.key===year?g.laps.filter(l=>!hidden.has(l.track)).length:g.laps.length})),'Fold checkpoint inventory differs');
   folds.push({fold:f,complete:fit.converged,rounds:fit.scores.length,capHit:fit.capHit});if(!fit.converged)continue;
   const car=buildCar(target,fit.xs[year]).car;
   for(const t of target.laps.filter(t=>hidden.has(t.track)&&t.position===1)){
    const fa=fit.factors[t.track];if(!fa||!groups.some(g=>g.key!==year&&g.laps.some(l=>l.track===t.track)))continue;
    const c={...car,cdA:car.cdA*fa.drag,cdALow:car.cdALow*fa.drag};
    const sim=simulateLap(withGrip(tracks[t.track],fa.grip),c,conditionsFromWeather(energy(t.weather,t.track,year))).lapTime*poleMult(fit.adj?.[year],tau(t.date,year));
    errors.push({track:t.track,realSec:t.lap_seconds,simSec:sim,errorSec:sim-t.lap_seconds,pct:100*(sim/t.lap_seconds-1)});
   }
  }
  r.heldout.push({year,n:errors.length,complete:folds.every(f=>f.complete),rmsPct:rms(errors.map(x=>x.pct)),folds,errors});
 }
 for(const t of raw.filter(t=>t.track==='las-vegas'&&t.position===1)){
  const base=cars[t.year],fa=main.factors[t.track],car={...base,cdA:base.cdA*fa.drag,cdALow:base.cdALow*fa.drag},tr=tracks[t.track];
  const sim=simulateLap(withGrip(tr,fa.grip),car,conditionsFromWeather(energy(t.weather,t.track,t.year)));
  const simSec=sim.lapTime*lapMult({group:t.year,team:t.team,tau:tau(t.date,t.year)},main.adj);
  const mins=realExtremes({s:t.s,v:t.v.map(v=>v/3.6)},15/3.6).filter(x=>x.min),h=Math.round(50/tr.ds),n=sim.v.length;
  const residuals=mins.map(e=>{let speed=Infinity;const i0=Math.round(e.s/tr.ds);for(let j=-h;j<=h;j++)speed=Math.min(speed,sim.v[((i0+j)%n+n)%n]);return 3.6*(speed-e.v);});
  r.vegas.push({year:t.year,session:t.session_key,wet:t.weather.rain,realSec:t.lap_seconds,simSec,errorSec:simSec-t.lap_seconds,cornerMinBiasKph:mean(residuals),nCorners:residuals.length,trapErrorKph:sim.vMaxKph-Math.max(...t.v),grip:fa.grip,drag:fa.drag});
 }
 const last=raw.filter(t=>t.track==='las-vegas'&&t.position===1&&!t.weather.rain).sort((a,b)=>b.year-a.year)[0],fa=main.factors['las-vegas'],base=cars[2026],c={...base,cdA:base.cdA*fa.drag,cdALow:base.cdALow*fa.drag};
 const date=last.date?'2026'+last.date.slice(4):null;
 r.prediction2026={lapSec:simulateLap(withGrip(tracks['las-vegas'],fa.grip),c,conditionsFromWeather(energy(last.weather,'las-vegas',2026))).lapTime*poleMult(main.adj?.[2026],tau(date,2026)),weatherFrom:last.year,date,grip:fa.grip,drag:fa.drag};
 if(status.complete){
  const cal=(await import(pathToFileURL(join(dir,'worker/lapsim/calibration-data.js')))).lapsimCalibration;
  for(const [y,car]of Object.entries(cars)){const clean={...car};delete clean.linkMu;assert.deepEqual(clean,cal.seasons[y].car);}
  for(const h of r.heldout){assert.equal(h.n,cal.seasons[h.year].holdout.n);assert.ok(Math.abs(h.rmsPct-cal.seasons[h.year].holdout.rmsPct)<=.00501);for(const e of h.errors){const saved=cal.seasons[h.year].holdout.tracks.find(t=>t.track===e.track);assert.ok(saved&&Math.abs(e.errorSec-saved.errorSec)<=.000501);}}
  assert.ok(Math.abs(r.prediction2026.lapSec-cal.seasons[2026].predictions['las-vegas'].lap)<=.000501);
 }
 const repro=join(out,arm+'-reproduction.json');if(existsSync(repro))r.reproduction=json(repro);
}
const a=arms.control,b=arms.candidate,checks={complete:status.complete,converged:a.mainConverged&&b.mainConverged&&[...a.heldout,...b.heldout].every(h=>h.complete),noCapHits:a.capHits===0&&b.capHits===0,heldoutNotWorse:[2025,2026].every(y=>{const x=a.heldout.find(h=>h.year===y),z=b.heldout.find(h=>h.year===y);return x.complete&&z.complete&&z.rmsPct<=x.rmsPct;}),dryVegasNotWorse:b.vegas.filter(t=>!t.wet).every(t=>Math.abs(t.errorSec)<=Math.abs(a.vegas.find(x=>x.year===t.year).errorSec)),reproduction:!!a.reproduction?.pass&&!!b.reproduction?.pass};
const result={manifest,status,arms,checks,pass:Object.values(checks).every(Boolean),adopted:false,integrity:await nightIntegrity(),notes:['Checkpoint replay only, no refit. Partial held-out RMS is not an acceptance result.','Wet Vegas rows are diagnostics only and excluded from the declared dry-row pass.','Trap error is simulated lap maximum minus measured trace maximum.']};
writeFileSync(join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
const f=v=>v==null?'':v.toFixed(6),lines=['# Dry Las Vegas geometry — 2026-11-10','','| Arm / season | Held-out n | Complete | Held-out RMS, % |','|---|---:|---|---:|'];
for(const [name,r]of Object.entries(arms))for(const h of r.heldout)lines.push(`| ${name} / ${h.year} | ${h.n} | ${h.complete} | ${f(h.rmsPct)} |`);
lines.push('','| Arm / Vegas season | Wet | Real, s | Sim, s | Error, s | Corner bias, km/h | Trap error, km/h |','|---|---|---:|---:|---:|---:|---:|');
for(const [name,r]of Object.entries(arms))for(const t of r.vegas)lines.push(`| ${name} / ${t.year} | ${t.wet} | ${f(t.realSec)} | ${f(t.simSec)} | ${f(t.errorSec)} | ${f(t.cornerMinBiasKph)} | ${f(t.trapErrorKph)} |`);
lines.push('','| Arm | Grip | Drag | Vegas prediction, s | Main rounds | Last score decrease, % |','|---|---:|---:|---:|---:|---:|');
for(const [name,r]of Object.entries(arms))lines.push(`| ${name} | ${f(r.factors.grip)} | ${f(r.factors.drag)} | ${f(r.prediction2026.lapSec)} | ${r.rounds[0].scores.length} | ${f(r.rounds[0].lastDecreasePct)} |`);
lines.push('','| Pass check | Result |','|---|---|',...Object.entries(checks).map(([k,v])=>`| ${k} | ${v} |`),'','| Arm / fit | Scores by round | Converged | Cap hit |','|---|---|---|---|');
for(const [name,r]of Object.entries(arms))for(const c of r.rounds)lines.push(`| ${name} / ${c.name} | ${c.scores.map(f).join(', ')} | ${c.converged} | ${c.capHit} |`);
lines.push('',status.complete?'Both paired fits finished. Acceptance still requires every declared check.':'The time box or fit cap ended this experiment. Partial results are not accepted.','',...result.notes);
writeFileSync(join(out,'report.md'),lines.join('\n')+'\n');console.log(JSON.stringify({checks,pass:result.pass,integrity:result.integrity}));
