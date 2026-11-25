// LapSim pipeline report (step 27, .github/workflows/lapsim-pipeline.yml): one JSON + markdown per run, tying every number to the run id,
// the input snapshot hashes, the code commit and the settings. No model code here: it only reads the fit outputs.
//   node scripts/sim/pipeline-report.mjs <new calibration-data.js> <shipped calibration-data.js> <out dir>
// Env: GITHUB_RUN_ID, GITHUB_SHA, SHIPPED_DIR, FIT_RESULT, TRACK_STATE_DIFF (track-state-diff.mjs JSON), SNAPSHOT_TAG, SNAPSHOT_SHA256, SNAPSHOT_SUMS (path of SHA256SUMS), DELTA_DIR (Δ benchmark output dir).
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {heldOut, compare} from './exp-compare.mjs';
import {kForVariants} from './gate.mjs';

const CAR_KEYS = ['muX', 'muY', 'muXTrac', 'clA', 'cdA', 'cdALow', 'pIce'];
const r4 = x => Number.isFinite(x) ? +x.toFixed(4) : null;

// shipped vs new: held-out RMS per group, the largest per-row change, and every car parameter that moved
export function diff(shipped, cand) {
  const a = heldOut(shipped), b = heldOut(cand), rows = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!(k in a) || !(k in b) || Math.abs(a[k] - b[k]) > 1e-9) rows.push({row: k, shippedPct: r4(a[k]), newPct: r4(b[k])});
  const cars = [], add = (where, x, y) => { for (const k of CAR_KEYS) if (Number.isFinite(x?.[k]) && Math.abs(x[k] - (y?.[k] ?? NaN)) > 1e-9 * Math.max(1, Math.abs(x[k]))) cars.push({where, param: k, shipped: r4(x[k]), new: r4(y?.[k])}); };
  for (const [y, s] of Object.entries(shipped.seasons || {})) add(`f1 ${y}`, s.car, cand.seasons?.[y]?.car);
  for (const [cls, ys] of Object.entries(shipped.series?.wec || {})) for (const [y, s] of Object.entries(ys)) add(`wec-${cls} ${y}`, s.car, cand.series?.wec?.[cls]?.[y]?.car);
  return {heldOut: compare(shipped, cand), harm: pairedHarm(a, b), changedRows: rows, changedCarParams: cars, identical: rows.length === 0 && cars.length === 0};
}

// refit ship rule (central 2026-11-25): per held-out track/event, harm = |refit error| − |shipped error| (pp); one-sided 95 % upper
// bound of the mean harm per series must be ≤ 0.10 pp (t quantile 0.95 with n − 1 dof: kForVariants at m = 3.2), and no single row may
// be worse than +1.0 pp (central 2026-11-25 14:48; a row above it fails the rule until it is explained in the refit PR)
export function pairedHarm(a, b, limit = 0.10, rowLimit = 1.0) {
  const out = {};
  for (const ser of ['f1', 'wec', 'fe']) {
    if (ser === 'fe' && !Object.keys(a).some(k => k.startsWith('fe/'))) continue; // FE rows only come from feHeldOut()
    const keys = Object.keys(a).filter(k => k.startsWith(ser === 'wec' ? 'wec' : ser + '/') && k in b), h = keys.map(k => Math.abs(b[k]) - Math.abs(a[k])), n = h.length;
    if (n < 2) { out[ser] = {n, pass: false}; continue; }
    const mean = h.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(h.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1)), ub = mean + kForVariants(3.2, n) * sd / Math.sqrt(n);
    const rows = keys.map((k, i) => ({row: k, shippedPct: r4(a[k]), newPct: r4(b[k]), harmPp: r4(h[i])})).sort((x, y) => y.harmPp - x.harmPp);
    const over = rows.filter(r => r.harmPp > rowLimit).map(r => r.row);
    out[ser] = {n, meanPp: r4(mean), ub95Pp: r4(ub), worse: h.filter(x => x > 1e-9).length, maxPp: rows[0].harmPp, overRowLimit: over, pass: ub <= limit && !over.length, rows};
  }
  return out;
}

// FE (central 2026-11-25 14:27): build-fe.mjs writes one event-hidden error per row (layout × season × rule set × session) to
// fe-fit.json; same paired harm as F1/WEC on those rows
export const feHeldOut = fit => Object.fromEntries(fit.rows.map(r => [`fe/${r.key}/${r.layout}/${r.season}/${r.session}`, r.event]));
export const feHarm = (shippedFit, candFit) => pairedHarm(feHeldOut(shippedFit), feHeldOut(candFit)).fe;

