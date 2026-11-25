// Step 35 (docs/prereg/step35-fe-2026-11-25.md): car.brakeAxle hook. Unset or never binding = today's lap; binding = never faster.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lapsimKernel} from '../worker/lapsim/kernel.js';
import {lapsimFeTracks} from '../worker/lapsim/fe-tracks-data.js';
import {FE_GENS} from '../worker/lapsim/fe-cars.js';

const K = lapsimKernel(), car = FE_GENS['fe-gen3evo'].car;
for (const id of ['fe-london', 'fe-jeddah']) test(`brakeAxle hook on ${id}`, () => {
  const tr = K.trackFromData(lapsimFeTracks[id]), base = K.simulateLap(tr, car, {});
  assert.equal(K.simulateLap(tr, {...car, brakeAxle: {rearMaxW: 1e12, eta: 0.95}}, {}).lapTime, base.lapTime); // cap never binds
  const v1 = K.simulateLap(tr, {...car, brakeAxle: {rearMaxW: 350e3, eta: 0.95}}, {}).lapTime;
  assert.ok(v1 >= base.lapTime && v1 < base.lapTime * 1.01, `${v1} vs ${base.lapTime}`);
});
