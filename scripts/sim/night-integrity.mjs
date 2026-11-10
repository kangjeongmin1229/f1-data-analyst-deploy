// Read-only sentinel for the authorized follow-up session.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash = b => createHash('sha256').update(b).digest('hex');
export async function nightIntegrity() {
 const original=JSON.parse(await readFile('scripts/sim/results/wec-consistent-rounds-2026-11-10/production-integrity.json'));
 for(const x of original.files) assert.equal(hash(await readFile(x.path)),x.sha256,`HARD STOP: production runtime/gate changed: ${x.path}`);
 const pinned=JSON.parse(await readFile('.cache/wec-consistent-inputs/verified-inputs.json'));
 const paths={archive:'../lapsim-inputs.tgz',archiveGeometry:'.cache/wec-consistent-inputs/worker/lapsim/tracks-data.js',archiveTraces:'.cache/wec-consistent-inputs/.cache/lapsim/traces.json',rawWec:'.cache/wec-consistent-inputs/.cache/lapsim/wec.json',geometry:'worker/lapsim/tracks-data.js',seed:'worker/lapsim/calibration-data.js',oldB:'worker/lapsim/transfer-grip-data.js',timing71:'scripts/sim/data/t71-wec-extra.json',distanceOverride:'scripts/sim/results/wec-consistent-2026-11-10/interlagos-distance-override.json',projectionAudit:'scripts/sim/results/wec-consistent-2026-11-10/projection-audit.json',acceptedToleranceResult:'scripts/sim/results/wec-tolerance-2026-11-10/results.json',excludedWec:'.cache/wec-sector-run/baseline/.cache/lapsim/wec.json'};
 for(const [key,path] of Object.entries(paths)) assert.equal(hash(await readFile(path)),pinned[key].sha256,`HARD STOP: input hash mismatch: ${key}`);
 return {at:new Date().toISOString(),productionFiles:original.files.length,pinnedInputs:Object.keys(paths).length,pass:true};
}
