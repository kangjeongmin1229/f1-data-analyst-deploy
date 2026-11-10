// Measurement-only download using the existing OpenF1 selection and raw cache.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve,join}from'node:path';import{spawnSync}from'node:child_process';
const out=resolve('.cache/night-session/gears');await mkdir(out,{recursive:true});
let source=await readFile('scripts/sim/fetch-openf1.mjs','utf8');
const before="(await openf1('sessions', {year})).filter(s => s.session_name === 'Qualifying' && Date.parse(s.date_end) < Date.now() - 3 * 3600e3)";
if(source.split(before).length!==2)throw Error('Downloader source changed');
source=source.replace(before,"(await openf1('sessions', {year})).filter(s => [9153,9586,9908,11357].includes(s.session_key))");
await writeFile(join(out,'fetch.mjs'),source);
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),LAPSIM_CACHE:join(out,'input'),LAPSIM_TRACE_DRIVERS:'30',LAPSIM_GEOMETRY_DRIVERS:'1',LAPSIM_RACES:'off'};
const r=spawnSync(process.execPath,[join(out,'fetch.mjs'),'2023,2024,2025,2026'],{env,stdio:'inherit'});if(r.status!==0)throw Error('Gear data download failed');
