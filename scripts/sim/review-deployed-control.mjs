// Replay saved held-out states only. No optimizer, selection, or production mutation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {lapsimTracks as repository} from '../../worker/lapsim/tracks-data.js';
import {lapsimCalibration as production} from '../../worker/lapsim/calibration-data.js';
import {SERIES} from '../../worker/lapsim/series.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {withGrip} from './calibrate-lib.mjs';
const dir=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const load=async p=>import(pathToFileURL(p));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);
const arms={};
for(const arm of ['control','candidate']){
 const root=path.join(dir,arm),cal=(await load(path.join(dir,arm+'.js'))).lapsimCalibration;
 const geom=(await load(path.join(root,'worker/lapsim/tracks-data.js'))).lapsimTracks;
 const transfer=(await load(path.join(root,'worker/lapsim/transfer-grip-data.js'))).lapsimTransferGrip;
 const wec=JSON.parse(fs.readFileSync(path.join(root,'.cache/lapsim/wec.json')));
 const events=fs.readFileSync(path.join(dir,arm+'-objective.jsonl'),'utf8').trim().split('\n').map(JSON.parse),rows=[];
 const differentGeometry=Object.keys(repository).filter(k=>JSON.stringify(repository[k])!==JSON.stringify(geom[k]));
 const productionDifferences=[];
 assert.deepEqual(cal.seasons,production.seasons);assert.deepEqual(cal.projections,production.projections);
 for(const g of events.filter(e=>e.event==='group')){
  const [kind,y]=g.group.split('/'),cls=kind.slice(4),s=cal.series.wec[cls][y],p=production.series.wec[cls][y];
  if(JSON.stringify(s.car)!==JSON.stringify(p.car)||JSON.stringify([s.gripSource.used,s.pooled?.used,s.bop?.used])!==JSON.stringify([p.gripSource.used,p.pooled?.used,p.bop?.used]))productionDifferences.push(g.group);
  const choice=s.bop?.used?'bop':s.pooled?.used?'pooled':s.gripSource.used;
  assert.notEqual(choice,'bop','Explicit per-event patch replay required');
  for(const e of g.heldout.errors){
   const end=events.find(x=>x.event==='end'&&x.group===g.group&&x.candidate===choice&&x.heldOut?.includes(e.name));assert.ok(end);
   const base=structuredClone(SERIES.wec.classes[cls].prior),car=structuredClone(base);
   Object.entries(SERIES.wec.classes[cls].bounds).forEach(([key,[lo,hi]],i)=>car[key]=Math.max(lo,Math.min(hi,base[key]*Math.exp(end.x[i]))));
   car.muX=base.muX*car.muY/base.muY;car.muXTrac=base.muXTrac*car.muY/base.muY;if(base.noLowDrag){car.clALow=car.clA;car.cdALow=car.cdA;}
   const w=wec.find(w=>w.cls===cls&&String(w.year)===y&&w.track===e.name);assert.ok(w);
   const grip=s.gripSource.used==='transfer'?transfer.grip[e.name]:Object.keys(cal.seasons).sort().reverse().map(y=>cal.seasons[y].tracks[e.name]?.grip).find(x=>x!=null);
   const real=w.laps[0].lap,env=conditionsFromWeather(w.weather||{});
   const fitted=simulateLap(withGrip(trackFromData(geom[e.name]),grip),car,env).lapTime;
   const deployed=simulateLap(withGrip(trackFromData(repository[e.name]),grip),car,env).lapTime;
   assert.ok(Math.abs((fitted-real)-e.dt)<1e-8,`${g.group}/${e.name} replay differs`);
   rows.push({group:g.group,track:e.name,realSec:real,asFittedSec:fitted,repositoryReplaySec:deployed,asFittedPct:e.pct,repositoryReplayPct:100*(deployed/real-1),choice,fold:end.fold,rounds:null,iterations:end.iteration});
  }
 }
 assert.equal(rows.length,33);arms[arm]={rows,n:rows.length,asFittedRmsPct:rms(rows.map(r=>r.asFittedPct)),repositoryReplayRmsPct:rms(rows.map(r=>r.repositoryReplayPct)),differentGeometry,productionDifferences,geometrySha256:hash(path.join(root,'worker/lapsim/tracks-data.js')),calibrationSha256:hash(path.join(dir,arm+'.js'))};
}
const result={definition:'Saved R held-out fold states replayed on repository geometry, with saved choices fixed. This is NOT the frozen deployed production calibration: its main cars and some choices differ.',sourceDir:dir,repositoryGeometrySha256:hash('worker/lapsim/tracks-data.js'),arms,pass:arms.candidate.repositoryReplayRmsPct<=arms.control.repositoryReplayRmsPct,optimizerRounds:0,productionChanged:false};
fs.writeFileSync(path.join(out,'deployed-control.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({control:arms.control.asFittedRmsPct,repositoryReplay:arms.control.repositoryReplayRmsPct,candidate:arms.candidate.repositoryReplayRmsPct,changedGeometry:arms.control.differentGeometry,productionDifferences:arms.control.productionDifferences,pass:result.pass}));
