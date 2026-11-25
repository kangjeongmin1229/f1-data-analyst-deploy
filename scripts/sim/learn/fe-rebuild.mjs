// The one Formula E rebuild of the LapSim pipeline (central 2026-11-25 14:39): saves the committed fe-fit.json, runs build-fe.mjs on
// this checkout's kernel and copies its outputs to <out>. The report job (FE paired harm) and step 35's FE checks both read these
// files; nobody else runs build-fe.mjs in the pipeline.   node scripts/sim/learn/fe-rebuild.mjs <out dir>
import {copyFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export const FE_OUTPUTS = ['scripts/sim/data/learn/fe-fit.json', 'worker/lapsim/fe-data.js', 'worker/lapsim/fe-tracks-data.js', 'worker/lapsim/fe-zones-data.js', 'scripts/sim/data/track-registry.json'];
export function feRebuild(out) {
  mkdirSync(out + '/fe', {recursive: true});
  copyFileSync('scripts/sim/data/learn/fe-fit.json', out + '/fe-fit-shipped.json');
  const r = spawnSync(process.execPath, ['scripts/sim/learn/build-fe.mjs'], {encoding: 'utf8', maxBuffer: 1 << 26});
  writeFileSync(out + '/build-fe.log', r.stdout + r.stderr);
  if (r.status !== 0) throw Error('build-fe.mjs failed, see ' + out + '/build-fe.log');
  for (const f of FE_OUTPUTS) copyFileSync(f, out + '/fe/' + f.split('/').pop());
}
if (import.meta.url === `file://${process.argv[1]}`) feRebuild(process.argv[2] || 'out');
