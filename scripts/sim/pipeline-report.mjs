// LapSim pipeline report (step 27, .github/workflows/lapsim-pipeline.yml): one JSON + markdown per run, tying every number to the run id,
// the input snapshot hashes, the code commit and the settings. No model code here: it only reads the fit outputs.
//   node scripts/sim/pipeline-report.mjs <new calibration-data.js> <shipped calibration-data.js> <out dir>
// Env: GITHUB_RUN_ID, GITHUB_SHA, SHIPPED_DIR, FIT_RESULT, TRACK_STATE_DIFF (track-state-diff.mjs JSON), SNAPSHOT_TAG, SNAPSHOT_SHA256, SNAPSHOT_SUMS (path of SHA256SUMS), DELTA_DIR (Δ benchmark output dir).
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {heldOut, compare} from './exp-compare.mjs';
import {kForVariants} from './gate.mjs';
import {F1_BOUNDS} from './exp-physics.mjs';
import {SERIES} from '../../worker/lapsim/series.js';

const CAR_KEYS = ['muX', 'muY', 'muXTrac', 'clA', 'cdA', 'cdALow', 'pIce'];
const r4 = x => Number.isFinite(x) ? +x.toFixed(4) : null;

// shipped vs new: held-out RMS per group, the largest per-row change, and every car parameter that moved
// gates (central): old = UB ≤ 0.10 pp; honest = the 19:35 amendment for changes that put measured / rule values in (UB ≤ 0.15 pp and
// no fitted parameter at a bound in any class/season; claude/decision-central-gate-honest-2026-11-25.md). LAPSIM_GATE picks it.
export const GATES = {old: {name: 'old', ub: 0.10, bounds: false}, honest: {name: 'honest', ub: 0.15, bounds: true}};
export const gateOf = (env = process.env) => GATES[env.LAPSIM_GATE] || GATES.old;
export function diff(shipped, cand, gate = GATES.old) {
  const a = heldOut(shipped), b = heldOut(cand), rows = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!(k in a) || !(k in b) || Math.abs(a[k] - b[k]) > 1e-9) rows.push({row: k, shippedPct: r4(a[k]), newPct: r4(b[k])});
  const cars = [], add = (where, x, y) => { for (const k of CAR_KEYS) if (Number.isFinite(x?.[k]) && Math.abs(x[k] - (y?.[k] ?? NaN)) > 1e-9 * Math.max(1, Math.abs(x[k]))) cars.push({where, param: k, shipped: r4(x[k]), new: r4(y?.[k])}); };
  for (const [y, s] of Object.entries(shipped.seasons || {})) add(`f1 ${y}`, s.car, cand.seasons?.[y]?.car);
  for (const [cls, ys] of Object.entries(shipped.series?.wec || {})) for (const [y, s] of Object.entries(ys)) add(`wec-${cls} ${y}`, s.car, cand.series?.wec?.[cls]?.[y]?.car);
  return {heldOut: compare(shipped, cand), harm: pairedHarm(a, b, gate.ub), wec: wecDetail(a, b, gate.ub), gate: gate.name, changedRows: rows, changedCarParams: cars, identical: rows.length === 0 && cars.length === 0};
}

// step 36: two JSON values compared, 'generated' (a date) ignored → differing paths (first 40) and their count
export function jsonDiff(a, b, path = '', out = []) {
  if (path.endsWith('.generated')) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) jsonDiff(a[k], b[k], path + '.' + k, out); }
  else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({path: path.slice(1), shipped: a, new: b});
  return out;
}
const learnedJson = f => JSON.parse(readFileSync(f, 'utf8').split('export const lapsimLearned=')[1].trim().replace(/;$/, ''));
export function endurance(dir) {
  if (!dir || !existsSync(`${dir}/endurance-fit.json`)) return null;
  const n = JSON.parse(readFileSync(`${dir}/endurance-fit.json`, 'utf8')), fit = jsonDiff(JSON.parse(readFileSync(`${dir}/shipped-endurance-fit.json`, 'utf8')), n), page = jsonDiff(learnedJson(`${dir}/shipped-learned-data.js`), learnedJson(`${dir}/learned-data.js`));
  return {rows: n.rows, events: n.events, layouts: n.layouts, models: n.models, byGroup: n.byGroup, byGroupSeries: n.byGroupSeries, fitDiffs: fit.length, pageDiffs: page.length, fitDiff: fit.slice(0, 40), pageDiff: page.slice(0, 40), identical: !fit.length && !page.length};
}
const endMd = e => !e ? ['Not run.', ''] : [
  `Rows ${e.rows}, events ${e.events}, layouts ${e.layouts}, models ${e.models}. Reproduction (date field ignored): ${e.identical ? '**identical** to the shipped endurance-fit.json and learned-data.js.' : `**endurance-fit.json ${e.fitDiffs} values differ, learned-data.js ${e.pageDiffs} values differ** (first 40 each in the JSON).`}`, '',
  '| group / series | models | before | raw | eventOut | eventOutClass | layoutOut | modelOut |', '|---|---|---|---|---|---|---|---|',
  ...Object.entries({...e.byGroup, ...e.byGroupSeries}).map(([g, x]) => `| ${g} | ${x.models} | ${x.before ?? '–'} | ${x.raw ?? '–'} | ${x.eventOut ?? '–'} | ${x.eventOutClass ?? '–'} | ${x.layoutOut ?? '–'} | ${x.modelOut ?? '–'} |`), ''];

