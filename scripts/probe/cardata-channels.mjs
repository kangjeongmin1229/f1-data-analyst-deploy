// One-off probe: which CarData channels the official 2026 live-timing archive carries
// (looking for ERS deploy/recharge, battery, overtake and boost next to speed/rpm/throttle).
import {inflateRawSync} from 'node:zlib';
const BASE = 'https://livetiming.formula1.com/static/';
const get = async p => { const r = await fetch(BASE + p, {headers: {'user-agent': 'Kongboda-probe/1.0'}}); if (!r.ok) throw Error(r.status + ' ' + p); return r.text(); };
const idx = JSON.parse((await get('2026/Index.json')).replace(/^﻿/, ''));
const meetings = idx.Meetings.filter(m => m.Sessions?.some(s => s.Path)).slice(-2);
for (const m of meetings) for (const s of m.Sessions.filter(s => s.Path).slice(-3)) {
  try {
    const lines = (await get(s.Path + 'CarData.z.jsonStream')).split('\n').filter(Boolean).slice(0, 400);
    const keys = new Map();
    for (const l of lines) {
      const z = JSON.parse(l.slice(12));
      const d = JSON.parse(inflateRawSync(Buffer.from(z, 'base64')).toString());
      for (const e of d.Entries || []) for (const car of Object.values(e.Cars || {})) for (const [k, v] of Object.entries(car.Channels || {})) { const a = keys.get(k) || new Set(); if (a.size < 6) a.add(v); keys.set(k, a); }
    }
    console.log(m.Name, s.Name, [...keys].map(([k, v]) => `${k}:[${[...v].join(',')}]`).join(' '));
    const topics = await get(s.Path + 'Index.json').then(t => Object.keys(JSON.parse(t.replace(/^﻿/, '')).Feeds || {})).catch(e => [e.message]);
    console.log('  feeds:', topics.join(', '));
  } catch (e) { console.log(m.Name, s.Name, e.message); }
}
