// Reporting only. Wait for existing fits, verify ZIPs and replay saved states.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo='kangjeongmin1229/f1-data-analyst-deploy',runId=42923060955;
assert.equal(process.env.GITHUB_REPOSITORY,repo);
const out='scripts/sim/results/owner-diagnostics-2026-11-11',root='.cache/owner-round-curve';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(root,{recursive:true});
const gh=p=>execFileSync('gh',['api','repos/'+repo+'/'+p],{maxBuffer:64*1024*1024});
const json=p=>JSON.parse(gh(p).toString()),sha=b=>createHash('sha256').update(b).digest('hex');
let run;
for(let poll=0;poll<400;poll++){
 run=json('actions/runs/'+runId);
 if(run.status==='completed')break;
 if(poll%5===0)console.log('Waiting for existing run '+runId+': '+run.status+' at '+new Date().toISOString());
 await new Promise(r=>setTimeout(r,55000));
}
assert.equal(run.status,'completed','Existing run is not terminal; no result accepted');
const jobs=json('actions/runs/'+runId+'/jobs?per_page=100');
fs.writeFileSync(out+'/round-run.json',JSON.stringify({run,jobs},null,2)+'\n');
const meta=json('actions/runs/'+runId+'/artifacts?per_page=100'),manifest=[];
for(const a of meta.artifacts.filter(a=>/^f1-rounds-[3456]$/.test(a.name))){
 assert.equal(a.expired,false,'Expired artifact');
 const zip=gh('actions/artifacts/'+a.id+'/zip'),digest=sha(zip);
 assert.equal('sha256:'+digest,a.digest,'Artifact ZIP hash mismatch '+a.name);
 const archive=out+'/'+a.name+'.zip';fs.writeFileSync(archive,zip);
 const dest=root+'/'+a.name;fs.mkdirSync(dest,{recursive:true});execFileSync('unzip',['-q','-o',archive,'-d',dest]);
 manifest.push({name:a.name,id:a.id,sha256:digest,sizeBytes:zip.length,apiDigest:a.digest,sourceCommit:a.workflow_run.head_sha});
}
fs.writeFileSync(out+'/round-artifacts.json',JSON.stringify(manifest,null,2)+'\n');
assert.equal(run.conclusion,'success','The fit run did not succeed; keep partial evidence only');
assert.equal(jobs.jobs.length,4);assert.ok(jobs.jobs.every(j=>j.conclusion==='success'));assert.equal(manifest.length,4);
const plan=JSON.parse(fs.readFileSync('scripts/sim/owner-actions-plan.json'));
for(const [url,dest]of [[plan.checkpoints.url,'.cache/owner-checkpoints.tar.gz'],[plan.inputArchive.url,'.cache/owner-inputs.tgz']])execFileSync('curl',['--fail','--location','--retry','3',url,'-o',dest],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/sim/owner-f1-actions.mjs','prepare','control'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/sim/report-owner-round-curve.mjs',root],{stdio:'inherit'});
const d=JSON.parse(fs.readFileSync(out+'/round-curve.json')),f=x=>x.toFixed(6);
const lines=['# Verified F1 round curve — 2026-11-11','','Source fit run: https://github.com/'+repo+'/actions/runs/'+runId+'. Source commit: '+d.sourceCommit+'.','',
'All four artifact ZIPs match GitHub SHA256 digests. All final held-out predictions replay from saved folds within 1e-8 seconds. Fold membership, input hashes, saved round counts and RMS arithmetic are checked. No optimizer is called. Fixed-round completion is not convergence.','',
'| Main rounds | Fold rounds | Season | Held-out n | Held-out RMS % | In-sample n | In-sample RMS % |','|---:|---:|---:|---:|---:|---:|---:|'];
for(const a of d.arms)for(const s of a.summary)lines.push('| '+[a.rounds,a.foldRounds,s.year,s.n,f(s.heldoutRmsPct),s.inSampleN,f(s.inSampleRmsPct)].join(' | ')+' |');
lines.push('','The production fold rule couples the main count to the fold count. Hidden rows use fold factors; main factors would leak target data. Every round state is retained. Main scores and exclusions are in round-curve.json.','',
'## Saved fold trajectory, zero-optimizer replay','','The longest job contains fold states at rounds 1–5. Complete-state replay changes cars, factors and team states together. Factor-only replay holds final cars/team adjustments at round 5 and changes only saved factors. This is sensitivity analysis, not a fitted candidate.','',
'| Fold round | Season | n | Complete state RMS % | Factor-only RMS %, final car/team fixed |','|---:|---:|---:|---:|---:|');
for(const s of d.perRoundHeldoutsSummary){const t=d.factorOnlySensitivitySummary.find(t=>t.year===s.year&&t.round===s.round);lines.push('| '+[s.round,s.year,s.n,f(s.rmsPct),f(t.rmsPct)].join(' | ')+' |');}
lines.push('','## Stop audit','','| Job main count | Fit | Rounds | Stop | Last decrease % | Decrease in [0,1) % |','|---:|---:|---:|---|---:|---|');
for(const a of d.arms)for(const s of a.fits)lines.push('| '+[a.rounds,s.fit,s.rounds,s.stopReason,f(s.lastDecreasePct),s.belowOnePct].join(' | ')+' |');
lines.push('','With no exclusions, fit 1 is main; fits 2–5 are the 2025 folds and 6–9 the 2026 folds. If the unchanged outlier policy adds a main fit, the JSON inventory records the shift. A small decrease at a fixed count does not mean model acceptance.','',
'## Interpretation and limits','','The historic production fit predates the causal 2026 battery kernel. Fold membership is unchanged, but stopping differs. This curve uses the current kernel and cannot recover missing historic production fold states. It does not prove track factors alone caused the historic score gap. No rule change, model adoption, production change, merge or Vercel action.','',
'## Reproduce','','Download the four f1-rounds artifacts from the source run. Verify ZIP hashes against round-artifacts.json and extract into .cache/owner-round-curve/<artifact-name>. Restore pinned archives from scripts/sim/owner-actions-plan.json; run node scripts/sim/owner-f1-actions.mjs prepare control, then node scripts/sim/report-owner-round-curve.mjs .cache/owner-round-curve. Zero optimizer rounds. Raw traces remain outside git.','',
'[Settings and code comparison](lapsim-f1-control-diagnosis-2026-11-11.md). [Baseline residual analysis](lapsim-owner-residual-analysis-2026-11-11.md).');
fs.writeFileSync('docs/lapsim-owner-round-curve-results-2026-11-11.md',lines.join('\n')+'\n');
const dp='docs/lapsim-f1-control-diagnosis-2026-11-11.md';
let text=fs.readFileSync(dp,'utf8');
text=text.replace('The four-arm round sweep is running; its final curve is not available yet. Do not change the stopping rule or use a partial run as a result.','The four-arm sweep has finished and passed artifact/replay checks. Read the [verified curve](lapsim-owner-round-curve-results-2026-11-11.md). No stopping rule is changed.');
text=text.replace(/## Authorized curve run — pending[\s\S]*/,'## Verified curve\n\nSee the [curve, in-sample errors, fold trajectories and stop audit](lapsim-owner-round-curve-results-2026-11-11.md). This measures the current kernel with the production fold rule. It does not recover old production fold states.\n');
fs.writeFileSync(dp,text);
const hashes=Object.fromEntries(fs.readdirSync(out).filter(n=>n!=='sha256.json'&&fs.statSync(out+'/'+n).isFile()).sort().map(n=>[n,sha(fs.readFileSync(out+'/'+n))]));
fs.writeFileSync(out+'/sha256.json',JSON.stringify(hashes,null,2)+'\n');
console.log('Verified reporting complete. No fit or model export was performed.');
