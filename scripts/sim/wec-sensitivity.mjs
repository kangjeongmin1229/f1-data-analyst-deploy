// Diagnostic only (no fit, no model change): simulate the fitted laps of one WEC class-season for many
// car-parameter samples. Used by wec-sensitivity.py (SALib). stdin: {cal, cls, year, samples: [{muY, clA, ...}]}
// stdout: {tracks: [{track, realLap, trapKph}], out: [[lap..., vmax...] per sample]}
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {withGrip} from './calibrate-lib.mjs';

const {cal, cls, year, samples} = JSON.parse(readFileSync(0, 'utf8'));
const s = (await import(pathToFileURL(cal).href)).lapsimCalibration.series.wec[cls][year];
const laps = Object.entries(s.tracks).map(([id, r]) => ({id, r, track: withGrip(trackFromData(lapsimTracks[id]), r.grip), env: conditionsFromWeather(r.weather || {})}));
const out = samples.map(x => {
  const car = {...s.car, ...x};
  if (x.muY) { car.muX = s.car.muX * x.muY / s.car.muY; car.muXTrac = s.car.muXTrac * x.muY / s.car.muY; }
  car.clALow = car.clA; car.cdALow = car.cdA;
  const res = laps.map(l => simulateLap(l.track, car, l.env));
  return [...res.map(r => r.lapTime), ...res.map(r => r.vMaxKph)];
});
console.log(JSON.stringify({car: s.car, tracks: laps.map(l => ({track: l.id, realLap: l.r.realLap, trapKph: l.r.trapKph ?? null})), out}));
