// Hansen/UMD Global Forest Change v1.11 (2000–2023): treecover2000 y lossyear sobre la microcuenca.
const fs = require('fs');
(async () => {
  const { fromUrl } = await import('geotiff');
  const base = 'https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11/Hansen_GFC-2023-v1.11_';
  const lonW = -80.14, lonE = -79.93, latN = 9.005, latS = 8.64, res = 0.00025;
  const tiles = [{ n: '10N_090W', lon: -90 }, { n: '10N_080W', lon: -80 }];
  const y0 = Math.floor((10 - latN) / res), y1 = Math.ceil((10 - latS) / res);
  const Wp = Math.round((lonE - lonW) / res), Hp = y1 - y0, X0 = Math.floor((lonW + 90) / res);
  const outW = Math.ceil((lonE - lonW) / res) + 2;
  const layers = {};
  for (const layer of ['treecover2000', 'lossyear']) {
    if (fs.existsSync('hansen_'+layer+'.bin')) { layers[layer]=new Uint8Array(fs.readFileSync('hansen_'+layer+'.bin')); continue; }
    const arr = new Uint8Array(outW * Hp);
    for (const t of tiles) {
      let img; for (let a=0;a<10;a++){ try { const tiff = layer==='lossyear' ? await (await import('geotiff')).fromFile('ly_'+t.n+'.tif') : await fromUrl(base + layer + '_' + t.n + '.tif'); img = await tiff.getImage(); break; } catch(e){ console.log('retry',a,e.message); await new Promise(r=>setTimeout(r,3000)); } }
      const tx0 = Math.max(0, Math.floor((lonW - t.lon) / res)), tx1 = Math.min(40000, Math.ceil((lonE - t.lon) / res));
      if (tx1 <= tx0) continue;
      const t0 = Date.now();
      let r; for (let a=0;a<10;a++){ try { r = await img.readRasters({ window: [tx0, y0, tx1, y1], samples: [0], interleave: true }); break; } catch(e){ console.log('retry read',a,e.message); await new Promise(r=>setTimeout(r,3000)); } }
      console.log(layer, t.n, 'px', tx1 - tx0, 'x', Hp, (Date.now() - t0) / 1000 + ' s');
      const off = Math.round((t.lon + tx0 * res - lonW) / res);
      for (let j = 0; j < Hp; j++) for (let i = 0; i < tx1 - tx0; i++) { const ox = off + i; if (ox >= 0 && ox < outW) arr[j * outW + ox] = r[j * (tx1 - tx0) + i]; }
    }
    fs.writeFileSync('hansen_' + layer + '.bin', Buffer.from(arr)); layers[layer] = arr;
  }
  fs.writeFileSync('hansen.json', JSON.stringify({ w: outW, h: Hp, lon0: lonW, lat0: 10 - y0 * res, res }));
  const lc = {}; for (const v of layers.lossyear) lc[v] = (lc[v] || 0) + 1; console.log('lossyear hist', lc);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
