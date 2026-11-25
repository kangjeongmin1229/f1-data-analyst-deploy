// Step 35 item 3 (data fix): Formula E intermediate timing lines I1 / I2 from the official FIA Formula E circuit maps. The map header prints
// them ("I1 @ 780m / I2 @ 1845m", "IP1 @ 895m/ IP2 @ 1720m"; distance from the finish line); the labels IP1 / IP2 also sit beside the
// line. Primary: the printed distance ÷ the printed track length. Check: the IP label projected onto the map's lap line (oriented from the
// FINISH label, fe-lines.mjs orientLine, the line build-fe.mjs uses). Al Kamel sectors: S1 finish -> I1, S2 I1 -> I2, S3 I2 -> finish.
// Out: scripts/sim/data/learn/fe-sector-lines.json. Spot checks by eye: status doc (claude/status-2026-11-25-step35-fe.md).
//   node scripts/sim/learn/fe-sector-lines.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {lineOf, orientLine, footArc} from './fe-lines.mjs';

const maps = JSON.parse(readFileSync('scripts/sim/data/learn/fe-maps.json', 'utf8')).events, FIT = JSON.parse(readFileSync('scripts/sim/data/learn/fe-fit.json', 'utf8'));
const num = s => { const t = s.replace(/\s/g, ''); return /^\d{1,2}[.,]\d{3}$/.test(t) ? +t.replace(/[.,]/, '') : +t.replace(',', '.'); }; // "1,152" / "1.093" = thousands
const lengthOf = s => { const m = /length\s*:?\s*([\d][\d,. ]*\d)\s*(k?m)/i.exec(s); return m ? +m[1].replace(/\D/g, '') : null; };
const along = Q => { const c = [0]; for (let i = 1; i < Q.length; i++) c.push(c[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1])); return c; };
const near = (Q, w) => { let b = Infinity, k = 0; Q.forEach((p, i) => { const d = Math.hypot(p[0] - w.x, p[1] - (w.y - w.h / 2)); if (d < b) { b = d; k = i; } }); return {k, d: b}; };
const VENUE = {'São Paulo': /S.o Pa/, Jarama: /Madrid|Jarama/};
const out = {source: 'official FIA Formula E circuit maps (Al Kamel Systems): printed "I1 @ … m / I2 @ … m" and the IP1 / IP2 labels', tracks: {}};
for (const l of FIT.layouts) {
  const re = VENUE[l.venue] || new RegExp(l.venue.split(' ')[0], 'i');
  const cand = maps.filter(m => re.test(m.event) && Math.abs((lengthOf(m.words.map(w => w.t).join(' ')) || 0) / l.lengthM - 1) < 0.004)
    .sort((a, b) => b.season.localeCompare(a.season, undefined, {numeric: true}));
  let got = null;
  for (const m of cand) { const s = m.words.map(w => w.t).join(' ');
    const a = /I\s?P?1\s*@\s*([\d][\d,.]*)\s*m?/i.exec(s), b = /I\s?P?2\s*@\s*([\d][\d,.]*)\s*m?/i.exec(s); if (!a || !b) continue;
    const i1 = num(a[1]), i2 = num(b[1]); if (!(i1 > 0 && i2 > i1 && i2 < l.lengthM)) continue;
    let check = null; const l0 = lineOf(m);
    if (l0 && l0.gapPt <= 40) { const o = orientLine(l0, m, l.lengthM), P = o.line.pts, cum = along(P), tot = cum.at(-1) + Math.hypot(P[0][0] - P.at(-1)[0], P[0][1] - P.at(-1)[1]), sc = l.lengthM / tot;
      const ip = k => { const w = m.words.find(x => x.t === k); if (!w) return null; const q = footArc(P, w); return {frac: +(q.s / q.total).toFixed(4), labelOffM: Math.round(q.d * sc)}; };
      check = {ip1: ip('IP1'), ip2: ip('IP2'), startVerified: o.startVerified}; }
    const f1 = i1 / l.lengthM, f2 = i2 / l.lengthM, ipShiftM = check?.ip1 && check?.ip2 ? Math.round(((check.ip1.frac - f1 + 1.5) % 1 - 0.5 + (check.ip2.frac - f2 + 1.5) % 1 - 0.5) / 2 * l.lengthM) : null, dev = check?.ip1 && check?.ip2 ? Math.max(Math.abs(check.ip1.frac - f1), Math.abs(check.ip2.frac - f2)) * l.lengthM : null;
    got = {map: `${m.season} ${m.event}`, i1M: i1, i2M: i2, lengthM: l.lengthM, f1: +f1.toFixed(4), f2: +f2.toFixed(4), labelCheck: check, labelVsPrintedM: dev == null ? null : Math.round(dev), ipShiftM}; break; }
  out.tracks[l.id] = got;
}
writeFileSync('scripts/sim/data/learn/fe-sector-lines.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out.tracks)) console.log(k.padEnd(16), v ? `${v.map.padEnd(32)} I1 ${v.i1M} m (${v.f1}) I2 ${v.i2M} m (${v.f2}) label check Δ ${v.labelVsPrintedM ?? '–'} m, mean IP shift ${v.ipShiftM ?? '–'} m` : 'no printed I1/I2');
