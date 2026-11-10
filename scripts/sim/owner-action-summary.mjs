// Collect independent jobs and replay their saved fits through the original exporter.
import {readFile,writeFile,mkdir,cp,copyFile,readdir,symlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve('owner-summary'),artifacts=resolve('.cache/action-artifacts');
const json=async p=>JSON.parse(await readFile(p));
const plan=await json('scripts/sim/owner-actions-plan.json');
await mkdir(out,{recursive:true});
// Verify source/archive hashes and restore the saved main and completed folds.
execFileSync(process.execPath,['scripts/sim/owner-f1-actions.mjs','prepare','control'],{stdio:'inherit'});
const saved=resolve('.cache/owner-saved'),all=[];
async function walk(dir){if(!existsSync(dir))return;for(const d of await readdir(dir,{withFileTypes:true})){const p=join(dir,d.name);if(d.isDirectory())await walk(p);else all.push(p);}}
await walk(artifacts);
const statuses=[];
for(const arm of ['control','candidate']){
  const dir=join(out,'f1',arm);await mkdir(dir,{recursive:true});
  await cp('worker',join(dir,'worker'),{recursive:true});await cp('scripts/sim',join(dir,'scripts/sim'),{recursive:true});
  await copyFile('package.json',join(dir,'package.json'));await mkdir(join(dir,'docs'));await mkdir(join(dir,'.cache'),{recursive:true});
  for(const file of ['owner-inputs.tgz','owner-checkpoints.tar.gz'])await symlink(resolve('.cache',file),join(dir,'.cache',file));
  execFileSync(process.execPath,['scripts/sim/owner-f1-actions.mjs','prepare',arm],{cwd:dir,stdio:'inherit'});
  const checks=join(dir,'.cache/f1-convergence');await mkdir(checks,{recursive:true});
  for(const name of await readdir(join(saved,'latest',arm)))if(/^fit-\d+\.json$/.test(name))await copyFile(join(saved,'latest',arm,name),join(checks,name));
  for(const p of all.filter(p=>p.endsWith('/provenance.json'))){
    const v=await json(p);if(v.arm!==arm||v.year==null)continue;
    assert.equal(v.checkpointArchive,plan.checkpoints.sha256);
    assert.ok(plan.folds.some(f=>f.arm===arm&&f.year===v.year&&f.fold===v.fold));
    const source=join(p,'..',`fit-${v.fitNumber}.json`);if(existsSync(source))await copyFile(source,join(checks,`fit-${v.fitNumber}.json`));
  }
  const complete=await Promise.all(Array.from({length:9},async(_,i)=>{const p=join(checks,`fit-${i+1}.json`);if(!existsSync(p))return false;const s=await json(p);return !!(s.complete||s.converged);}));
  let error=null;
  if(complete.every(Boolean))try{
    const joint=join(dir,'scripts/sim/joint-bcd.mjs'),text=await readFile(joint,'utf8');
    assert.equal(text.split('export async function fitJointBCD(').length,2);
    await writeFile(joint,text.replace('export async function fitJointBCD(','async function rawFitJointBCD(')+'\nimport {replayCompleted} from "./owner-checkpoint-replay.mjs";\nexport const fitJointBCD=replayCompleted(rawFitJointBCD,".cache/f1-convergence");\n');
    await copyFile(join(saved,'original',arm,'source/calibrate.mjs'),join(dir,'scripts/sim/calibrate.mjs'));
    const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),...plan.f1Settings};
    execFileSync(process.execPath,['scripts/sim/calibrate.mjs'],{cwd:dir,env,stdio:'inherit'});
    execFileSync(process.execPath,[resolve('scripts/sim/verify-f1-reproduction.mjs'),dir,join(out,'f1',arm+'-reproduction.json')],{stdio:'inherit'});
  }catch(e){error=e.message;}
  statuses.push({arm,complete:complete.every(Boolean)&&!error,foldsComplete:complete.slice(1).filter(Boolean).length,error});
}
const f1dir=join(out,'f1');
const oldManifest=await json(join(saved,'original/manifest.json'));
await writeFile(join(f1dir,'manifest.json'),JSON.stringify(oldManifest,null,2)+'\n');
await writeFile(join(f1dir,'status.json'),JSON.stringify({complete:statuses.every(s=>s.complete),statuses,timedOut:false,source:'parallel fork Actions; owner fold rule'},null,2)+'\n');
for(const p of Object.keys(oldManifest.source.inputs)){
  let bytes;const path='scripts/sim/results/night-session-2026-11-10/block-2/geometry/'+p;
  bytes=existsSync(path)?await readFile(path):gunzipSync(await readFile(path+'.gz'));
  const target=resolve('.cache/night-session/vegas',p);await mkdir(join(target,'..'),{recursive:true});await writeFile(target,bytes);
}
let report=await readFile('scripts/sim/report-dry-vegas.mjs','utf8');
report=report.replace("from './night-integrity.mjs'","from './owner-action-integrity.mjs'")
  .replace('complete:fit.converged','complete:!!(fit.complete||fit.converged),stopReason:fit.stopReason||"preserved-completed-fold"')
  .replace('if(!fit.converged)continue','if(!(fit.complete||fit.converged))continue')
  .replace('converged:a.mainConverged','stoppingRuleSatisfied:a.mainConverged');
