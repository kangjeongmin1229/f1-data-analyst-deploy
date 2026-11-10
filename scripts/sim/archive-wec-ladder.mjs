// Store derived diagnostic evidence only; raw third-party inputs stay in the cache.
import {readFile, writeFile, mkdir, readdir, copyFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve('.cache/wec-ladder'), target=resolve('scripts/sim/results/wec-ladder-2026-11-10');
await mkdir(target,{recursive:true});
for(const name of await readdir(source)) {
  if(/\.json$|\.js$|\.log$|\.stderr$/.test(name))await copyFile(join(source,name),join(target,name));
}
for(const name of ['280-100','280-200']){
  const raw=await readFile(join(source,`${name}-objective.jsonl`),'utf8');
  const chains=new Map();
  for(const event of raw.trim().split('\n').map(JSON.parse)){
    const {event:kind,iteration,objective,spread,x,...meta}=event, key=JSON.stringify(meta);
    if(!chains.has(key))chains.set(key,{...meta,events:[]});
    chains.get(key).events.push([kind,iteration,objective,spread??null,x??null]);
  }
  await writeFile(join(target,`${name}-objective-histories.json`),JSON.stringify({
    rawJsonlSha256:createHash('sha256').update(raw).digest('hex'),
    columns:['event','iteration','objective','spread','x'],note:'Lossless objective histories; constant metadata stored once per start. restart 0 is the only start; the optimizer has no restart loop.',
    chains:[...chains.values()]})+'\n');
}
await copyFile('.cache/wec-ladder-tests.log',join(target,'tests.log'));
const hashes={};for(const name of (await readdir(target)).filter(n=>n!=='checksums.json'))hashes[name]=createHash('sha256').update(await readFile(join(target,name))).digest('hex');
await writeFile(join(target,'checksums.json'),JSON.stringify(hashes,null,2)+'\n');
console.log(`Saved ${Object.keys(hashes).length} diagnostic artifacts to ${target}`);
