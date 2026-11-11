// Declared test of the new-track geometry method on tracks where the driven line is known (2026-11-11, written before the run).
// Question: when a track is built from a map centre line, how far is the simulated lap from the lap on the production track
// (built from real car positions)? Same car, same weather, same track factor, height switched off on both sides, so only the
// plan shape differs. Tracks: every TUM racetrack-database track that matches a production track within 2 % of its length.
// Filter corrected once, after the first run and before reading lap times of the skipped tracks: 0.5 % was wrong because a centre
// line is 0.5-1.8 % longer than the driven line of the production track. 2 % still drops the two real layout changes
// (Yas Marina 6.07 %, Zandvoort 2.50 %).
// Variants (fixed, not tuned): A centre line as it is; B least-curvature line inside the TUM widths, half-width =
// min(left, right) - 1.2 m; C the TUM database's own race line. Cars: F1 2025 and WEC LMH (latest season), production values.
// Metric: lap-time difference to the production track in %, per track; RMS and bias per variant and car. Pass idea for a
// method to be usable on new tracks: bias near zero and RMS under the current held-out error (about 1 %).
//   node scripts/sim/tracks/check-method.mjs <racetrack-database dir>
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {carsFor} from '../../../worker/lapsim/scenario.js';
import {minCurvatureLine, lineTrack} from '../../../worker/lapsim/racing-line.js';
import {resampleClosed} from '../../../worker/lapsim/geometry.js';
const K = lapsimKernel(), DIR = process.argv[2], commit = execFileSync('git', ['-C', DIR, 'rev-parse', 'HEAD']).toString().trim();
const MAP = {Austin: 'austin', Budapest: 'hungaroring', Catalunya: 'catalunya', Melbourne: 'melbourne', MexicoCity: 'mexico-city', Montreal: 'montreal', Monza: 'monza', Sakhir: 'sakhir', SaoPaulo: 'interlagos',
  Sepang: 'kuala-lumpur', Shanghai: 'shanghai', Silverstone: 'silverstone', Spa: 'spa-francorchamps', Spielberg: 'spielberg', Suzuka: 'suzuka', YasMarina: 'yas-marina-circuit', Zandvoort: 'zandvoort'};
const csv = f => readFileSync(f, 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split(',').map(Number));
const withGrip = (tr, g) => ({...tr, mu: Float64Array.from(tr.mu, m => m * g)}), env = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
const rows = [], skipped = [];
for (const [file, id] of Object.entries(MAP)) {
  const prod = lapsimTracks[id]; if (!prod) { skipped.push([file, 'no production track']); continue; }
  const c = csv(`${DIR}/tracks/${file}.csv`), g = resampleClosed(c.map(r => r[0]), c.map(r => r[1]), 5);
  const lenErr = (g.length - prod.length) / prod.length; if (Math.abs(lenErr) > 0.02) { skipped.push([file, `length ${Math.round(g.length)} m against ${prod.length} m (${(lenErr * 100).toFixed(2)} %): different layout`]); continue; }
  // widths resampled to the same grid by lap share
  const half = Array.from({length: g.x.length}, (_, i) => { const r = c[Math.min(c.length - 1, Math.floor(i / g.x.length * c.length))]; return Math.max(0.5, Math.min(r[2], r[3]) - 1.2); });
  const A = lineTrack(K, Array.from(g.x), Array.from(g.y), 5), rl = minCurvatureLine(Array.from(g.x), Array.from(g.y), half), B = lineTrack(K, rl.x, rl.y, 5);
  let C = null; try { const r = csv(`${DIR}/racelines/${file}.csv`); C = lineTrack(K, r.map(x => x[0]), r.map(x => x[1]), 5); } catch {}
  const base = K.trackFromData({...prod, grade: null}), cars = carsFor(id);
  for (const key of ['2025', 'wec-lmh']) {
    const car = cars[key]; if (!car?.car) continue;
    const ref = K.simulateLap(withGrip(base, car.grip || 1), car.car, env).lapTime, pct = t => t ? +((K.simulateLap(withGrip(t, car.grip || 1), car.car, env).lapTime / ref - 1) * 100).toFixed(2) : null;
    rows.push({track: id, car: key, productionLap: +ref.toFixed(3), lengthErrPct: +(lenErr * 100).toFixed(2), centreLinePct: pct(A), racingLinePct: pct(B), tumRaceLinePct: pct(C), racingLineLengthM: Math.round(B.length), meanHalfWidthM: +(half.reduce((a, b) => a + b, 0) / half.length).toFixed(1)});
  }
}
const st = (a, f) => { const v = a.map(r => r[f]).filter(Number.isFinite); return v.length ? {n: v.length, rms: +Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length).toFixed(2), bias: +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2), min: Math.min(...v), max: Math.max(...v)} : null; };
const summary = {}; for (const car of ['2025', 'wec-lmh']) { const a = rows.filter(r => r.car === car); summary[car] = {centreLine: st(a, 'centreLinePct'), racingLine: st(a, 'racingLinePct'), tumRaceLine: st(a, 'tumRaceLinePct')}; }
writeFileSync('scripts/sim/data/tracks/method-check.json', JSON.stringify({note: 'Geometry-method test on known tracks: lap-time difference to the production track (real car positions), plan shape only.', source: `github.com/TUMFTM/racetrack-database @ ${commit}`, declared: '2026-11-11, before the run', summary, skipped, rows}, null, 1));
console.table(rows.map(r => ({track: r.track, car: r.car, 'len %': r.lengthErrPct, 'centre %': r.centreLinePct, 'line %': r.racingLinePct, 'TUM line %': r.tumRaceLinePct, halfW: r.meanHalfWidthM})));
console.log(JSON.stringify(summary, null, 1)); console.log('skipped', skipped);
