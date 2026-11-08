import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const runner = fileURLToPath(new URL('../scripts/sim/refine-t71.mjs', import.meta.url));
const fixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't71-refine-'));
  const input = path.join(dir, 'input.json'), out = path.join(dir, 'out');
  // Synthetic test targets, not observations or calibration evidence.
  const rows = [{track:'sakhir',target:90,split:'train',year:2025,weather:{}}, {track:'jeddah',target:88,split:'holdout',year:2025,weather:{}}];
  fs.writeFileSync(input, JSON.stringify(rows));
  return {dir,input,out,rows,run:()=>spawnSync(process.execPath,[runner,input,out],{encoding:'utf8'})};
};
test('offline refinement resumes exactly and rejects modified input', () => {
  const f = fixture();
  try {
    const first = f.run(); assert.equal(first.status,0,first.stderr);
    const a = JSON.parse(first.stdout); assert.equal(a.computedGridPoints,41);
    const second = f.run(); assert.equal(second.status,0,second.stderr);
    const b = JSON.parse(second.stdout); assert.equal(b.computedGridPoints,0); assert.deepEqual(a.best,b.best);
    f.rows[0].target += 1; fs.writeFileSync(f.input,JSON.stringify(f.rows));
    const changed = f.run(); assert.notEqual(changed.status,0); assert.match(changed.stderr,/Checkpoint does not match/);
    assert.equal(fs.existsSync(path.join(f.out,'refine.lock')),false);
  } finally {fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('offline refinement will not overwrite an existing writer lock', () => {
  const f = fixture();
  try {
    fs.mkdirSync(f.out); fs.writeFileSync(path.join(f.out,'refine.lock'),'other-worker');
    assert.notEqual(f.run().status,0);
    assert.equal(fs.readFileSync(path.join(f.out,'refine.lock'),'utf8'),'other-worker');
  } finally {fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('holdout outcomes do not select the refinement parameter', () => {
  const f = fixture();
  try {
    const first=f.run(); assert.equal(first.status,0,first.stderr); const a=JSON.parse(first.stdout);
    fs.rmSync(f.out,{recursive:true}); f.rows[1].target=120; fs.writeFileSync(f.input,JSON.stringify(f.rows));
    const second=f.run(); assert.equal(second.status,0,second.stderr); const b=JSON.parse(second.stdout);
    assert.equal(a.best.factor,b.best.factor); assert.equal(a.best.trainRmsePct,b.best.trainRmsePct);
  } finally {fs.rmSync(f.dir,{recursive:true,force:true});}
});
