// Download only discovered official classification files. They provide event-specific
// entry-number -> car-model identities; manufacturer prefix matching is not used.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='.cache/night-session/wec-sources';
const sessions=JSON.parse(await readFile('.cache/wec-sector-run/baseline/.cache/lapsim/wec.json'));
const saved=JSON.parse(await readFile(`${dir}/classification-sources.json`).catch(()=> '[]'));
const sources=[];await mkdir(`${dir}/classification`,{recursive:true});
for(const year of [2025,2026]){
 const archive=JSON.parse(await readFile(`${dir}/archive-${year}.json`));
 for(const event of [...new Set(sessions.filter(w=>w.year===year).map(w=>w.event))])for(const cls of ['HYPERCAR','LMGT3']){
  const all=archive.files.filter(f=>f.folders[0]===event&&f.folders[1]==='FIA WEC'&&[ `Classification_Qualifying ${cls}.CSV`, `Classification_Qualifying ${cls}_Final.CSV` ].includes(f.title));
  const final=all.filter(f=>f.title.endsWith('_Final.CSV')); const matches=final.length?final:all;
  if(matches.length!==1)throw Error(`Ambiguous classification: ${year}/${event}/${cls}: ${matches.length}`);
  const f=matches[0],prior=saved.find(s=>s.url===f.url);
  if(prior){const b=await readFile(`${dir}/${prior.path}`);if(createHash('sha256').update(b).digest('hex')!==prior.sha256)throw Error('HARD STOP: saved classification hash mismatch');sources.push(prior);continue;}
  const res=await fetch(f.url,{signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error(`Source HTTP ${res.status}: ${f.url}`);
  const bytes=new Uint8Array(await res.arrayBuffer()),path=`classification/${year}-${sessions.find(w=>w.year===year&&w.event===event).track}-${cls}.csv`;
  await writeFile(`${dir}/${path}`,bytes);
  sources.push({...f,year,event,cls,path,sha256:createHash('sha256').update(bytes).digest('hex'),retrievedAt:new Date().toISOString()});
  await writeFile(`${dir}/classification-sources.json`,JSON.stringify(sources,null,2)+'\n');
  console.log(year,event,cls,bytes.length);
 }
}
