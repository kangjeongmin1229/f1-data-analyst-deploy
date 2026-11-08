import test from 'node:test';
import assert from 'node:assert/strict';
import {driveEnergyWithWindJ as driveEnergyJ} from '../scripts/sim/diagnostics/stint-energy-wind.mjs';
const car={mass:1000,cdA:1,clA:2,cRoll:.01},track={ds:10,heading:[0,Math.PI],grade:[0,0]},v=[50,50];
const analytical=(a,b)=>[a,b].reduce((s,air)=>s+(.6*air*air+.01*(9810+1.2*air*air))*10,0);
test('zero wind preserves the closed-loop drag and rolling work',()=>{
 assert.equal(driveEnergyJ(track,car,{rho:1.2},v),analytical(50,50));
});
test('opposite headings use headwind and tailwind; energy uses ground distance',()=>{
 assert.ok(Math.abs(driveEnergyJ(track,car,{rho:1.2,windSpeed:10,windFromDeg:90},v)-analytical(60,40))<1e-8);
});
test('crosswind retains kernel along-track approximation',()=>{
 assert.ok(Math.abs(driveEnergyJ(track,car,{rho:1.2,windSpeed:10,windFromDeg:0},v)-analytical(50,50))<1e-8);
});
test('missing heading preserves previous no-wind fallback',()=>{
 assert.equal(driveEnergyJ({ds:10},car,{rho:1.2,windSpeed:10,windFromDeg:90},v),analytical(50,50));
});
test('air-relative speed is clamped, matching the kernel convention',()=>{
 assert.equal(driveEnergyJ({ds:10,heading:[0]},car,{rho:1.2,windSpeed:60,windFromDeg:270},[50]),.01*9810*10);
});