// WEC speed-trap residual per class-season: sim top (or, with a known trap position, the straight peak there) − real trap, km/h
export function trapRms(cal) { const o = {}; for (const [c, ys] of Object.entries(cal?.series?.wec || {})) for (const [y, s] of Object.entries(ys)) { const e = Object.values(s.tracks || {}).filter(t => Number.isFinite(t.trapKph) && Number.isFinite(t.simTopKph)).map(t => t.simTopKph - t.trapKph);
  if (e.length) o[`wec-${c}/${y}`] = {n: e.length, rmsKph: r4(Math.sqrt(e.reduce((a, x) => a + x * x, 0) / e.length)), biasKph: r4(e.reduce((a, x) => a + x, 0) / e.length), atPosition: Object.values(s.tracks).filter(t => t.trapAtM != null).length}; } return o; }
const trapMd = r => !r.traps ? [] : ['## WEC speed trap (sim − real, km/h; shipped → this run)', '', '| class-season | n | at position | RMS shipped | RMS | bias shipped | bias |', '|---|---|---|---|---|---|---|',
  ...Object.keys({...r.traps.shipped, ...r.traps.new}).map(k => `| ${k} | ${r.traps.new[k]?.n ?? '–'} | ${r.traps.new[k]?.atPosition ?? 0} | ${r.traps.shipped[k]?.rmsKph ?? '–'} | ${r.traps.new[k]?.rmsKph ?? '–'} | ${r.traps.shipped[k]?.biasKph ?? '–'} | ${r.traps.new[k]?.biasKph ?? '–'} |`), ''];
// step 34: Q → Hyperpole repeat σ_rep per WEC class and the IMSA split-half σ (scripts/sim/learn/noise-floor.mjs → noise-floor-rep.json)
const repMd = n => !n ? [] : ['## σ_meas per class (step 34: Q → Hyperpole repeat; IMSA split-half)', '', '| class series | σ_rep lap % [90 %] | pairs |', '|---|---|---|',
  ...Object.entries(n.floors || {}).map(([k, o]) => `| ${k} | ${o.rep.lap.sigmaPct ?? '–'} ${o.rep.lap.pi90Pct ? '[' + o.rep.lap.pi90Pct.join(', ') + ']' : ''} | ${o.rep.lap.pairs} |`),
  ...Object.entries(n.split || {}).map(([k, o]) => `| ${k} (split-half) | ${o.lap?.sigmaPct ?? '–'} | ${o.cars ?? o.n ?? '–'} cars |`), ''];
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

// WEC per class and per track (central 2026-11-25 16:10, after step 34a's base drop): the same paired harm per class (all seasons
// of that class) and one row per track (mean over the classes and seasons that hold it out), so a track-level term shows as one row
export function wecDetail(a, b, ub = 0.10) {
  const keys = Object.keys(a).filter(k => k.startsWith('wec') && k in b), h = k => Math.abs(b[k]) - Math.abs(a[k]);
  const byClass = {}, byTrack = {};
  for (const k of keys) { const [g, t] = k.split('|'), c = g.split('/')[0]; (byClass[c] ||= {a: {}, b: {}}); byClass[c].a[k] = a[k]; byClass[c].b[k] = b[k]; (byTrack[t] ||= []).push(h(k)); }
  return {byClass: Object.fromEntries(Object.entries(byClass).map(([c, x]) => { const { rows, ...r } = pairedHarm(x.a, x.b, ub).wec; return [c, r]; })),
    byTrack: Object.entries(byTrack).map(([t, v]) => ({track: t, n: v.length, meanHarmPp: r4(v.reduce((x, y) => x + y, 0) / v.length), maxHarmPp: r4(Math.max(...v))})).sort((x, y) => y.meanHarmPp - x.meanHarmPp)};
}
// fitted car parameters on a fit bound (rule 3.4: a value at its bound is a finding; central 17:18: flag ClA at bound per class), and
// (F1 pIce bounds are a scale on the prior, not watts: left out) and μx/μy per series (central 17:18: 0.66–0.73, reported as a feature, not a fit target)
export function carTable(cal) {
  const at = (v, [lo, hi]) => !Number.isFinite(v) ? null : v <= lo * (1 + 1e-6) ? 'min' : v >= hi * (1 - 1e-6) ? 'max' : null;
  const row = (where, car, bounds) => ({where, muX: r4(car?.muX), muY: r4(car?.muY), muXOverMuY: r4(car?.muX / car?.muY), clA: r4(car?.clA),
    atBound: Object.fromEntries(Object.entries(bounds).map(([k, b]) => [k, at(car?.[k], b)]).filter(([, v]) => v))});
  return [...Object.entries(cal.seasons || {}).map(([y, s]) => row(`f1/${y}`, s.car, (({pIce, ...b}) => b)(F1_BOUNDS))),
    ...Object.entries(cal.series?.wec || {}).flatMap(([c, ys]) => Object.entries(ys).map(([y, s]) => row(`wec-${c}/${y}`, s.car, SERIES.wec.classes[c]?.bounds || {})))];
}

