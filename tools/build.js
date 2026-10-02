// Ensambla cuenca_data.js (geometrías + métricas + semáforo) para la aplicación.
const fs = require('fs');
const L = require('./lib');
const { W, H, DI, DJ } = L;
const { polygons } = require('./arcs');
const N = W * H;
const lbB = fs.readFileSync('label.bin');                       // 1 CG, 2 TR
const sb = fs.readFileSync('sector.bin'); const sector = new Uint16Array(sb.buffer, sb.byteOffset, sb.length / 2);
const scored = JSON.parse(fs.readFileSync('scored.json'));
const streams = JSON.parse(fs.readFileSync('streams.geojson'));
const outl = JSON.parse(fs.readFileSync('outlets.json'));
const { CONFIG, secs, global, totals, PXHA } = scored;
CONFIG.zonas = { alta: 350, media: 200 };                         // por elevación media del sector
secs.forEach(s => { s.zona = s.elevMean >= CONFIG.zonas.alta ? 'alta' : s.elevMean >= CONFIG.zonas.media ? 'media' : 'baja'; });

const labUnion = new Uint16Array(N), labSub = new Uint16Array(N), labSec = new Uint16Array(N);
for (let k = 0; k < N; k++) if (lbB[k]) { labUnion[k] = 1; labSub[k] = lbB[k]; labSec[k] = sector[k]; }
const pU = polygons(labUnion), pS = polygons(labSub), pX = polygons(labSec);
const mp = polys => polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };

// flujo: distancia al punto de salida y cauce más largo por subcuenca
const mask = []; for (let k = 0; k < N; k++) if (lbB[k]) mask.push(k);
mask.sort((a, b) => L.fill[a] - L.fill[b]);
const dist = new Float64Array(N);
const stepM = (k, d) => Math.sqrt(L.cellArea((k / W) | 0)) * (d & 1 ? Math.SQRT2 : 1);
const outCells = { 1: outl.cg, 2: outl.tr };
for (const k of mask) { if (k === outl.cg || k === outl.tr) { dist[k] = 0; continue; } const d = L.down(k); dist[k] = (d >= 0 && lbB[d] === lbB[k]) ? dist[d] + stepM(k, L.dir[k]) : 0; }
const lfp = {}; for (const sub of [1, 2]) { let best = -1, bk = -1; for (const k of mask) if (lbB[k] === sub && dist[k] > best) { best = dist[k]; bk = k; }
  let k = bk, minE = 1e9, maxE = -1e9; for (let g = 0; g < 100000 && k >= 0; g++) { minE = Math.min(minE, L.dem[k]); maxE = Math.max(maxE, L.dem[k]); if (k === outCells[sub]) break; k = L.down(k); }
  lfp[sub] = { k: bk, len: best, srcElev: L.dem[bk], sec: sector[bk] }; }
const ll = k => L.llOf(k % W, (k / W) | 0).map(v => +v.toFixed(5));

// morfometría
const ringLenKm = ring => { let s = 0; for (let i = 0; i < ring.length - 1; i++) { const [a, b] = ring[i], [c, d] = ring[i + 1]; const dx = (c - a) * 111320 * Math.cos(((b + d) / 2) * Math.PI / 180), dy = (d - b) * 110574; s += Math.hypot(dx, dy); } return s / 1000; };
const areaKm2 = secs.reduce((a, s) => a + s.km2, 0);
const perim = ringLenKm(pU[1][0][0]);
let elevSum = 0, elevN = 0, slopeSum = 0, eMin = 1e9, eMax = -1e9; for (const k of mask) { elevSum += L.dem[k]; elevN++; eMin = Math.min(eMin, L.dem[k]); eMax = Math.max(eMax, L.dem[k]); }
let lenStreams = 0; const lenBy = { rio: 0, riachuelo: 0, quebrada: 0 };
for (const f of streams.features) { const c = f.geometry.coordinates; let s = ringLenKm(c); lenStreams += s; lenBy[f.properties.c] += s; }
const subArea = { 1: 0, 2: 0 }; for (const k of mask) subArea[lbB[k]] += L.cellArea((k / W) | 0) / 1e6;
const lc = totals.cls, wcN = totals.wcN; const pct = c => +(100 * (lc[c] || 0) / wcN).toFixed(1);
const slopeMean = +(secs.reduce((a, s) => a + s.slopeMean * s.km2, 0) / areaKm2).toFixed(1);
const steepAll = +(secs.reduce((a, s) => a + s.steepPct * s.km2, 0) / areaKm2).toFixed(1);
const steepBareAll = +(secs.reduce((a, s) => a + s.steepBare * s.km2, 0) / areaKm2).toFixed(1);
const loss = totals.loss; const f2000 = totals.h2000 * PXHA; const lossTot = loss.reduce((a, b) => a + b, 0) * PXHA;
const lossHa = loss.map(v => +(v * PXHA).toFixed(0));
const cumLoss = []; let acc = 0; for (let y = 0; y <= 23; y++) { if (y > 0) acc += lossHa[y]; cumLoss.push(acc); }