await writeFile('scripts/sim/owner-job-report-f1.mjs',report);
try{execFileSync(process.execPath,['scripts/sim/owner-job-report-f1.mjs',f1dir],{stdio:'inherit'});}catch(e){await writeFile(join(f1dir,'report-error.txt'),e.message);}
const wecdir=join(out,'wec');await mkdir(wecdir,{recursive:true});const wecStatuses=[];
for(const arm of ['control','bop','sector2']){
  const p=all.find(p=>p.endsWith('/wec-'+arm+'/status.json'));
  const status=p?await json(p):{complete:false,error:'Job did not produce completed status'};wecStatuses.push({arm,...status});
  const source=p?join(p,'..'):all.find(p=>p.endsWith('/wec-'+arm+'/objective.jsonl'))?.replace(/\/objective.jsonl$/,'');
  if(!source)continue;
  for(const [from,to]of [['calibration-data.js',arm+'.js'],['objective.jsonl',arm+'-objective.jsonl'],['validation.json','validate-'+arm+'.json'],['reproduction.json',arm+'-reproduction.json']])
    if(existsSync(join(source,from)))await copyFile(join(source,from),join(wecdir,to));
}
await writeFile(join(wecdir,'status.json'),JSON.stringify({complete:wecStatuses.every(s=>s.complete),statuses:wecStatuses},null,2)+'\n');
await writeFile(join(wecdir,'manifest.json'),JSON.stringify({common:plan.wecSettings,variants:plan.wecVariants,source:plan,declared:'Owner requested a fresh R confirmation; earlier results remain separately recorded'},null,2)+'\n');
let wr=await readFile('scripts/sim/report-wec-followup.mjs','utf8');wr=wr.replace("from './night-integrity.mjs'","from './owner-action-integrity.mjs'");
await writeFile('scripts/sim/owner-job-report-wec.mjs',wr);
try{execFileSync(process.execPath,['scripts/sim/owner-job-report-wec.mjs',wecdir],{stdio:'inherit'});}catch(e){await writeFile(join(wecdir,'report-error.txt'),e.message);}
const f1=existsSync(join(f1dir,'results.json'))?await json(join(f1dir,'results.json')):null;
const wec=existsSync(join(wecdir,'results.json'))?await json(join(wecdir,'results.json')):null;
const run=`https://github.com/${process.env.GITHUB_REPOSITORY||'kangjeongmin1229/f1-data-analyst-deploy'}/actions/runs/${process.env.GITHUB_RUN_ID||'local'}`;
const lines=['# Owner continuation — fork Actions','','Run: '+run,'','No production adoption, merge or Vercel action. All completed prior folds are preserved. Main-round-limit stops complete a fold under the new rule without claiming numerical convergence.','','| Arm | Finished folds | Export and reproduction |','|---|---:|---|',...statuses.map(s=>`| ${s.arm} | ${s.foldsComplete}/8 | ${s.complete?'passed':'incomplete: '+(s.error||'missing folds')} |`),'','| Arm / fit | Rounds | Numerical convergence | Stop reason |','|---|---:|---|---|'];
for(const arm of ['control','candidate'])for(const name of (await readdir(join(f1dir,arm,'.cache/f1-convergence'))).filter(n=>/^fit-\d+\.json$/.test(n)).sort()){
  const s=await json(join(f1dir,arm,'.cache/f1-convergence',name));lines.push(`| ${arm} / ${name} | ${s.scores.length} | ${s.converged} | ${s.stopReason||(s.converged?'preserved-completed-fit':'partial')} |`);
}
if(f1){lines.push('','| Arm / season | n | Held-out RMS, % |','|---|---:|---:|');for(const [a,r]of Object.entries(f1.arms))for(const h of r.heldout)lines.push(`| ${a} / ${h.year} | ${h.n} | ${h.rmsPct} |`);lines.push('','F1 checks: `'+JSON.stringify(f1.checks)+'`. Candidate adopted: no.');}
lines.push('','| WEC arm | Status | RMS, % |','|---|---|---:|',...wecStatuses.map(s=>`| ${s.arm} | ${s.complete?'fit finished':'incomplete'} | ${wec?.arms?.[s.arm]?.rmsPct??'unavailable'} |`));
if(wec)lines.push('','WEC comparisons: `'+JSON.stringify(wec.comparisons)+'`.');
lines.push('','Full results, per-fold checkpoints, logs, source hashes and reproduction audits are in the run artifacts and the PR #154 checkpoint archive. Errors or missing artifacts remain explicitly incomplete.');
await writeFile(join(out,'handoff-summary.md'),lines.join('\n')+'\n');
// Deliver only derived results. Runtime snapshots and normalized input traces are not published here.
const publish=resolve('owner-publish');await mkdir(publish,{recursive:true});await copyFile(join(out,'handoff-summary.md'),join(publish,'handoff-summary.md'));
for(const [label,dir]of [['f1',f1dir],['wec',wecdir]]){
  for(const file of await readdir(dir))if(/\.(json|md|txt|js|jsonl)$/.test(file))await cp(join(dir,file),join(publish,label+'-'+file));
}
for(const arm of ['control','candidate']){
  await cp(join(f1dir,arm,'.cache/f1-convergence'),join(publish,arm+'-checkpoints'),{recursive:true});
  if(statuses.find(s=>s.arm===arm).complete)await copyFile(join(f1dir,arm,'worker/lapsim/calibration-data.js'),join(publish,arm+'-calibration.js'));
}
await cp(artifacts,join(publish,'job-artifacts'),{recursive:true});
