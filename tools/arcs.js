// Polígonos con topología compartida: los bordes entre sectores vecinos son el mismo arco (sin huecos ni solapes).
const L = require('./lib');
const { W, H } = L;
const V = W + 1;

function dp(pts, tol) {
  if (pts.length < 3) return pts; const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
}
function chaikinOpen(p, it) {
  for (let n = 0; n < it; n++) { if (p.length < 3) break; const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; if (i > 0) q.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]]); if (i < p.length - 2) q.push([.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } q.push(p[p.length - 1]); p = q; }
  return p;
}
function chaikinClosed(p, it) { // p: sin repetir primer punto
  for (let n = 0; n < it; n++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } p = q; }
  return p;
}
const shoelace = r => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const pip = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; };

// lab: Uint16Array(W*H) con 0 fuera. Devuelve {id: MultiPolygon coords en lon/lat}
function polygons(lab, opt = {}) {
  const tol = opt.tol ?? 0.8, iters = opt.iters ?? 2, minHoleCells = opt.minHole ?? 60;
  let i0 = W, i1 = 0, j0 = H, j1 = 0;
  for (let k = 0; k < W * H; k++) if (lab[k]) { const i = k % W, j = (k / W) | 0; if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
  i0 = Math.max(0, i0 - 2); j0 = Math.max(0, j0 - 2); i1 = Math.min(W - 1, i1 + 2); j1 = Math.min(H - 1, j1 + 2);
  const lb = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? 0 : lab[j * W + i];
  const isJ = (vi, vj) => { const a = lb(vi - 1, vj - 1), b = lb(vi, vj - 1), c = lb(vi - 1, vj), d = lb(vi, vj); const s = new Set([a, b, c, d]); if (s.size >= 3) return true; if (s.size === 2 && a === d && b === c && a !== b) return true; return false; };
  // aristas dirigidas, interior (etiqueta mayor) a la derecha
  const groups = new Map();
  const addE = (key, f, t) => { let g = groups.get(key); if (!g) groups.set(key, g = []); g.push([f, t]); };
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const a = lb(i, j); if (!a) continue;
    const up = lb(i, j - 1), dn = lb(i, j + 1), lf = lb(i - 1, j), rt = lb(i + 1, j);
    if (up !== a && a > up) addE(a * 4096 + up, j * V + i, j * V + i + 1);
    if (rt !== a && a > rt) addE(a * 4096 + rt, j * V + i + 1, (j + 1) * V + i + 1);
    if (dn !== a && a > dn) addE(a * 4096 + dn, (j + 1) * V + i + 1, (j + 1) * V + i);
    if (lf !== a && a > lf) addE(a * 4096 + lf, (j + 1) * V + i, j * V + i);
  }
  const jc = new Map(); const isJunction = v => { let r = jc.get(v); if (r === undefined) { r = isJ(v % V, (v / V) | 0); jc.set(v, r); } return r; };
  const arcs = [];   // {a,b,pts,closed,from,to}
  for (const [key, edges] of groups) {
    const a = Math.floor(key / 4096), b = key % 4096;
    const outm = new Map(); edges.forEach((e, idx) => { let l = outm.get(e[0]); if (!l) outm.set(e[0], l = []); l.push(idx); });
    const used = new Uint8Array(edges.length);
    const walk = (startIdx) => { const pts = [edges[startIdx][0]]; let idx = startIdx; for (;;) { used[idx] = 1; const to = edges[idx][1]; pts.push(to); if (isJunction(to)) break; const nx = (outm.get(to) || []).find(x => !used[x]); if (nx === undefined) break; idx = nx; } return pts; };
    for (let idx = 0; idx < edges.length; idx++) if (!used[idx] && isJunction(edges[idx][0])) { const p = walk(idx); arcs.push({ a, b, v: p }); }
    for (let idx = 0; idx < edges.length; idx++) if (!used[idx]) { const p = walk(idx); arcs.push({ a, b, v: p }); }
  }
  // suavizado de cada arco
  for (const arc of arcs) {
    let pts = arc.v.map(v => [v % V, (v / V) | 0]);
    arc.closed = arc.v[0] === arc.v[arc.v.length - 1];
    if (arc.closed) { let r = pts.slice(0, -1); r = dp(r.concat([r[0]]), tol).slice(0, -1); if (r.length >= 3) r = chaikinClosed(r, iters); arc.pts = r.concat([r[0]]); }
    else { pts = dp(pts, tol); arc.pts = chaikinOpen(pts, iters); }
  }
  const toLL = ([i, j]) => [+L.x2lon(L.x0 + i / 256).toFixed(5), +L.y2lat(L.y0 + j / 256).toFixed(5)];
  const res = {};
  const labels = new Set(); arcs.forEach(a => { labels.add(a.a); if (a.b) labels.add(a.b); });
  for (const s of labels) {
    const mine = []; for (const arc of arcs) { if (arc.a === s) mine.push({ pts: arc.pts, fv: arc.v[0], tv: arc.v[arc.v.length - 1] }); else if (arc.b === s) mine.push({ pts: arc.pts.slice().reverse(), fv: arc.v[arc.v.length - 1], tv: arc.v[0] }); }
    const outm = new Map(); mine.forEach((m, i) => { let l = outm.get(m.fv); if (!l) outm.set(m.fv, l = []); l.push(i); });
    const used = new Uint8Array(mine.length); const rings = [];
    for (let i = 0; i < mine.length; i++) { if (used[i]) continue; let ring = []; let cur = i; let guard = 0;
      for (;;) { used[cur] = 1; ring = ring.concat(ring.length ? mine[cur].pts.slice(1) : mine[cur].pts); const to = mine[cur].tv; if (to === mine[i].fv) break; const nx = (outm.get(to) || []).find(x => !used[x]); if (nx === undefined || guard++ > 5000) break; cur = nx; }
      if (ring.length > 3) rings.push(ring.slice(0, -1)); }
    const outers = [], holes = [];
    rings.forEach(r => { const ar = shoelace(r); (ar > 0 ? outers : holes).push({ r, ar }); });
    const polys = outers.map(o => ({ outer: o.r, holes: [] }));
    holes.forEach(h => { if (-h.ar < minHoleCells * 0.5) return; const p = polys.find(pp => pip(h.r[0], pp.outer)); if (p) p.holes.push(h.r); });
    res[s] = polys.map(p => [p.outer, ...p.holes].map(r => { const c = r.map(toLL); c.push(c[0]); return c; }));
  }
  return res;
}
module.exports = { polygons, dp };