// series that pass the ship rule ship; a failing series keeps the shipped calibration (central 16:10: WEC fails → ship F1/FE only).
// WEC also needs (central 17:20): every class passing, no track row over +1.0 pp, and held-out RMS within ±0.05 pp of step 34a's
// kernel-only WEC result (0.992 %, central decision 17:18)
export const WEC_KERNEL_ONLY = {rmsPct: 0.992, tolPp: 0.05};
export function shipSeries(harm, fe, wec, wecRmsPct, cars = null) {
  const out = Object.entries({...harm, ...(fe ? {fe} : {})}).map(([s, x]) => ({series: s, pass: !!x?.pass, why: x?.pass ? [] : ['series rule']}));
  const w = out.find(x => x.series === 'wec');
  if (w && wec) {
    for (const [c, x] of Object.entries(wec.byClass)) if (!x.pass) w.why.push(`class ${c}`);
    for (const t of wec.byTrack) if (t.maxHarmPp > 1.0) w.why.push(`track ${t.track}`);
    if (!(Math.abs(wecRmsPct - WEC_KERNEL_ONLY.rmsPct) <= WEC_KERNEL_ONLY.tolPp)) w.why.push(`held-out RMS ${wecRmsPct} % not within ±${WEC_KERNEL_ONLY.tolPp} pp of ${WEC_KERNEL_ONLY.rmsPct} %`);
    w.pass = !w.why.length;
  }
  // honest gate: a fitted parameter on a bound in any class/season of the series blocks it (cars = carTable of the new calibration)
  if (cars) for (const x of out) { const at = cars.filter(c => c.where.startsWith(x.series === 'wec' ? 'wec-' : x.series + '/') && Object.keys(c.atBound).length);
    if (at.length) { x.why.push('at bound: ' + at.map(c => `${c.where} ${Object.entries(c.atBound).map(([k, b]) => k + ' ' + b).join('/')}`).join(', ')); x.pass = false; } }
  return out;
}

// FE (central 2026-11-25 14:27): build-fe.mjs writes one event-hidden error per row (layout × season × rule set × session) to
// fe-fit.json; same paired harm as F1/WEC on those rows
export const feHeldOut = fit => Object.fromEntries(fit.rows.map(r => [`fe/${r.key}/${r.layout}/${r.season}/${r.session}`, r.event]));
export const feHarm = (shippedFit, candFit, ub = 0.10) => pairedHarm(feHeldOut(shippedFit), feHeldOut(candFit), ub).fe;

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
  ...trapMd(r), ...repMd(r.rep),
  '## Endurance / GT3 learning (fit-endurance.mjs, pinned committed tables; RMS %)', '', ...endMd(r.endurance),
  '## Noise floors σ_meas (noise-floor.mjs, report-only)', '', r.noise || 'Not run.', '',
  '## Δ benchmarks', '', ...r.delta.map(d => `- ${d.name}: ${d.result}`), '',
  '## Inputs (SHA256SUMS of the snapshot)', '', '```', r.inputs.sums.trim(), '```', ''].join('\n');
