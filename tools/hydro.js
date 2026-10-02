// Hidrología sobre el DEM: limpieza, relleno de depresiones (Priority-Flood + epsilon),
// direcciones de flujo D8 y acumulación de flujo.
const fs = require('fs');
const meta = require('./dem.json');
const { W, H } = meta;
const raw = fs.readFileSync('dem.bin');
const dem = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4).slice();
const N = W * H;

// 1) Limpieza de picos/vacíos (SRTM): fuera de rango -> media de vecinos válidos
for (let it = 0; it < 3; it++) for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
  const k = j * W + i, v = dem[k];
  if (v < -5 || v > 1600) {
    let s = 0, c = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const u = dem[(j + dj) * W + i + di]; if (u >= -5 && u <= 1600) { s += u; c++; } }
    if (c) dem[k] = s / c;
  }
}
for (let k = 0; k < N; k++) if (dem[k] < 0) dem[k] = 0;

// 2) Priority-Flood + epsilon (Barnes et al. 2014)
class Heap {
  constructor(n) { this.k = new Float64Array(n); this.v = new Int32Array(n); this.n = 0; }
  push(key, val) { let i = this.n++; const k = this.k, v = this.v; while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() { const k = this.k, v = this.v; const rv = v[0]; const lk = k[--this.n], lv = v[this.n]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= this.n) break; if (c + 1 < this.n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; return rv; }
}
const DI = [1, 1, 0, -1, -1, -1, 0, 1], DJ = [0, 1, 1, 1, 0, -1, -1, -1];     // E,SE,S,SW,W,NW,N,NE
const EPS = 1e-4;
const fill = new Float32Array(dem);
const closed = new Uint8Array(N);
const heap = new Heap(N + 8);
for (let i = 0; i < W; i++) for (const j of [0, H - 1]) { const k = j * W + i; heap.push(fill[k], k); closed[k] = 1; }
for (let j = 1; j < H - 1; j++) for (const i of [0, W - 1]) { const k = j * W + i; heap.push(fill[k], k); closed[k] = 1; }
while (heap.n) {
  const k = heap.pop(); const i = k % W, j = (k / W) | 0;
  for (let d = 0; d < 8; d++) {
    const ni = i + DI[d], nj = j + DJ[d]; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
    const nk = nj * W + ni; if (closed[nk]) continue; closed[nk] = 1;
    if (fill[nk] <= fill[k]) fill[nk] = fill[k] + EPS;
    heap.push(fill[nk], nk);
  }
}

// 3) Direcciones D8 (máxima pendiente; diagonales con distancia √2)
const dir = new Int8Array(N).fill(-1);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const k = j * W + i; let best = 0, bd = -1;
  for (let d = 0; d < 8; d++) {
    const ni = i + DI[d], nj = j + DJ[d]; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
    const s = (fill[k] - fill[nj * W + ni]) / (d & 1 ? Math.SQRT2 : 1);
    if (s > best) { best = s; bd = d; }
  }
  dir[k] = bd;
}

// 4) Acumulación de flujo (orden topológico)
const indeg = new Int32Array(N);
for (let k = 0; k < N; k++) if (dir[k] >= 0) { const i = k % W, j = (k / W) | 0; indeg[(j + DJ[dir[k]]) * W + i + DI[dir[k]]]++; }
const acc = new Float32Array(N).fill(1);
const q = new Int32Array(N); let qh = 0, qt = 0;
for (let k = 0; k < N; k++) if (!indeg[k]) q[qt++] = k;
while (qh < qt) {
  const k = q[qh++]; const d = dir[k]; if (d < 0) continue;
  const i = k % W, j = (k / W) | 0; const nk = (j + DJ[d]) * W + i + DI[d];
  acc[nk] += acc[k]; if (--indeg[nk] === 0) q[qt++] = nk;
}

fs.writeFileSync('fill.bin', Buffer.from(fill.buffer));
fs.writeFileSync('dir.bin', Buffer.from(dir.buffer));
fs.writeFileSync('acc.bin', Buffer.from(acc.buffer));
let mx = 0; for (const v of acc) if (v > mx) mx = v;
console.log('listo. max acumulación (celdas):', mx);
