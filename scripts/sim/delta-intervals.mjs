// Step 29b: ± ranges for LapSim Δ answers (rule: docs/prereg/step29b-delta-intervals-2026-11-25.md).
// Reads the shipped calibration and the pooled DRS baseline, writes worker/lapsim/delta-intervals-data.js.
// node scripts/sim/delta-intervals.mjs [--check] [--report <pipeline-report.json> --drs <baseline.csv>]
//   --check: exit 1 if the committed data file differs. --report/--drs (refit, central 2026-11-25): build on the run being shipped: the R3
//   tie is that run's held-out RMS (report diff.heldOut.*.cand), the DRS ratios its pooled baseline; refused unless the run is production.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {calFingerprint} from '../../worker/lapsim/delta-intervals.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha = p => createHash('sha256').update(readFileSync(root + p)).digest('hex');
const CAL = 'worker/lapsim/calibration-data.js', DRS = 'scripts/sim/data/f1-delta/baseline-pooled-2026-11-24.csv';
const RULE = 'docs/prereg/step29b-delta-intervals-2026-11-25.md', OUT = 'worker/lapsim/delta-intervals-data.js';
// run 45402981435 report diff.heldOut.*.base (shipped held-out RMS %, R3 tie)
const SHIPPED = {tie: {all: 0.901, f1: 0.823, wec: 0.977}, drs: DRS, drsRun: '45487971969', lapRun: '45402981435',
  drsNote: 'lapsim-pipeline run 45487971969 (a42c1a7, shipped calibration) rebuilt this baseline; its report says identical',
  lapNote: 'held-out rows of the shipped calibration; RMS per group equals run 45402981435 report diff.heldOut base'};
// the run being shipped, from its pipeline report; a research (or push / local) run is never a shipped number
export function runSource(report, drs) {
  const id = report?.run?.id, mode = report?.run?.mode;
  if (mode !== 'production') throw Error(`refused: run ${id} is mode "${mode}", not production; 29b ranges are built only on the run being shipped`);
  const h = report.diff?.heldOut;
  if (!h?.all || !h.f1 || !h.wec) throw Error(`refused: run ${id} has no fit output (report diff.heldOut missing)`);
  if (!drs) throw Error('--drs <pooled DRS baseline.csv of the same run> is required with --report');
  return {tie: {all: h.all.cand, f1: h.f1.cand, wec: h.wec.cand}, drs, drsRun: String(id), lapRun: String(id),
    drsNote: `lapsim-pipeline run ${id} (${report.run.commit}): pooled DRS baseline of the run being shipped`,
    lapNote: `held-out rows of the calibration of run ${id}; RMS per group equals its report diff.heldOut cand`};
}

// Hyndman–Fan type 7 (numpy default)
export function quantile(xs, p) {
  const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * p, lo = Math.floor(h);
  return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo]);
}
const r4 = x => Math.round(x * 1e4) / 1e4;

export async function build(src = SHIPPED) {
  const DRS = src.drs, TIE = src.tie;
  const {lapsimCalibration: c} = await import(root + CAL);
  // R2 DRS: ρ = measured / model per pooled event × zone case
  const [head, ...rows] = readFileSync(root + DRS, 'utf8').trim().split(/\r?\n/);
  const col = head.split(','), im = col.indexOf('meas_delta_s'), ip = col.indexOf('pred_delta_s');
  const rho = rows.map(l => l.split(',')).map(f => +f[im] / +f[ip]);
  if (rho.length !== 125 || rho.some(x => !Number.isFinite(x))) throw Error(`DRS cases: expected 125 finite ratios, got ${rho.length}`);
  // R3 lap level: e = errorSec / realLap per held-out row
  const e = {f1: [], wec: []};
  for (const y of ['2025', '2026']) for (const t of c.seasons[y].holdout.tracks) e.f1.push(t.errorSec / c.seasons[y].tracks[t.track].realLap);
  for (const cls of ['lmh', 'lmdh', 'lmgt3']) for (const y of ['2025', '2026']) { const s = c.series.wec[cls][y]; for (const t of s.holdout.tracks) e.wec.push(t.errorSec / s.tracks[t.track].realLap); }
  e.all = [...e.f1, ...e.wec];
  const rms = xs => Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length) * 100;
  for (const g of ['all', 'f1', 'wec']) if (Math.abs(rms(e[g]) - TIE[g]) > 0.001 + 5e-4) throw Error(`R3 tie failed: ${g} RMS ${rms(e[g]).toFixed(4)} % vs run ${src.lapRun} ${TIE[g]} %`);
  const lap = g => ({n: e[g].length, q05: r4(quantile(e[g], 0.05)), q50: r4(quantile(e[g], 0.5)), q95: r4(quantile(e[g], 0.95)), rmsPct: r4(rms(e[g]))});
  return {
    rule: {path: RULE, sha256: sha(RULE)}, level: 0.9, quantile: 'empirical, type 7 (numpy default); no normal assumption',
    calibration: {path: CAL, sha256: sha(CAL), generatedAt: c.generatedAt, fingerprint: calFingerprint(c)},
    drs: {status: 'checked', n: rho.length, q05: r4(quantile(rho, 0.05)), q50: r4(quantile(rho, 0.5)), q95: r4(quantile(rho, 0.95)),
      source: {path: DRS, sha256: sha(DRS), run: src.drsRun, note: src.drsNote},
      unit: 'ratio measured Δ / model Δ per pooled event × zone case, 2023–25 races'},
    lap: {status: 'checked', f1: lap('f1'), wec: lap('wec'), source: {run: src.lapRun, note: src.lapNote},
      unit: 'e = simulated / real − 1 per held-out row'},
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const rep = arg('--report'), d = await build(rep ? runSource(JSON.parse(readFileSync(rep, 'utf8')), arg('--drs')) : SHIPPED);
  const text = `// generated by scripts/sim/delta-intervals.mjs (step 29b); do not edit by hand\nexport const lapsimDeltaIntervals = ${JSON.stringify(d)};\n`;
  if (process.argv.includes('--check')) { const same = readFileSync(root + OUT, 'utf8') === text; console.log(same ? 'delta intervals up to date' : 'delta intervals stale: run node scripts/sim/delta-intervals.mjs'); process.exit(same ? 0 : 1); }
  writeFileSync(root + OUT, text); console.log(JSON.stringify(d, null, 1));
}
