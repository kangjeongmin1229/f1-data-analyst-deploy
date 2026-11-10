// Owner-requested draft only. Replay the verified R export; never refit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {splitWecSessions} from './wec-session-scope.mjs';
const target=path.resolve(process.argv[2]);
const source=path.resolve('scripts/sim/results/owner-followup-2026-11-11/wec-results/wec-control/wec-control');
const load=p=>import(pathToFileURL(p));
const {lapsimCalibration:cal}=await load(path.join(target,'worker/lapsim/calibration-data.js'));
const frozen=structuredClone(cal),{lapsimCalibration:next}=await load(path.join(source,'calibration-data.js'));
assert.deepEqual(frozen.seasons,next.seasons);assert.deepEqual(frozen.projections,next.projections);
const {lapsimTracks:tracks}=await load(path.join(target,'worker/lapsim/tracks-data.js'));
const {lapsimWecPoles:poles}=await load(path.join(target,'worker/lapsim/wec-poles-data.js'));
const {simulate}=await load(path.join(target,'worker/lapsim/tool.js'));
const {SERIES}=await load(path.join(target,'worker/lapsim/series.js'));
const sessions=JSON.parse(fs.readFileSync('.cache/owner-diagnostics/.cache/lapsim/wec.json'));
const scope=splitWecSessions(sessions),groups=[],forecasts=[],reproduction=[],f1=[];
const events=fs.readFileSync(path.join(source,'objective.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
function choose(arm,cls,y){cal.series.wec=structuredClone(arm.series.wec);cal.series.wec[cls]={[y]:structuredClone(arm.series.wec[cls][y])};}
for(const [cls,ys] of Object.entries(next.series.wec))for(const y of Object.keys(ys)){
 const a=frozen.series.wec[cls][y],b=ys[y],bounds=SERIES.wec.classes[cls].bounds;
 const hits=car=>Object.entries(bounds).flatMap(([k,[lo,hi]])=>Math.abs(car[k]-lo)<1e-8?[k+' lower']:Math.abs(car[k]-hi)<1e-8?[k+' upper']:[]);
 const choice=s=>({gripSource:s.gripSource?.used,pooled:s.pooled?.used??false,bop:s.bop?.used??false});
 const dry=scope.dry.filter(w=>w.cls===cls&&String(w.year)===y);
 const results={};for(const [label,arm]of Object.entries({frozen,next})){
  choose(arm,cls,y);results[label]=dry.map(w=>{const real=poles[w.track][y][cls].lap,r=simulate({track:w.track,car:'wec-'+cls});assert.equal(r.car.year,+y);return{track:w.track,real,sim:r.result.lap_seconds,error:r.result.lap_seconds-real};});
  assert.ok(results[label].every(r=>r.error===0),'Dry reproduction failure in isolated draft');
 }
 reproduction.push({group:cls+'/'+y,n:dry.length,maxAbsErrorFrozen:Math.max(...results.frozen.map(r=>Math.abs(r.error))),maxAbsErrorNew:Math.max(...results.next.map(r=>Math.abs(r.error)))});
 const g=events.find(e=>e.event==='group'&&e.group==='wec-'+cls+'/'+y);assert.ok(g);
 groups.push({group:cls+'/'+y,frozen:a.car,next:b.car,frozenChoice:choice(a),nextChoice:choice(b),frozenBounds:hits(a.car),nextBounds:hits(b.car),heldout:g.heldout,interlagos:{real:poles.interlagos[y][cls].lap,publicFrozen:results.frozen.find(r=>r.track==='interlagos').sim,publicNew:results.next.find(r=>r.track==='interlagos').sim,rawFrozen:a.tracks.interlagos.simLap,rawNew:b.tracks.interlagos.simLap,newHeldout:poles.interlagos[y][cls].lap+g.heldout.errors.find(e=>e.name==='interlagos').dt}});
 for(const track of Object.keys(tracks).sort()){
  if(poles[track]?.[y]?.[cls])continue; // Wet raced events are not called unraced.
  choose(frozen,cls,y);const a=simulate({track,car:'wec-'+cls});choose(next,cls,y);const b=simulate({track,car:'wec-'+cls});
  assert.deepEqual(a.conditions,b.conditions);
  forecasts.push({group:cls+'/'+y,track,frozenSec:a.result.lap_seconds,newSec:b.result.lap_seconds,deltaSec:b.result.lap_seconds-a.result.lap_seconds,conditions:a.conditions});
 }
}
for(const arm of [frozen,next]){cal.series.wec=structuredClone(arm.series.wec);const rows=[];for(const y of [2025,2026])for(const [track,t]of Object.entries(cal.seasons[y].tracks)){if(t.weather?.rain)continue;const r=simulate({track,car:String(y)});rows.push({year:y,track,lap:r.result.lap_seconds});}f1.push(rows);}
assert.deepEqual(f1[0],f1[1]);
cal.series.wec=structuredClone(next.series.wec);assert.deepEqual(cal.seasons,frozen.seasons);assert.deepEqual(cal.projections,frozen.projections);
const text='// Generated from the verified WEC R-control export; draft for owner review.\nexport const lapsimCalibration='+JSON.stringify(cal)+';\n';
fs.writeFileSync(path.join(target,'worker/lapsim/calibration-data.js'),text);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out={sourceRun:42913368752,sourceCommit:'c4a2b9f4ba107b5e2b1655de1a370e37092fb033',sourceCalibrationSha256:hash(path.join(source,'calibration-data.js')),geometrySha256:hash(path.join(target,'worker/lapsim/tracks-data.js')),transferSha256:hash(path.join(target,'worker/lapsim/transfer-grip-data.js')),groups,forecasts,reproduction,f1Unchanged:true,excluded:scope.excluded.map(({row,...x})=>({track:row.track,cls:row.cls,year:row.year,...x}))};
fs.mkdirSync('scripts/sim/results/owner-diagnostics-2026-11-11',{recursive:true});fs.writeFileSync('scripts/sim/results/owner-diagnostics-2026-11-11/wec-r-draft.json',JSON.stringify(out,null,2)+'\n');
let doc='# Draft model: WEC consistent baseline at R\n\nOwner-requested consistency and convergence correction. No measured gain against frozen production is claimed: the original production held-out states were not retained, so a like-for-like held-out comparison does not exist. The new R held-out RMS is 1.166709%, n=33, not a paired improvement. No merge or production adoption.\n\nSource: fork run [42913368752](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42913368752), commit `'+out.sourceCommit+'`. Export SHA256 `'+out.sourceCalibrationSha256+'`. Geometry SHA256 `'+out.geometrySha256+'`. Existing B transfer SHA256 `'+out.transferSha256+'`. R=1e-4, cap=2000; all source fits stopped by tolerance, no cap hits. F1 seasons/projections, B, geometry, bounds, weights and gates are unchanged. This updates class-level LMGT3 calibration from the completed control; the separate per-model LMGT3 experiment stays parked.\n';
const fmt=v=>typeof v==='number'?v.toFixed(6):JSON.stringify(v);
for(const g of groups){doc+='\n## '+g.group+'\n\n| Value or choice | Frozen | R control |\n|---|---:|---:|\n';for(const k of Object.keys(g.next))doc+=`| ${k} | ${fmt(g.frozen[k])} | ${fmt(g.next[k])} |\n`;for(const k of Object.keys(g.nextChoice))doc+=`| ${k} | ${fmt(g.frozenChoice[k])} | ${fmt(g.nextChoice[k])} |\n`;doc+=`| Bound hits | ${g.frozenBounds.join(', ')||'none'} | ${g.nextBounds.join(', ')||'none'} |\n`;const r=reproduction.find(r=>r.group===g.group);doc+=`| Dry reproduction count | ${r.n} | ${r.n} |\n| Largest error, s | ${r.maxAbsErrorFrozen} | ${r.maxAbsErrorNew} |\n`;
 doc+='\nUnraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.\n\n| Unraced track | Frozen s | R control s | Change s |\n|---|---:|---:|---:|\n';for(const r of forecasts.filter(r=>r.group===g.group))doc+=`| ${r.track} | ${r.frozenSec.toFixed(3)} | ${r.newSec.toFixed(3)} | ${r.deltaSec.toFixed(3)} |\n`;
}
doc+='\n## Six Interlagos rows\n\nPublic raced outputs include the existing correction and reproduce the real lap. Raw main-fit laps are in-sample; the R held-out prediction is separate. Frozen held-out predictions are unavailable.\n\n| Class-season | Real s | Public frozen s | Public new s | Raw frozen fit s | Raw R fit s | R held-out s |\n|---|---:|---:|---:|---:|---:|---:|\n';for(const g of groups)doc+='| '+g.group+' | '+Object.values(g.interlagos).map(x=>x.toFixed(6)).join(' | ')+' |\n';
doc+='\nValidation: dry WEC rows reproduce exactly at public output precision; F1 public results are byte-identical between the two in-memory arms. Full test command/results are recorded in the PR. Missing: a frozen-production held-out comparison, independent future-race validation, and proof of better physical parameters. No Vercel access or merge.\n';
fs.writeFileSync(path.join(target,'docs/lapsim-wec-consistent-r-draft-2026-11-11.md'),doc);console.log(JSON.stringify({groups:groups.length,forecasts:forecasts.length,dryRows:reproduction.reduce((n,r)=>n+r.n,0),f1Rows:f1[0].length,f1Unchanged:true}));
