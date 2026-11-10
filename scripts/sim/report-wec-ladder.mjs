// Read-only ladder report. The criterion is diagnostic, never a replacement gate.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {heldOut} from './exp-compare.mjs';
import {boundHits} from './exp-physics.mjs';
const dir=resolve(process.argv[2]||'.cache/wec-ladder'), old=resolve('.cache/wec-sector-run');
const load=async f=>(await import(pathToFileURL(f).href)).lapsimCalibration;
const specs=[['70/25',join(old,'baseline.js'),435.5],['140/50',join(old,'baseline140.js'),1108.3],
  ...['280-100','280-200'].map(n=>[n.replace('-','/'),join(dir,n+'.js'),JSON.parse(readFileSync(join(dir,n+'-runtime.json'))).seconds])];
const rows=[], pooled=[], calibrations={};
const choices=s=>({pooled:s.pooled?.used??null,bop:s.bop?.used??null,gripSource:s.gripSource.used});
for(const [rung,file,seconds]of specs){
  const cal=await load(file);calibrations[rung]=cal;
  assert.deepEqual(cal.seasons,calibrations['70/25'].seasons);assert.deepEqual(cal.projections,calibrations['70/25'].projections);
  const held=heldOut(cal), all=[];
  for(const [cls,years]of Object.entries(cal.series.wec))for(const [year,s]of Object.entries(years)){
    const group=`wec-${cls}/${year}`, errors=Object.entries(held).filter(([k])=>k.startsWith(group+'|')).map(([,v])=>v);all.push(...errors);
    rows.push({rung,group,n:errors.length,rmsPct:Math.sqrt(errors.reduce((a,x)=>a+x*x,0)/errors.length),car:s.car,choices:choices(s),
      laps:s.laps,score:s.score,bounds:boundHits(group,s.car).hits,totalRungSeconds:seconds});
  }
  pooled.push({rung,n:all.length,rmsPct:Math.sqrt(all.reduce((a,x)=>a+x*x,0)/all.length),seconds});
}
const transitions=[];
for(let i=1;i<specs.length;i++){
  const from=specs[i-1][0],to=specs[i][0];
  const groups=rows.filter(r=>r.rung===to).map(b=>{const a=rows.find(r=>r.rung===from&&r.group===b.group);
    const deltaPP=b.rmsPct-a.rmsPct,choiceFlipped=JSON.stringify(a.choices)!==JSON.stringify(b.choices);
    return {group:b.group,deltaPP,choiceFlipped,from:a.choices,to:b.choices,pass:Math.abs(deltaPP)<0.02&&!choiceFlipped};});
  transitions.push({from,to,pass:groups.every(g=>g.pass),groups});
}
const sameMainChecks=rows.filter(r=>r.rung==='280/200').map(b=>{
  const a=rows.find(r=>r.rung==='280/100'&&r.group===b.group);
  const sameChoices=JSON.stringify(a.choices)===JSON.stringify(b.choices);
  if(sameChoices)assert.deepEqual(a.car,b.car,'STOP 5.3: same selected inputs and 280 main iterations produced different cars');
  return {group:b.group,sameChoices,carIdentical:JSON.stringify(a.car)===JSON.stringify(b.car)};
});
const objectives=[];
for(const name of ['280-100','280-200']){
  const events=readFileSync(join(dir,`${name}-objective.jsonl`),'utf8').trim().split('\n').map(JSON.parse).filter(e=>e.event==='iteration'||e.event==='end'), chains=new Map();
  for(const e of events){const key=JSON.stringify([e.group,e.candidate,e.fold??null,e.restart]);if(!chains.has(key))chains.set(key,[]);chains.get(key).push(e);}
  for(const chain of chains.values()){
    const last=chain.at(-1);assert.equal(last.event,'end','Incomplete objective log');
    const initial=chain[0],previous=chain.filter(e=>e.event==='iteration').at(-1);
    objectives.push({rung:name.replace('-','/'),group:last.group,candidate:last.candidate,fold:last.fold??null,heldOut:last.heldOut??[],restart:last.restart,
      initial:initial.objective,final:last.objective,iterations:last.iteration,lastStepDropPct:previous.objective===0?0:100*(previous.objective-last.objective)/Math.abs(previous.objective)});
  }
}
const objectiveChanges=objectives.filter(x=>x.rung==='280/200'&&['f1','transfer'].includes(x.candidate)).map(b=>{
  const a=objectives.find(x=>x.rung==='280/100'&&x.group===b.group&&x.candidate===b.candidate&&x.fold===b.fold&&x.restart===b.restart);
  assert.ok(a,'Missing paired fold objective');
  return {group:b.group,candidate:b.candidate,fold:b.fold,heldOut:b.heldOut,from:a.final,to:b.final,dropPct:a.final===0?0:100*(a.final-b.final)/Math.abs(a.final)};
});
const result={objectiveChanges,criterion:'Every group absolute change <0.02 pp and no pooled/bop/gripSource flips between adjacent rungs.',
  sameMainChecks,smallestPassingRung:transitions.find(x=>x.pass)?.to??null,rows,pooled,transitions,objectives,f1Unchanged:true,adopted:false,b2Rejudged:false,
  runtimeNote:'Seconds are total wall time per rung, repeated per group. Group wall times were not instrumented; reused 70/25 and 140/50 have no objective logs. Parallel-run times include CPU contention.',
  errorNote:'RMS is reconstructed from saved fold errorSec (rounded to 0.001 s), not the two-decimal saved RMS. This precision is sufficient for the 0.02 pp criterion.'};
writeFileSync(join(dir,'results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pooled,transitions,smallestPassingRung:result.smallestPassingRung},null,2));
