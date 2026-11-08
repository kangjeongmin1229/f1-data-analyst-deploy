import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTiQualifyingLap} from '../scripts/sim/ti-fit-inputs.mjs';
const fixture = () => ({lap:[1,2,3],time:[90,89,88],del:[false,false,false],iacc:[true,true,true],pin:['None',null,'None'],pout:['None',null,'None'],status:['1','1','1'],compound:['SOFT','SOFT','SOFT'],wR:[false,false,false],wAT:[20,21,22],wTT:[30,31,32],wH:[50,51,52],wP:[1000,1001,1002],wWD:[0,10,20],wWS:[1,2,3],s1:[30,30,30],s2:[30,30,30],s3:[30,29,28]});
test('fastest eligible lap retains its own weather and sectors',()=>{
  const l=fixture();l.del[2]=true;const r=selectTiQualifyingLap(l);
  assert.equal(r.observation.lap,2);assert.equal(r.observation.weather.airTempC,21);
  assert.deepEqual(r.observation.sectors,[30,30,29]);assert.equal(r.eligibleLaps,2);
});
test('hold wet, neutralized, pit, generated, incomplete and inconsistent observations',()=>{
  for(const [key,value,reason] of [['wR',true,'wet-or-non-soft'],['status','12','non-green-or-unknown'],['pin',1,'pit-in-or-out'],['iacc',false,'deleted-inaccurate-or-generated'],['wP',null,'incomplete-weather-or-sector'],['wH',101,'invalid-weather'],['s3',1,'sector-sum-mismatch']]){
    const l=fixture();l[key][2]=value;const r=selectTiQualifyingLap(l);assert.equal(r.observation.lap,2);assert.equal(r.rejected[reason],1);
  }
  const l=fixture();l.ff1G=[false,false,true];assert.equal(selectTiQualifyingLap(l).observation.lap,2);
});
test('invalid schema fails closed and an entirely held session stays empty',()=>{
  const l=fixture();l.wP.pop();assert.throws(()=>selectTiQualifyingLap(l),/columns/);
  const d=fixture();d.lap[2]=2;assert.throws(()=>selectTiQualifyingLap(d),/duplicate/);
  const w=fixture();w.wR.fill(true);const r=selectTiQualifyingLap(w);assert.equal(r.index,null);assert.equal(r.observation,null);assert.equal(r.eligibleLaps,0);
});
