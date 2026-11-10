// Declared four-arm diagnostic. Fits only in the owner fork; no model export/adoption.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const rounds=Number(process.argv[2]);assert.ok([3,4,5,6].includes(rounds));
const output=path.resolve('round-output');fs.mkdirSync(output,{recursive:true});
const save=(name,data)=>fs.writeFileSync(path.join(output,name),JSON.stringify(data,null,2)+'\n');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/sim/owner-f1-actions.mjs','prepare','control'],{stdio:'inherit'});
const plan=JSON.parse(fs.readFileSync('scripts/sim/owner-actions-plan.json'));
for(const k of Object.keys(process.env))if(k.startsWith('LAPSIM_'))delete process.env[k];
Object.assign(process.env,plan.f1Settings,{LAPSIM_BCD_CONVERGENCE:'off',LAPSIM_ROUNDS:String(rounds)});
const original=fs.readFileSync('scripts/sim/calibrate.mjs','utf8'),marker='\nif (!ONLY_WEC) {\nconst t0 = Date.now();';assert.equal(original.split(marker).length,2);
fs.writeFileSync('scripts/sim/diagnostic-groups.mjs',original.split(marker)[0]+'\nexport {groups,BCD,traces,tracks};\n');
const jointPath='scripts/sim/joint-bcd.mjs',joint=fs.readFileSync(jointPath,'utf8');
const signature='export async function fitJointBCD(groups, opts = {}) {',point='      o.log?.(`round ${r + 1}: score ${score.toFixed(4)}`);';
assert.equal(joint.split(signature).length,2);assert.equal(joint.split(point).length,2);
const instrumented=joint.replace(signature,signature+'\n  const diagnosticFit=++diagnosticSequence;').replace(point,point+'\n      await diagnosticSave(diagnosticFit,r+1,groups,o,{xs,factors,adj,score});')+`\nimport {writeFileSync as diagnosticWrite} from 'node:fs';\nlet diagnosticSequence=0;\nfunction diagnosticSave(fit,round,groups,options,state){const {log,...settings}=options;diagnosticWrite(${JSON.stringify(output)}+'/fit-'+fit+'-round-'+round+'.json',JSON.stringify({fit,round,groups:groups.map(g=>({key:g.key,rows:g.laps.map(l=>({track:l.name,position:l.meta?.position,session:l.meta?.sessionKey}))})),settings,...state},null,2));}\n`;
fs.writeFileSync(jointPath,instrumented);
try{
 const {groups,BCD}=await import('./diagnostic-groups.mjs');assert.equal(BCD.convergence,undefined);const options={...BCD,workers:2};
 const {fitJointBCD,holdoutBCD}=await import('./joint-bcd.mjs');
 save('provenance.json',{sourceCommit:process.env.GITHUB_SHA,rounds,foldRounds:Math.max(2,rounds-1),options:{...options,log:undefined},seed:'deterministic; x=0, grip=drag=1, team adjustment empty',productionFitCommit:'9fb675e2cb60de4ee5e2d395af5acabf45740e73',currentKernelSha256:sha('worker/lapsim/kernel.js'),inputs:JSON.parse(fs.readFileSync('.cache/owner-prepared.json')),startedAt:new Date().toISOString()});
 let main=await fitJointBCD(groups,options);const bad=main.perLap.filter(p=>Math.abs(p.dt/p.realLap)>.04);
 if(bad.length){for(const g of groups){const drop=new Set(bad.filter(p=>p.group===g.key).map(p=>p.name));g.laps=g.laps.filter(l=>!drop.has(l.name));}main=await fitJointBCD(groups,options);}
 save('main.json',main);save('exclusions.json',bad);
 const heldouts=[];for(const year of [2025,2026]){const h=await holdoutBCD(groups,year,{...options,rounds:Math.max(2,rounds-1)});heldouts.push({year,...h});save('heldouts.json',heldouts);}
 const prepared=JSON.parse(fs.readFileSync('.cache/owner-prepared.json'));for(const [p,h]of Object.entries(prepared))if(p!==jointPath)assert.equal(sha(p),h,'Input/runtime changed: '+p);
 const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);
 save('summary.json',{complete:true,rounds,foldRounds:Math.max(2,rounds-1),groups:heldouts.map(h=>{const p=main.perLap.filter(p=>p.group===h.year&&p.meta.position===1);return{year:h.year,n:h.n,heldoutRmsPct:h.rmsPct,inSampleN:p.length,inSampleRmsPct:rms(p.map(p=>100*p.dt/p.realLap))};}),adopted:false,finishedAt:new Date().toISOString()});
}finally{fs.writeFileSync(jointPath,joint);}
