// Export only: replay verified checkpoint states without optimizer rounds.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {f1FoldStop} from './f1-fold-rule.mjs';
export function checkpointReplay(rawFit, directory, trusted, onReplay=()=>{}) {
  let sequence=0,mainRounds;
  return async(groups,options)=>{
    const number=++sequence, name=`fit-${number}.json`,bytes=await readFile(join(directory,name)),state=JSON.parse(bytes);
    const hash=b=>createHash('sha256').update(b).digest('hex');
    assert.equal(hash(bytes),trusted[name],`Untrusted export checkpoint ${name}`);
    assert.deepEqual(state.groups,groups.map(g=>({key:g.key,laps:g.laps.length})),`Training rows changed: ${name}`);
    const {log,convergenceDir,workers,...settings}=options;
    if(state.inputHash)assert.equal(state.inputHash,hash(JSON.stringify({groups,settings})),`Training/options digest changed: ${name}`);
    if(number===1){assert.ok(state.converged);mainRounds=state.scores.length;}
    else assert.ok(state.converged||f1FoldStop(state.scores,mainRounds).complete,`Incomplete fold: ${name}`);
    const result=await rawFit(groups,{...options,convergence:false,rounds:0,log:undefined,startX:state.xs,startFactors:state.factors,startAdj:state.adj});
    result.score=state.scores.at(-1);onReplay({number,rounds:state.scores.length,converged:state.converged,stopReason:state.stopReason||'preserved-completed-fit'});return result;
  };
}
