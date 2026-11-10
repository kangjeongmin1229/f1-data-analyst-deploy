// Independent Block 3 report: does not wait for F1 folds.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const json=async p=>JSON.parse(await readFile(p));
const dir=resolve('owner-wec-summary'),files=[];await mkdir(dir,{recursive:true});
async function walk(p){for(const d of await readdir(p,{withFileTypes:true})){const f=join(p,d.name);if(d.isDirectory())await walk(f);else files.push(f);}}
await walk('.cache/action-artifacts');
const statuses=[];
for(const arm of ['control','bop','sector2']){
  const p=files.find(p=>p.endsWith('/wec-'+arm+'/status.json'));
  const state=p?await json(p):{complete:false,error:'Missing completed job artifact'};statuses.push({arm,...state});
  const source=p?join(p,'..'):files.find(p=>p.endsWith('/wec-'+arm+'/objective.jsonl'))?.replace(/\/objective.jsonl$/,'');
  if(!source)continue;
  for(const [from,to]of [['calibration-data.js',arm+'.js'],['objective.jsonl',arm+'-objective.jsonl'],['validation.json','validate-'+arm+'.json'],['reproduction.json',arm+'-reproduction.json']])
    if(existsSync(join(source,from)))await copyFile(join(source,from),join(dir,to));
}
const plan=await json('scripts/sim/owner-actions-plan.json');
await writeFile(join(dir,'status.json'),JSON.stringify({complete:statuses.every(s=>s.complete),statuses},null,2)+'\n');
await writeFile(join(dir,'manifest.json'),JSON.stringify({common:plan.wecSettings,variants:plan.wecVariants,declared:'Independent fresh R confirmation authorized by owner on 2026-11-11',source:plan},null,2)+'\n');
const report=(await readFile('scripts/sim/report-wec-followup.mjs','utf8')).replace("from './night-integrity.mjs'","from './owner-action-integrity.mjs'");
await writeFile('scripts/sim/owner-job-wec-report.mjs',report);
execFileSync(process.execPath,['scripts/sim/owner-job-wec-report.mjs',dir],{stdio:'inherit'});
const note=`\n\nThis Block 3 confirmation ran independently of Block 2. Run: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}. No production adoption, merge or Vercel action.\n`;
await writeFile(join(dir,'report.md'),(await readFile(join(dir,'report.md'),'utf8'))+note);
