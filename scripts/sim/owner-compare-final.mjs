import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {compare} from './exp-compare.mjs';
import {gate} from './gate.mjs';
import {physicalDiagnostics,comparePhysical} from './exp-physics.mjs';
const base=resolve(process.argv[2]||'final-results'),out=resolve('comparison');await mkdir(out,{recursive:true});
const json=async p=>JSON.parse(await readFile(p)),load=async p=>(await import(pathToFileURL(p))).lapsimCalibration;
const a=join(base,'final-f1-control','control'),b=join(base,'final-f1-candidate','candidate');
const [ca,cb,prod,ha,hb,ra,rb,va,vb]=await Promise.all([load(join(a,'calibration-data.js')),load(join(b,'calibration-data.js')),load(join(a,'production-calibration-data.js')),json(join(a,'holdouts.json')),json(join(b,'holdouts.json')),json(join(a,'reproduction.json')),json(join(b,'reproduction.json')),json(join(a,'validation.json')),json(join(b,'validation.json'))]);
const precise={};for(const year of [2025,2026]){
 const x=ha.find(h=>h.year===year),y=hb.find(h=>h.year===year);assert.ok(x&&y);
 const xs=[...x.errors].sort((a,b)=>a.name.localeCompare(b.name)),ys=[...y.errors].sort((a,b)=>a.name.localeCompare(b.name));assert.deepEqual(xs.map(e=>e.name),ys.map(e=>e.name),'Unpaired heldout tracks');
 precise[year]={...gate(xs.map(e=>e.pct),ys.map(e=>e.pct)),controlRmsPct:x.rmsPct,candidateRmsPct:y.rmsPct,controlN:x.n,candidateN:y.n,notWorse:y.rmsPct<=x.rmsPct};
}
const baseline=compare(prod,ca),physical=comparePhysical(physicalDiagnostics(ca,va),physicalDiagnostics(cb,vb));
const result={accepted:false,sourceRun:42913368752,heldoutFullPrecision:precise,pairedStoredPrecision:compare(ca,cb),baselineAgainstProduction:baseline,baselineValid:[2025,2026].every(y=>{const q=baseline['f1/'+y];return q&&Math.abs(q.cand-q.base)<=.05;}),physical,reproduction:{control:ra,candidate:rb},remaining:['Review dry Las Vegas raw replay against the declared no-worse check (already failed for 2024 before validation).','Reconcile WEC artifacts from original and sector recovery runs; report every cap hit.','Scientific acceptance requires all declared checks, not only a successful workflow.'],productionAdopted:false};
await writeFile(join(out,'comparison.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# F1 checkpoint comparison','','Not adopted. Scientific review remains required.','','| Season | n control/candidate | Control RMS % | Candidate RMS % | Gate |','|---|---:|---:|---:|---|'];
for(const [y,r]of Object.entries(precise))lines.push(`| ${y} | ${r.controlN}/${r.candidateN} | ${r.controlRmsPct.toFixed(6)} | ${r.candidateRmsPct.toFixed(6)} | ${r.reason} |`);
lines.push('',`Reproduction: control ${ra.n} dry rows, max ${ra.maxAbsErrorSec} s; candidate ${rb.n} dry rows, max ${rb.maxAbsErrorSec} s.`,`Baseline within 0.05 percentage points per season: ${result.baselineValid}.`,'',...result.remaining.map(s=>'- '+s));await writeFile(join(out,'report.md'),lines.join('\n')+'\n');console.log(lines.join('\n'));