const sum = f => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).summary ?? null : null;
const md = r => [
  `# LapSim pipeline report — run ${r.run.id}`, '',
  `Mode: **${r.run.mode}**${r.run.mode === 'production' ? '' : ' (not a production number)'} · repo ${r.run.repo} · commit \`${r.run.commit}\` · snapshot \`${r.inputs.tag}\` (sha256 \`${r.inputs.sha256}\`) · generated ${r.generatedAt}`, '',
  `Fit settings (.github/lapsim-fit.env): ${Object.entries(r.settings).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}. Seeds: ${r.seeds}.`, '',
  `Fit job: ${r.fit}.`, '',
  ...(r.diff ? fitMd(r) : ['No fit output in this run.', '']),
  ...(r.feHarm ? [`FE ship rule (event-hidden paired harm per row vs shipped, build-fe.mjs on this run's kernel): n ${r.feHarm.n}, mean ${r.feHarm.meanPp} pp, UB ${r.feHarm.ub95Pp} pp, worse ${r.feHarm.worse}, worst row +${r.feHarm.maxPp} pp (limit +1.0) → ${r.feHarm.pass ? 'pass' : '**FAIL**'}.`, ''] : []),
  '## Change-effects table (track-state build on the pinned inputs)', '',
  ...(r.trackState ? [`Effects ${r.trackState.identical ? '**identical** to the shipped table' : `**${r.trackState.effects.length} fields differ**`}; registry tracks changed: ${r.trackState.registryTracksChanged.join(', ') || 'none'}; year pairs changed: ${r.trackState.pairsChanged}.` + (r.trackState.cases ? ` Cases ${r.trackState.cases.n} on ${r.trackState.cases.circuits} circuits, skipped ${r.trackState.cases.skipped} (${Object.entries(r.trackState.cases.skippedWhy).map(([k, v]) => `${k} ${v}`).join(', ')}).` : ''), '',
    ...(r.trackState.effects.length ? ['| type | field | shipped | this run |', '|---|---|---|---|', ...r.trackState.effects.map(e => `| ${e.type} | ${e.field} | ${JSON.stringify(e.shipped)} | ${JSON.stringify(e.new)} |`), ''] : [])] : ['Not run.', '']),
  '## Δ benchmarks', '', ...r.delta.map(d => `- ${d.name}: ${d.result}`), '',
  '## Inputs (SHA256SUMS of the snapshot)', '', '```', r.inputs.sums.trim(), '```', ''].join('\n');
const fitMd = r => [
  '## Held-out lap error (RMS %, shipped → this run)', '', '| group | n | shipped | this run |', '|---|---|---|---|',
  ...Object.entries(r.diff.heldOut).map(([g, x]) => `| ${g} | ${x.n} | ${x.base} | ${x.cand} |`), '',
  `Ship rule (paired harm per held-out track/event vs shipped, one-sided 95 % UB ≤ 0.10 pp, no row worse than +1.0 pp): ${Object.entries(r.diff.harm).map(([s, x]) => `${s} n ${x.n}, mean ${x.meanPp} pp, UB ${x.ub95Pp} pp, worse ${x.worse}, worst row +${x.maxPp} pp${x.overRowLimit?.length ? ` (over +1.0: ${x.overRowLimit.join(", ")})` : ""} → ${x.pass ? 'PASS' : 'FAIL'}`).join('; ')}.`, '',
  `Reproduction: ${r.diff.identical ? '**identical** to the shipped calibration (every held-out row and car parameter).' : `**${r.diff.changedRows.length} held-out rows and ${r.diff.changedCarParams.length} car parameters differ** (tables below).`}`, '',
  ...(r.diff.changedCarParams.length ? ['| car | param | shipped | this run |', '|---|---|---|---|', ...r.diff.changedCarParams.map(c => `| ${c.where} | ${c.param} | ${c.shipped} | ${c.new} |`), ''] : []),
  ...(r.diff.changedRows.length ? ['| held-out row | shipped % | this run % |', '|---|---|---|', ...r.diff.changedRows.map(c => `| ${c.row} | ${c.shippedPct} | ${c.newPct} |`), ''] : []),
  '## Level C and forward chaining (RMS %, shipped → this run)', '', '| group | level C shipped | level C | forward shipped | forward |', '|---|---|---|---|---|',
  ...Object.keys({...r.levelC.new, ...r.forward.new}).map(g => `| ${g} | ${[r.levelC.shipped, r.levelC.new, r.forward.shipped, r.forward.new].map(x => x?.[g]?.rmsPct ?? '–').join(' | ')} |`), ''];

