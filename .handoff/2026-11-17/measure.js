() => {
  const svg = document.querySelector('svg.ls-map'); if (!svg) return {count: {nomap: 1}, examples: ['no map']};
  const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const num = s => s.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const ptsOf = el => { const n = num(el.getAttribute('d') || el.getAttribute('points') || ''); const o = []; for (let i = 0; i + 1 < n.length; i += 2) o.push([n[i], n[i + 1]]); return o; };
  const dens = (P, step) => { const o = []; for (let i = 0; i + 1 < P.length; i++) { const [a, b] = [P[i], P[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / step)); for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); } if (P.length) o.push(P[P.length - 1]); return o; };
  const sw = +svg.querySelector('g').getAttribute('stroke-width') || 5;
  // oriented box of a text: its own box turned by rotate(a) about its centre (the zoom box turns texts about their own centre)
  const obb = el => { const b = el.getBBox(); const m = /rotate\((-?[\d.]+)\)/.exec(el.getAttribute('transform') || ''), a = m ? +m[1] * Math.PI / 180 : 0, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    return [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]].map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]); };
  const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const sat = (A, B) => { for (const P of [A, B]) for (let i = 0; i < 4; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4], nx = y2 - y1, ny = x1 - x2; const pa = A.map(([x, y]) => x * nx + y * ny), pb = B.map(([x, y]) => x * nx + y * ny); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false; } return true; };
  const shrink = (Q, f) => { const cx = Q.reduce((s, p) => s + p[0], 0) / 4, cy = Q.reduce((s, p) => s + p[1], 0) / 4; return Q.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]); };
  const labels = [...svg.querySelectorAll('text.ls-corner, text.ls-zone-t, text.ls-zone-mt')].filter(t => t.textContent.trim() && getComputedStyle(t).opacity !== '0' && t.style.opacity !== '0').map(t => ({t: t.textContent.trim(), cls: t.getAttribute('class'), q: shrink(obb(t), 0.9)}));
  const track = dens(ptsOf(svg.querySelector('.ls-band') || {getAttribute: () => ''}), sw * 0.6), line = [...svg.querySelectorAll('g>path')].flatMap(p => dens(ptsOf(p), sw * 0.6));
  const band = svg.querySelector('.ls-band') ? ptsOf(svg.querySelector('.ls-band')) : null;
  const pit = [...svg.querySelectorAll('path.ls-pit')].flatMap(p => dens(ptsOf(p), sw * 0.6));
  const zone = [...svg.querySelectorAll('path.ls-zone')].filter(z => z.style.opacity !== '0').flatMap(p => dens(ptsOf(p), sw * 0.6));
  const flag = svg.querySelector('.kb-flag'); const fb = flag ? flag.getBBox() : null;
  const count = {labelLabel: 0, labelTrack: 0, labelPit: 0, labelZone: 0, labelFlag: 0, outside: 0}, ex = [];
  const hitPts = (Q, P) => P.some(([x, y]) => inPoly(Q, x, y));
  for (let i = 0; i < labels.length; i++) { const L = labels[i], Q = L.q;
    for (let j = i + 1; j < labels.length; j++) if (sat(Q, labels[j].q)) { count.labelLabel++; ex.push('label/label ' + L.t + ' x ' + labels[j].t); }
    if (hitPts(Q, line) || (band && Q.some(([x, y]) => inPoly(band, x, y)) && !L.cls.includes('ls-zone'))) { count.labelTrack++; ex.push('on track: ' + L.t); }
    if (hitPts(Q, pit)) { count.labelPit++; ex.push('on pit lane: ' + L.t); }
    if (!L.cls.includes('ls-zone') && hitPts(Q, zone)) { count.labelZone++; ex.push('on zone band: ' + L.t); }
    if (fb && sat(Q, [[fb.x, fb.y], [fb.x + fb.width, fb.y], [fb.x + fb.width, fb.y + fb.height], [fb.x, fb.y + fb.height]])) { count.labelFlag++; ex.push('on flag: ' + L.t); }
    if (Q.some(([x, y]) => x < vb[0] || y < vb[1] || x > vb[0] + vb[2] || y > vb[1] + vb[3])) { count.outside++; ex.push('outside: ' + L.t); }
  }
  return {count, examples: ex, n: labels.length};
}
