// Step 30b (report-only): export the kernel path (page kappa + map) and the 283 corner apexes exactly as step30a found them.
// Out: scripts/sim/data/step30b/kernel-export.json. Run from the repo root.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulationPage} from '../../../worker/simulation.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimRacingLines} from '../../../worker/lapsim/racing-lines-data.js';
const sha = t => createHash('sha256').update(t).digest('hex');
const IN = process.env.STEP30B_IN || 'scripts/sim/data/f1-pedal-gap-corners-2025-2026.csv', txt = readFileSync(IN, 'utf8');
if (!process.env.STEP30B_IN && sha(txt) !== '3598af140e1f0265c98ba84a7a852755841ffe56e88f90ef713856b56a91fd6a') throw new Error('input CSV changed');
const [head, ...lines] = txt.trim().split('\n'), H = head.split(',');
const rows = lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], i < 2 ? v : +v]))).filter(r => r.apex_kph_meas > 0 && r.apex_kph_model > 0);
const page = new Map(), tracks = {};
function track(id, season) {
  const k = id + season; if (page.has(k)) return page.get(k);
  const d = JSON.parse(simulationPage({track: id, car: +season >= 2025 ? season : '2025'}, 'en').match(/id="lapsim-data">([\s\S]*?)<\/script>/)[1]).track;
  const t = {ds: d.ds, kappa: d.kappa.map(v => v / 1e5), corners: d.corners || []}; page.set(k, t);
  const td = lapsimTracks[id];
  tracks[k] = {id, season, ds: d.ds, kappa: t.kappa, corners: t.corners, map: td.map, year: td.year, quality: td.quality,
    sameAsTracksData: td.kappa.length === d.kappa.length && td.kappa.every((v, i) => v === d.kappa[i])};
  return t;
}
const out = [];
for (const r of rows) { // apex search copied from step30a-line-vs-grip.mjs
  const t = track(r.track, r.season), n = t.kappa.length, L = n * t.ds, c = Math.round(r.lap_share * n), h = Math.max(Math.round(0.01 * n), Math.round(40 / t.ds));
  let ia = c; for (let k = -h; k <= h; k++) { const i = ((c + k) % n + n) % n; if (Math.abs(t.kappa[i]) > Math.abs(t.kappa[((ia % n) + n) % n])) ia = c + k; }
  ia = ((ia % n) + n) % n;
  const turn = t.corners.reduce((b, q) => { const d = Math.min(Math.abs(q.s - ia * t.ds), L - Math.abs(q.s - ia * t.ds)); return d < 80 && (!b || d < b.d) ? {d, q} : b; }, null);
  out.push({track: r.track, season: r.season, corner_id: r.corner_id, ia, turn: turn ? String(turn.q.number) + (turn.q.letter || '') : '', meas: r.apex_kph_meas, model: r.apex_kph_model, Rref: 1 / Math.abs(t.kappa[ia])});
}
mkdirSync('scripts/sim/data/step30b', {recursive: true});
const lines2 = Object.fromEntries(Object.entries(lapsimRacingLines.tracks).map(([k, v]) => [k, {edges: v.edges, line: v.line, left: v.left, right: v.right}]));
writeFileSync((process.env.STEP30B_EXPORT || 'scripts/sim/data/step30b/kernel-export.json'), JSON.stringify({input: IN, inputSha: sha(txt), corners: out, tracks, racingLines: lines2}));
console.log(out.length, Object.keys(tracks).length, Object.values(tracks).filter(t => !t.sameAsTracksData).map(t => t.id + t.season));
