// Sectores = tramo de río (Strahler >= ORD_MIN) + las laderas/afluentes menores que drenan a él.
const fs = require('fs');
const L = require('./lib');
const { W, H, DI, DJ } = L;
const lb = fs.readFileSync('label.bin');
const orderB = fs.readFileSync('order.bin');
const ORD_MIN = +(process.argv[2] || 3), MIN_KM2 = +(process.argv[3] || 6);
const N = W * H;
const cellKm2 = k => L.cellArea((k / W) | 0) / 1e6;

// 1) celdas de la red principal y tramos
const net = new Uint8Array(N); const mask = [];
for (let k = 0; k < N; k++) { if (lb[k]) mask.push(k); if (lb[k] && orderB[k] >= ORD_MIN) net[k] = 1; }
const upNet = k => { const i = k % W, j = (k / W) | 0, ups = []; for (let d = 0; d < 8; d++) { const ni = i + DI[d], nj = j + DJ[d]; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const nk = nj * W + ni; if (net[nk] && L.down(nk) === k) ups.push(nk); } return ups; };
const seg = new Int32Array(N).fill(-1); const segs = [];
for (const k of mask) {
  if (!net[k]) continue; const ups = upNet(k);
  const isStart = ups.length !== 1 || orderB[ups[0]] !== orderB[k];
  if (!isStart) continue;
  const id = segs.length; const cells = []; let c = k;
  for (;;) { seg[c] = id; cells.push(c); const d = L.down(c); if (d < 0 || !net[d]) break; const u = upNet(d); if (u.length !== 1 || orderB[d] !== orderB[k]) break; c = d; }
  segs.push({ id, cells, last: cells[cells.length - 1], order: orderB[k] });
}
for (const s of segs) { const d = L.down(s.last); s.down = (d >= 0 && net[d] && seg[d] >= 0) ? seg[d] : -1; }

// 2) asignar cada celda de la cuenca al tramo al que drena
const sorted = mask.slice().sort((a, b) => L.fill[a] - L.fill[b]);       // aguas abajo primero
const sec = new Int32Array(N).fill(-1);
for (const k of sorted) { if (net[k]) sec[k] = seg[k]; else { const d = L.down(k); sec[k] = (d >= 0 && lb[d]) ? sec[d] : -1; } }
for (const k of mask) if (sec[k] < 0) { sec[k] = 0; }                      // seguridad

// 3) fusionar sectores pequeños con el de aguas abajo
const area = new Float64Array(segs.length); for (const k of mask) area[sec[k]] += cellKm2(k);
const parent = segs.map((_, i) => i); const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
let changed = true;
while (changed) {
  changed = false;
  const A = new Float64Array(segs.length); for (let i = 0; i < segs.length; i++) A[find(i)] += area[i];
  for (let i = 0; i < segs.length; i++) {
    if (find(i) !== i) continue;
    if (A[i] >= MIN_KM2) continue;
    // destino: tramo aguas abajo del último subtramo del grupo; si no existe, el vecino de mayor área
    let target = -1; for (let j = 0; j < segs.length; j++) if (find(j) === i && segs[j].down >= 0 && find(segs[j].down) !== i) { target = find(segs[j].down); break; }
    if (target >= 0) { parent[i] = target; changed = true; break; }
  }
}
const root = new Map(); let nid = 0; for (let i = 0; i < segs.length; i++) { const r = find(i); if (!root.has(r)) root.set(r, ++nid); }
const secId = new Uint16Array(N); for (const k of mask) secId[k] = root.get(find(sec[k]));
const A2 = new Float64Array(nid + 1); for (const k of mask) A2[secId[k]] += cellKm2(k);
// tramo aguas abajo de cada sector fusionado
const downOf = new Int32Array(nid + 1).fill(0);
for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (s.down >= 0 && find(s.down) !== find(i)) downOf[root.get(find(i))] = root.get(find(s.down)); }
console.log('tramos orden>=' + ORD_MIN + ':', segs.length, '→ sectores tras fusionar (<' + MIN_KM2 + ' km²):', nid);
console.log('áreas km²:', Array.from(A2).slice(1).map(v => +v.toFixed(1)).join(' '));
fs.writeFileSync('sector.bin', Buffer.from(secId.buffer));
fs.writeFileSync('sector_down.json', JSON.stringify(Array.from(downOf)));
