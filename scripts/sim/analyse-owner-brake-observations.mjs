// Saved-state analysis only. No optimizer calls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {prepGroups,buildCar,poleMult,lapScore} from './joint-bcd.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dir='scripts/sim/results/owner-diagnostics-2026-11-11',file=dir+'/baseline-residuals.json',d=read(file),base='scripts/sim/results/owner-followup-2026-11-11/f1-results/final-f1-control/control/';
assert.equal(sha('.cache/lapsim/traces.json'),d.sourceHashes.traces);assert.equal(sha('worker/lapsim/tracks-data.js'),d.sourceHashes.geometry);
for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];
Object.assign(process.env,read('scripts/sim/owner-actions-plan.json').f1Settings,{LAPSIM_BCD_CONVERGENCE:'off'});
const {groups,traces}=await import('./diagnostic-groups.mjs'),prepared=prepGroups(groups);
function brakePoint(v,k){let j=k,vmax=v[k];while(j>0&&v[j-1]>=v[j]-.05){j--;vmax=Math.max(vmax,v[j]);if(k-j>400)break;}let b=j;for(let i=j;i<=k;i++)if(v[i]>=vmax-3/3.6)b=i;return b;}
const wrap=(x,L)=>((x+L/2)%L+L)%L-L/2,summary=[];
for(const r of d.rows.filter(r=>r.series==='f1')){
 const target=prepared.find(g=>g.key===r.year),l=target.laps.find(l=>l.name===r.track&&l.weight>=1);assert.ok(l);
 const t=traces.find(t=>t.year===r.year&&t.track===r.track&&t.session_key===l.meta.sessionKey&&t.position===l.meta.position);assert.ok(t);
 const s=read(base+'checkpoints/fit-'+(2+(r.year===2026?4:0)+r.fold)+'.json'),res=lapScore(l,buildCar(target,s.xs[r.year]).car,s.factors[r.track],{wTime:0,wSector:0}).res;
 assert.ok(Math.abs(res.lapTime*poleMult(s.adj?.[r.year],l.tau)-r.predictedSec)<1e-8,'Saved prediction changed');
 assert.equal(t.brake.length,t.s.length);assert.equal(t.throttle.length,t.s.length);
 const L=l.track.ds*l.track.kappa.length,observed=[];
 for(let i=1;i<t.brake.length;i++)if(t.brake[i-1]!=null&&t.brake[i]!=null&&Number.isFinite(Number(t.brake[i-1]))&&Number.isFinite(Number(t.brake[i]))&&Number(t.brake[i-1])<=0&&Number(t.brake[i])>0)observed.push({sample:i,distanceM:t.s[i],speedKph:t.v[i],signal:t.brake[i]});
 const simulated=[];
 for(const c of r.parts.corners){const distanceM=brakePoint(res.v,c.at)*l.track.ds;if(!simulated.some(x=>Math.abs(wrap(x.distanceM-distanceM,L))<10))simulated.push({distanceM,cornerM:c.distanceM});}
 const pairs=[];
 for(let i=0;i<observed.length;i++)for(let j=0;j<simulated.length;j++){const biasM=wrap(simulated[j].distanceM-observed[i].distanceM,L);if(Math.abs(biasM)<=200)pairs.push({i,j,biasM});}
 pairs.sort((a,b)=>Math.abs(a.biasM)-Math.abs(b.biasM));const usedObs=new Set(),usedSim=new Set(),matched=[];
 for(const p of pairs){if(usedObs.has(p.i)||usedSim.has(p.j))continue;usedObs.add(p.i);usedSim.add(p.j);matched.push({realM:observed[p.i].distanceM,simM:simulated[p.j].distanceM,biasM:p.biasM,observedSample:observed[p.i].sample,observedSignal:observed[p.i].signal,cornerM:simulated[p.j].cornerM});}
 r.parts.brakesSpeedProxy=r.parts.brakes;r.parts.brakes=matched;
 const rawSampleShare=r.features.fullThrottleShare,validThrottle=t.throttle.filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
 r.features.fullThrottleShare=validThrottle.length?validThrottle.filter(v=>v>=98).length/validThrottle.length:null;
 let distance=0,full=0,rejectedIntervals=0;
 for(let i=1;i<t.s.length;i++){let step=t.s[i]-t.s[i-1];if(step<-L/2)step+=L;if(step<0||step>200||![t.throttle[i-1],t.throttle[i]].every(v=>Number.isFinite(v)&&v>=0&&v<=100)){rejectedIntervals++;continue;}distance+=step;full+=step*((t.throttle[i-1]>=98?1:0)+(t.throttle[i]>=98?1:0))/2;}
 r.features.fullThrottleDistanceShare=distance/L>=.8&&distance/L<=1.2?full/distance:null;
 r.parts.brakeObservationAudit={observedRisingEdges:observed.length,simulatedLandmarks:simulated.length,matched:matched.length,unmatchedObserved:observed.length-matched.length,unmatchedSimulated:simulated.length-matched.length,observed,simulated,signalValues:[...new Set(t.brake)].sort((a,b)=>a-b),matchingToleranceM:200};
 r.parts.throttleDistanceAudit={coveredDistanceM:distance,trackLengthM:L,coverageRatio:distance/L,rejectedIntervals,rawSampleShare,invalidThrottleSamples:t.throttle.length-validThrottle.length};
 summary.push({year:r.year,track:r.track,n:matched.length,observedEdges:observed.length,simulatedLandmarks:simulated.length,unmatchedObserved:observed.length-matched.length,meanBiasM:matched.length?matched.reduce((s,x)=>s+x.biasM,0)/matched.length:null,throttleCoverageRatio:distance/L,fullThrottleDistanceShare:r.features.fullThrottleDistanceShare});
}
assert.equal(summary.length,34);
d.brakeObservationMethod='Observed brake-active rising edges from the pinned OpenF1 brake channel, paired one-to-one with simulated speed-deceleration landmarks within 200m. Positive bias = simulated onset later. Matching remains approximate; unmatched edges are recorded. Brake indicator is not pressure. Original speed-only comparison retained in brakesSpeedProxy.';
d.throttleShareMethod='fullThrottleShare is the sample fraction at throttle>=98 among valid 0–100 readings. fullThrottleDistanceShare weights adjacent flags by projected travel distance, excluding invalid throttle readings and backwards/over-200m intervals and requiring 80–120% lap coverage. It is distance share, not time share; timestamps are absent from this normalized snapshot.';
d.limitations=d.limitations.map(s=>s.startsWith('Braking points are inferred')?d.brakeObservationMethod:s);
fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
execFileSync('python3',['scripts/sim/report-owner-residuals.py'],{stdio:'inherit'});
const docPath='docs/lapsim-owner-residual-analysis-2026-11-11.md';
let doc=fs.readFileSync(docPath,'utf8');
doc=doc.replaceAll('Braking onset comes from the speed trace; positive distance bias means simulated braking starts later. This is not a verified pedal landmark.','Observed braking onset uses saved brake-active rising edges. Simulated onset is inferred from the speed profile; positive bias means later simulated braking. Pairing is one-to-one within 200 m; unmatched events are recorded. This is not a measured brake-pressure comparison.');
doc=doc.replace('medium-speed corner minima are too slow while straight-end speeds and braking locations are too high/late, especially in 2026','medium-speed corner minima are too slow while straight-end speeds are too high, especially in 2026');
doc+='\n## Observed brake and throttle audit\n\n'+d.brakeObservationMethod+'\n\n'+d.throttleShareMethod+'\n\n| Season | Track | Observed brake edges | Simulated landmarks | Matched n | Unmatched observed | Mean signed bias m | Throttle distance coverage |\n|---:|---|---:|---:|---:|---:|---:|---:|\n';
for(const s of summary)doc+='| '+[s.year,s.track,s.observedEdges,s.simulatedLandmarks,s.n,s.unmatchedObserved,s.meanBiasM?.toFixed(6)??'unknown',s.throttleCoverageRatio.toFixed(6)].join(' | ')+' |\n';
doc+='\nReproduce this addendum with node scripts/sim/analyse-owner-brake-observations.mjs after restoring pinned aligned traces. This replays the same 34 saved F1 folds and changes no fit, model or gate.\n';
fs.writeFileSync(docPath,doc);
fs.writeFileSync(dir+'/brake-observation-audit.json',JSON.stringify({sourceHashes:d.sourceHashes,method:d.brakeObservationMethod,throttleMethod:d.throttleShareMethod,rows:summary},null,2)+'\n');
const hashes=Object.fromEntries(fs.readdirSync(dir).filter(n=>n!=='sha256.json'&&fs.statSync(dir+'/'+n).isFile()).sort().map(n=>[n,sha(dir+'/'+n)]));fs.writeFileSync(dir+'/sha256.json',JSON.stringify(hashes,null,2)+'\n');
const updated=read(file);console.log('BRAKE_SUMMARY='+JSON.stringify([2025,2026].map(year=>{const rows=updated.rows.filter(r=>r.series==='f1'&&r.year===year),a=rows.flatMap(r=>r.parts.brakes),b=rows.map(r=>r.parts.brakeObservationAudit);return{year,n:a.length,meanBiasM:a.reduce((s,x)=>s+x.biasM,0)/a.length,rmsM:Math.sqrt(a.reduce((s,x)=>s+x.biasM*x.biasM,0)/a.length),observedEdges:b.reduce((s,x)=>s+x.observedRisingEdges,0),unmatchedObserved:b.reduce((s,x)=>s+x.unmatchedObserved,0),fullThrottleCorrelations:updated.correlations.f1.filter(x=>x.feature.includes('Throttle'))};})));