if (process.argv[1]?.endsWith('pipeline-report.mjs')) {
  const [newF, shippedF, out] = process.argv.slice(2), E = process.env;
  const load = async f => (await import(pathToFileURL(f).href)).lapsimCalibration;
  const settings = Object.fromEntries(readFileSync('.github/lapsim-fit.env', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => l.split(/=(.*)/s).slice(0, 2)));
  const dd = E.DELTA_DIR || '', rows = k => existsSync(`${dd}/${k}/baseline.csv`) ? readFileSync(`${dd}/${k}/baseline.csv`, 'utf8').trim().split('\n').length - 1 : null;
  const pooled = k => existsSync(`${dd}/${k}/report.json`) ? JSON.parse(readFileSync(`${dd}/${k}/report.json`, 'utf8')).pooled : null;
  const sha = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
  const dPin = JSON.parse(readFileSync('.github/lapsim-snapshot.json', 'utf8')).delta, v2 = pooled('v2pooled'), lk = pooled('locked2022');
  const v2same = sha(`${dd}/v2pooled/baseline.csv`) === sha('scripts/sim/data/f1-delta/baseline-pooled-2026-11-24.csv');
  const r = {
    generatedAt: new Date().toISOString(),
    run: {mode: E.PIPELINE_MODE || 'local', repo: E.GITHUB_REPOSITORY || 'local', id: E.GITHUB_RUN_ID || 'local', commit: E.GITHUB_SHA || 'local', url: E.GITHUB_RUN_ID ? `${E.GITHUB_SERVER_URL}/${E.GITHUB_REPOSITORY}/actions/runs/${E.GITHUB_RUN_ID}` : null},
    inputs: {tag: E.SNAPSHOT_TAG || '', sha256: E.SNAPSHOT_SHA256 || '', sums: E.SNAPSHOT_SUMS && existsSync(E.SNAPSHOT_SUMS) ? readFileSync(E.SNAPSHOT_SUMS, 'utf8') : ''},
    settings, seeds: 'fit: none (deterministic Nelder–Mead / BCD); condition-report bootstrap seed 7; gate.mjs sign-flip / bootstrap seed 1',
    fit: E.FIT_RESULT || 'local',
    diff: existsSync(newF) ? diff(await load(shippedF), await load(newF)) : null,
    // FE_FIT_SHIPPED / FE_FIT_NEW: fe-fit.json before and after build-fe.mjs on this run's kernel
    feHarm: E.FE_FIT_NEW && existsSync(E.FE_FIT_NEW) && existsSync(E.FE_FIT_SHIPPED || '') ? feHarm(JSON.parse(readFileSync(E.FE_FIT_SHIPPED, 'utf8')), JSON.parse(readFileSync(E.FE_FIT_NEW, 'utf8'))) : null,
    trackState: E.TRACK_STATE_DIFF && existsSync(E.TRACK_STATE_DIFF) ? JSON.parse(readFileSync(E.TRACK_STATE_DIFF, 'utf8')) : null,
    // SHIPPED_DIR: the committed level C / forward files, copied before the run's outputs overwrite docs/
    levelC: {shipped: sum(`${E.SHIPPED_DIR}/lapsim-level-c.json`), new: sum('docs/lapsim-level-c.json')},
    forward: {shipped: sum(`${E.SHIPPED_DIR}/lapsim-forward.json`), new: sum('docs/lapsim-forward.json')},
    delta: [
      {name: `F1 DRS Δ v1 per stint (cases sha256 ${dPin.v1.sha256.slice(0, 8)}…)`, result: rows('v1') == null ? 'not run' : `${rows('v1')} model rows (every case stopped on noise in step 24: no kept case)`},
      {name: `F1 pooled DRS Δ v2 (cases sha256 ${dPin.v2pooled.sha256.slice(0, 8)}…)`, result: v2 ? `n ${v2.n}, pass rate ${v2.pass_rate}, bias ${v2.bias_s} s [${v2.bias_ci95_s.join(', ')}], sign errors ${v2.sign_errors}, median pred ${v2.median_pred_s} s vs meas ${v2.median_meas_s} s; baseline CSV ${v2same ? 'identical to' : 'differs from'} the shipped baseline-pooled-2026-11-24.csv` : 'not run'},
      {name: `F1 2022 LOCKED (cases sha256 ${dPin.locked2022.sha256.slice(0, 8)}…)`, result: lk ? `SCORED for approved run ${dPin.locked2022.approved_run}: n ${lk.n}, pass rate ${lk.pass_rate}, bias ${lk.bias_s} s` : 'locked, not scored'},
      {name: 'WEC BoP Δ v2 (step 21)', result: 'not on main; report-only after the σ_meas stop (0.82 s > 0.1 s)'},
    ],
  };
  writeFileSync(out + '/pipeline-report.json', JSON.stringify(r, null, 1) + '\n');
  writeFileSync(out + '/pipeline-report.md', md(r));
  console.log(md(r));
}
