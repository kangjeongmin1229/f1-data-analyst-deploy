// One-off probe: field names in cached 2026 OpenF1 car_data responses (any ERS/overtake/boost field?)
import {readdir, readFile} from 'node:fs/promises';
const dir = '.cache/lapsim/raw', keys = new Map(); let files = 0;
for (const f of await readdir(dir)) {
  let d; try { d = JSON.parse(await readFile(`${dir}/${f}`, 'utf8')); } catch { continue; }
  if (!Array.isArray(d) || !d[0] || !('rpm' in d[0] || 'n_gear' in d[0])) continue;
  if (!String(d[0].date).startsWith('2026')) continue;
  files++;
  for (const r of d.slice(0, 50)) for (const [k, v] of Object.entries(r)) { const s = keys.get(k) || new Set(); if (s.size < 5) s.add(v); keys.set(k, s); }
}
console.log('2026 car_data files:', files);
for (const [k, v] of keys) console.log(k, [...v].join(' | '));
