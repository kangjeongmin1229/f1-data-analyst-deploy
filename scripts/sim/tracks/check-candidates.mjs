// First check of the candidate tracks: simulate the production WEC cars on a track the fit never saw and compare with the real
// best dry qualifying lap (Timing71 rows). This is the "track-unseen" test of the rules (3.2, level C), with two declared baselines:
// track factor 1, and the mean factor of that class's fitted tracks. No fitting happens here. Declared 2026-11-11 before the first run:
// metrics = signed error % per row and RMS per group; rows = seasons 2025 and 2026, classes Hypercar (LMH/LMDh by car model), LMGT3;
// IMSA GTP uses the LMDh car and IMSA GTD the LMGT3 car (borrowed cars, reported separately).
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimCalibration} from '../../../worker/lapsim/calibration-data.js';
import {SERIES} from '../../../worker/lapsim/series.js';
import {minCurvatureLine, lineTrack} from '../../../worker/lapsim/racing-line.js';
const K = lapsimKernel(), D = 'scripts/sim/data/';
const cand = {...JSON.parse(readFileSync(D + 'tracks/extra-tracks.json', 'utf8')).tracks, ...JSON.parse(readFileSync(D + 'tracks/extra-tracks-tum.json', 'utf8')).tracks};
const bests = JSON.parse(readFileSync(D + 'laps/t71-bests-counts.json', 'utf8')).bests;
// candidate id → Timing71 track id (one layout per venue: the one the series races)
const MAP = {'le-mans-le-mans-24-heures': 'le-mans', 'fuji-fuji-speedway': 'fuji', 'daytona-road-course-imsa': 'daytona', 'road-atlanta-road-atlanta': 'road-atlanta', 'laguna-seca-laguna-seca-raceway': 'laguna-seca',
  'watkins-glen-long-course-imsa': 'watkins-glen', 'road-america-road-america-elkhart-lake': 'road-america', 'vir-full-course-imsa': 'vir', 'indianapolis-indianapolis-road-course': 'indianapolis',
  'mid-ohio-imsa-layout': 'mid-ohio', 'lime-rock-imsa-layout': 'lime-rock', 'portimao-algarve': 'portimao', 'mugello-mugello': 'mugello', 'kyalami-grand-prix-circuit': 'kyalami'};
