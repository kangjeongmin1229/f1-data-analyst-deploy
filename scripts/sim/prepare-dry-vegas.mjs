// Experiment-only source preparation. Runs the existing downloader and geometry builder
// in an isolated tree; only source selection changes, never geometry tuning.
import {readFile, writeFile, mkdir, cp} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root = resolve('.'), out = resolve(process.argv[2] || '.cache/night-session/vegas');
const hash = b => createHash('sha256').update(b).digest('hex');
const replace = (s, before, after) => { if (s.split(before).length !== 2) throw Error('Source transformation does not match exactly once'); return s.replace(before, after); };
await mkdir(join(out, 'scripts/sim'), {recursive:true});
await mkdir(join(out, 'input'), {recursive:true});
await cp('worker/lapsim', join(out, 'worker/lapsim'), {recursive:true});
await writeFile(join(out, 'package.json'), '{"type":"module"}\n');
const originalFetch = await readFile('scripts/sim/fetch-openf1.mjs','utf8');
let fetcher = replace(originalFetch,
  "(await openf1('sessions', {year})).filter(s => s.session_name === 'Qualifying' && Date.parse(s.date_end) < Date.now() - 3 * 3600e3)",
  "(await openf1('sessions', {year})).filter(s => [9314,9640,9854].includes(s.session_key))");
fetcher = replace(fetcher, 'for (const year of YEARS) {\n  for (const s of byYear[year]) {', "latest['Las Vegas'] = 2024;\nfor (const year of YEARS) {\n  for (const s of byYear[year]) {");
await writeFile(join(out, 'scripts/sim/fetch-openf1.mjs'), fetcher);
const env = {...process.env, LAPSIM_CACHE:join(out,'input'), LAPSIM_TRACE_DRIVERS:'10', LAPSIM_GEOMETRY_DRIVERS:'14', LAPSIM_RACES:'off', LAPSIM_POS_K:'0.4', LAPSIM_KAPPA_K:'0.8', LAPSIM_SIGMA:'7', LAPSIM_CURV_SMOOTH:'6', LAPSIM_SIGMA_MIN:'3'};
const run = (file,args=[]) => { const p=spawnSync(process.execPath,[file,...args],{cwd:out,env,stdio:'inherit'}); if(p.status!==0) throw Error(`Failed ${file}: ${p.status}`); };
run('scripts/sim/fetch-openf1.mjs',['2023,2024,2025']);
const index=JSON.parse(await readFile(join(out,'input/index.json')));
if(index.length!==3 || ![9314,9640,9854].every(k=>index.some(x=>x.session_key===k))) throw Error('Missing requested source session');
const source=JSON.parse(await readFile(join(out,'input/sessions/2024-las-vegas.json')));
if(!source.weather.length || source.weather.some(w=>!Number.isFinite(w[5]) || w[5]!==0)) throw Error('Geometry source is not verified zero-rain');
const originalBuild=await readFile('scripts/sim/build-geometry.mjs','utf8');
const builder=replace(originalBuild, 'const isGeometry = x => x.year === latestYear[x.circuit];', 'const isGeometry = x => x.session_key === 9640;');
await writeFile(join(out,'scripts/sim/build-geometry.mjs'),builder);
run('scripts/sim/build-geometry.mjs');
const {lapsimTracks: production}=await import(join(root,'worker/lapsim/tracks-data.js'));
const {lapsimTracks: candidate}=await import(join(out,'worker/lapsim/tracks-data.js'));
if(candidate['las-vegas']?.sessionKey!==9640 || Object.keys(candidate).length!==1) throw Error('Unexpected built geometry');
const pinnedPath='.cache/wec-consistent-rounds/control/.cache/lapsim/traces.json';
const pinnedBytes=await readFile(pinnedPath);
if(hash(pinnedBytes)!=='36a1f55ac59e73f05abf4144ea08d1c2cdb7d8b78854d7de19e99a83f4f64413') throw Error('HARD STOP: pinned trace hash mismatch');
const pinned=JSON.parse(pinnedBytes), fresh=JSON.parse(await readFile(join(out,'input/traces.json')));
let replaced=0;
const traces=pinned.map(t=>{
 if(t.track!=='las-vegas')return t;
 const r=fresh.find(r=>r.session_key===t.session_key && r.driver_number===t.driver_number && r.lap_seconds===t.lap_seconds);
 if(!r || ['v','throttle','brake','sectors'].some(k=>JSON.stringify(r[k])!==JSON.stringify(t[k]))) throw Error(`Source cannot reproduce pinned measurement ${t.session_key}/${t.driver_number}`);
 replaced++; return {...t,s:r.s};
});
if(replaced!==30)throw Error(`Unexpected replacement count ${replaced}`);
await writeFile(join(out,'candidate-tracks.js'),`export const lapsimTracks=${JSON.stringify({...production,'las-vegas':candidate['las-vegas']})};\n`);
await writeFile(join(out,'candidate-traces.json'),JSON.stringify(traces));
const inputs={};
for(const p of ['candidate-tracks.js','candidate-traces.json','input/index.json','input/circuits.json','input/f1-circuits.geojson',...index.map(x=>'input/sessions/'+x.file)]) inputs[p]=hash(await readFile(join(out,p)));
await writeFile(join(out,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),sourceSession:9640,geometryDrivers:14,traceDrivers:10,tuning:{posK:.4,kappaK:.8,sigma:7,curvatureSmooth:6,sigmaMin:3,ds:5},replaced,otherTracesUnchanged:855,otherTracksUnchanged:true,sourceHashes:{fetcher:hash(originalFetch),builder:hash(originalBuild)},inputs},null,2)+'\n');
console.log('Ready: dry Las Vegas geometry and matching distances; pinned measurements unchanged.');
