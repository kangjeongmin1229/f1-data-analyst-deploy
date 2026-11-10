// One isolated class-season experiment; source selection is fixed before fitting.
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {lapsimCalibration as production} from '../../worker/lapsim/calibration-data.js';
import {lapsimTransferGrip as transfer} from '../../worker/lapsim/transfer-grip-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {SERIES} from '../../worker/lapsim/series.js';
import {splitWecSessions} from './wec-session-scope.mjs';
import {modelBopLookup} from './wec-model-bop.mjs';
import {fitSeason,withGrip} from './calibrate-lib.mjs';
import {fitModelHierarchy,carForModel,MODEL_STOP,MODEL_SHRINK} from './wec-model-fit.mjs';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {gate} from './gate.mjs';
const [cls,yearText,outArg]=process.argv.slice(2),year=Number(yearText),out=resolve(outArg);
await mkdir(out,{recursive:true});
const tracks=Object.fromEntries(Object.entries(lapsimTracks).map(([k,v])=>[k,trackFromData(v)]));
const identities=JSON.parse(readFileSync('scripts/sim/data/wec-model-identities.json'));
const verified=JSON.parse(readFileSync('scripts/sim/data/wec-bop-verified-2025.json'));
const bopOf=modelBopLookup(identities,verified);
const identity=new Map(identities.rows.map(r=>[JSON.stringify([r.year,r.track,r.entry]),r.model]));
const scope=splitWecSessions(JSON.parse(readFileSync('.cache/lapsim/wec.json')));
const sessions=scope.dry.filter(w=>w.cls===cls&&w.year===year&&tracks[w.track]);
const source=production.series.wec[cls][year].gripSource.used;
const grip=id=>source==='transfer'?transfer.grip[id]:Object.keys(production.seasons).sort().reverse().map(y=>production.seasons[y].tracks[id]?.grip).find(Number.isFinite);
const traps=sessions.flatMap(w=>w.cars.map(c=>c.topSpeedKph)).filter(Number.isFinite).sort((a,b)=>a-b),medTrap=traps[Math.floor(traps.length/2)];
const rows=sessions.flatMap(w=>w.cars.map((c,i)=>{
 const model=identity.get(JSON.stringify([year,w.track,c.car]));if(!model)throw Error('Unverified model');
 const bop=cls==='lmgt3'?null:bopOf(year,w.track,c.car);
 if(year===2025&&cls!=='lmgt3'&&!bop)throw Error('Missing verified BoP');
 return {name:w.track,track:tracks[w.track],model,entry:c.car,lapSeconds:c.lap,weight:i===0?1:.5,grip:grip(w.track),weather:w.weather,trapKph:c.topSpeedKph>=.92*medTrap?c.topSpeedKph:null,bop,meta:{event:w.event,car:c.car,model,session:c.session},classBest:i===0};
}));
if(rows.some(l=>!Number.isFinite(l.grip)))throw Error('Missing frozen track factor');
const def=SERIES.wec.classes[cls],base={...structuredClone(def.prior),linkMu:true};
const params=Object.entries(def.bounds).map(([key,[min,max]])=>({key,path:key,base:base[key],step:.08,min,max}));
const result={group:`wec-${cls}/${year}`,settings:{stop:MODEL_STOP,shrink:MODEL_SHRINK,gripSource:source},nCars:rows.length,nTracks:sessions.length,folds:[],complete:false};
const save=()=>writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
function patchRows(train,test=[]){
 const known=train.filter(l=>l.bop),kg=known.reduce((s,l)=>s+l.bop.kg,0)/(known.length||1),kw=known.reduce((s,l)=>s+l.bop.kW,0)/(known.length||1);
 const patch=l=>l.bop?{...l,patch:car=>({...car,mass:car.mass+l.bop.kg-kg,pIce:car.pIce*l.bop.kW/kw})}:l;
 return {train:train.map(patch),test:test.map(patch),refKg:known.length?kg:null,refKW:known.length?kw:null};
}
function fitPair(train,label){
 const ends={};
 const trace=arm=>e=>{if(e.event==='end')ends[arm]=e;if(e.event==='end'||e.iteration%100===0)appendFileSync(join(out,'objectives.jsonl'),JSON.stringify({label,arm,...e})+'\n');};
 const control=fitSeason(train,base,params,{stop:MODEL_STOP,trace:trace('base')});
 if(ends.base.capHit)return {control,ends,pass:false};
 const model=fitModelHierarchy(train,base,params,{enabled:true,controlFit:control,stop:MODEL_STOP,trace:trace('models')});
 return {control,model,ends,pass:!ends.models.capHit};
}
const mainRows=patchRows(rows),main=fitPair(mainRows.train,'main');
result.main={...main,refKg:mainRows.refKg,refKW:mainRows.refKW};save();
if(!main.pass){result.parked='Main fit reached the iteration cap; held-out folds not run';save();process.exit(0);}
function evaluate(l,fit){const c=carForModel(fit,l.model),car=l.patch?l.patch(c):c;const sim=simulateLap(withGrip(l.track,l.grip),car,conditionsFromWeather(l.weather||{})).lapTime;return {track:l.name,model:l.model,entry:l.entry,realSec:l.lapSeconds,simSec:sim,pct:(sim/l.lapSeconds-1)*100,classBest:l.classBest};}
for(const kind of ['track','model']){
 const values=[...new Set(rows.map(l=>kind==='track'?l.name:l.model))].sort();
 for(const hidden of values){
  const select=l=>(kind==='track'?l.name:l.model)===hidden;
  const prepared=patchRows(rows.filter(l=>!select(l)),rows.filter(select));
  const pair=fitPair(prepared.train,`${kind}:${hidden}`);
  const fold={kind,hidden,trainRows:prepared.train.length,trainModels:[...new Set(prepared.train.map(l=>l.model))],convergence:pair.ends,pass:pair.pass,errors:[]};
  if(pair.pass){
   const seen=new Set();
   for(const l of prepared.test){const key=JSON.stringify([l.name,l.model]);if(seen.has(key))continue;seen.add(key);fold.errors.push({base:evaluate(l,pair.control),models:evaluate(l,pair.model)});}
  }
  result.folds.push(fold);save();
  if(!pair.pass){result.parked=`${kind} fold reached cap: ${hidden}`;save();process.exit(0);}
 }
}
result.complete=true;save();console.log(JSON.stringify({group:result.group,complete:true,folds:result.folds.length}));
