// Índice de semáforo por sector (0–100, mayor = mejor condición).
const fs = require('fs');
const M = JSON.parse(fs.readFileSync('metrics.json'));
const down = JSON.parse(fs.readFileSync('sector_down.json'));
const PXHA = (0.00025 * 111320 * Math.cos(8.85 * Math.PI / 180)) * (0.00025 * 110574) / 1e4;

const CONFIG = {
  // cada parámetro: valor "malo" (0 pts) y valor "bueno" (100 pts); interpolación lineal
  params: [
    { id: 'arbol', mide: 'Porcentaje del sector cubierto por árboles',   label: 'Cobertura arbórea',                w: 30, bad: 30, good: 90, unit: '%', fuente: 'ESA WorldCover 2021 (10 m)' },
    { id: 'ribera', mide: 'Porcentaje de la franja de ±40 m junto a los cauces que tiene árboles',  label: 'Árboles en la franja ribereña',    w: 20, bad: 40, good: 90, unit: '%', fuente: 'WorldCover 2021 + red hídrica del DEM (±40 m del cauce)' },
    { id: 'erosion', mide: 'Porcentaje del área con pendiente > 30 % y sin árboles', label: 'Ladera empinada sin árboles',      w: 15, bad: 10, good: 0,  unit: '% del área', fuente: 'Pendiente > 30 % (DEM SRTM) y cobertura WorldCover' },
    { id: 'perdida', mide: 'Porcentaje del bosque del año 2000 perdido entre 2014 y 2023', label: 'Pérdida forestal reciente',        w: 15, bad: 20, good: 0,  unit: '% del bosque de 2000 perdido en 2014–2023', fuente: 'Hansen/UMD Global Forest Change v1.11' },
    { id: 'acumulada', mide: 'Promedio de cobertura arbórea de todos los sectores que drenan hacia éste (incluido él)', label: 'Condición aguas arriba',         w: 20, bad: 30, good: 90, unit: '% árboles (promedio aguas arriba)', fuente: 'Suma de cobertura arbórea de todos los sectores que drenan hacia éste' }
  ],
  umbral: { verde: 70, amarillo: 50 },
  zonas: { alta: 300, media: 150 }
};
const lin = (v, bad, good) => Math.max(0, Math.min(100, 100 * (v - bad) / (good - bad)));

const secs = M.sectors.map(s => {
  const loss1423 = s.hLoss.slice(14, 24).reduce((a, b) => a + b, 0);
  const f2000 = Math.max(1, s.forest2000Ha / PXHA);
  return { ...s, perdidaPct: +(100 * loss1423 / f2000).toFixed(1), perdidaTotalHa: +(s.hLoss.reduce((a, b) => a + b, 0) * PXHA).toFixed(0) };
});
const byId = Object.fromEntries(secs.map(s => [s.id, s]));
// aguas arriba: acumula área y árboles ponderados
const ups = {}; secs.forEach(s => ups[s.id] = []);
secs.forEach(s => { let d = down[s.id]; const seen = new Set(); while (d && byId[d] && !seen.has(d)) { seen.add(d); ups[d].push(s.id); d = down[d]; } });
secs.forEach(s => { const set = [s.id, ...ups[s.id]]; const A = set.reduce((a, i) => a + byId[i].km2, 0); s.upKm2 = +A.toFixed(1); s.upTree = +(set.reduce((a, i) => a + byId[i].km2 * byId[i].tree, 0) / A).toFixed(1); s.nUp = ups[s.id].length; });

for (const s of secs) {
  const val = { arbol: s.tree, ribera: s.ripTree, erosion: s.steepBare, perdida: s.perdidaPct, acumulada: s.upTree };
  s.comp = {}; let tot = 0;
  for (const p of CONFIG.params) { const pts = lin(val[p.id], p.bad, p.good); s.comp[p.id] = { v: +val[p.id].toFixed(1), pts: +pts.toFixed(0) }; tot += pts * p.w / 100; }
  s.score = +tot.toFixed(0);
  s.color = s.score >= CONFIG.umbral.verde ? 'verde' : s.score >= CONFIG.umbral.amarillo ? 'amarillo' : 'rojo';
  s.zona = s.elevMean >= CONFIG.zonas.alta ? 'alta' : s.elevMean >= CONFIG.zonas.media ? 'media' : 'baja';
}
const tot = secs.reduce((a, s) => a + s.km2, 0);
const share = c => +(100 * secs.filter(s => s.color === c).reduce((a, s) => a + s.km2, 0) / tot).toFixed(1);
const global = { score: +(secs.reduce((a, s) => a + s.score * s.km2, 0) / tot).toFixed(0), verde: share('verde'), amarillo: share('amarillo'), rojo: share('rojo') };
fs.writeFileSync('scored.json', JSON.stringify({ CONFIG, secs, global, totals: M.totals, PXHA }));
console.log('id  km2  zona  elev  tree rip  eros  perd  up  | pts: A  B  C  D  E | score color');
secs.forEach(s => console.log(String(s.id).padStart(2), String(s.km2).padStart(5), s.zona.padEnd(5), String(s.elevMean).padStart(4), String(s.tree).padStart(5), String(s.ripTree).padStart(5), String(s.steepBare).padStart(5), String(s.perdidaPct).padStart(5), String(s.upTree).padStart(5), '|', CONFIG.params.map(p => String(s.comp[p.id].pts).padStart(3)).join(' '), '|', String(s.score).padStart(3), s.color));
console.log('GLOBAL', global);
const zonas = ['baja', 'media', 'alta'].map(z => { const g = secs.filter(s => s.zona === z); const a = g.reduce((x, s) => x + s.km2, 0); return z + ': ' + g.length + ' sect, ' + a.toFixed(0) + ' km², score medio ' + (g.reduce((x, s) => x + s.score * s.km2, 0) / a).toFixed(0) + ', rojos ' + g.filter(s => s.color === 'rojo').length + ', amarillos ' + g.filter(s => s.color === 'amarillo').length + ', verdes ' + g.filter(s => s.color === 'verde').length; });
console.log(zonas.join('\n'));
