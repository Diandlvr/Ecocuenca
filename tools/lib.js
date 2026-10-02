const fs = require('fs');
const meta = require('./dem.json'); const { W, H, Z, x0, y0 } = meta;
const f32 = f => { const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const dem = f32('dem.bin'), fill = f32('fill.bin'), acc = f32('acc.bin');
const dirb = fs.readFileSync('dir.bin'); const dir = new Int8Array(dirb.buffer, dirb.byteOffset, dirb.length);
const DI = [1, 1, 0, -1, -1, -1, 0, 1], DJ = [0, 1, 1, 1, 0, -1, -1, -1];
const lon2x = lon => (lon + 180) / 360 * 2 ** Z, lat2y = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** Z;
const x2lon = x => x / 2 ** Z * 360 - 180, y2lat = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** Z))) * 180 / Math.PI;
const cellOf = (lon, lat) => { const i = Math.round((lon2x(lon) - x0) * 256 - .5), j = Math.round((lat2y(lat) - y0) * 256 - .5); return [i, j]; };
const llOf = (i, j) => [x2lon(x0 + (i + .5) / 256), y2lat(y0 + (j + .5) / 256)];
// píxel Mercator -> área real (m²)
const cellArea = j => { const lat = y2lat(y0 + (j + .5) / 256); const m = 40075016.686 * Math.cos(lat * Math.PI / 180) / (256 * 2 ** Z); return m * m; };
// lago: baja cota, relieve nulo (embalse Gatún ~26 m)
const isLake = k => { const e = dem[k]; if (e < 20 || e > 29) return false; const i = k % W, j = (k / W) | 0; if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) return false; let r = 0; for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) r = Math.max(r, Math.abs(dem[k + b * W + a] - e)); return r < 1.2; };
const snap = (lon, lat, rad = 12) => { let [ci, cj] = cellOf(lon, lat), best = -1, bk = -1; for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) { const k = (cj + dj) * W + ci + di; if (acc[k] > best) { best = acc[k]; bk = k; } } return bk; };
const down = k => { const d = dir[k]; if (d < 0) return -1; const i = k % W, j = (k / W) | 0; return (j + DJ[d]) * W + i + DI[d]; };
module.exports = { W, H, Z, x0, y0, dem, fill, acc, dir, DI, DJ, lon2x, lat2y, cellOf, llOf, cellArea, isLake, snap, down, x2lon, y2lat };
