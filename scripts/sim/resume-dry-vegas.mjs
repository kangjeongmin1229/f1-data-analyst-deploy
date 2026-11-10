// Resume only the declared, pinned Las Vegas paired experiment in isolated copies.
import {readFile, writeFile, mkdir, cp, readdir, copyFile, open, unlink} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {spawn, execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {nightIntegrity} from './night-integrity.mjs';

const original = resolve(process.argv[2]);
const previous = process.argv[3] ? resolve(process.argv[3]) : null;
const out = resolve(process.argv[4] || '.cache/resume-vegas-2026-11-11-local');
const archive = resolve('scripts/sim/results/vegas-resume-2026-11-11');
const hash = b => createHash('sha256').update(b).digest('hex');
const json = async p => JSON.parse(await readFile(p));
const branch = execFileSync('git', ['branch', '--show-current'], {encoding:'utf8'}).trim();
assert.equal(branch, 'exp/lapsim-resume-2026-11-11');
const lock = await open('.cache/vegas-resume.lock', 'wx');
await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
await lock.close();
const children = new Set();
let timer, periodic, archiving = Promise.resolve();
try {
  assert.equal((await json(join(original, 'status.json'))).complete, false);
  const manifest = await json(join(original, 'manifest.json'));
  const oldArchive = await json('scripts/sim/results/night-session-2026-11-10/block-2/sha256.json');
  const sentinel = await nightIntegrity();
  for (const [p, expected] of Object.entries(manifest.source.inputs))
    assert.equal(hash(await readFile(resolve('.cache/night-session/vegas', p))), expected, 'HARD STOP: source hash ' + p);
  await mkdir(out); await mkdir(archive, {recursive:true});
  const provenance = {parent:'5a4978dcd10fdbd065752cb6f7279fd628b355f9',original,source:manifest,sentinel,
    purpose:'Complete the interrupted validation, without choosing another candidate or adopting any fit',
    timeBudgetMinutes:60,arms:{},node:process.version};
  for (const arm of ['control','candidate']) {
    const src = join(original, arm), dir = join(out, arm), trusted = {}, pinned = {};
    for (const name of await readdir(join(src,'.cache/f1-convergence'))) {
      if (!/^fit-\d+\.json$/.test(name)) continue;
      const bytes = await readFile(join(src,'.cache/f1-convergence',name));
      assert.equal(hash(bytes), oldArchive.files[arm+'/'+name].sourceSha256, 'HARD STOP: saved checkpoint differs from Git archive');
      trusted[name] = hash(bytes);
    }
    for (const p of ['worker/lapsim/tracks-data.js','.cache/lapsim/traces.json','scripts/sim/calibrate.mjs','scripts/sim/joint-bcd.mjs','scripts/sim/calibrate-lib.mjs','scripts/sim/bcd-worker.mjs'])
      pinned[p] = hash(await readFile(join(src,p)));
    assert.equal(pinned['worker/lapsim/tracks-data.js'], arm==='candidate' ? manifest.source.inputs['candidate-tracks.js'] : hash(await readFile('worker/lapsim/tracks-data.js')));
    assert.equal(pinned['.cache/lapsim/traces.json'], arm==='candidate' ? manifest.source.inputs['candidate-traces.json'] : hash(await readFile('.cache/wec-consistent-rounds/control/.cache/lapsim/traces.json')));
    await cp(src, dir, {recursive:true,filter:p=>!p.includes('/scripts/sim/results')&&!p.includes('/node_modules')});
    for (const [p, expected] of Object.entries(pinned)) assert.equal(hash(await readFile(join(dir,p))),expected);
    if (previous) {
      const priorManifest = await json(join(previous,'resume-manifest.json'));
      assert.deepEqual(priorManifest.arms[arm].pinned,pinned,'HARD STOP: restart source mismatch');
      for (const name of await readdir(join(previous,arm,'.cache/f1-convergence'))) {
        if (!/^fit-\d+\.json$/.test(name)) continue;
        const bytes=await readFile(join(previous,arm,'.cache/f1-convergence',name)), saved=JSON.parse(bytes);
        assert.ok(saved.inputHash || hash(bytes)===trusted[name], 'HARD STOP: unverified restart checkpoint');
        // The wrapper rechecks the complete training-data/options digest before reusing this state.
        await writeFile(join(dir,'.cache/f1-convergence',name),bytes);
      }
    }
    // Preserve the exact old fitter. Only its call boundary is wrapped in this isolated copy.
    const jointFile = join(dir,'scripts/sim/joint-bcd.mjs'), text = await readFile(jointFile,'utf8');
    assert.equal(text.split('export async function fitJointBCD(').length,2);
    const wrapper = '\nimport {checkpointFitter} from "./bcd-checkpoint-resume.mjs";\n'+
      'export const fitJointBCD = checkpointFitter(rawFitJointBCD, bcdConverged, ".cache/f1-convergence", '+JSON.stringify(trusted)+');\n';
    await writeFile(jointFile,text.replace('export async function fitJointBCD(','async function rawFitJointBCD(')+wrapper);
    await copyFile('scripts/sim/bcd-checkpoint-resume.mjs',join(dir,'scripts/sim/bcd-checkpoint-resume.mjs'));
    provenance.arms[arm] = {trustedLegacy:trusted,pinned,wrapperHash:hash(await readFile(jointFile))};
    await mkdir(join(archive,arm),{recursive:true});
    await writeFile(join(archive,arm,'original-calibrate.mjs.gz'),gzipSync(await readFile(join(src,'scripts/sim/calibrate.mjs'))));
  }
  await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await writeFile(join(out,'resume-manifest.json'),JSON.stringify(provenance,null,2)+'\n');
  const priorProgress = previous ? await json(join(archive,'progress.json')) : null;
  const startedAt = priorProgress?.startedAt || new Date().toISOString();
  const deadline = priorProgress ? Date.parse(priorProgress.deadline) : Date.now()+60*60000;
  assert.ok(deadline>Date.now(),'The original continuation budget has ended');
  const env = {...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('LAPSIM_'))),...manifest.settings};
  const statuses = [];
  async function save(running) {
    await nightIntegrity();
    const progress = {startedAt,updatedAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),running,arms:{},statuses};
    for (const arm of ['control','candidate']) {
      const dir = join(out,arm,'.cache/f1-convergence'), states=[];
      for (const name of (await readdir(dir)).filter(n=>/^fit-\d+\.json$/.test(n)).sort()) {
        const bytes=await readFile(join(dir,name)), s=JSON.parse(bytes);
        states.push({fit:name,rounds:s.scores.length,converged:s.converged,capHit:s.capHit,score:s.scores.at(-1)});
        await writeFile(join(archive,arm,name),bytes);
      }
      progress.arms[arm]=states;
      for (const ext of ['log','stderr']) {
        try { await writeFile(join(archive,arm+'.'+ext+'.gz'),gzipSync(await readFile(join(out,arm+'.'+ext)))); }
        catch(e){if(e.code!=='ENOENT')throw e;}
      }
    }
    for (const name of ['manifest.json','resume-manifest.json']) await copyFile(join(out,name),join(archive,name));
    await writeFile(join(archive,'progress.json'),JSON.stringify(progress,null,2)+'\n');
    console.log(JSON.stringify(progress));
  }
  const enqueue = running => archiving = archiving.then(()=>save(running));
  let timedOut=false;
  timer=setTimeout(()=>{timedOut=true;for(const child of children)child.kill('SIGTERM');},deadline-Date.now());
  // Local-only persistence. This compute process has no upload or push operation.
  periodic=setInterval(()=>{enqueue(true).catch(e=>{console.error(e);for(const c of children)c.kill('SIGTERM');});},5*60000);
  const jobs=['control','candidate'].map(arm=>new Promise((done,reject)=>{
    const child=spawn(process.execPath,['scripts/sim/calibrate.mjs'],{cwd:join(out,arm),env,stdio:['ignore','pipe','pipe']});children.add(child);
    child.stdout.pipe(createWriteStream(join(out,arm+'.log')));child.stderr.pipe(createWriteStream(join(out,arm+'.stderr')));
    child.once('error',reject);child.once('close',(code,signal)=>{children.delete(child);statuses.push({arm,code,signal});done();});
  }));
  console.log(JSON.stringify({startedAt,deadline:new Date(deadline).toISOString(),resumed:true,arms:['control','candidate'],archive}));
  await enqueue(true);
  await Promise.all(jobs);clearTimeout(timer);clearInterval(periodic);
  const status={at:new Date().toISOString(),timedOut,statuses,complete:statuses.every(s=>s.code===0),integrity:await nightIntegrity()};
  await writeFile(join(out,'status.json'),JSON.stringify(status,null,2)+'\n');
  if(status.complete) for(const arm of ['control','candidate']) {
    execFileSync(process.execPath,['scripts/sim/verify-f1-reproduction.mjs',join(out,arm),join(out,arm+'-reproduction.json')]);
    await copyFile(join(out,arm+'-reproduction.json'),join(archive,arm+'-reproduction.json'));
    await writeFile(join(archive,arm,'calibration-data.js.gz'),gzipSync(await readFile(join(out,arm,'worker/lapsim/calibration-data.js'))));
  }
  execFileSync(process.execPath,['scripts/sim/report-dry-vegas.mjs',out]);
  for(const name of ['status.json','results.json','report.md'])await copyFile(join(out,name),join(archive,name));
  await enqueue(false);
} finally {
  clearTimeout(timer);clearInterval(periodic);
  for(const child of children)child.kill('SIGTERM');
  await unlink('.cache/vegas-resume.lock');
}
