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

test('overlapping ways with different point spacing are still one lap', () => {
  const n = 120, r = 800, full = circle(n, r), half = circle(n, r, 0, 60);
  // the second way shares only every third node, plus one extra point exactly on a segment of the first
  const sparse = half.filter((_, i) => i % 3 === 0); sparse.splice(1, 0, {lat: (full[1].lat + full[2].lat) / 2, lon: (full[1].lon + full[2].lon) / 2});
  const r1 = loops([way(full, 'F1 Track'), way(sparse, 'Permanent Circuit')], {cap: 20000});
  assert.equal(r1.searchCapped, false);
  assert.ok(r1.loops.some(l => Math.abs(l.m - 2 * Math.PI * r) < 15));
});

test('a plain ring is found when another part of the venue has junctions (Jarama, Mosport case)', () => {
  const ring = circle(120, 600); // about 3770 m, split into two ways that meet end to end
  const a = ring.slice(0, 61), b = ring.slice(60);
  const shift = g => g.map(p => ({lat: p.lat + 0.05, lon: p.lon})); // a small separate part with junctions
  const small = circle(40, 100), spur = [small[0], {lat: small[0].lat, lon: small[0].lon + 0.001}];
  const r1 = loops([way(a, 'Main'), way(b, 'Main'), way(shift(small), null), way(shift(spur), null)], {minM: 1500});
  assert.equal(r1.loops.length, 1);
  assert.ok(Math.abs(r1.loops[0].m - 2 * Math.PI * 600) < 15);
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

test('road lap: named roads joined in order, accepted only inside the length rule', async () => {
  const {roadLap} = await import('../scripts/sim/tracks/road-lap.mjs');
  const ring = circle(120, 800), road = (g, name) => ({type: 'way', tags: {highway: 'residential', name}, geometry: g});
  // lap = A (0-30) + unnamed (30-60) + B (60-90) + unnamed (90-120); a long detour road also joins 30 and 60
  const detour = [ring[30], {lat: ring[45].lat + 0.02, lon: ring[45].lon}, ring[60]];
  const roads = [road(ring.slice(0, 31), 'A Straight'), road(ring.slice(30, 61), null), road(ring.slice(60, 91), 'B Straight'), road(ring.slice(90), null), road(detour, 'Detour Road')];
  const L = 2 * Math.PI * 800, ok = roadLap(roads, ['A Straight', 'B Straight'], L);
  assert.equal(ok.accepted, true); assert.ok(Math.abs(ok.loopM - L) < 15);
  assert.equal(roadLap(roads, ['A Straight', 'B Straight'], L * 1.02).accepted, false);
  assert.equal(roadLap(roads, ['A Straight', 'No Such Road'], L).accepted, false);
});
