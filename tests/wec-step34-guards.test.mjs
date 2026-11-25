import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openFinal} from '../scripts/sim/wec-final-holdout.mjs';
import {lapsimKernel} from '../worker/lapsim/kernel.js';
import {lapsimTracks} from '../worker/lapsim/tracks-data.js';
import {lapsimCalibration as C} from '../worker/lapsim/calibration-data.js';

test('WEC final hold-out: refuses without approval, opens once, refuses a second opening', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'wfh-')), 'lock.json'), set = [{event: 'x'}];
  writeFileSync(f, JSON.stringify({set, set_sha256: createHash('sha256').update(JSON.stringify(set)).digest('hex'), approved_run: '', opened: null}));
  assert.throws(() => openFinal('1', f), /no central approval/);
  writeFileSync(f, JSON.stringify({...JSON.parse(readFileSync(f, 'utf8')), approved_run: '1'}));
  assert.deepEqual(openFinal('1', f, 'd'), set);
  assert.throws(() => openFinal('1', f), /already opened/);
});

test('the shipped lock is closed', () => assert.equal(JSON.parse(readFileSync('scripts/sim/data/wec-final-holdout.json', 'utf8')).opened, null));

// G-E (A1 §5): Hypercar hybrid per lap — LMH front axle only above 190 km/h, power ≤ rule, energy ledger closes within 0.1 %
test('Hypercar hybrid: deploy speed, power and energy close on every calibrated WEC track', () => {
  const K = lapsimKernel();
  for (const cls of ['lmh', 'lmdh']) for (const [y, s] of Object.entries(C.series.wec[cls])) for (const [id, t] of Object.entries(s.tracks)) {
    const tr = K.trackFromData(lapsimTracks[id]), r = K.simulateLap({...tr, mu: Float64Array.from(tr.mu, m => m * t.grip)}, s.car, K.conditionsFromWeather({}));
    const dep = r.flow.dep, n = r.v.length; let sum = 0;
    for (let i = 0; i < n; i++) { sum += dep[i]; if (!(dep[i] > 0)) continue;
      if (cls === 'lmh') assert.ok(r.v[i] * 3.6 > 190 - 1e-6, `${cls} ${y} ${id}: deploy at ${(r.v[i] * 3.6).toFixed(1)} km/h`);
      const dt = r.time[(i + 1) % n] - r.time[i]; if (dt > 0) assert.ok(dep[i] / dt <= s.car.ers.eMax * 1.001, `${cls} ${y} ${id}: ${(dep[i] / dt / 1e3).toFixed(1)} kW`); }
    assert.ok(Math.abs(sum - r.energy.deployJ) <= 1e-3 * r.energy.deployJ, `${cls} ${y} ${id}: ledger`);
    assert.ok(r.energy.deployJ <= r.energy.budgetJ * 1.001, `${cls} ${y} ${id}: budget`);
  }
});

// G-B (A1 §5): measured learning tables equal their sha256 pins
test('measured endurance tables are byte-identical to their pins', () => {
  for (const f of JSON.parse(readFileSync('.github/lapsim-snapshot.json', 'utf8')).endurance.files)
    assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'), f.sha256, f.path);
});
