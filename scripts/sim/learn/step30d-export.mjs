// Step 30d (report-only): export the map line data (midline, drawn edges, iRacing kerb offsets) for the TUM tracks.
// Usage (repo root): node scripts/sim/learn/step30d-export.mjs <out.json>
import {writeFileSync} from 'node:fs';
import {lineData} from '../../../worker/simulation.js';

const ids = ['austin', 'hungaroring', 'catalunya', 'melbourne', 'mexico-city', 'montreal', 'monza', 'sakhir', 'interlagos', 'shanghai',
  'silverstone', 'spa-francorchamps', 'spielberg', 'suzuka', 'yas-marina-circuit', 'zandvoort', 'kuala-lumpur'];
const out = {};
for (const id of ids) {
  const d = lineData(id), k = d.kerbLine;
  out[id] = {edges: d.edges, mid: d.mid, left: d.left, right: d.right, nrm: d.nrm,
    kerbL: k ? k.l.map(v => v / 10) : null, kerbR: k ? k.r.map(v => v / 10) : null};
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.entries(out).map(([k, v]) => `${k}:${v.edges}:${v.kerbL ? 'kerbs' : '-'}`).join(' '));