const withGrip = (tr, g) => ({...tr, mu: Float64Array.from(tr.mu, m => m * g)});
const wec = lapsimCalibration.series.wec, gm = a => Math.exp(a.reduce((s, x) => s + Math.log(x), 0) / a.length);
const rows = [];
for (const [cid, tid] of Object.entries(MAP)) {
  const c = cand[cid]; if (!c) { rows.push({track: tid, note: 'no candidate'}); continue; }
  const track = K.trackFromData(c);
  // third variant (declared with the first run's result in view, so it is a new declaration, 2026-11-11): the centre line is not the
  // driven line. Build the least-curvature line inside the track: half-width = FIA reference width / 2 minus 1.2 m (car half-width
  // and margin); 12 m is assumed where the FIA list has no width. Height is carried over by lap position.
  const n0 = track.kappa.length, cx = new Float64Array(n0), cy = new Float64Array(n0); { let h = 0, x = 0, y = 0; for (let i = 0; i < n0; i++) { cx[i] = x; cy[i] = y; h += track.kappa[i] * c.ds; x += Math.cos(h) * c.ds; y += Math.sin(h) * c.ds; } }
  const halfW = Math.max(1, (c.widthM || 12) / 2 - 1.2), rl = minCurvatureLine(Array.from(cx), Array.from(cy), new Array(n0).fill(halfW)), line = lineTrack(K, rl.x, rl.y, 5);
  line.grade = track.grade ? Float64Array.from({length: line.kappa.length}, (_, j) => track.grade[Math.min(n0 - 1, Math.floor(j / line.kappa.length * n0))]) : null;
  for (const [key, b] of Object.entries(bests)) {
    const [series, t, season, cls] = key.split('|'); if (t !== tid || !['2025', '2026'].includes(season) || !['wec', 'imsa'].includes(series) || b.paceSuspect) continue;
    let k = null, borrowed = false;
    if (series === 'wec' && /^hypercar/i.test(cls)) k = SERIES.wec.classes.lmh.manufacturers?.test(b.carModel || '') ? 'lmh' : 'lmdh';
    else if (series === 'wec' && /^lmgt3$/i.test(cls)) k = 'lmgt3';
    else if (series === 'imsa' && /^gtp$/i.test(cls)) { k = 'lmdh'; borrowed = true; }
    else if (series === 'imsa' && /^gtd(pro)?$/i.test(cls)) { k = 'lmgt3'; borrowed = true; }
    const cal = k && wec[k]?.[season]; if (!cal) continue;
    const env = K.conditionsFromWeather({pressureHpa: b.pressureHpa ?? 1013.25, airTempC: b.airC ?? 25, humidityPct: b.humidityPct ?? 50, trackTempC: b.trackC ?? 35, windSpeed: 0, windFromDeg: 0});
    const gMean = gm(Object.values(cal.tracks).map(x => x.grip).filter(Number.isFinite));
    const s1 = K.simulateLap(track, cal.car, env), s2 = K.simulateLap(withGrip(track, gMean), cal.car, env), s3 = K.simulateLap(withGrip(line, gMean), cal.car, env);
    rows.push({track: tid, candidate: cid, series, season: +season, cls, car: k, borrowed, model: b.carModel, real: b.lap, pushLaps: b.laps, simUnity: +s1.lapTime.toFixed(3), errUnityPct: +((s1.lapTime / b.lap - 1) * 100).toFixed(2),
      meanFactor: +gMean.toFixed(4), simMean: +s2.lapTime.toFixed(3), errMeanPct: +((s2.lapTime / b.lap - 1) * 100).toFixed(2), simLine: +s3.lapTime.toFixed(3), errLinePct: +((s3.lapTime / b.lap - 1) * 100).toFixed(2), lineLengthM: Math.round(line.length), halfWidthM: +halfW.toFixed(1), simTopKph: Math.round(s2.vMaxKph), weather: [b.airC, b.trackC, b.pressureHpa]});
  }
}
const ok = rows.filter(r => r.real), rms = (a, f) => a.length ? +Math.sqrt(a.reduce((s, r) => s + r[f] ** 2, 0) / a.length).toFixed(2) : null, bias = (a, f) => a.length ? +(a.reduce((s, r) => s + r[f], 0) / a.length).toFixed(2) : null;
const groups = {}; for (const [name, f] of [['WEC cars on their own class', r => !r.borrowed], ['IMSA with borrowed WEC cars', r => r.borrowed], ['all', () => true]]) { const a = ok.filter(f); groups[name] = {n: a.length, tracks: new Set(a.map(r => r.track)).size, rmsUnityPct: rms(a, 'errUnityPct'), biasUnityPct: bias(a, 'errUnityPct'), rmsMeanFactorPct: rms(a, 'errMeanPct'), biasMeanFactorPct: bias(a, 'errMeanPct'), rmsRacingLinePct: rms(a, 'errLinePct'), biasRacingLinePct: bias(a, 'errLinePct')}; }
writeFileSync(D + 'tracks/candidate-check.json', JSON.stringify({note: 'Track-unseen check of candidate tracks with production WEC cars. No fit. Candidate geometry is a map centre line with rough height; errors include geometry, car and borrowed-car error together.', generated: new Date().toISOString().slice(0, 10), groups, rows}, null, 1));
console.table(ok.map(r => ({track: r.track, series: r.series, yr: r.season, cls: r.cls, car: r.car + (r.borrowed ? '*' : ''), real: r.real, simMean: r.simMean, 'err1 %': r.errUnityPct, 'errMean %': r.errMeanPct, 'errLine %': r.errLinePct, halfW: r.halfWidthM})));
console.log(groups);
