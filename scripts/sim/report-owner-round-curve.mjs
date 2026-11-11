// Verify fork artifacts and replay saved states. No optimizer calls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildCar, prepGroups, lapScore, poleMult} from './joint-bcd.mjs';
const root=path.resolve(process.argv[2] || '.cache/owner-round-curve');
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source='86d56f5e80994758cadcb916d11c32dc37ee0c19';
for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];
Object.assign(process.env,read('scripts/sim/owner-actions-plan.json').f1Settings,{LAPSIM_BCD_CONVERGENCE:'off'});
const {groups}=await import('./diagnostic-groups.mjs');
const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-8,label+': '+a+' != '+b);
const inventory=gs=>gs.map(g=>({key:g.key,rows:g.laps.map(l=>({track:l.name,position:l.meta?.position,session:l.meta?.sessionKey}))}));
const predict=(l,g,state,factors=state.factors)=>lapScore(l,buildCar(g,state.xs[g.key]).car,factors[l.name],{wTime:0,wSector:0}).res.lapTime*poleMult(state.adj?.[g.key],l.tau);
const result={sourceCommit:source,runId:42923060955,complete:true,arms:[],perRoundHeldouts:[],factorOnlySensitivity:[],inputHashes:null,limitations:[
 'The production fold rule couples main rounds 3/4/5/6 to fold rounds 2/3/4/5. Main-fit factors are not used to predict hidden rows.',
 'The current causal-battery kernel is held fixed. This does not recreate the earlier production kernel or its missing fold states.',
 'Fixed round completion is not numerical convergence. No stopping rule or model is adopted.',
 'Factor-only replay fixes final fold cars/team adjustments and changes factors; it is a sensitivity check, not a separately fitted candidate.'
]};
for(const rounds of [3,4,5,6]){
 const dir=path.join(root,'f1-rounds-'+rounds),provenance=read(path.join(dir,'provenance.json'));
 assert.equal(provenance.sourceCommit,source);assert.equal(provenance.rounds,rounds);assert.equal(provenance.foldRounds,rounds-1);
 if(result.inputHashes)assert.deepEqual(provenance.inputs,result.inputHashes);else result.inputHashes=provenance.inputs;
 for(const [p,h]of Object.entries(provenance.inputs))if(p!=='scripts/sim/joint-bcd.mjs')assert.equal(hash(p),h,'Replay input mismatch: '+p);
 const summary=read(path.join(dir,'summary.json')),main=read(path.join(dir,'main.json')),excluded=read(path.join(dir,'exclusions.json')),heldouts=read(path.join(dir,'heldouts.json'));
 assert.equal(summary.complete,true);assert.equal(summary.rounds,rounds);assert.equal(summary.foldRounds,rounds-1);assert.equal(heldouts.length,2);
 const filtered=groups.map(g=>({...g,laps:g.laps.filter(l=>!excluded.some(e=>e.group===g.key&&e.name===l.name))}));
 const prepared=prepGroups(filtered),mainFit=excluded.length?2:1,mainState=read(path.join(dir,'fit-'+mainFit+'-round-'+rounds+'.json'));
 assert.deepEqual(mainState.xs,main.xs);assert.deepEqual(mainState.factors,main.factors);assert.deepEqual(mainState.groups,inventory(filtered));
 const fits=[];
 for(let fit=1;fit<=mainFit+8;fit++){
  const count=fit<=mainFit?rounds:rounds-1,states=[];
  for(let r=1;r<=count;r++){const s=read(path.join(dir,'fit-'+fit+'-round-'+r+'.json'));assert.equal(s.fit,fit);assert.equal(s.round,r);assert.ok(Number.isFinite(s.score));states.push(s);}
  const scores=states.map(s=>s.score),decrease=100*(scores.at(-2)-scores.at(-1))/scores.at(-2);
  fits.push({fit,rounds:count,stopReason:'declared fixed-round count',lastDecreasePct:decrease,belowOnePct:decrease>=0&&decrease<1,scores});
 }
 const rows=[];
 for(const [yi,year]of [2025,2026].entries()){
  const target=prepared.find(g=>g.key===year),names=[...new Set(target.laps.map(l=>l.name))].sort(),held=heldouts.find(h=>h.year===year),replayed=[];
  assert.equal(held.n,held.errors.length);
  for(let fold=0;fold<4;fold++){
   const fit=mainFit+1+yi*4+fold,state=read(path.join(dir,'fit-'+fit+'-round-'+(rounds-1)+'.json')),test=new Set(names.filter((_,i)=>i%4===fold));
   const train=filtered.map(g=>g.key===year?{...g,laps:g.laps.filter(l=>!test.has(l.name))}:g);assert.deepEqual(state.groups,inventory(train));
   const laps=target.laps.filter(l=>test.has(l.name)&&(l.weight??1)>=1&&state.factors[l.name]&&train.some(g=>g.laps.some(x=>x.name===l.name)));
   for(const l of laps){const seconds=predict(l,target,state),e=held.errors.find(e=>e.name===l.name);assert.ok(e);close(seconds-l.lapSeconds,e.dt,'saved holdout '+year+'/'+l.name);replayed.push({year,track:l.name,fold,rounds:rounds-1,realSeconds:l.lapSeconds,predictedSeconds:seconds,residualPct:100*(seconds/l.lapSeconds-1)});}
   if(rounds===6)for(let r=1;r<=5;r++){
    const early=read(path.join(dir,'fit-'+fit+'-round-'+r+'.json'));
    for(const l of laps){result.perRoundHeldouts.push({year,round:r,track:l.name,fold,residualPct:100*(predict(l,target,early)/l.lapSeconds-1)});result.factorOnlySensitivity.push({year,factorRound:r,track:l.name,fold,carAndTeamRound:5,residualPct:100*(predict(l,target,state,early.factors)/l.lapSeconds-1)});}
   }
  }
  const stats=summary.groups.find(g=>g.year===year),mainRows=main.perLap.filter(p=>p.group===year&&p.meta.position===1);
  assert.equal(replayed.length,stats.n);close(rms(replayed.map(r=>r.residualPct)),stats.heldoutRmsPct,'heldout RMS');assert.equal(mainRows.length,stats.inSampleN);close(rms(mainRows.map(p=>100*p.dt/p.realLap)),stats.inSampleRmsPct,'in-sample RMS');
  rows.push({...stats,mainRounds:rounds,foldRounds:rounds-1,predictions:replayed});
 }
 const files=Object.fromEntries(fs.readdirSync(dir).filter(f=>fs.statSync(path.join(dir,f)).isFile()).sort().map(f=>[f,hash(path.join(dir,f))]));
 result.arms.push({rounds,foldRounds:rounds-1,summary:rows,excluded,fits,files,mainInSample:prepared.map(g=>{const a=main.perLap.filter(p=>p.group===g.key&&p.meta.position===1);return{year:g.key,n:a.length,rmsPct:rms(a.map(p=>100*p.dt/p.realLap))};})});
}
for(const key of ['perRoundHeldouts','factorOnlySensitivity']){
 const roundKey=key==='perRoundHeldouts'?'round':'factorRound';result[key+'Summary']=[];
 for(const year of [2025,2026])for(let round=1;round<=5;round++){const a=result[key].filter(r=>r.year===year&&r[roundKey]===round);result[key+'Summary'].push({year,round,n:a.length,rmsPct:rms(a.map(r=>r.residualPct))});}
}
fs.writeFileSync('scripts/sim/results/owner-diagnostics-2026-11-11/round-curve.json',JSON.stringify(result,null,2)+'\n');
console.log('FINAL_CURVE_JSON='+JSON.stringify({arms:result.arms.map(a=>({rounds:a.rounds,summary:a.summary.map(({predictions,...s})=>s),excluded:a.excluded,fits:a.fits})),perRound:result.perRoundHeldoutsSummary,factorOnly:result.factorOnlySensitivitySummary}));
