// Run in an isolated checkout after downloading the original job artifacts.
import {readFile,writeFile,mkdir,copyFile,cp,readdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const arm=process.argv[2],downloads=resolve(process.argv[3]||'downloaded-results');assert.ok(['control','candidate'].includes(arm));
const root=process.cwd(),dest=resolve('final-output',arm),json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const plan=await json('scripts/sim/owner-actions-plan.json');
execFileSync(process.execPath,['scripts/sim/owner-f1-actions.mjs','prepare',arm],{stdio:'inherit'});
await mkdir(dest,{recursive:true});
await copyFile('worker/lapsim/calibration-data.js',join(dest,'production-calibration-data.js'));
const check=resolve('.cache/export-checkpoints');await mkdir(check,{recursive:true});
await copyFile(`.cache/owner-saved/latest/${arm}/fit-1.json`,join(check,'fit-1.json'));
const statuses=[];
for(const year of [2025,2026])for(let fold=0;fold<4;fold++){
 const d=join(downloads,`f1-${arm}-${year}-${fold}`,`${arm}-${year}-${fold}`),s=await json(join(d,'status.json'));
 assert.equal(s.complete,true,`Missing complete fold ${arm}/${year}/${fold}`);
 const n=2+([2025,2026].indexOf(year)*4)+fold;
 await copyFile(join(d,`fit-${n}.json`),join(check,`fit-${n}.json`));statuses.push({year,fold,...s});
}
const trusted={};for(const n of await readdir(check))if(/^fit-\d+\.json$/.test(n))trusted[n]=hash(await readFile(join(check,n)));
assert.equal(Object.keys(trusted).length,9);
const jointPath='scripts/sim/joint-bcd.mjs',original=await readFile(jointPath,'utf8');
assert.equal(original.split('export async function fitJointBCD(').length,2);
let text=original.replace('export async function fitJointBCD(','async function rawFitJointBCD(');
text=text.replace('export async function holdoutBCD(','async function rawHoldoutBCD(');
text+='\nimport {checkpointReplay} from "./owner-checkpoint-replay.mjs";\nimport {writeFileSync as ownerWrite} from "node:fs";\n';
text+=`const ownerReplays=[],ownerHoldouts=[]; export const fitJointBCD=checkpointReplay(rawFitJointBCD,${JSON.stringify(check)},${JSON.stringify(trusted)},x=>{ownerReplays.push(x);ownerWrite(${JSON.stringify(join(dest,'replay.json'))},JSON.stringify(ownerReplays,null,2));});\n`;
text+=`export async function holdoutBCD(...args){const r=await rawHoldoutBCD(...args);ownerHoldouts.push({year:args[1],...r});ownerWrite(${JSON.stringify(join(dest,'holdouts.json'))},JSON.stringify(ownerHoldouts,null,2));return r;}\n`;
await writeFile(jointPath,text);
await copyFile(`.cache/owner-saved/original/${arm}/source/calibrate.mjs`,'scripts/sim/owner-export-calibrate.mjs');
const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),...plan.f1Settings};
try{
 execFileSync(process.execPath,['scripts/sim/owner-export-calibrate.mjs'],{env,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/sim/verify-f1-reproduction.mjs','.',join(dest,'reproduction.json')],{stdio:'inherit'});
 execFileSync(process.execPath,['scripts/sim/validate.mjs','owner-final'],{env,stdio:'inherit'});
 await copyFile('worker/lapsim/calibration-data.js',join(dest,'calibration-data.js'));
 await copyFile('probe-out/validate-owner-final.json',join(dest,'validation.json'));
 await cp(check,join(dest,'checkpoints'),{recursive:true});
 const replay=await json(join(dest,'replay.json'));assert.equal(replay.length,9);
 const prepared=await json('.cache/owner-prepared.json');
 for(const [p,h]of Object.entries(prepared))if(p!=='worker/lapsim/calibration-data.js'&&p!==jointPath)assert.equal(hash(await readFile(p)),h,`Integrity failed: ${p}`);
 await writeFile(join(dest,'status.json'),JSON.stringify({complete:true,accepted:false,arm,optimizerRoundsExecuted:0,sourceCommit:process.env.GITHUB_SHA,sourceRun:42913368752,checkpoints:trusted,folds:statuses,remaining:'Paired gate, production-baseline validity and physical acceptance must be assessed.'},null,2));
}finally{await writeFile(jointPath,original);}
