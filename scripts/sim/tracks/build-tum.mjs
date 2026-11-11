// Candidate tracks from the TUM racetrack database (github.com/TUMFTM/racetrack-database, LGPL-3.0): smoothed centre lines
// (originally OpenStreetMap) with track widths from satellite images. Local x/y only: no position on Earth, so NO elevation
// (grade is zero and marked missing). Accepted only within 0.5 % of the FIA lap distance.
//   node scripts/sim/tracks/build-tum.mjs <racetrack-database dir>
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resampleClosed, headingCurvature} from '../../../worker/lapsim/geometry.js';
const DIR = process.argv[2], FIA = JSON.parse(readFileSync('scripts/sim/data/tracks/fia-circuits.json', 'utf8')).rows;
const commit = execFileSync('git', ['-C', DIR, 'rev-parse', 'HEAD']).toString().trim();
// only venues the simulator does not already have from car positions
const WANT = {BrandsHatch: ['brands-hatch', /^BRANDS HATCH GRAND PRIX/i], Norisring: ['norisring', /NORISRING/i], Oschersleben: ['oschersleben', /OSCHERSLEBEN/i], MoscowRaceway: ['moscow-raceway', /MOSCOW RACEWAY/i]};
const out = {note: 'Candidate tracks from the TUM racetrack database. Not read by the simulator. No elevation: grade is zero and must be added before use on a hilly track.', source: `github.com/TUMFTM/racetrack-database @ ${commit} (LGPL-3.0)`, tracks: {}}, report = [];
for (const [file, [venue, re]] of Object.entries(WANT)) {
  const rows = readFileSync(`${DIR}/tracks/${file}.csv`, 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split(',').map(Number));
  const g = resampleClosed(rows.map(r => r[0]), rows.map(r => r[1]), 5), {kappa} = headingCurvature(g.x, g.y, g.ds, 6), n = g.x.length;
  const fia = FIA.filter(x => re.test(x.name)).map(x => ({...x, err: Math.abs(x.lengthM - g.length) / x.lengthM})).sort((a, b) => a.err - b.err)[0];
  const ok = fia && fia.err <= 0.005, turn = kappa.reduce((a, k) => a + k * g.ds, 0), width = rows.reduce((a, r) => a + r[2] + r[3], 0) / rows.length;
  report.push(`${venue}: ${Math.round(g.length)} m, FIA ${fia ? fia.name + ' ' + fia.lengthM + ' m (' + (fia.err * 100).toFixed(2) + ' %)' : 'no row'}, ${ok ? 'accepted' : 'NOT accepted'}, mean width ${width.toFixed(1)} m`);
  if (!ok) continue;
  const step = Math.max(1, Math.floor(n / 360)), map = {x: [], y: []}; for (let i = 0; i < n; i += step) { map.x.push(Math.round(g.x[i])); map.y.push(Math.round(g.y[i])); }
  out.tracks[venue] = {id: venue, venue, name: fia.name, ds: g.ds, length: Math.round(g.length), officialLengthM: fia.lengthM, lengthSource: `FIA list ${fia.list}`, fiaGrade: fia.grade, pole: fia.pole, widthM: fia.widthM,
    sectors: [], corners: [], kappa: Array.from(kappa, v => Math.round(v * 1e5)), grade: new Array(n).fill(0), heading: null, map, elevation: null, meanWidthM: +width.toFixed(1),
    quality: {evidence: 'map centre line (TUM, smoothed)', lengthErrorPct: +(fia.err * 100).toFixed(2), totalTurnDeg: Math.round(turn * 180 / Math.PI), elevation: 'missing', startVerified: false},
    sources: [out.source, `FIA list ${fia.list}`]};
}
writeFileSync('scripts/sim/data/tracks/extra-tracks-tum.json', JSON.stringify(out)); console.log(report.join('\n'));
