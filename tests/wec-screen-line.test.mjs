import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lapsimTracks} from '../worker/lapsim/tracks-data.js';
import {trackFromData} from '../worker/lapsim/tracks.js';

// screen 2b S12: the iRacing line must sit on the same grid as the track and keep its total turning
for (const [file, label, tol] of [['wec-iracing-line.json', 'model (iRacing)', 1e-3], ['wec-line-ratio.json', 'model (iRacing GT3 line ratio)', 0.6]])
test(`${file} matches the track grid` , () => {
  const L = JSON.parse(readFileSync('scripts/sim/data/screens/' + file, 'utf8'));
  assert.equal(L.label, label);
  for (const [id, l] of Object.entries(L.tracks)) {
    const t = trackFromData(lapsimTracks[id]), sum = a => a.reduce((s, x) => s + x, 0);
    assert.equal(l.kappa.length, t.kappa.length, id);
    assert.ok(Math.abs(sum(l.kappa) - sum(t.kappa)) * t.ds < tol, id); // ratio model: total turning may drop (|Δ| < 0.6 rad)
  }
});
