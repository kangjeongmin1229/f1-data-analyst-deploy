import test from 'node:test';
import assert from 'node:assert/strict';
import {loops, totalTurnDeg} from '../scripts/sim/tracks/assemble.mjs';
import {sessionType, markRelative, markWetAcrossYears} from '../scripts/sim/laps/schema.mjs';
import {modelIdentity} from '../scripts/sim/laps/models.mjs';

// a circle of n points, radius r metres, around (35, 127)
const circle = (n, r, from = 0, to = n) => Array.from({length: to - from + 1}, (_, k) => { const a = 2 * Math.PI * ((from + k) % n) / n; return {lat: 35 + r * Math.sin(a) / 111195, lon: 127 + r * Math.cos(a) / (111195 * Math.cos(35 * Math.PI / 180))}; });
const way = (geometry, name) => ({type: 'way', tags: {highway: 'raceway', name}, geometry});

test('two ways drawn over the same nodes give one lap, not thousands (Yeongam case)', () => {
  const n = 120, r = 800; // lap about 5027 m
  const r1 = loops([way(circle(n, r), 'F1 Track'), way(circle(n, r, 0, 60), 'Permanent Circuit')], {cap: 5000});
  assert.equal(r1.searchCapped, false);
  assert.ok(r1.duplicateEdgesDropped >= 59);
  assert.equal(r1.loops.length, 1);
  assert.ok(Math.abs(r1.loops[0].m - 2 * Math.PI * r) < 15);
  assert.ok(Math.abs(Math.abs(totalTurnDeg(r1.loops[0].line())) - 360) < 1);
});

test('an open end is reported with its distance to the rest of the track', () => {
  const pts = circle(120, 800), gap = pts.slice(0, 115); // about 250 m missing
  const r1 = loops([way(gap, 'Main')], {snapM: 12});
  assert.equal(r1.loops.length, 0);
  assert.equal(r1.dangling.length, 2);
});

test('session types: a qualifying race is a race', () => {
  assert.equal(sessionType('Qualifying Race 1'), 'R');
  assert.equal(sessionType('Sprint Qualifying'), 'Q');
  assert.equal(sessionType('Hyperpole 2'), 'Q');
  assert.equal(sessionType('Free Practice 2'), 'P');
  assert.equal(sessionType('Race - Hour 6'), 'R');
});

test('a push lap of a session later marked wet is not a push lap', () => {
  const lap = (season, time, trapKph, q = []) => ({series: 'x', track: 't', cls: 'c', sessionType: 'Q', season, event: 'e' + season, session: 'Qualifying', entry: '1', time, trapKph, q: [...q]});
  const rows = [lap(2023, 100, 300), lap(2024, 100.2, 301), lap(2025, 112, 260)]; // 2025: trap 13 % down = wet
  for (const s of [2023, 2024, 2025]) markRelative(rows.filter(r => r.season === s));
  assert.equal(rows[2].push, 1);
  markWetAcrossYears(rows);
  assert.ok(rows[2].q.includes('wet_session'));
  assert.equal(rows[2].push, 0);
  assert.equal(rows[0].push, 1);
});

test('two events at one track in one season are separate sessions', () => {
  const lap = (event, rain) => ({series: 'x', track: 't', cls: 'c', sessionType: 'Q', season: 2024, event, session: 'Qualifying', entry: '1', time: 100, trapKph: 300, q: rain ? ['wet_lap'] : []});
  const rows = [lap('6 Hours', true), lap('8 Hours', false)];
  markWetAcrossYears(rows);
  assert.ok(rows[0].q.includes('wet_session'));
  assert.ok(!rows[1].q.includes('wet_session'));
});

test('car models: Evo kit is separate, a model called Evolution is not a kit', () => {
  assert.equal(modelIdentity('Porsche 911 GT3 R (992) EVO').evo, 'evo');
  assert.equal(modelIdentity('Porsche 911 GT3 R (992) EVO').base, modelIdentity('Porsche 911 GT3 R (992)').base);
  assert.equal(modelIdentity('Audi R8 LMS GT3 evo II').evo, 'evo2');
  assert.equal(modelIdentity('Aston Martin Vantage AMR GT3 Evolution').evo, 'evo');
  assert.equal(modelIdentity('Mitsubishi Lancer Evo X').evo, null);
});
