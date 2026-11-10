import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export async function nightIntegrity(){
  const plan=JSON.parse(await readFile('scripts/sim/owner-actions-plan.json'));
  for(const [path,expected]of Object.entries(plan.pinnedFiles))
    assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),expected,'HARD STOP: source changed '+path);
  return {pass:true,productionFiles:45,pinnedSourceFiles:Object.keys(plan.pinnedFiles).length,at:new Date().toISOString()};
}
