import test from 'node:test';
import assert from 'node:assert/strict';
import {batteryLedger} from '../scripts/sim/diagnostics/battery-ledger.mjs';
test('retains deficits instead of clamping them into a passing battery trace',()=>{
 const r=batteryLedger({soc:4,recharge:null,dep:[3,3],brk:[0,1],thr:[0,0]});
 assert.equal(r.endJ,-1);assert.equal(r.minJ,-2);assert.equal(r.maxUnderflowJ,2);assert.equal(r.balanceResidualJ,0);
});
test('separates recovery blocked by the lap limit from battery overflow',()=>{
 const r=batteryLedger({soc:4,recharge:5,dep:[0,3],brk:[4,4],thr:[0,0]});
 assert.equal(r.acceptedRecoveryJ,5);assert.equal(r.spilledJ,4);assert.equal(r.blockedJ,3);assert.equal(r.endJ,2);assert.equal(r.balanceResidualJ,0);
});
test('counts throttle recovery and preserves zero-capacity boundaries',()=>{
 const r=batteryLedger({soc:0,recharge:2,dep:[0],brk:[0],thr:[3]});
 assert.equal(r.endJ,0);assert.equal(r.spilledJ,2);assert.equal(r.blockedJ,1);
});
test('rejects malformed flows instead of treating missing or invalid energy as zero',()=>{
 for(const flow of [
  {soc:4,dep:[1],brk:[],thr:[0]},
  {soc:NaN,dep:[],brk:[],thr:[]},
  {soc:4,dep:[-1],brk:[0],thr:[0]},
  {soc:4,dep:[1],brk:[Infinity],thr:[0]},
  {soc:4,recharge:-1,dep:[],brk:[],thr:[]}
 ])assert.throws(()=>batteryLedger(flow));
});
