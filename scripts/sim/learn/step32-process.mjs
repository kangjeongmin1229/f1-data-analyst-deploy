// Step 32 A7.3: one processing path for measured and simulated laps (identical processing).
// sampleRegrid: speeds at the lap's raw sample positions xs (grid-index units) → linear onto the grid, NaN outside (np.interp left/right).
// deriv: step31_power.py deriv() in JS — periodic interpolation over NaN, Savitzky–Golay 45 m, order 2, deriv 1, mode wrap.
export function regrid(n, xs, sp) {
  const a = new Float64Array(n).fill(NaN); let j = 0;
  for (let k = 0; k < n; k++) { if (k < xs[0] || k > xs[xs.length - 1]) continue; while (j < xs.length - 2 && xs[j + 1] < k) j++;
    const x0 = xs[j], x1 = xs[j + 1]; a[k] = x1 > x0 ? sp[j] + (sp[j + 1] - sp[j]) * (k - x0) / (x1 - x0) : sp[j]; }
  return a;
}
export function deriv(vKph, ds, sgw = 45) {
  const n = vKph.length, v = Float64Array.from(vKph, x => x / 3.6), idx = []; for (let i = 0; i < n; i++) if (Number.isFinite(v[i])) idx.push(i);
  const vf = new Float64Array(n), m = idx.length;
  for (let q = 0; q < m; q++) { const a = idx[q], b = idx[(q + 1) % m], span = ((b - a + n) % n) || n; // periodic np.interp
    for (let s = 0; s < span; s++) vf[(a + s) % n] = v[a] + (v[b] - v[a]) * s / span; }
  let w = Math.round(sgw / ds); w = w | 1; const h = (w - 1) / 2; let den = 0; for (let j = -h; j <= h; j++) den += j * j;
  const dv = new Float64Array(n); // quadratic SG slope at the centre = linear LS slope: Σ j·v / Σ j² / ds
  for (let i = 0; i < n; i++) { let s = 0; for (let j = -h; j <= h; j++) s += j * vf[((i + j) % n + n) % n]; dv[i] = s / den / ds; }
  const ok = Uint8Array.from(v, x => Number.isFinite(x) ? 1 : 0);
  return {vf, dv, ok};
}
