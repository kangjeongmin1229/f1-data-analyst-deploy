// Read-only reproduction audit. Historical WEC seasons are selected in memory only.
import {writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [folder='.',output='.cache/wec-reproduction.json']=process.argv.slice(2),root=resolve(folder);
const load=p=>import(pathToFileURL(join(root,p)).href);
const {lapsimCalibration:c}=await load('worker/lapsim/calibration-data.js');
const {lapsimWecPoles:P}=await load('worker/lapsim/wec-poles-data.js');
const {simulate}=await load('worker/lapsim/tool.js');
const before=JSON.stringify(c),rows=[];
for(const [cls,seasons] of Object.entries(c.series.wec)){
 try{for(const [year,season] of Object.entries(seasons)){
  c.series.wec[cls]={[year]:season};
  const errors=[];
  for(const [track,ys] of Object.entries(P)){
   const p=ys[year]?.[cls];if(!p)continue;
   const r=simulate({track,car:'wec-'+cls,conditions:'real'});
   assert.equal(r.car.year,Number(year));
   const errorSec=r.result.lap_seconds-p.lap;
   errors.push({track,realSec:p.lap,simSec:r.result.lap_seconds,errorSec});
  }
  assert.ok(errors.length>0);
  rows.push({group:'wec-'+cls+'/'+year,n:errors.length,maxAbsErrorSec:Math.max(...errors.map(e=>Math.abs(e.errorSec))),pass:errors.every(e=>Math.abs(e.errorSec)<0.0015),
   mode:Number(year)===Math.max(...Object.keys(seasons).map(Number))?'public latest-season selector':'historical season selected in memory; API does not expose a WEC year selector',errors});
 }}finally{c.series.wec[cls]=seasons}
}
assert.equal(JSON.stringify(c),before,'Audit must restore calibration in memory');
const report={pass:rows.every(r=>r.pass),toleranceSec:0.0015,productionFilesWritten:false,rows};
await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:report.pass,groups:rows.map(({errors,...r})=>r)},null,2));
assert.ok(report.pass,'STOP 5.3: raced-session reproduction failed');
