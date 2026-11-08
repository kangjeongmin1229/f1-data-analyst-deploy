import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

test('private stint refit preserves production data and reports missing geometry and raw holdout errors',async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url)),dir=fs.mkdtempSync(path.join(os.tmpdir(),'stint-fit-'));
  const production=path.join(root,'worker/lapsim/stint-data.js'),before=fs.readFileSync(production);
  try{
    const data=JSON.parse(fs.readFileSync(path.join(root,'scripts/sim/data/wec-stints.json')));
    data[2025]['fixture-no-geometry']={cars:{'007':{}}};
    const input=path.join(dir,'input.json'),output=path.join(dir,'result.mjs');fs.writeFileSync(input,JSON.stringify(data));
    const run=spawnSync(process.execPath,['scripts/sim/stint-fit.mjs'],{cwd:root,env:{...process.env,LAPSIM_STINT_INPUT:input,LAPSIM_STINT_OUT:output},encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const {lapsimStints:r}=await import(pathToFileURL(output));
    assert.ok(r.held.some(x=>x.id==='fixture-no-geometry'&&x.reason==='missing-track-geometry'&&x.cars===1));
    assert.equal(r.test.errors.length,r.test.rows);
    const rms=Math.sqrt(r.test.errors.reduce((s,x)=>s+x.errorPct*x.errorPct,0)/r.test.rows);
    assert.equal(r.test.unroundedRmsPct,rms);assert.equal(r.test.rmsPct,+rms.toFixed(2));
    assert.equal(r.k,+r.unroundedK.toFixed(4));assert.deepEqual(fs.readFileSync(production),before);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
