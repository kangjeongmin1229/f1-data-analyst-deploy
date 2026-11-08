import test from 'node:test';
import assert from 'node:assert/strict';
import {extractStints} from '../scripts/sim/stint-extraction.mjs';
const lap = (n, pit = false, flag = 'GF') => ({lap:n,pit,flag});
test('exclude start and unclosed finishing segments; retain complete green pit-to-pit segment',()=>{
  assert.deepEqual(extractStints([lap(1),lap(2,true),lap(3),lap(4),lap(5,true),lap(6)]),{stints:[3],allStints:[2,3],heldStints:[]});
});
test('a pit-crossing lap under safety car does not become green because it ends a stint',()=>{
  const r=extractStints([lap(1,true),lap(2),lap(3,true,'SC')]);
  assert.deepEqual(r.stints,[]);assert.equal(r.heldStints[0].reason,'non-green-or-unknown-flag');
});
test('missing and duplicate laps are held rather than treated as short valid stints',()=>{
  for(const rows of [[lap(1,true),lap(3),lap(4,true)],[lap(1,true),lap(2),lap(2),lap(3,true)]]){
    const r=extractStints(rows);assert.deepEqual(r.stints,[]);assert.equal(r.heldStints[0].reason,'missing-or-duplicate-lap');
  }
});
