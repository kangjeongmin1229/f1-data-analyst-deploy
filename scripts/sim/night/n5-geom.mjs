// N5: geometry κ (as the A2 baseline uses it), grid step and official corners per track → JSON (read only).
import {writeFileSync} from 'node:fs';
import * as S from '../learn/step32-loto.mjs';
const out = {}; for (const id of new Set(S.EV.map(e => e.track))) { const g = S.K.trackFromData(S.T[id]);
  out[id] = {kappa: Array.from(g.kappa), ds: S.T[id].ds, corners: (S.T[id].corners || []).map(c => [`T${c.number}${c.letter || ''}`, c.s])}; }
writeFileSync(process.argv[2], JSON.stringify(out)); console.log(Object.keys(out).length, 'tracks');
