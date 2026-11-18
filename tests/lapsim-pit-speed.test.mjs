import test from 'node:test';
import assert from 'node:assert/strict';
import {lapsimPitSpeed, pitSpeedKph} from '../worker/lapsim/pit-speed-data.js';
import {lapsimAllTracks} from '../worker/lapsim/tracks.js';

test('pit speed: every event value is a known track with a source per season (A2, RD event notes)', () => {
  for (const [id, t] of Object.entries(lapsimPitSpeed.tracks)) {
    assert.ok(lapsimAllTracks[id], id);
    const e = t.f1; assert.ok(e.kph > 0 && e.kph < 80, id);
    for (const y of e.years) assert.match(e.src[y], /^https:\/\/www\.fia\.com\/.+\.pdf$/, `${id} ${y}`);
    assert.deepEqual(Object.keys(e.src).map(Number).sort(), [...e.years].sort(), id);
  }
});

test('pit speed: the event limit applies only in its seasons (Zandvoort 60 in 2024, 80 again in 2025)', () => {
  assert.equal(pitSpeedKph('f1', 'zandvoort', 2024), 60);
  assert.equal(pitSpeedKph('f1', 'zandvoort', 2025), 80);
  assert.equal(pitSpeedKph('f1', 'singapore', 2025), 80);
  assert.equal(pitSpeedKph('f1', 'monte-carlo', 2025), 60);
  assert.equal(pitSpeedKph('f1', 'monza', 2025), 80);
  assert.equal(pitSpeedKph('f1', 'zandvoort'), 80, 'no season: series rule');
  assert.equal(pitSpeedKph('wec', 'zandvoort', 2024), 60);
});
