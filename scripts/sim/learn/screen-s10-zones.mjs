// Screen S10 (report-only, central 07:15 26 Nov; scan note claude/status-2026-11-26-screen-S10.md): DRS per zone, leave one event out.
// Flap delay per zone: step 32b telemetry (zone-mapping-table.csv, first open position after the mapped line, fork step36-mde ec85ead,
// sha256 078fd588…). For event (season, track) zone z: median of the same track's zones within 100 m in the other seasons; none → median
// of every other event's zones. Low-drag ratio: only per track is measured (step 2a car-measured-data.js perTrack cdALow / cdA); for
// (season, track): mean of the same track in the other seasons; none → mean of the other tracks of that season. Own event never used. A
// same-zone delay outside [0, 150] m is taken as a mapping error and replaced by the pooled median.
//   node scripts/sim/learn/screen-s10-zones.mjs <zone-mapping-table.csv> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimCarMeasured as M} from '../../../worker/lapsim/car-measured-data.js';

const [inp, outPath] = process.argv.slice(2);
const [h, ...rs] = readFileSync(inp, 'utf8').trim().split(/\r?\n/).map(l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
const rows = rs.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))).filter(r => r.track && r.prod_from_m !== '' && +r.year <= 2025);
const tel = r => r.telemetry_first_open_minus_mapped_m === '' ? null : +r.telemetry_first_open_minus_mapped_m;
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const ratio = (y, tr) => { const t = M.seasons[y]?.perTrack?.[tr]; return t?.cdA?.value && t?.cdALow?.value ? t.cdALow.value / t.cdA.value : null; };
const out = {label: 'measured (32b telemetry delay; step 2a per-track ratio), leave one event out', events: {}};
for (const key of new Set(rows.map(r => r.year + '|' + r.track))) {
  const [y, tr] = key.split('|'), own = rows.filter(r => r.year === y && r.track === tr), others = rows.filter(r => !(r.year === y && r.track === tr) && tel(r) != null);
  const zones = own.map(r => { const near = others.filter(o => o.track === tr && Math.abs(+o.prod_from_m - +r.prod_from_m) <= 100).map(tel);
    const pooled = med(others.map(tel)), v = near.length ? med(near) : null, ok = v != null && v >= 0 && v <= 150; // outside [0, 150] m = a mapping error
    return {zone: +r.zone, at: +r.prod_from_m, atSim: +r.sim_from_m, d: +(ok ? v : pooled).toFixed(1), src: ok ? `same zone, ${near.length} other season(s)` : v != null ? `pooled other events (same-zone ${v.toFixed(0)} m outside [0, 150])` : 'pooled other events'}; });
  const same = Object.keys(M.seasons).filter(s => s !== y).map(s => ratio(s, tr)).filter(x => x != null);
  const pool = Object.keys(M.seasons[y]?.perTrack || {}).filter(t => t !== tr).map(t => ratio(y, t)).filter(x => x != null);
  out.events[key] = {zones, lowR: +(same.length ? mean(same) : mean(pool)).toFixed(4), lowRSrc: same.length ? `same track, ${same.length} other season(s)` : `other tracks of ${y} (${pool.length})`};
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
const ev = Object.values(out.events), zs = ev.flatMap(e => e.zones);
console.log({events: ev.length, zones: zs.length, sameZone: zs.filter(z => z.src.startsWith('same')).length, delayMedian: med(zs.map(z => z.d)), delayRange: [Math.min(...zs.map(z => z.d)), Math.max(...zs.map(z => z.d))],
  lowRMean: +mean(ev.map(e => e.lowR)).toFixed(4), lowRRange: [Math.min(...ev.map(e => e.lowR)), Math.max(...ev.map(e => e.lowR))], lowRSameTrack: ev.filter(e => e.lowRSrc.startsWith('same')).length});
