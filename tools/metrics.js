// Métricas por sector: relieve, cobertura (ESA WorldCover 2021), franja ribereña, pérdida forestal (Hansen).
const fs = require('fs');
const L = require('./lib');
const { W, H, Z, x0, y0 } = L;
const N = W * H;
const lb = fs.readFileSync('label.bin');
const sb = fs.readFileSync('sector.bin'); const sector = new Uint16Array(sb.buffer, sb.byteOffset, sb.length / 2);
const isStreamB = fs.readFileSync('isstream.bin');
const nSec = Math.max(...sector.slice(0, 1)) , maxId = (() => { let m = 0; for (let k = 0; k < N; k++) if (sector[k] > m) m = sector[k]; return m; })();

// pendiente (%) en celdas
const slope = new Float32Array(N);
for (let j = 1; j < H - 1; j++) { const m = Math.sqrt(L.cellArea(j)); for (let i = 1; i < W - 1; i++) { const k = j * W + i; const dx = (L.dem[k + 1] - L.dem[k - 1]) / (2 * m), dy = (L.dem[k + W] - L.dem[k - W]) / (2 * m); slope[k] = 100 * Math.hypot(dx, dy); } }
// franja ribereña: celdas a ≤1 celda (~38 m) de un cauce
const rip = new Uint8Array(N);
for (let k = 0; k < N; k++) if (isStreamB[k]) { const i = k % W, j = (k / W) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) rip[(j + dj) * W + i + di] = 1; }

const S = Array.from({ length: maxId + 1 }, () => ({ n: 0, area: 0, elevSum: 0, elevMin: 1e9, elevMax: -1e9, slopeSum: 0, steep: 0, cls: {}, ripN: 0, ripTree: 0, steepBare: 0, wcN: 0, hN: 0, h2000: 0, loss: new Array(24).fill(0), cg: 0, tr: 0 }));
for (let k = 0; k < N; k++) {
  const id = sector[k]; if (!id || !lb[k]) continue; const s = S[id];
  const a = L.cellArea((k / W) | 0) / 1e6; s.n++; s.area += a; s.elevSum += L.dem[k]; s.elevMin = Math.min(s.elevMin, L.dem[k]); s.elevMax = Math.max(s.elevMax, L.dem[k]);
  s.slopeSum += slope[k]; if (slope[k] > 30) s.steep++; if (lb[k] === 1) s.cg++; else s.tr++;
}

