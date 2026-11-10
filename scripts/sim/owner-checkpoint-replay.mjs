// Reconstruct completed fits for the original calibration exporter; never optimize.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export function replayCompleted(rawFit,directory){
  let number=0;
  return async(groups,options)=>{
    const state=JSON.parse(await readFile(join(directory,`fit-${++number}.json`)));
    assert.ok(state.complete||state.converged,'Cannot export an unfinished fold');
    assert.deepEqual(state.groups,groups.map(g=>({key:g.key,laps:g.laps.length})));
    if(state.inputHash){const {log,convergenceDir,workers,...settings}=options;
      const actual=createHash('sha256').update(JSON.stringify({groups,settings})).digest('hex');
      assert.equal(actual,state.inputHash,'HARD STOP: exporter and fitter training rows/settings differ');}
    const result=await rawFit(groups,{...options,convergence:false,rounds:0,log:undefined,
      startX:state.xs,startFactors:state.factors,startAdj:state.adj});
    result.score=state.scores.at(-1);console.log(`replayed completed fit ${number}, ${state.scores.length} rounds`);return result;
  };
}
