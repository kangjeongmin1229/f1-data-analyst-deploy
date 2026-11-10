// Archive selected derived results, not raw third-party source documents or runtime trees.
import {readFile,writeFile,mkdir,readdir,stat,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const block=process.argv[2],folders={2:'vegas-fit',3:'wec-fit',4:'models-fit',5:'gears',6:'core-review'};
if(!folders[block])throw Error('Expected block 2, 3, 4, 5 or 6');
const source=resolve('.cache/night-session',folders[block]),out=resolve('scripts/sim/results/night-session-2026-11-10','block-'+block);
await mkdir(out,{recursive:true});
const files={},hash=b=>createHash('sha256').update(b).digest('hex');
async function save(from,name){let bytes=await readFile(from),target=name;if(/\.jsonl$|\.log$|\.stderr$/.test(name)||bytes.length>100000){bytes=gzipSync(bytes);target+='.gz';}await mkdir(join(out,target,'..'),{recursive:true});await writeFile(join(out,target),bytes);files[target]={sha256:hash(bytes),bytes:bytes.length,sourceSha256:hash(await readFile(from))};}
for(const name of await readdir(source)){const path=join(source,name);if((await stat(path)).isFile()&&!name.endsWith('.stderr')&&name!=='report.log')await save(path,name);else if((await stat(path)).isFile()&&(await stat(path)).size)await save(path,name);}
if(block==='2'){
 for(const arm of ['control','candidate'])for(const name of await readdir(join(source,arm,'.cache/f1-convergence')))await save(join(source,arm,'.cache/f1-convergence',name),arm+'/'+name);
 const sourceDir='.cache/night-session/vegas',manifest=JSON.parse(await readFile(join(sourceDir,'manifest.json')));
 for(const [name,expected]of Object.entries(manifest.inputs)){if(hash(await readFile(join(sourceDir,name)))!==expected)throw Error('HARD STOP: Vegas archive input hash mismatch '+name);await save(join(sourceDir,name),'geometry/'+name);}
 await save(join(sourceDir,'manifest.json'),'geometry/manifest.json');
 const status=JSON.parse(await readFile(join(source,'status.json')));
 if(status.complete)for(const arm of ['control','candidate'])await save(join(source,arm,'worker/lapsim/calibration-data.js'),arm+'/calibration-data.js');
}
if(block==='5'){
 const manifest=JSON.parse(await readFile(join(source,'measurement-inputs.json')));
 await save(join(source,'input/index.json'),'input/index.json');
 for(const [name,expected]of Object.entries(manifest.inputs)){const file=join(source,'input/sessions',name);if(hash(await readFile(file))!==expected)throw Error('HARD STOP: gear archive input hash mismatch '+name);await save(file,'input/sessions/'+name);}
}
if(block==='4'){
 const status=JSON.parse(await readFile(join(source,'status.json')));
 if(status.control?.code===0)await save(join(source,'production/worker/lapsim/calibration-data.js'),'production.js');
 for(const dir of await readdir(source)){if(!/^lm(h|dh|gt3)-\d+$/.test(dir))continue;for(const name of await readdir(join(source,dir)))if((await stat(join(source,dir,name))).isFile())await save(join(source,dir,name),dir+'/'+name);}
 await save('.cache/night-session/wec-sources/all-car-inventory.json','all-car-inventory.json');
}
await writeFile(join(out,'sha256.json'),JSON.stringify({files},null,2)+'\n');
console.log(JSON.stringify({block,files:Object.keys(files).length,bytes:Object.values(files).reduce((s,f)=>s+f.bytes,0),out}));