// WorldCover
const wc = JSON.parse(fs.readFileSync('wc2021.json')); const wcb = fs.readFileSync('wc2021.bin');
const tot = { cls: {}, ripN: 0, ripTree: 0, n: 0 };
{
  const cols = new Int32Array(wc.w), rows = new Int32Array(wc.h);
  for (let c = 0; c < wc.w; c++) cols[c] = Math.floor((L.lon2x(wc.lon0 + (c + .5) * wc.rx) - x0) * 256);
  for (let r = 0; r < wc.h; r++) rows[r] = Math.floor((L.lat2y(wc.lat0 + (r + .5) * wc.ry) - y0) * 256);
  for (let r = 0; r < wc.h; r++) { const j = rows[r]; if (j < 1 || j >= H - 1) continue; for (let c = 0; c < wc.w; c++) {
    const i = cols[c]; if (i < 1 || i >= W - 1) continue; const k = j * W + i; const id = sector[k]; if (!id || !lb[k]) continue;
    const v = wcb[r * wc.w + c]; const s = S[id]; s.wcN++; s.cls[v] = (s.cls[v] || 0) + 1; tot.n++; tot.cls[v] = (tot.cls[v] || 0) + 1;
    if (rip[k]) { s.ripN++; tot.ripN++; if (v === 10 || v === 95) { s.ripTree++; tot.ripTree++; } }
    if (slope[k] > 30 && v !== 10 && v !== 95 && v !== 80) s.steepBare++;
  } }
}
// Hansen
const hj = JSON.parse(fs.readFileSync('hansen.json')); const htc = fs.readFileSync('hansen_treecover2000.bin'), hly = fs.readFileSync('hansen_lossyear.bin');
const totH = { h2000: 0, loss: new Array(24).fill(0) };
{
  for (let r = 0; r < hj.h; r++) { const lat = hj.lat0 - (r + .5) * hj.res, j = Math.floor((L.lat2y(lat) - y0) * 256); if (j < 1 || j >= H - 1) continue;
    for (let c = 0; c < hj.w; c++) { const lon = hj.lon0 + (c + .5) * hj.res, i = Math.floor((L.lon2x(lon) - x0) * 256); if (i < 1 || i >= W - 1) continue;
      const k = j * W + i, id = sector[k]; if (!id || !lb[k]) continue; const s = S[id]; s.hN++;
      if (htc[r * hj.w + c] >= 30) { s.h2000++; totH.h2000++; const y = hly[r * hj.w + c]; if (y > 0) { s.loss[y]++; totH.loss[y]++; } } } }
}
const out = { sectors: [], totals: { cls: tot.cls, wcN: tot.n, ripN: tot.ripN, ripTree: tot.ripTree, h2000: totH.h2000, loss: totH.loss } };
for (let id = 1; id <= maxId; id++) { const s = S[id]; if (!s.n) continue;
  const frac = c => (s.cls[c] || 0) / s.wcN;
  out.sectors.push({ id, km2: +s.area.toFixed(2), elevMean: +(s.elevSum / s.n).toFixed(0), elevMin: +s.elevMin.toFixed(0), elevMax: +s.elevMax.toFixed(0), slopeMean: +(s.slopeSum / s.n).toFixed(1), steepPct: +(100 * s.steep / s.n).toFixed(1),
    tree: +(100 * (frac(10) + frac(95))).toFixed(1), grass: +(100 * frac(30)).toFixed(1), crop: +(100 * frac(40)).toFixed(1), built: +(100 * frac(50)).toFixed(1), shrub: +(100 * frac(20)).toFixed(1), water: +(100 * (frac(80) + frac(90))).toFixed(1),
    ripTree: +(100 * s.ripTree / Math.max(1, s.ripN)).toFixed(1), steepBare: +(100 * s.steepBare / s.wcN).toFixed(1), cgShare: +(s.cg / s.n).toFixed(2),
    forest2000Ha: +(s.h2000 * (hj.res * 111320 * Math.cos(8.85 * Math.PI / 180)) * (hj.res * 110574) / 1e4).toFixed(0), hLoss: s.loss });
}
fs.writeFileSync('metrics.json', JSON.stringify(out));
console.log('id  km2  elev(min-max)  pend%  steep%  tree  grass  ripTree  steepBare  cg   forest2000ha  loss01-23(ha)');
const pxha = (hj.res * 111320 * Math.cos(8.85 * Math.PI / 180)) * (hj.res * 110574) / 1e4;
out.sectors.forEach(s => console.log(String(s.id).padStart(2), String(s.km2).padStart(5), (s.elevMean + '(' + s.elevMin + '-' + s.elevMax + ')').padEnd(14), String(s.slopeMean).padStart(5), String(s.steepPct).padStart(6), String(s.tree).padStart(6), String(s.grass).padStart(5), String(s.ripTree).padStart(7), String(s.steepBare).padStart(7), s.cgShare, String(s.forest2000Ha).padStart(7), (s.hLoss.reduce((a, b) => a + b, 0) * pxha).toFixed(0)));
const T = out.totals; const frT = c => (100 * (T.cls[c] || 0) / T.wcN).toFixed(1);
console.log('TOTAL cuenca: árbol', frT(10), '% | pasto', frT(30), '% | arbustos', frT(20), '% | cultivo', frT(40), '% | construido', frT(50), '% | agua/humedal', ((+frT(80)) + (+frT(90))).toFixed(1), '% | ribereño árbol', (100 * T.ripTree / T.ripN).toFixed(1), '%');
console.log('Hansen: bosque 2000 (>=30% dosel)', (T.h2000 * pxha).toFixed(0), 'ha; pérdida 2001–2023', (T.loss.reduce((a, b) => a + b, 0) * pxha).toFixed(0), 'ha');
