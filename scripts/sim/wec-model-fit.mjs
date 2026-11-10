// Experiment-only hierarchy. No runtime caller and no production installation.
import {fitSeason, lapError, withGrip, nelderMead} from './calibrate-lib.mjs';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
export const MODEL_SHRINK = {lambda: 8, logScale: 0.1};
export const MODEL_STOP = {tolerance: 1e-4, cap: 2000, window: 10};
export function hierarchyCars(base, params, models, x) {
  let outside = 0;
  const build = offset => {
    const c = structuredClone(base);
    params.forEach((p,i) => {
      let value = p.base * Math.exp(x[i] + (offset ? x[offset+i] : 0));
      if(value<p.min){outside+=Math.log(p.min/value)**2;value=p.min;}
      if(value>p.max){outside+=Math.log(value/p.max)**2;value=p.max;}
      c[p.path]=value;
    });
    if(base.linkMu){c.muX=base.muX*c.muY/base.muY;c.muXTrac=base.muXTrac*c.muY/base.muY;}
    if(base.noLowDrag){c.clALow=c.clA;c.cdALow=c.cdA;}
    return c;
  };
  const car=build(0),modelCars=Object.fromEntries(models.map((m,i)=>[m,build(params.length*(i+1))]));
  return {car,modelCars,outside};
}
export const carForModel=(fit,model)=>fit.modelCars?.[model] || fit.car;
export function fitModelHierarchy(laps,base,params,{enabled=false,controlFit,trace,stop=MODEL_STOP}={}) {
  if(!enabled)return fitSeason(laps,base,params,{stop,trace});
  if(!controlFit)throw Error('A control fit on exactly these training rows is required');
  const models=[...new Set(laps.map(l=>l.model).filter(Boolean))].sort();
  const prepared=laps.map(l=>({...l,env:conditionsFromWeather(l.weather||{})}));
  const x0=[...controlFit.x,...new Array(models.length*params.length).fill(0)];
  const objective=x=>{
    const fit=hierarchyCars(base,params,models,x);
    let total=0;
    for(const l of prepared){let c=carForModel(fit,l.model);if(l.patch)c=l.patch(c);total+=(l.weight??1)*lapError(withGrip(l.track,l.grip),c,l.env,null,l.lapSeconds,{wTime:2,trapKph:l.trapKph}).score;}
    const delta=x.slice(params.length);
    const shrink=MODEL_SHRINK.lambda*delta.reduce((a,d)=>a+(d/MODEL_SHRINK.logScale)**2,0)/Math.max(1,models.length);
    return total/prepared.length+100*fit.outside+shrink;
  };
  let end;
  const result=nelderMead(objective,x0,{step:0.08,stop,trace:e=>{if(e.event==='end')end=e;trace?.(e);}});
  const {car,modelCars}=hierarchyCars(base,params,models,result.x);
  return {car,modelCars,x:result.x,score:result.value,models,convergence:end,shrink:MODEL_SHRINK};
}