// nombres de sectores
const subName = { ciri: 'Cirí Grande', trinidad: 'Trinidad' };
secs.forEach(s => { s.sub = s.cgShare >= .5 ? 'ciri' : 'trinidad'; });
for (const sub of ['ciri', 'trinidad']) for (const z of ['alta', 'media', 'baja']) { const g = secs.filter(s => s.sub === sub && s.zona === z).sort((a, b) => b.elevMean - a.elevMean); g.forEach((s, i) => { s.nombre = subName[sub] + ' · ' + z + (g.length > 1 ? ' ' + (i + 1) : ''); }); }
// punto interior de cada sector (celda más cercana a la media)
const pts = {}; for (const k of mask) { const id = sector[k]; (pts[id] = pts[id] || { sx: 0, sy: 0, n: 0, cells: [] }); const p = pts[id]; p.sx += k % W; p.sy += (k / W) | 0; p.n++; p.cells.push(k); }
secs.forEach(s => { const p = pts[s.id]; const mx = p.sx / p.n, my = p.sy / p.n; let best = 1e18, bk = p.cells[0]; for (const k of p.cells) { const d = (k % W - mx) ** 2 + ((k / W | 0) - my) ** 2; if (d < best) { best = d; bk = k; } } s.ll = ll(bk); });

const sectorFeatures = secs.map(s => ({ type: 'Feature', properties: { id: s.id, nombre: s.nombre, sub: s.sub, zona: s.zona, km2: s.km2, elevMean: s.elevMean, elevMin: s.elevMin, elevMax: s.elevMax, slopeMean: s.slopeMean, tree: s.tree, grass: s.grass, ripTree: s.ripTree, steepBare: s.steepBare, perdidaPct: s.perdidaPct, upTree: s.upTree, upKm2: s.upKm2, score: s.score, color: s.color, comp: s.comp, ll: s.ll }, geometry: mp(pX[s.id]) }));
const boundary = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { id: 'microcuenca', nombre: 'Microcuenca Ciri Grande–Trinidad', km2: +areaKm2.toFixed(1) }, geometry: mp(pU[1]) },
  { type: 'Feature', properties: { id: 'ciri', nombre: 'Subcuenca del río Cirí Grande', km2: +subArea[1].toFixed(1) }, geometry: mp(pS[1]) },
  { type: 'Feature', properties: { id: 'trinidad', nombre: 'Subcuenca del río Trinidad', km2: +subArea[2].toFixed(1) }, geometry: mp(pS[2]) } ] };

