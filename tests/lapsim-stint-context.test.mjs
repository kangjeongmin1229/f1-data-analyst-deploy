import test from 'node:test';
import assert from 'node:assert/strict';
import {stintContext} from '../scripts/sim/stint-context.mjs';
const fixture = () => ({series:{wec:{lmh:{2025:{car:{mass:1000},tracks:{imola:{grip:1.1,weather:{airTempC:20,pressureHpa:1000}}}},2026:{car:{mass:1100},tracks:{imola:{grip:1.2,weather:{airTempC:30,pressureHpa:1010}}}}}}}});
test('historical stint context selects the requested year for car, grip and weather',()=>{
  const c=fixture(), r=stintContext(c,2025,'imola','lmh');
  assert.equal(r.ok,true);assert.equal(r.car.mass,1000);assert.equal(r.grip,1.1);assert.equal(r.weather.airTempC,20);
  assert.equal(stintContext(c,2026,'imola','lmh').car.mass,1100);
});
test('missing historical inputs are held rather than replaced with a newer season',()=>{
  const c=fixture();delete c.series.wec.lmh[2025];
  assert.deepEqual(stintContext(c,2025,'imola','lmh'),{ok:false,reason:'missing-year-class-model'});
  const d=fixture();delete d.series.wec.lmh[2025].tracks.imola.weather;
  assert.equal(stintContext(d,2025,'imola','lmh').reason,'missing-event-weather');
  assert.equal(stintContext(d,2025,'monza','lmh').reason,'missing-year-track-calibration');
});
