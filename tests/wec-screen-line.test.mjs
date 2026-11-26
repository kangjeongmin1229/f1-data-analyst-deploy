import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lapsimTracks} from '../worker/lapsim/tracks-data.js';
import {trackFromData} from '../worker/lapsim/tracks.js';

// screen 2b S12: the iRacing line must sit on the same grid as the track and keep its total turning
test('iRacing WEC line matches the track grid and total turning', () => {
  const L = JSON.parse(readFileSync('scripts/sim/data/screens/wec-iracing-line.json', 'utf8'));
  assert.equal(L.label, 'model (iRacing)');
  for (const [id, l] of Object.entries(L.tracks)) {
    const t = trackFromData(lapsimTracks[id]), sum = a => a.reduce((s, x) => s + x, 0);
    assert.equal(l.kappa.length, t.kappa.length, id);
    assert.ok(Math.abs(sum(l.kappa) - sum(t.kappa)) * t.ds < 1e-3, id);
  }
});
