// Delimitación de las dos subcuencas (Cirí Grande y Trinidad) a partir del DEM:
// todas las celdas cuyo camino de flujo D8 pasa por el punto de salida (pour point).
const fs = require('fs');
const L = require('./lib');
const { W, H, DI, DJ } = L;

function pourPoint(lon, lat) {                       // sigue el cauce hasta justo antes del lago
  let k = L.snap(lon, lat), prev = k, g = 0;
  while (k >= 0 && g++ < 30000) { if (L.isLake(k) && L.acc[k] > 3000) return prev; prev = k; k = L.down(k); }
  return prev;
}
function basin(outK) {                               // BFS aguas arriba
  const m = new Uint8Array(W * H); const q = [outK]; m[outK] = 1;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % W, j = (k / W) | 0;
    for (let d = 0; d < 8; d++) {
      const ni = i + DI[d], nj = j + DJ[d]; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni; if (m[nk]) continue;
      const dd = L.dir[nk]; if (dd < 0) continue;
      if (nj + DJ[dd] === j && ni + DI[dd] === i) { m[nk] = 1; q.push(nk); }
    }
  }
  return m;
}
const pCG = pourPoint(-80.0567, 8.7654), pTR = pourPoint(-79.9987, 8.7805);
const mCG = basin(pCG), mTR = basin(pTR);
const label = new Uint8Array(W * H);
let aCG = 0, aTR = 0, overlap = 0;
for (let k = 0; k < W * H; k++) { if (mCG[k]) { label[k] = 1; aCG += L.cellArea((k / W) | 0); } if (mTR[k]) { if (label[k]) overlap++; label[k] = 2; aTR += L.cellArea((k / W) | 0); } }
console.log('Cirí Grande km²', (aCG / 1e6).toFixed(1), 'Trinidad km²', (aTR / 1e6).toFixed(1), 'solape', overlap);
const ll = k => L.llOf(k % W, (k / W) | 0);
console.log('salida CG', ll(pCG).map(v => v.toFixed(5)), 'salida TR', ll(pTR).map(v => v.toFixed(5)));
fs.writeFileSync('label.bin', Buffer.from(label.buffer));
fs.writeFileSync('outlets.json', JSON.stringify({ CG: ll(pCG), TR: ll(pTR), cg: pCG, tr: pTR }));

// ---- extracción de contornos de una máscara ----
function rings(mask) {
  const edges = new Map(); const V = W + 1; const add = (a, b) => { const kk = a; (edges.get(kk) || edges.set(kk, []).get(kk)).push(b); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!mask[j * W + i]) continue;
    const up = j > 0 && mask[(j - 1) * W + i], dn = j < H - 1 && mask[(j + 1) * W + i], lf = i > 0 && mask[j * W + i - 1], rt = i < W - 1 && mask[j * W + i + 1];
    if (!up) add(j * V + i, j * V + i + 1);
    if (!rt) add(j * V + i + 1, (j + 1) * V + i + 1);
    if (!dn) add((j + 1) * V + i + 1, (j + 1) * V + i);
    if (!lf) add((j + 1) * V + i, j * V + i);
  }
  const out = [];
  for (const [start] of edges) {
    while (edges.get(start) && edges.get(start).length) {
      const ring = [start]; let cur = start;
      for (;;) { const nx = edges.get(cur); if (!nx || !nx.length) break; const n = nx.pop(); ring.push(n); cur = n; if (n === start) break; }
      if (ring.length > 3) out.push(ring.map(v => [v % V, (v / V) | 0]));
    }
  }
  return out;
}
const area2 = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
function dp(pts, tol) {                                     // Douglas-Peucker (abierto)
  if (pts.length < 3) return pts; const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
}
function chaikin(pts, it) {                                   // anillo cerrado
  let p = pts.slice(0, -1);
  for (let n = 0; n < it; n++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .75 * b[1] + .25 * a[1]]); } p = q; }
  p.push(p[0]); return p;
}
const toLL = ([i, j]) => [+L.x2lon(L.x0 + i / 256).toFixed(5), +L.y2lat(L.y0 + j / 256).toFixed(5)];
function polygonOf(mask, minHoleKm2 = 0.08, tol = 0.8) {
  const rs = rings(mask).map(r => ({ r, a: area2(r) }));
  const out = rs.filter(o => o.a > 0).sort((x, y) => y.a - x.a)[0];                       // anillo exterior mayor (horario en pantalla)
  const holes = rs.filter(o => o.a < 0 && -o.a * (38.2 * 38.2) / 1e6 > minHoleKm2);
  const fmt = o => { let p = dp(o.r.slice(0, -1).concat([o.r[0]]), tol); p = chaikin(p, 2); return p.map(toLL); };
  return [fmt(out), ...holes.map(fmt)];
}
module.exports = { rings, area2, dp, chaikin, toLL, polygonOf };

if (require.main === module) {
  const un = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) un[k] = label[k] ? 1 : 0;
  const geo = { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { id: 'microcuenca', name: 'Ciri Grande–Trinidad', km2: +((aCG + aTR) / 1e6).toFixed(1) }, geometry: { type: 'Polygon', coordinates: polygonOf(un) } },
    { type: 'Feature', properties: { id: 'ciri', name: 'Subcuenca Río Cirí Grande', km2: +(aCG / 1e6).toFixed(1) }, geometry: { type: 'Polygon', coordinates: polygonOf(mCG) } },
    { type: 'Feature', properties: { id: 'trinidad', name: 'Subcuenca Río Trinidad', km2: +(aTR / 1e6).toFixed(1) }, geometry: { type: 'Polygon', coordinates: polygonOf(mTR) } } ] };
  fs.writeFileSync('boundary.geojson', JSON.stringify(geo));
  geo.features.forEach(f => console.log(f.properties.id, 'vértices', f.geometry.coordinates.map(r => r.length).join(',')));
  // bbox
  let w = 9e9, e = -9e9, s = 9e9, n = -9e9; geo.features[0].geometry.coordinates[0].forEach(([x, y]) => { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); });
  console.log('bbox', w, e, s, n);
}
