// Descarga tiles Terrarium, arma el DEM, rellena depresiones, D8, acumulación de flujo.
const fs = require('fs'), https = require('https');
const { PNG } = require('pngjs');

const Z = 12;
const BBOX = { w: -80.30, e: -79.70, s: 8.55, n: 9.25 };   // lon/lat

const lon2x = (lon, z) => (lon + 180) / 360 * 2 ** z;
const lat2y = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z;
const x2lon = (x, z) => x / 2 ** z * 360 - 180;
const y2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;

function get(url) {
  return new Promise((res, rej) => https.get(url, r => {
    const c = []; r.on('data', d => c.push(d)); r.on('end', () => r.statusCode === 200 ? res(Buffer.concat(c)) : rej(new Error(r.statusCode + ' ' + url)));
  }).on('error', rej));
}

(async () => {
  const x0 = Math.floor(lon2x(BBOX.w, Z)), x1 = Math.floor(lon2x(BBOX.e, Z));
  const y0 = Math.floor(lat2y(BBOX.n, Z)), y1 = Math.floor(lat2y(BBOX.s, Z));
  const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256;
  const elev = new Float32Array(W * H);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const buf = await get(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`);
    const png = PNG.sync.read(buf);
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const p = (j * 256 + i) * 4;
      elev[((ty - y0) * 256 + j) * W + (tx - x0) * 256 + i] = png.data[p] * 256 + png.data[p + 1] + png.data[p + 2] / 256 - 32768;
    }
  }
  const meta = { Z, x0, y0, W, H };
  fs.writeFileSync('dem.bin', Buffer.from(elev.buffer));
  fs.writeFileSync('dem.json', JSON.stringify(meta));
  let mn = 1e9, mx = -1e9; for (const v of elev) { if (v < mn) mn = v; if (v > mx) mx = v; }
  console.log('DEM', W, 'x', H, 'elev', mn.toFixed(1), mx.toFixed(1), 'tiles', (x1 - x0 + 1) * (y1 - y0 + 1));
})();
