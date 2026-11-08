// Diagnostic only. Inputs are simulated DC energy flows, not measured battery telemetry.
// Apply deployment, then recovery, matching the kernel's causal segment ordering.
export function batteryLedger(flow) {
  const {dep,brk,thr,soc:capacity,recharge}=flow;
  if (!Array.isArray(dep)||!Array.isArray(brk)||!Array.isArray(thr)||dep.length!==brk.length||dep.length!==thr.length) throw new TypeError('Equal-length energy arrays required');
  if (!Number.isFinite(capacity)||capacity<0||(recharge!=null&&(!Number.isFinite(recharge)||recharge<0))) throw new RangeError('Nonnegative finite energy limits required');
  let state=capacity,minimum=capacity,deployed=0,recovered=0,rawRecovery=0,spilled=0,blocked=0,maxUnderflow=0;
  for(let i=0;i<dep.length;i++) {
    if (![dep[i],brk[i],thr[i]].every(x=>Number.isFinite(x)&&x>=0)) throw new RangeError('Nonnegative finite energy flows required');
    const raw=brk[i]+thr[i],accepted=recharge==null?raw:Math.min(raw,Math.max(0,recharge-recovered));
    maxUnderflow=Math.max(maxUnderflow,dep[i]-state);
    state-=dep[i];minimum=Math.min(minimum,state);deployed+=dep[i];rawRecovery+=raw;recovered+=accepted;blocked+=raw-accepted;
    spilled+=Math.max(0,state+accepted-capacity);state=Math.min(capacity,state+accepted);
  }
  return {initialJ:capacity,endJ:state,minJ:minimum,deployedJ:deployed,rawRecoveryJ:rawRecovery,acceptedRecoveryJ:recovered,spilledJ:spilled,blockedJ:blocked,maxUnderflowJ:maxUnderflow,balanceResidualJ:state-(capacity-deployed+recovered-spilled)};
}
