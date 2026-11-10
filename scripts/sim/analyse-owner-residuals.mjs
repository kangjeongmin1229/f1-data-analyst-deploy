// Replay saved baseline states only. No optimizer calls and no runtime writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {lapsimCalibration as frozen} from '../../worker/lapsim/calibration-data.js';
import {lapsimTransferGrip} from '../../worker/lapsim/transfer-grip-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {SERIES} from '../../worker/lapsim/series.js';
import {buildCar,prepGroups,poleMult,lapScore} from './joint-bcd.mjs';
import {withGrip,realExtremes} from './calibrate-lib.mjs';
import {checkTiming,timingMapping,sectorTimes} from './wec-timing.mjs';
import {modelBopLookup} from './wec-model-bop.mjs';
const json=p=>JSON.parse(fs.readFileSync(p)),base='scripts/sim/results/owner-followup-2026-11-11/',out='scripts/sim/results/owner-diagnostics-2026-11-11';fs.mkdirSync(out,{recursive:true});
for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];Object.assign(process.env,json('scripts/sim/owner-actions-plan.json').f1Settings,{LAPSIM_BCD_CONVERGENCE:'off'});
const {groups,traces}=await import('./diagnostic-groups.mjs');
const prepared=prepGroups(groups),h=json(base+'f1-results/final-f1-control/control/holdouts.json'),f1=[],wec=[];
fs.writeFileSync('.cache/owner-diagnostics/old-kernel.mjs',execFileSync('git',['show','9fb675e:worker/lapsim/kernel.js']));
const old=(await import('../../.cache/owner-diagnostics/old-kernel.mjs')).lapsimKernel();
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null,rms=a=>a.length?Math.sqrt(mean(a.map(x=>x*x))):null;
function brakePoint(s,v,k){let j=k,vmax=v[k];while(j>0&&v[j-1]>=v[j]-.05){j--;vmax=Math.max(vmax,v[j]);if(k-j>400)break;}let b=j;for(let i=j;i<=k;i++)if(v[i]>=vmax-3/3.6)b=i;return s[b];}
function traceParts(l,res,m,t){
 const obs=l.obs,L=l.track.ds*l.track.kappa.length,mins=realExtremes(obs,15/3.6).filter(e=>e.min),maxs=realExtremes(obs,15/3.6).filter(e=>!e.min),n=res.v.length,ds=l.track.ds,window=Math.round(50/ds);
 const corners=mins.map(e=>{let sim=Infinity,at=0;for(let j=-window;j<=window;j++){const i=((Math.round(e.s/ds)+j)%n+n)%n;if(res.v[i]<sim){sim=res.v[i];at=i;}}return{distanceM:e.s,realKph:e.v*3.6,simKph:sim*3.6,biasKph:(sim-e.v)*3.6,at,band:e.v*3.6<150?'slow':e.v*3.6<250?'medium':'fast'};});
 const straights=maxs.map(e=>{let sim=-Infinity;for(let j=-window;j<=window;j++){const i=((Math.round(e.s/ds)+j)%n+n)%n;sim=Math.max(sim,res.v[i]);}return{distanceM:e.s,realKph:e.v*3.6,simKph:sim*3.6,biasKph:(sim-e.v)*3.6};});
 const ss=res.v.map((_,i)=>i*ds),brakes=corners.map(c=>{const k=obs.s.findIndex(s=>s>=c.distanceM);if(k<1)return null;const real=brakePoint(obs.s,obs.v,k),sim=brakePoint(ss,res.v,c.at);return Math.abs(sim-real)<Math.min(200,L/2)?{cornerM:c.distanceM,realM:real,simM:sim,biasM:sim-real}:null;}).filter(Boolean);
 const sectors=l.sectors?.length===3&&l.sectors.every(Number.isFinite)&&res.sectors?.length===3?res.sectors.map((s,i)=>({sector:i+1,realSec:l.sectors[i],simSec:s*m,biasSec:s*m-l.sectors[i]})):[];
 return{corners,straights,brakes,sectors,lapMaxBiasKph:res.vMaxKph-Math.max(...t.v),cornerMeanKph:mean(corners.map(c=>c.realKph))};
}
function features(weather,track,extras={}){const env=conditionsFromWeather(weather||{});return{trackTempC:weather?.trackTempC??null,airDensityKgM3:Number.isFinite(weather?.pressureHpa)&&Number.isFinite(weather?.airTempC)?env.rho:null,altitudeM:null,windSpeedMs:weather?.windSpeed??null,trackLengthM:track.ds*track.kappa.length,...extras};}
for(const hold of h){const year=hold.year,target=prepared.find(g=>g.key===year),names=[...new Set(target.laps.map(l=>l.name))].sort();
 for(const e of hold.errors){const fold=names.indexOf(e.name)%4,number=2+(year===2026?4:0)+fold,s=json(base+`f1-results/final-f1-control/control/checkpoints/fit-${number}.json`),l=target.laps.find(l=>l.name===e.name&&l.weight>=1);assert.ok(l);const c=buildCar(target,s.xs[year]).car,f=s.factors[e.name],m=poleMult(s.adj?.[year],l.tau),res=lapScore(l,c,f,{wTime:0,wSector:0}).res,dt=res.lapTime*m-l.lapSeconds;assert.ok(Math.abs(dt-e.dt)<1e-8,'F1 replay mismatch '+year+'/'+e.name);
  const t=traces.find(t=>t.year===year&&t.track===e.name&&t.session_key===l.meta.sessionKey&&t.position===l.meta.position),parts=traceParts(l,res,m,t),sourceYears=groups.filter(g=>g.key!==year&&g.laps.some(l=>l.name===e.name)).map(g=>g.key),cdrag={...c,cdA:c.cdA*f.drag,cdALow:c.cdALow*f.drag};
  const oldSec=old.simulateLap(withGrip(l.track,f.grip),cdrag,l.env).lapTime*m;
  const currentLegacySec=simulateLap(withGrip(l.track,f.grip),{...cdrag,ers:{...cdrag.ers,causalSoc:false}},l.env).lapTime*m;
  assert.ok(Math.abs(currentLegacySec-oldSec)<1e-9, "Legacy-kernel attribution differs");
  f1.push({series:'f1',year,track:e.name,group:'f1/'+year,fold,rounds:s.scores.length,realSec:l.lapSeconds,predictedSec:res.lapTime*m,residualSec:dt,residualPct:e.pct,features:features(l.weather,l.track,{fullThrottleShare:t.throttle?.length?t.throttle.filter(v=>v>=98).length/t.throttle.length:null,meanCornerSpeedKph:parts.cornerMeanKph,trackGrip:f.grip,trackDrag:f.drag,factorSourceLatestSeason:sourceYears.length?Math.max(...sourceYears):null}),factorSourceSeasons:sourceYears,parts,oldKernelSameState:{predictedSec:oldSec,residualPct:100*(oldSec/l.lapSeconds-1),currentMinusOldSec:res.lapTime*m-oldSec,currentLegacySec}});
 }
}
const dir=base+'wec-results/wec-control/wec-control/',{lapsimCalibration:cal}=await import('./results/owner-followup-2026-11-11/wec-results/wec-control/wec-control/calibration-data.js');
const events=fs.readFileSync(dir+'objective.jsonl','utf8').trim().split('\n').map(JSON.parse),sessions=json('.cache/owner-diagnostics/.cache/lapsim/wec.json'),mapping=json('scripts/sim/data/wec-timing-positions.json'),elig=json('scripts/sim/owner-wec-eligibility.json'),bop=modelBopLookup(json('scripts/sim/data/wec-model-identities.json'),json('scripts/sim/data/wec-bop-verified-2025.json'));
for(const g of events.filter(e=>e.event==='group')){const[k,y]=g.group.split('/'),cls=k.slice(4),season=cal.series.wec[cls][y],choice=season.bop?.used?'bop':season.pooled?.used?'pooled':season.gripSource.used;assert.notEqual(choice,'bop');
 for(const e of g.heldout.errors){const end=events.find(x=>x.event==='end'&&x.group===g.group&&x.candidate===choice&&x.heldOut?.includes(e.name));assert.ok(end);const def=SERIES.wec.classes[cls],basecar=structuredClone(def.prior),car=structuredClone(basecar);Object.entries(def.bounds).forEach(([key,[lo,hi]],i)=>car[key]=Math.max(lo,Math.min(hi,basecar[key]*Math.exp(end.x[i]))));car.muX=basecar.muX*car.muY/basecar.muY;car.muXTrac=basecar.muXTrac*car.muY/basecar.muY;car.clALow=car.clA;car.cdALow=car.cdA;
 const w=sessions.find(w=>w.cls===cls&&w.year===+y&&w.track===e.name),lap=w.laps[0],sourceYear=Object.keys(cal.seasons).sort().reverse().find(y=>cal.seasons[y].tracks[e.name]?.grip!=null),ownGrip=cal.seasons[sourceYear].tracks[e.name].grip,grip=season.gripSource.used==='transfer'?lapsimTransferGrip.grip[e.name]:ownGrip,tr=trackFromData(lapsimTracks[e.name]),res=simulateLap(withGrip(tr,grip),car,conditionsFromWeather(w.weather));assert.ok(Math.abs(res.lapTime-lap.lap-e.dt)<1e-8,'WEC replay mismatch '+g.group+'/'+e.name);
 const check=checkTiming(timingMapping(mapping,'wec',e.name,+y),tr,lap.lap,lap.sectors),sectors=check.sectorEnds?sectorTimes(res,{...tr,sectors:check.sectorEnds}).map((v,i)=>({sector:i+1,realSec:lap.sectors[i],simSec:v,biasSec:v-lap.sectors[i]})):[];let b=null;if(+y===2025&&cls!=='lmgt3')b=bop(+y,e.name,lap.car);
 wec.push({series:'wec',year:+y,cls,group:g.group,track:e.name,fold:end.fold,iterations:end.iteration,choice,gripSource:season.gripSource.used,factorSourceSeasons:season.gripSource.used==='transfer'?'B joint 2023–2026; per-track lineage not retained':[+sourceYear],realSec:lap.lap,predictedSec:res.lapTime,residualSec:e.dt,residualPct:e.pct,features:features(w.weather,tr,{fullThrottleShare:null,meanCornerSpeedKph:null,trackGrip:grip,f1OwnGrip:ownGrip,trackDrag:null,factorSourceLatestSeason:season.gripSource.used==='transfer'?null:+sourceYear,bopMassKg:b?.kg??null,bopPowerKW:b?.kW??null,bopAbove250Pct:b?.above250Pct??null,bopStintMJ:b?.stintMJ??null}),bop:b,parts:{sectors,sectorReason:check.sectorReason,lapMaxVsTrapBiasKph:Number.isFinite(lap.topSpeedKph)?res.vMaxKph-lap.topSpeedKph:null},eligibilityNote:'Diagnostics include all geometrically and arithmetically valid sector measurements, even where the pre-fit share check excluded an objective term. No fitting or eligibility changes.'});
 }
}
assert.equal(f1.length,34);assert.equal(wec.length,33);
const rows=[...f1,...wec];for(const series of ['f1','wec']){const selected=rows.filter(r=>r.series===series),s=selected.reduce((s,r)=>s+r.residualPct**2,0);for(const r of selected)r.squaredPctErrorShare=100*r.residualPct**2/s;}
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result={definition:'Signed residual = saved held-out prediction minus observed best qualifying lap. Baselines: final Block2 F1 control and WEC R control. All 67 lap predictions replay within 1e-8 seconds; zero optimizer rounds.',sourceHashes:{traces:sha('.cache/lapsim/traces.json'),geometry:sha('worker/lapsim/tracks-data.js'),f1Holdouts:sha(base+'f1-results/final-f1-control/control/holdouts.json'),wecObjective:sha(dir+'objective.jsonl')},rows,summary:['f1/2025','f1/2026',...new Set(wec.map(r=>r.group))].map(group=>{const a=rows.filter(r=>r.group===group);return{group,n:a.length,rmsPct:rms(a.map(r=>r.residualPct)),biasSec:mean(a.map(r=>r.residualSec))};}),kernelReplay:[2025,2026].map(year=>{const a=f1.filter(r=>r.year===year);return{year,n:a.length,currentRmsPct:rms(a.map(r=>r.residualPct)),oldKernelSameCurrentStatesRmsPct:rms(a.map(r=>r.oldKernelSameState.residualPct)),meanKernelDeltaSec:mean(a.map(r=>r.oldKernelSameState.currentMinusOldSec)),maxAbsKernelDeltaSec:Math.max(...a.map(r=>Math.abs(r.oldKernelSameState.currentMinusOldSec)))};}),limitations:['Altitude is not available as a verified track feature in these inputs; pressure is not substituted for surveyed altitude.','F1 slow/medium/fast bins use measured minima below150/150–250/at least250kmh; extrema and ±50m alignment are proxies.','Braking points are inferred from speed, limited to ±200m; no direct pedal-position landmark claim.','WEC lap maximum vs trap is not an end-of-straight position match.','WEC measured full-throttle share and corner minimum speeds are unavailable.','Fold factors use multiple other seasons; main-fit factors must not replace hidden-fold factors.','Old-kernel replay holds current fitted states fixed; it does not recreate missing production held-out fits.']};
fs.writeFileSync(out+'/baseline-residuals.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,summary:result.summary,kernelReplay:result.kernelReplay}));
