import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {gate} from './gate.mjs';
import {physicalDiagnostics,comparePhysical} from './exp-physics.mjs';
const root=resolve(process.argv[2]||'wec-results'),out=resolve(process.argv[3]||'wec-comparison'),arms={};await mkdir(out,{recursive:true});
const json=async p=>JSON.parse(await readFile(p));
for(const arm of ['control','bop','sector2']){
 const d=join(root,'wec-'+arm,'wec-'+arm),status=await json(join(d,'status.json'));assert.equal(status.complete,true);
 const events=(await readFile(join(d,'objective.jsonl'),'utf8')).trim().split('\n').map(JSON.parse),groups=events.filter(r=>r.event==='group');assert.equal(groups.length,6,'Missing class-season result');assert.equal(new Set(groups.map(g=>g.group)).size,6);
 const ends=events.filter(r=>r.event==='end'),cal=(await import(pathToFileURL(join(d,'calibration-data.js')))).lapsimCalibration;
 const reproduction=await json(join(d,'reproduction.json'));assert.equal(reproduction.pass,true);
 const rows=groups.flatMap(g=>g.heldout.errors.map(e=>({key:g.group+'|'+e.name,group:g.group,...e}))).sort((a,b)=>a.key.localeCompare(b.key));
 arms[arm]={status,groups,rows,reproduction,capHits:ends.filter(e=>e.capHit),nonToleranceStops:ends.filter(e=>e.stopReason!=='tolerance'),iterations:ends.map(e=>({group:e.group,candidate:e.candidate,fold:e.fold,iteration:e.iteration,capHit:e.capHit,stopReason:e.stopReason})),physical:physicalDiagnostics(cal,await json(join(d,'validation.json')))};
}
const comparisons={};for(const arm of ['bop','sector2']){
 const a=arms.control,b=arms[arm];assert.deepEqual(a.rows.map(r=>r.key),b.rows.map(r=>r.key),'Unpaired WEC rows');
 const byGroup={};for(const group of a.groups.map(g=>g.group))byGroup[group]=gate(a.rows.filter(r=>r.group===group).map(r=>r.pct),b.rows.filter(r=>r.group===group).map(r=>r.pct));
 comparisons[arm]={pooled:gate(a.rows.map(r=>r.pct),b.rows.map(r=>r.pct)),byGroup,noGroupWorse:Object.values(byGroup).every(r=>r.rmsNew<=r.rmsCur),noCapHits:!a.capHits.length&&!b.capHits.length,physical:comparePhysical(a.physical,b.physical),adopted:false};
}
const result={sourceRuns:[42913368752,42913698920],arms,comparisons,accepted:false,note:'No adoption. Acceptance requires all declared held-out, convergence, physical, reproduction and F1-protection checks. Sector recovery replaces only the initial pre-fit input-selection failure.'};
await writeFile(join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
let text='# WEC confirmation at R\n\nNo model adopted.\n\n| Candidate | n | Control RMS % | Candidate RMS % | Pooled gate | No group worse | Cap hits (control/candidate) |\n|---|---:|---:|---:|---|---|---:|\n';
for(const [name,c]of Object.entries(comparisons))text+=`| ${name} | ${c.pooled.n} | ${c.pooled.rmsCur.toFixed(6)} | ${c.pooled.rmsNew.toFixed(6)} | ${c.pooled.reason} | ${c.noGroupWorse} | ${arms.control.capHits.length}/${arms[name].capHits.length} |\n`;
await writeFile(join(out,'report.md'),text);console.log(text);