const fitMd = r => [
  '## Held-out lap error (RMS %, shipped → this run)', '', '| group | n | shipped | this run |', '|---|---|---|---|',
  ...Object.entries(r.diff.heldOut).map(([g, x]) => `| ${g} | ${x.n} | ${x.base} | ${x.cand} |`), '',
  `Ship rule, gate ${r.diff.gate} (paired harm per held-out track/event vs shipped, one-sided 95 % UB ≤ ${(GATES[r.diff.gate] || GATES.old).ub.toFixed(2)} pp, no row worse than +1.0 pp${r.diff.gate === 'honest' ? ', no fitted parameter at a bound' : ''}): ${Object.entries(r.diff.harm).map(([s, x]) => `${s} n ${x.n}, mean ${x.meanPp} pp, UB ${x.ub95Pp} pp, worse ${x.worse}, worst row +${x.maxPp} pp${x.overRowLimit?.length ? ` (over +1.0: ${x.overRowLimit.join(", ")})` : ""} → ${x.pass ? 'PASS' : 'FAIL'}`).join('; ')}.`, '',
  ...(r.diff.wec ? ['WEC per class (paired harm, all seasons of the class):', '', '| class | n | mean pp | UB pp | worse | worst pp | rows > +1.0 pp | pass |', '|---|---|---|---|---|---|---|---|',
    ...Object.entries(r.diff.wec.byClass).map(([c, x]) => `| ${c} | ${x.n} | ${x.meanPp} | ${x.ub95Pp} | ${x.worse} | ${x.maxPp} | ${(x.overRowLimit || []).length} | ${x.pass ? 'pass' : 'FAIL'} |`), '',
    'WEC per track (mean over the class × season rows that hold it out):', '', '| track | rows | mean harm pp | max harm pp |', '|---|---|---|---|',
    ...r.diff.wec.byTrack.map(t => `| ${t.track} | ${t.n} | ${t.meanHarmPp} | ${t.maxHarmPp} |`), ''] : []),
  ...(r.cars ? ['Fitted cars (this run): μx, μy, μx/μy, ClA and every parameter on a fit bound:', '', '| car | μx | μy | μx/μy | ClA | at bound |', '|---|---|---|---|---|---|',
    ...r.cars.map(c => `| ${c.where} | ${c.muX} | ${c.muY} | ${c.muXOverMuY} | ${c.clA} | ${Object.entries(c.atBound).map(([k, b]) => `**${k} at ${b}**`).join(', ') || '–'} |`), ''] : []),
  `Ships per series: ${shipSeries(r.diff.harm, r.feHarm, r.diff.wec, r.diff.heldOut.wec?.cand, r.diff.gate === 'honest' ? r.cars : null).map(x => `${x.series} ${x.pass ? 'ships' : `**blocked (keeps the shipped calibration): ${x.why.join('; ')}**`}`).join(' · ')}.`, '',
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
    diff: existsSync(newF) ? diff(await load(shippedF), await load(newF), gateOf(E)) : null,
    cars: existsSync(newF) ? carTable(await load(newF)) : null,
    carsShipped: carTable(await load(shippedF)),
    // FE_FIT_SHIPPED / FE_FIT_NEW: fe-fit.json before and after build-fe.mjs on this run's kernel
    feHarm: E.FE_FIT_NEW && existsSync(E.FE_FIT_NEW) && existsSync(E.FE_FIT_SHIPPED || '') ? feHarm(JSON.parse(readFileSync(E.FE_FIT_SHIPPED, 'utf8')), JSON.parse(readFileSync(E.FE_FIT_NEW, 'utf8')), gateOf(E).ub) : null,
    trackState: E.TRACK_STATE_DIFF && existsSync(E.TRACK_STATE_DIFF) ? JSON.parse(readFileSync(E.TRACK_STATE_DIFF, 'utf8')) : null,
    // SHIPPED_DIR: the committed level C / forward files, copied before the run's outputs overwrite docs/
    levelC: {shipped: sum(`${E.SHIPPED_DIR}/lapsim-level-c.json`), new: sum('docs/lapsim-level-c.json')},
    forward: {shipped: sum(`${E.SHIPPED_DIR}/lapsim-forward.json`), new: sum('docs/lapsim-forward.json')},
    endurance: endurance(E.ENDURANCE_DIR),
    rep: E.ENDURANCE_DIR && existsSync(`${E.ENDURANCE_DIR}/noise-floor-rep.json`) ? JSON.parse(readFileSync(`${E.ENDURANCE_DIR}/noise-floor-rep.json`, 'utf8')) : null,
    noise: E.NOISE_DIR && existsSync(`${E.NOISE_DIR}/noise-floor.md`) ? readFileSync(`${E.NOISE_DIR}/noise-floor.md`, 'utf8') : null,
    noiseJson: E.NOISE_DIR && existsSync(`${E.NOISE_DIR}/noise-floor.json`) ? JSON.parse(readFileSync(`${E.NOISE_DIR}/noise-floor.json`, 'utf8')) : null,
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
