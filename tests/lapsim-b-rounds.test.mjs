import test from 'node:test';
import assert from 'node:assert/strict';
import {fitJointBCD} from '../scripts/sim/joint-bcd.mjs';
import {bConverged} from '../scripts/sim/b-transfer-rounds.mjs';
import {TUM_2019} from '../worker/lapsim/cars.js';
import {simulateLap} from '../worker/lapsim/engine.js';

test('one-round warm starts preserve uninterrupted BCD with team adjustments', async () => {
  const track = {ds: 10, kappa: Float64Array.from({length: 120}, (_, i) => i % 60 > 40 ? 1 / 60 : 0)};
  const base = structuredClone(TUM_2019);
  const lap = simulateLap(track, base).lapTime;
  const groups = [{key: 2025, base, params: [{key: 'muY', path: 'muY', base: base.muY, min: 1, max: 3}],
    laps: [0, 1, 2].map(i => ({name: 'interlagos', track, lapSeconds: lap * (1 + i / 100), team: `team-${i}`, tau: i / 2}))}];
  const options = {rounds: 3, iters: 8, workers: 1, teams: true, trackDrag: false, wTime: 20, wSector: 2, wPrior: 8};
  const continuous = await fitJointBCD(groups, options);
  let resumed;
  for (let i = 0; i < 3; i++) resumed = await fitJointBCD(groups, {...options, rounds: 1,
    ...(resumed ? {startX: resumed.xs, startFactors: resumed.factors, startAdj: resumed.adj} : {})});
  assert.deepEqual(resumed, continuous);
});

test('B convergence waits for five rounds and requires a nonnegative decrease strictly below one percent', () => {
  assert.equal(bConverged([100, 99.9]), false);
  assert.equal(bConverged([110, 105, 102, 100, 99]), false);
  assert.equal(bConverged([110, 105, 102, 100, 99.01]), true);
  assert.equal(bConverged([110, 105, 102, 100, 100.01]), false);
  assert.equal(bConverged([110, 105, 102, 100, 100]), true);
});
