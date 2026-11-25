// Screen S9: sector-line shift that would remove each layout's adjacent-sector offsets (report only). Reads /tmp/s9.json and /tmp/fe-sector-lines.json.
import {readFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {FE_GENS} from '../../../worker/lapsim/fe-cars.js';
const K = lapsimKernel(), A = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, S9 = JSON.parse(readFileSync('/tmp/s9.json')), SL = JSON.parse(readFileSync('/tmp/fe-sector-lines.json')).tracks;
const car = {...FE_GENS['fe-gen3evo'].car, frontMaxW: 50e3};
for (const [id, L] of Object.entries(S9.layouts)) { const t = A[id], res = K.simulateLap(K.trackFromData(t), car, {}), n = res.v.length, sl = SL[id], o = L.sectors.map(s => s.offsetPp);
  // shift each sector line by the distance that moves the adjacent-sector imbalance: I1 takes −o1, I2 takes +o3 (time, % of lap) at the model speed there
  const at = f => res.v[Math.min(n - 1, Math.round(f * n))], dI1 = -o[0] / 100 * res.lapTime * at(sl.f1), dI2 = o[2] / 100 * res.lapTime * at(sl.f2);
  console.log(id.padEnd(14), 'off', o.map(x => x.toFixed(2)).join('/'), 'implied I1 shift', dI1.toFixed(0), 'm @', (at(sl.f1) * 3.6).toFixed(0), 'km/h; I2', dI2.toFixed(0), 'm @', (at(sl.f2) * 3.6).toFixed(0), '| label check', sl.labelVsPrintedM, 'ipShift', sl.ipShiftM); }
