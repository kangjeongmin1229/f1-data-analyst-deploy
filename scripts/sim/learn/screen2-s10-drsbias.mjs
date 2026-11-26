import {readFileSync} from 'node:fs';
const csv = f => { const [h, ...r] = readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(',')); return r.map(x => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };
const rows = d => csv(d + '/baseline.csv').map(r => ({id: r.case_id, use: r.use, event: r.year + '|' + r.event, zone: r.track + '#' + r.zone, meas: +r.meas_delta_s, pred: +r.pred_delta_s, err: +r.pred_delta_s - +r.meas_delta_s}));
const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))]; };
const [bd, cd] = process.argv.slice(2), B = rows(bd), C = rows(cd);
if (B.map(r => r.id).join() !== C.map(r => r.id).join()) throw new Error('case lists differ');
const ev = [...new Set(B.map(r => r.event))], by = (rs, e) => rs.filter(r => r.event === e).map(r => r.err), E = Object.fromEntries(ev.map(e => [e, [by(B, e), by(C, e)]]));
const u = rng(7), dd = [], cut = []; for (let i = 0; i < 2000; i++) { const eb = [], ec = []; for (let j = 0; j < ev.length; j++) { const [x, y] = E[ev[Math.floor(u() * ev.length)]]; eb.push(...x); ec.push(...y); } dd.push(mean(ec) - mean(eb)); cut.push(1 - Math.abs(mean(ec)) / Math.abs(mean(eb))); }
const r4 = x => +x.toFixed(4), rms = a => Math.sqrt(mean(a.map(x => x * x)));
console.log(JSON.stringify({n: B.length, events: ev.length, biasH0: r4(mean(B.map(r => r.err))), biasS10: r4(mean(C.map(r => r.err))), diff: r4(mean(C.map(r => r.err)) - mean(B.map(r => r.err))), diff90: [r4(pct(dd, 0.05)), r4(pct(dd, 0.95))],
  cut: r4(1 - Math.abs(mean(C.map(r => r.err))) / Math.abs(mean(B.map(r => r.err)))), cut90: [r4(pct(cut, 0.05)), r4(pct(cut, 0.95))], rmsH0: r4(rms(B.map(r => r.err))), rmsS10: r4(rms(C.map(r => r.err))),
  medMeas: r4(pct(B.map(r => r.meas), 0.5)), medPredH0: r4(pct(B.map(r => r.pred), 0.5)), medPredS10: r4(pct(C.map(r => r.pred), 0.5))}));
const Z = {}; B.forEach((r, i) => { if (r.use === 'drs_lap') return; (Z[r.zone] ??= []).push([r.err, C[i].err]); });
const zl = Object.entries(Z).map(([z, a]) => [z, a.length, r4(mean(a.map(x => x[0]))), r4(mean(a.map(x => x[1])))]).sort((a, b) => Math.abs(b[3] - b[2]) - Math.abs(a[3] - a[2]));
console.log('zones', zl.length, 'uses', JSON.stringify([...new Set(B.map(r => r.use))])); console.log('largest per-zone change [zone, n, biasH0, biasS10]:', JSON.stringify(zl.slice(0, 8)));
console.log('zones better/worse |bias|:', zl.filter(z => Math.abs(z[3]) < Math.abs(z[2])).length, '/', zl.filter(z => Math.abs(z[3]) > Math.abs(z[2])).length);
