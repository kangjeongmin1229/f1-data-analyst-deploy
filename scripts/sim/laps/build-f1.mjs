// F1 all laps from the TracingInsights season repositories (FastF1 timing; the source ti-races.mjs already uses).
//   node scripts/sim/laps/build-f1.mjs <ti-root> [years=2023,2024,2025,2026]
// Writes .cache/lapsim/laps/f1-<year>.ndjson (not committed) and returns counts on stdout.
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tiTrack} from '../ti-races.mjs';
import {sessionType, markRelative, markRainTiming, markWetAcrossYears, counts} from './schema.mjs';

const ROOT = process.argv[2] || '.cache/lapsim/ti-all', YEARS = (process.argv[3] || '2023,2024,2025,2026').split(',').map(Number);
const OUT = process.env.LAPSIM_LAPS || '.cache/lapsim/laps';
const v = x => x === 'None' || x == null ? null : x;
const SLICK = ['SOFT', 'MEDIUM', 'HARD'];
export function clone(dir, year) {
  if (existsSync(join(dir, '.git'))) return;
  execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', `https://github.com/TracingInsights/${year}`, dir], {stdio: 'inherit', env: {...process.env, GIT_LFS_SKIP_SMUDGE: '1'}});
  execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', '--no-cone', '/*/*/*/laptimes.json'], {stdio: 'inherit'});
  execFileSync('git', ['-C', dir, 'checkout', '-q'], {stdio: 'inherit'});
}
mkdirSync(OUT, {recursive: true});
const all = [];
for (const year of YEARS) {
  const dir = join(ROOT, String(year)); clone(dir, year);
  const commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim();
  for (const event of readdirSync(dir).filter(e => /Grand Prix$/.test(e))) {
    const track = tiTrack(event, year);
    for (const session of readdirSync(join(dir, event))) {
      const sd = join(dir, event, session); const rows = [];
      for (const drv of readdirSync(sd).filter(x => /^[A-Z]{3}$/.test(x))) {
        let L; try { L = JSON.parse(readFileSync(join(sd, drv, 'laptimes.json'), 'utf8')); } catch { continue; }
        let stint = null, stintLap = 0;
        for (let i = 0; i < L.lap.length; i++) {
          const time = v(L.time[i]), s = [v(L.s1?.[i]), v(L.s2?.[i]), v(L.s3?.[i])], status = String(L.status?.[i] ?? '1');
          if (v(L.stint?.[i]) !== stint) { stint = v(L.stint?.[i]); stintLap = 0; } stintLap++;
          const q = [];
          if (!Number.isFinite(time)) q.push('no_time');
          if (v(L.pin?.[i]) != null) q.push('pit_in');
          if (v(L.pout?.[i]) != null) q.push('pit_out');
          if (status !== '1') q.push('not_green');            // FastF1 track status: 1 = clear for the whole lap
          if (L.del?.[i] === true) q.push('deleted');
          if (L.wR?.[i] === true || (L.compound?.[i] && !SLICK.includes(L.compound[i]))) q.push('wet_lap');
          if (L.iacc?.[i] === false && Number.isFinite(time)) q.push('inaccurate');
          if (Number.isFinite(time) && s.every(Number.isFinite) && Math.abs(s[0] + s[1] + s[2] - time) > 0.002) q.push('sector_sum');
          if (sessionType(session) === 'R' && L.lap[i] === 1) q.push('first_lap');
          rows.push({source: 'tracinginsights', series: 'f1', season: year, event, track, layout: track, sessionType: sessionType(session), session,
            cls: 'f1', carModel: `${L.team?.[i]} ${year}`, team: L.team?.[i] ?? null, entry: String(L.dNum?.[i] ?? drv), driver: drv, lap: L.lap[i], time,
            s1: s[0], s2: s[1], s3: s[2], trapKph: v(L.vst?.[i]), tyre: L.compound?.[i] ?? null, tyreAge: v(L.life?.[i]), stint, stintLap,
            pitIn: v(L.pin?.[i]) != null ? 1 : 0, pitOut: v(L.pout?.[i]) != null ? 1 : 0, flag: status, tEnd: v(L.sesT?.[i]), rain: L.wR?.[i] === true ? 1 : 0, airC: v(L.wAT?.[i]), trackC: v(L.wTT?.[i]), humidityPct: v(L.wH?.[i]), pressureHpa: v(L.wP?.[i]),
            windMs: v(L.wWS?.[i]), windFromDeg: v(L.wWD?.[i]), trackCondition: null, q, src: commit.slice(0, 10)});
        }
      }
      // session is wet when any lap saw rain or a wet-weather tyre
      if (rows.some(r => r.q.includes('wet_lap'))) for (const r of rows) r.q.push('wet_session');
      all.push(...markRainTiming(markRelative(rows)));
    }
  }
}
const wetList = markWetAcrossYears(all);
for (const year of YEARS) writeFileSync(join(OUT, `f1-${year}.ndjson`), all.filter(r => r.season === year).map(r => JSON.stringify(r)).join('\n'));
writeFileSync(join(OUT, 'f1-counts.json'), JSON.stringify({source: 'TracingInsights season repositories (github.com/TracingInsights/<year>), FastF1 timing', counts: counts(all), wetAcrossYears: wetList}, null, 1));
console.table(counts(all));
console.log('across-year marks:', wetList.length);
