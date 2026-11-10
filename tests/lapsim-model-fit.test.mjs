import test from'node:test';import assert from'node:assert/strict';
import{hierarchyCars,carForModel,fitModelHierarchy}from'../scripts/sim/wec-model-fit.mjs';
import{fitSeason}from'../scripts/sim/calibrate-lib.mjs';import{TUM_2019}from'../worker/lapsim/cars.js';import{simulateLap}from'../worker/lapsim/engine.js';
test('unknown models use the class base and model offsets obey the unchanged bounds',()=>{
 const base={muY:1.7,muX:1.6,muXTrac:1.8,clA:3.4,cdA:1,linkMu:true,noLowDrag:true};
 const params=[{path:'muY',base:1.7,min:1.3,max:2.2},{path:'clA',base:3.4,min:2,max:7},{path:'cdA',base:1,min:.7,max:1.6}];
 const fit=hierarchyCars(base,params,['known'],[0,0,0,Math.log(2),Math.log(3),Math.log(.1)]);
 assert.equal(carForModel(fit,'hidden'),fit.car);
 assert.equal(fit.modelCars.known.muY,2.2);assert.equal(fit.modelCars.known.clA,7);assert.equal(fit.modelCars.known.cdA,.7);
 assert.equal(fit.modelCars.known.clALow,7);assert.equal(fit.modelCars.known.cdALow,.7);assert.ok(fit.outside>0);
});
test('disabled model hierarchy returns the byte-identical class fit',()=>{
 const track={ds:10,kappa:Float64Array.from({length:40},(_,i)=>i%20>12?1/60:0)},base=structuredClone(TUM_2019);
 const params=[{path:'muY',key:'muY',base:base.muY,min:1,max:3,step:.08}],laps=[{name:'test',track,model:'one',grip:1,lapSeconds:simulateLap(track,base).lapTime}];
 const stop={tolerance:1e-4,cap:2000,window:10};
 assert.equal(JSON.stringify(fitModelHierarchy(laps,base,params,{enabled:false,stop})),JSON.stringify(fitSeason(laps,base,params,{stop})));
});
