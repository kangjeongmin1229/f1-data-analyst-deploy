// Offline TracingInsights qualifying inputs. Raw files and results stay outside git.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tiTrack} from './ti-races.mjs';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {lapsimCalibration} from '../../worker/lapsim/calibration-data.js';

const columns = ['lap','time','del','iacc','pin','pout','status','compound','wR','wAT','wTT','wH','wP','wWD','wWS','s1','s2','s3'];
const absent = x => x === null || x === 'None';
export function selectTiQualifyingLap(l) {
  if (!Array.isArray(l?.lap) || columns.some(k => !Array.isArray(l[k]) || l[k].length !== l.lap.length)) throw Error('Missing or unequal qualifying columns');
  if (new Set(l.lap).size !== l.lap.length || l.lap.some(n => !Number.isInteger(n) || n < 1)) throw Error('Invalid or duplicate lap number');
  const rejected = {}, eligible = [];
  for (let i = 0; i < l.lap.length; i++) {
    let reason;
    if (!Number.isFinite(l.time[i]) || l.time[i] <= 0) reason = 'missing-time';
    else if (l.del[i] !== false || l.iacc[i] !== true || l.ff1G?.[i] === true) reason = 'deleted-inaccurate-or-generated';
    else if (!absent(l.pin[i]) || !absent(l.pout[i])) reason = 'pit-in-or-out';
    else if (String(l.status[i]) !== '1') reason = 'non-green-or-unknown';
    else if (l.wR[i] !== false || l.compound[i] !== 'SOFT') reason = 'wet-or-non-soft';
    else if (!['wAT','wTT','wH','wP','wWD','wWS','s1','s2','s3'].every(k => Number.isFinite(l[k][i]))) reason = 'incomplete-weather-or-sector';
    else if (l.wP[i] <= 0 || l.wAT[i] <= -273.15 || l.wTT[i] <= -273.15 || l.wH[i] < 0 || l.wH[i] > 100 || l.wWS[i] < 0 || l.wWD[i] < 0 || l.wWD[i] > 360) reason = 'invalid-weather';
    else if (['s1','s2','s3'].some(k => l[k][i] <= 0) || Math.abs(l.s1[i] + l.s2[i] + l.s3[i] - l.time[i]) > .002) reason = 'sector-sum-mismatch';
    if (reason) rejected[reason] = (rejected[reason] || 0) + 1;
    else eligible.push(i);
  }
  eligible.sort((a,b) => l.time[a] - l.time[b] || l.lap[a] - l.lap[b]);
  const i = eligible[0];
  return {index: i ?? null, eligibleLaps: eligible.length, rejected,
    observation: i == null ? null : {lap: l.lap[i], target: l.time[i], sectors: [l.s1[i],l.s2[i],l.s3[i]],
      weather: {airTempC:l.wAT[i],trackTempC:l.wTT[i],humidityPct:l.wH[i],pressureHpa:l.wP[i],windSpeed:l.wWS[i],windFromDeg:l.wWD[i],rain:false}}};
}

function main() {
  const [root, yearText, driver, training, output] = process.argv.slice(2), year = Number(yearText);
  if (!root || ![2025,2026].includes(year) || !/^[A-Z]{3}$/.test(driver || '') || !training || !output) throw Error('Usage: node scripts/sim/ti-fit-inputs.mjs SEASON_CHECKOUT YEAR DRIVER TRAIN_TRACKS OUTPUT_DIRECTORY');
  const train = new Set(training.split(',')), rows = [], events = [];
  const sourceCommit = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  for (const event of fs.readdirSync(root).filter(e => e.endsWith('Grand Prix')).sort()) {
    const file = path.join(root,event,'Qualifying',driver,'laptimes.json');
    if (!fs.existsSync(file)) { events.push({event,held:'missing-driver-laptimes'}); continue; }
    const bytes = fs.readFileSync(file), track = tiTrack(event,year), entry = {event,track,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    let selected;
    try { const laps = JSON.parse(bytes); selected = selectTiQualifyingLap(laps); entry.laps = laps.lap.length; }
    catch (e) { events.push({...entry,held:'invalid-source-schema',detail:e.message}); continue; }
    Object.assign(entry,{eligibleLaps:selected.eligibleLaps,rejected:selected.rejected});
    if (!lapsimTracks[track]) entry.held = 'missing-track';
    else if (!lapsimCalibration.seasons[year]?.tracks[track]) entry.held = 'missing-same-year-track-calibration';
    else if (!selected.observation) entry.held = 'no-eligible-lap';
    else {
      const o = selected.observation;
      Object.assign(entry,{selectedLap:o.lap,target:o.target,geometryYear:lapsimTracks[track].year});
      rows.push({track,year,target:o.target,split:train.has(track)?'train':'holdout',weather:o.weather,
        telemetryFile:path.join(root,event,'Qualifying',driver,`${o.lap}_tel.json`),
        evidence:{event,lap:o.lap,driver,sectors:o.sectors,sourceSha256:entry.sha256,sourceCommit,geometryYear:entry.geometryYear}});
    }
    events.push(entry);
  }
  if (!rows.some(r=>r.split==='train') || !rows.some(r=>r.split==='holdout')) throw Error('Need eligible training and separate holdout tracks');
  // Exclusive creation prevents silently replacing an earlier split or checkpoint.
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(output,'inputs.json'),JSON.stringify(rows,null,2)+'\n');
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({year,driver,sourceCommit,trainingTracks:[...train],events,
    limitations:['No residual-based exclusions. Unknown fuel/setup remain unverified.', 'Holdout is only from new parameter selection; earlier calibration and geometry may contain these tracks.', 'Telemetry files are referenced, not fetched or certified by this adapter.']},null,2)+'\n');
  console.log(`${rows.length} observations; ${events.filter(e=>e.held).length} held events`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
