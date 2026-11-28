// central 2026-11-25 17:30: a fitted car with ClA on its fit bound ships labelled (connector and page)
import test from 'node:test';
import assert from 'node:assert/strict';
import {claAtBound, carsFor} from '../worker/lapsim/scenario.js';

test('ClA at bound: flagged for fitted cars only, upper and lower', () => {
  assert.equal(claAtBound({kind: 'calibrated', car: {clA: 8}}), 'max');
  assert.equal(claAtBound({kind: 'calibrated', series: 'wec', cls: 'lmgt3', car: {clA: 3.5}}), 'max');
  assert.equal(claAtBound({kind: 'calibrated', series: 'wec', cls: 'lmh', car: {clA: 2}}), 'min');
  assert.equal(claAtBound({kind: 'calibrated', series: 'wec', cls: 'lmh', car: {clA: 6.3}}), null);
  assert.equal(claAtBound({kind: 'prior', car: {clA: 8}}), null);
  assert.equal(claAtBound({kind: 'calibrated', series: 'fe', car: {clA: 8}}), null);
});

test('ClA at bound reaches the car uncertainty the page and the connector read', () => {
  const cars = carsFor('spa');
  for (const c of Object.values(cars)) assert.equal(c.unc?.claAtBound ?? null, claAtBound(c));
});
