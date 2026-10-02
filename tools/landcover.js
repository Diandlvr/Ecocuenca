// ESA WorldCover 2021 (10 m) — ventana sobre la microcuenca vía HTTP range (COG).
const fs = require('fs');
(async () => {
  const { fromUrl } = await import('geotiff');
  const year = process.argv[2] || '2021', ver = year === '2021' ? 'v200' : 'v100';
  const url = `https://esa-worldcover.s3.eu-central-1.amazonaws.com/${ver}/${year}/map/ESA_WorldCover_10m_${year}_${ver}_N06W081_Map.tif`;
  const tiff = await fromUrl(url); const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin(); const [rx, ry] = img.getResolution();
  console.log('tile', img.getWidth(), 'x', img.getHeight(), 'origen', ox, oy, 'res', rx, ry, 'tile px', img.getTileWidth(), img.getTileHeight());
  const lonW = -80.14, lonE = -79.93, latN = 9.005, latS = 8.64;
  const x0 = Math.floor((lonW - ox) / rx), x1 = Math.ceil((lonE - ox) / rx), y0 = Math.max(0, Math.floor((latN - oy) / ry)), y1 = Math.ceil((latS - oy) / ry);
  console.log('ventana', x0, y0, x1, y1, (x1 - x0) * (y1 - y0) / 1e6, 'Mpx');
  const t = Date.now();
  const r = await img.readRasters({ window: [x0, y0, x1, y1], samples: [0], interleave: true });
  console.log('leído en', ((Date.now() - t) / 1000).toFixed(1), 's', r.length);
  fs.writeFileSync(`wc${year}.bin`, Buffer.from(r.buffer, r.byteOffset, r.length));
  fs.writeFileSync(`wc${year}.json`, JSON.stringify({ w: x1 - x0, h: y1 - y0, lon0: ox + x0 * rx, lat0: oy + y0 * ry, rx, ry }));
  const cnt = {}; for (const v of r) cnt[v] = (cnt[v] || 0) + 1; console.log(cnt);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
