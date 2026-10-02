// Red hídrica (umbral de iniciación de cauce), orden de Strahler, vectorización y morfometría.
const fs = require('fs');
const L = require('./lib');
const { W, H, DI, DJ } = L;
const { dp, toLL } = require('./watershed');
const lb = fs.readFileSync('label.bin');                  // 1 = Cirí Grande, 2 = Trinidad
const out = JSON.parse(fs.readFileSync('outlets.json'));
const T_KM2 = +(process.argv[2] || 0.25);                // iniciación de cauce
const N = W * H;
const cellKm2 = j => L.cellArea(j) / 1e6;
const isStream = new Uint8Array(N);
let nStream = 0;
for (let k = 0; k < N; k++) if (lb[k] && L.acc[k] * cellKm2((k / W) | 0) >= T_KM2) { isStream[k] = 1; nStream++; }

// Strahler
const indeg = new Int32Array(N);
for (let k = 0; k < N; k++) if (isStream[k]) { const d = L.down(k); if (d >= 0 && isStream[d]) indeg[d]++; }
const order = new Uint8Array(N), maxIn = new Uint8Array(N), cntMax = new Uint8Array(N);
const q = []; for (let k = 0; k < N; k++) if (isStream[k] && !indeg[k]) { q.push(k); order[k] = 1; }
const deg0 = Int32Array.from(indeg);
for (let h = 0; h < q.length; h++) {
  const k = q[h]; if (deg0[k] > 0) order[k] = maxIn[k] + (cntMax[k] >= 2 ? 1 : 0); else order[k] = 1;
  const d = L.down(k); if (d < 0 || !isStream[d]) continue;
  if (order[k] > maxIn[d]) { maxIn[d] = order[k]; cntMax[d] = 1; } else if (order[k] === maxIn[d]) cntMax[d]++;
  if (--indeg[d] === 0) q.push(d);
}
let maxOrder = 0; for (let k = 0; k < N; k++) if (order[k] > maxOrder) maxOrder = order[k];
const cls = o => o >= 5 ? 'rio' : o >= 3 ? 'riachuelo' : 'quebrada';

// vectorizar: tramos de orden constante
const feats = []; const lenByOrder = {}; let totalLen = 0;
const stepLen = (k, d) => { const j = (k / W) | 0; const m = Math.sqrt(L.cellArea(j)); return m * (d & 1 ? Math.SQRT2 : 1); };
const inStreamIn = new Int32Array(N); for (let k = 0; k < N; k++) if (isStream[k]) { const d = L.down(k); if (d >= 0 && isStream[d]) inStreamIn[d]++; }
const startCell = k => isStream[k] && (inStreamIn[k] !== 1 || order[k] !== order[k] ) ;
const visitedStart = new Uint8Array(N);
function lineFrom(s) {
  const pts = [s]; let k = s;
  for (;;) {
    const d = L.down(k); if (d < 0 || !isStream[d]) break;
    pts.push(d);
    if (inStreamIn[d] !== 1 || order[d] !== order[s]) { break; }
    k = d;
  }
  return pts;
}
for (let k = 0; k < N; k++) {
  if (!isStream[k]) continue;
  // inicio de tramo: fuente, o confluencia (≥2 afluentes), o cambio de orden respecto al aguas arriba único
  let isStart = inStreamIn[k] !== 1;
  if (!isStart) { // un único afluente: ¿cambia el orden?
    for (let d = 0; d < 8; d++) { const ni = (k % W) + DI[d], nj = ((k / W) | 0) + DJ[d]; const nk = nj * W + ni; if (isStream[nk] && L.down(nk) === k) { if (order[nk] !== order[k]) isStart = true; } }
  }
  if (!isStart) continue;
  const pts = lineFrom(k);
  if (pts.length < 2) continue;
  const xy = pts.map(c => [c % W + .5, ((c / W) | 0) + .5]);
  let len = 0; for (let i = 0; i < pts.length - 1; i++) { const dd = (() => { for (let d = 0; d < 8; d++) { const ni = (pts[i] % W) + DI[d], nj = ((pts[i] / W) | 0) + DJ[d]; if (nj * W + ni === pts[i + 1]) return d; } return 0; })(); len += stepLen(pts[i], dd); }
  const ord = order[k], endK = pts[pts.length - 1];
  const simp = dp(xy, 0.9);
  const side = lb[k] === 1 ? 'ciri' : 'trinidad';
  feats.push({ type: 'Feature', properties: { o: ord, c: cls(ord), a: +(L.acc[pts[pts.length - 1]] * cellKm2((endK / W) | 0)).toFixed(1), s: side }, geometry: { type: 'LineString', coordinates: simp.map(([x, y]) => toLL([x, y])) } });
  lenByOrder[ord] = (lenByOrder[ord] || 0) + len; totalLen += len;
}
let areaKm2 = 0; for (let k = 0; k < N; k++) if (lb[k]) areaKm2 += cellKm2((k / W) | 0);
console.log('umbral', T_KM2, 'km² | celdas cauce', nStream, '| orden máx', maxOrder, '| tramos', feats.length);
console.log('longitud por orden (km):', Object.fromEntries(Object.entries(lenByOrder).map(([o, v]) => [o, +(v / 1000).toFixed(1)])), 'total', (totalLen / 1000).toFixed(1), 'km | densidad de drenaje', (totalLen / 1000 / areaKm2).toFixed(2), 'km/km²');
fs.writeFileSync('streams.geojson', JSON.stringify({ type: 'FeatureCollection', features: feats }));
fs.writeFileSync('order.bin', Buffer.from(order.buffer));
fs.writeFileSync('isstream.bin', Buffer.from(isStream.buffer));
console.log('streams.geojson', (fs.statSync('streams.geojson').size / 1024).toFixed(0), 'KB');