// puntos de interés derivados de la geometría
const best = secs.slice().sort((a, b) => b.score - a.score)[0], worst = secs.slice().sort((a, b) => a.score - b.score)[0];
const secOf = id => secs.find(s => s.id === id);
const poi = [
  { id: 'p1', kind: 'conservacion', tipo: 'nacimiento', name: 'Nacimiento del río Cirí Grande', ll: ll(lfp[1].k), sec: lfp[1].sec, extra: { len: +(lfp[1].len / 1000).toFixed(1), elev: Math.round(lfp[1].srcElev) } },
  { id: 'p2', kind: 'conservacion', tipo: 'nacimiento', name: 'Nacimiento del río Trinidad', ll: ll(lfp[2].k), sec: lfp[2].sec, extra: { len: +(lfp[2].len / 1000).toFixed(1), elev: Math.round(lfp[2].srcElev) } },
  { id: 'p3', kind: 'monitoreo', tipo: 'salida', name: 'Desembocadura del Cirí Grande', ll: ll(outl.cg), sec: sector[outl.cg], extra: { km2: +subArea[1].toFixed(1) } },
  { id: 'p4', kind: 'monitoreo', tipo: 'salida', name: 'Desembocadura del río Trinidad', ll: ll(outl.tr), sec: sector[outl.tr], extra: { km2: +subArea[2].toFixed(1) } },
  { id: 'p5', kind: 'presion', tipo: 'peor', name: 'Sector de mayor presión', ll: worst.ll, sec: worst.id, extra: {} },
  { id: 'p6', kind: 'conservacion', tipo: 'mejor', name: 'Sector mejor conservado', ll: best.ll, sec: best.id, extra: {} }
];

const data = {
  generado: new Date().toISOString().slice(0, 10),
  fuentes: { dem: 'AWS Terrain Tiles (Terrarium; SRTM 1 arc-sec) · zoom 12', cobertura: 'ESA WorldCover 2021 v200 (10 m)', bosque: 'Hansen/UMD Global Forest Change v1.11 (2000–2023)' },
  boundary, sectors: { type: 'FeatureCollection', features: sectorFeatures }, streams, poi,
  config: CONFIG, global,
  stats: {
    areaKm2: +areaKm2.toFixed(1), subKm2: { ciri: +subArea[1].toFixed(1), trinidad: +subArea[2].toFixed(1) }, perimKm: +perim.toFixed(1), kc: +(0.282 * perim / Math.sqrt(areaKm2)).toFixed(2),
    elevMin: Math.round(eMin), elevMax: Math.round(eMax), elevMean: Math.round(elevSum / elevN), slopeMean, steepPct: steepAll, steepBarePct: steepBareAll,
    lfp: { ciri: { km: +(lfp[1].len / 1000).toFixed(1), elevSrc: Math.round(lfp[1].srcElev) }, trinidad: { km: +(lfp[2].len / 1000).toFixed(1), elevSrc: Math.round(lfp[2].srcElev) } },
    outlets: { ciri: outl.CG.map(v => +v.toFixed(5)), trinidad: outl.TR.map(v => +v.toFixed(5)) },
    streamKm: +lenStreams.toFixed(0), streamBy: { rio: +lenBy.rio.toFixed(0), riachuelo: +lenBy.riachuelo.toFixed(0), quebrada: +lenBy.quebrada.toFixed(0) }, drainDensity: +(lenStreams / areaKm2).toFixed(2),
    cover: { arbol: pct(10), pasto: pct(30), arbusto: pct(20), cultivo: pct(40), construido: pct(50), agua: +(pct(80) + pct(90)).toFixed(1), ribera: +(100 * totals.ripTree / totals.ripN).toFixed(1) },
    hansen: { forest2000Ha: Math.round(f2000), lossHaTotal: Math.round(lossTot), lossPct: +(100 * lossTot / f2000).toFixed(1), lossByYear: lossHa.slice(1), cumLoss: cumLoss, basinHa: Math.round(areaKm2 * 100) }
  }
};
fs.writeFileSync('../cuenca_data.js', 'window.ECO_DATA = ' + JSON.stringify(data) + ';\n');
console.log('../cuenca_data.js', (fs.statSync('cuenca_data.js').size / 1024).toFixed(0), 'KB');
console.log('stats', JSON.stringify(data.stats).slice(0, 900));
console.log('poi', poi.map(p => p.name + ' ' + p.ll.join(',')).join(' | '));
console.log('polígonos: union', pU[1].length, 'partes; sectores', Object.keys(pX).length, 'vértices sectores', sectorFeatures.reduce((a, f) => a + JSON.stringify(f.geometry).length, 0));
