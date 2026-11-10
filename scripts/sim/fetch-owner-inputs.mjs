import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const p=JSON.parse(await readFile('scripts/sim/owner-actions-plan.json'));
await mkdir('.cache',{recursive:true});
for(const [input,path]of [[p.inputArchive,'.cache/owner-inputs.tgz'],[p.checkpoints,'.cache/owner-checkpoints.tar.gz']]){
  const response=await fetch(input.url);assert.equal(response.status,200,'Input download HTTP status');
  const bytes=Buffer.from(await response.arrayBuffer());
  const actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==input.sha256){await mkdir('owner-output',{recursive:true});await writeFile('owner-output/HARD_STOP','Downloaded input hash mismatch\n');}
  assert.equal(actual,input.sha256,'HARD STOP: downloaded input hash mismatch');
  await writeFile(path,bytes);console.log(JSON.stringify({path,bytes:bytes.length,sha256:input.sha256}));
}
