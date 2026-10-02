# Pipeline

Desde esta carpeta: `npm install`, luego en orden:

```
node dem.js
node hydro.js
node watershed.js
node streams.js 0.25
node sectors.js 3 6
node landcover.js 2021
curl -O https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11/Hansen_GFC-2023-v1.11_lossyear_10N_090W.tif   # renombrar a ly_10N_090W.tif
curl -O https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11/Hansen_GFC-2023-v1.11_lossyear_10N_080W.tif   # renombrar a ly_10N_080W.tif
node hansen.js
node metrics.js
node score.js
node build.js   # escribe ../cuenca_data.js
```
