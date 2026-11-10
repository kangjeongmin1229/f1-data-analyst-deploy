import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fitJointBCD, bcdConverged} from '../scripts/sim/joint-bcd.mjs';
import {checkpointFitter} from '../scripts/sim/bcd-checkpoint-resume.mjs';
import {TUM_2019} from '../worker/lapsim/cars.js';
import {simulateLap} from '../worker/lapsim/engine.js';

test('interrupted round checkpoints reproduce the uninterrupted optimizer exactly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lapsim-resume-'));
  try {
    const track = {ds: 10, kappa: Float64Array.from({length: 40}, (_, i) => i % 20 > 12 ? 1 / 60 : 0)};
    const base = structuredClone(TUM_2019), lap = simulateLap(track, base).lapTime;
    const groups = [{key: 2025, base, params: [], laps: [0, 1].map(i => ({name: 'test', track,
      lapSeconds: lap * (1 + i / 100), team: `team-${i}`, tau: i}))}];
    const options = {convergence: true, iters: 2, workers: 1, teams: true, trackDrag: true};
    const expected = await fitJointBCD(groups, options);
    let calls = 0;
    const interrupted = checkpointFitter(async (...args) => {
      if (++calls === 3) throw Error('test interruption');
      return fitJointBCD(...args);
    }, bcdConverged, dir);
    await assert.rejects(interrupted(groups, options), /test interruption/);
    assert.equal(JSON.parse(await readFile(join(dir, 'fit-1.json'))).scores.length, 2);
    const resumed = await checkpointFitter(fitJointBCD, bcdConverged, dir)(groups, options);
    assert.deepEqual(resumed, expected);
    const reused = await checkpointFitter(fitJointBCD, bcdConverged, dir)(groups, options);
    assert.deepEqual(reused, expected);
    const changed = structuredClone(groups); changed[0].laps[0].lapSeconds += 0.01;
    await assert.rejects(checkpointFitter(fitJointBCD, bcdConverged, dir)(changed, options), /input hash mismatch/);
    const file = join(dir, 'fit-1.json'), state = JSON.parse(await readFile(file));
    delete state.inputHash; await writeFile(file, JSON.stringify(state));
    await assert.rejects(checkpointFitter(fitJointBCD, bcdConverged, dir)(groups, options), /unverified legacy/);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
