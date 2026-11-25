// Step 35 item 4 (report only, no pre-registration yet, fe-gen4.js unchanged): Gen4 prior vs the official Jarama test (16-20 Nov 2026,
// Al Kamel files fetched in Actions: fe-cars-s13-r<run>.csv on fork release fe-inputs-s13). Grid over lateral grip μY (grip set in the
// prior's ratio) and SCz, SCx tied by the prior lift/drag ratio, at 600 kW; target: the fastest car's three best sectors of the fastest
// session (I1/I2 from the printed map distances, fe-sector-lines.json), times the Jarama track factor exp(G_gen3evo + T) of the rebuilt fit.
//   node scripts/sim/learn/fe-gen4-jarama.mjs <fe-cars-s13.csv>
import {readFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {lapsimFe} from '../../../worker/lapsim/fe-data.js';
import {gen4Car, gripSet, FE_GEN4_AERO, FE_GEN4_PRIOR} from '../../../worker/lapsim/fe-gen4.js';
import {parseCsv} from './build-endurance.mjs';
const K = lapsimKernel(), tr = K.trackFromData(lapsimFeTracks.jarama), SL = JSON.parse(readFileSync('scripts/sim/data/learn/fe-sector-lines.json', 'utf8')).tracks.jarama;
const rows = parseCsv(readFileSync(process.argv[2], 'utf8')).filter(r => +r.best > 0 && +r.s1 > 0 && +r.rainShare < 0.02).sort((a, b) => +a.best - +b.best), b = rows[0];
const meas = [+b.s1, +b.s2, +b.s3], sc = Math.exp(lapsimFe.T?.jarama ?? (lapsimFe.tracks.jarama?.T || 0));
const sim = car => { const r = K.simulateLap(tr, car, {}), n = r.time.length, t = f => r.time[Math.min(n - 1, Math.round(f * n))]; return [t(SL.f1), t(SL.f2) - t(SL.f1), r.lapTime - t(SL.f2)].map(x => x * sc); };
const out = {};
for (const aero of ['hdf', 'ldf']) { const A = FE_GEN4_AERO[aero], ld = A.clA / A.cdA; let best = null;
  for (let mu = FE_GEN4_PRIOR.muY.lo; mu <= FE_GEN4_PRIOR.muY.hi + 1e-9; mu += 0.025) for (let cl = A.bounds.clA[0]; cl <= A.bounds.clA[1] + 1e-9; cl += A.bounds.clA[1] > 4 ? 0.25 : 0.1) {
    const cd = Math.min(A.bounds.cdA[1], Math.max(A.bounds.cdA[0], cl / ld)), car = {...gen4Car({aero, powerKW: 600}), ...gripSet(mu), clA: cl, cdA: cd, clALow: cl, cdALow: cd}, s = sim(car);
    const e = s.reduce((a, x, i) => a + Math.log(x / meas[i]) ** 2, 0); if (!best || e < best.e) best = {e, mu: +mu.toFixed(3), clA: +cl.toFixed(2), cdA: +cd.toFixed(3), sectors: s.map(x => +x.toFixed(3)), lap: +s.reduce((a, x) => a + x).toFixed(3)}; }
  const prior = sim({...gen4Car({aero, powerKW: 600})}); best.rmsPct = +(Math.sqrt(best.e / 3) * 100).toFixed(2);
  best.atBound = best.mu <= FE_GEN4_PRIOR.muY.lo || best.mu >= FE_GEN4_PRIOR.muY.hi || best.clA <= A.bounds.clA[0] || best.clA >= A.bounds.clA[1];
  out[aero] = {prior: {sectors: prior.map(x => +x.toFixed(3)), lap: +prior.reduce((a, x) => a + x).toFixed(3)}, fit: best}; }
console.log(JSON.stringify({session: b.session, team: b.team, best: +b.best, sectors: meas, ideal: +b.ideal, weather: {airC: b.airC, trackC: b.trackC}, trackFactor: +sc.toFixed(4), out}, null, 1));
