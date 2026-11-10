import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {checkpointReplay} from '../scripts/sim/owner-checkpoint-replay.mjs';
test('export cannot optimize, accepts owner cap, and rejects changed rows or bytes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'lapsim-replay-')),groups=[{key:2025,laps:[{name:'x'}]}],options={convergence:true,rounds:4,iters:200};
 const hash=x=>createHash('sha256').update(x).digest('hex'),trusted={};
 const main={groups:[{key:2025,laps:1}],scores:[20,15,12,11,10,9.99],converged:true,xs:{},factors:{},adj:{}};
 const fold={...main,converged:false,scores:[20,18,16,14,12,10],inputHash:hash(JSON.stringify({groups,settings:options}))};
 for(const [i,s]of [[1,main],[2,fold]]){const bytes=JSON.stringify(s);await writeFile(join(dir,`fit-${i}.json`),bytes);trusted[`fit-${i}.json`]=hash(bytes);}
 try{
  let calls=0;const raw=async(g,o)=>{assert.equal(o.rounds,0);assert.equal(o.convergence,false);calls++;return {};};
  const run=checkpointReplay(raw,dir,trusted);await run(groups,options);await run(groups,options);assert.equal(calls,2);
  await assert.rejects(checkpointReplay(raw,dir,trusted)([{key:2025,laps:[]}],options),/Training rows/);
  await writeFile(join(dir,'fit-1.json'),'{}');await assert.rejects(checkpointReplay(raw,dir,trusted)(groups,options),/Untrusted/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
