# EcoCuenca Panamá — Ciri Grande–Trinidad

Plataforma de diagnóstico ambiental de la microcuenca **Ciri Grande–Trinidad**
(Cuenca del Canal de Panamá), para un proyecto universitario de Ingeniería Ambiental.

> Los valores, fechas, contornos y ubicaciones son **ilustrativos**: no sustituyen
> datos GeoJSON reales ni los diagnósticos oficiales de MiAmbiente / ACP / CICH.

🔗 **En vivo:** https://diandlvr.github.io/Ecocuenca/

📄 **Cambios y mejoras (v3), para la exposición:** [docs/EcoCuenca_Cambios_y_Mejoras.pdf](docs/EcoCuenca_Cambios_y_Mejoras.pdf)

---

## Alcance

El proyecto final trabaja **una sola microcuenca**:

| Campo | Valor |
|---|---|
| Nombre | Ciri Grande–Trinidad |
| Sistema | Cuenca Hidrográfica del Canal de Panamá |
| Río principal | Ciri Grande (vierte al río Trinidad → lago Gatún) |
| Estado | Verde — gestionada y protegida |
| Área (aprox.) | 145 km² |
| Comité de gestión | Activo |

Versiones anteriores mostraban 5 microcuencas de ejemplo con un semáforo; eso se
eliminó junto con la lista de zonas, el buscador entre zonas y el filtro "solo rojas".

---

## Límite de la microcuenca y semáforo (v2)

**Alcance real:** la microcuenca *Ciri Grande–Trinidad* reúne dos subcuencas vecinas que desembocan por separado en el lago Gatún: río **Cirí Grande** (203.7 km²) y río **Trinidad** (198.2 km²), total **401.8 km²** (perímetro 147.7 km, Kc = 2.08, muy alargada).

### Cómo se delimitó (no es un polígono dibujado)
1. DEM SRTM 30 m (AWS Terrain Tiles).
2. Relleno de depresiones (Priority-Flood) + dirección de flujo D8 + acumulación de flujo.
3. Cauces = celdas con ≥ 0.25 km² drenando; orden de Strahler: ríos (≥5), riachuelos (3–4), quebradas (1–2).
4. Puntos de salida donde cada río entra al lago; la cuenca es todo lo que drena a ese punto (divisorio de aguas).
5. Suavizado leve (< 40 m).

**Limitación:** es un cálculo de gabinete (celdas de ~38 m). En la planicie del lago el divisorio es menos preciso. Para el informe final: contrastar con el polígono oficial ACP/MiAmbiente y con GPS en campo.

### Semáforo (por sector)
Sector = tramo de río de orden ≥ 3 + sus laderas (22 sectores). Puntaje 0–100 = cobertura arbórea 30 % + árboles en ribera 20 % + ladera empinada sin árboles 15 % + pérdida forestal 2014–2023 15 % + condición aguas arriba 20 %. **Verde ≥ 70, amarillo 50–69, rojo < 50.** Resultado: índice general 72 (verde), 21 % del área en rojo, todo en la cuenca baja. Pendiente de campo: calidad del agua, caudal, comité por sector.

**Orden visual (v3):** la leyenda, las barras y las listas siguen el orden de un semáforo real: **rojo arriba, amarillo al centro, verde abajo**. La lista de sectores se ordena por prioridad (rojos primero).

**Verificación de la geografía:** se contrastó contra ESA WorldCover 2021 leyendo el ráster directamente: la cuenca baja (norte, junto al lago Gatún) tiene 23–52 % de árboles y la cuenca alta (sur) 85–95 %. Que los rojos queden al norte del mapa es real, no un error de orientación.

### Diagnóstico multicriterio (pestaña «Diagnóstico», v3)
Aplica la tabla de criterios de la propuesta (§5.4) con cuatro variables: **calidad de agua 35 %, residuos 25 %, uso del suelo vs. aptitud 20 %, erosión 20 %**. Las variables sin datos no cuentan y el resto se repondera.

- **Calidad de agua:** registro de mediciones para las estaciones ACP *Los Cañones* (Cirí Grande) y *El Chorro* (Trinidad): OD, turbidez, pH y coliformes fecales. Se guarda en el navegador y se exporta a CSV. **No trae valores precargados**: cargar los del Informe de Calidad de Agua de la ACP o los de campo. Los marcadores están en el punto de cierre de cada subcuenca (ubicación de referencia).
- **Uso vs. aptitud:** clase agrológica **estimada por la pendiente media** (III < 8 %, IV < 15 %, VI < 30 %, VII < 50 %, VIII) cruzada con el % de pastos. Reemplazar por el mapa ANATI/IDIAP cuando se tenga.
- **Erosión:** % del sector con pendiente > 30 % sin árboles (rojo ≥ 5 %, amarillo 2–5 %).
- **Residuos:** reportes ciudadanos activos de «Residuos sólidos» o «Vertedero ilegal» (rojo con ≥ 3 o un vertedero ilegal de gravedad alta).

El mapa se puede **colorear por cualquiera de estas variables** (Capas → Colorear sectores por).

### Otras funciones (v3)
- **Buscador** sobre el mapa (tecla `/`): sectores, ríos/subcuencas, zonas, puntos, estaciones, reportes, «solo rojos» y coordenadas (`8.85, -80.03`).
- **Filtro por color**: chips en la pestaña Semáforo y clic en la leyenda.
- **Reportes ampliados**: más tipos, gravedad, foto (reducida a 900 px), autor/comunidad, estado *nuevo → verificado → resuelto*, filtros, exportar/importar GeoJSON y CSV para reunir los reportes del equipo.
- **Descargas** de sectores en CSV y GeoJSON (con puntaje, erosión, clase estimada, etc.).
- **Informe imprimible** (botón *Informe* → imprimir o guardar como PDF).
- **Enlaces directos**: `#sector=5` o `#punto=p3` abren ese elemento.
- **Proyecto**: diálogo con el problema, la comparación con herramientas existentes, el marco legal y las fuentes.

**Datos:** SRTM (NASA), ESA WorldCover 2021 (CC BY 4.0), Hansen/UMD GFC v1.11 (CC BY 4.0). Scripts reproducibles en la carpeta tools/ (orden en tools/README.md); salida: cuenca_data.js.

---

## Cómo funciona

Es **un solo archivo HTML** (`ecocuenca_demo.html`) sin proceso de build. Todo el
CSS y el JavaScript van embebidos. Solo se cargan por CDN: **Leaflet 1.9.4** (mapa),
las tipografías de Google Fonts y las **teselas de mapa** (Esri / OpenTopoMap).

### Estructura de la interfaz

```
┌─ Cabecera ──────────────────────────────────────────────┐
│ Logo · lectura de coordenadas del cursor en vivo        │
├─────────────┬───────────────────────────────────────────┤
│  PANEL      │  MAPA (Leaflet)                           │
│  (ficha)    │   · base satélite por defecto            │
│             │   · límite de la microcuenca (polígono)   │
│  3 pestañas │   · 6 puntos de interés (marcadores)      │
│             │   · reportes ciudadanos (chinchetas)      │
└─────────────┴───────────────────────────────────────────┘
```

### Panel lateral — 5 pestañas (Ficha · Semáforo · Diagnóstico · Puntos · Reportes)

1. **Ficha** — indicadores clave, ficha ambiental, medidor de **cobertura boscosa**
   con **control temporal 2005 → 2024** (al mover el deslizador cambian el número,
   la cronología y el color/relleno del polígono en el mapa), riesgos identificados,
   comparación *antes / ahora*, cronología de gestión y créditos.
2. **Puntos** — lista de los 6 puntos de interés. Al abrir uno se ve su ficha
   (foto, descripción, mini-datos, coordenadas, crédito de la imagen) y el mapa
   vuela hasta él. Botón para ampliar la foto en un visor.
3. **Reportes** — reportes ciudadanos creados desde la interfaz. Estado vacío con llamada
   a la acción; cada reporte se puede *Ver* (centra el mapa) o *Borrar* (con
   **Deshacer**). Se guardan en `localStorage` del navegador (ver nota abajo).

### Mapa

- **Mapa base por defecto: Satélite** (Esri World Imagery). En el botón **Capas**
  puedes cambiar a *Relieve* (OpenTopoMap) u *Oscuro* (Esri Dark Gray), y
  encender/apagar las capas de límite, puntos y reportes.
- **Encuadrar** vuelve la vista a la microcuenca.
- El contorno de la microcuenca se dibuja con una animación de trazo y su relleno
  refleja la cobertura boscosa del año seleccionado.

### Reportar un problema

1. Pulsa **Reportar** (o la tecla `R`).
2. Toca un punto del mapa → aparece una chincheta con animación de confirmación.
3. Completa tipo y descripción (validación en línea) y guarda.
4. El reporte queda en la pestaña *Reportes* y como chincheta en el mapa.

---

## Interacción y accesibilidad (HCI)

- **Estados de carga**: esqueleto en la ficha y overlay con spinner sobre el mapa.
- **Estado de error**: si las teselas no cargan (sin conexión), mensaje claro y
  botón **Reintentar**; la ficha sigue disponible.
- **Estado vacío**: en la pestaña *Reportes* cuando aún no hay ninguno.
- **Teclado**:
  | Tecla | Acción |
  |---|---|
  | `Tab` / `Shift+Tab` | Navegación; foco visible en todos los controles |
  | `Enter` / `Espacio` | Activar el control enfocado |
  | `Esc` | Cierra, en orden: visor → modal → menú de capas → modo de ubicación → detalle de punto → panel (en móvil) |
  | `←` / `→` | Cambiar de imagen en el visor; moverse entre pestañas cuando el foco está en ellas |
  | `R` | Iniciar / cancelar un reporte |
  | `F` | Encuadrar la microcuenca |
- **Lectores de pantalla**: roles y etiquetas ARIA (`tablist`/`tab`/`tabpanel`,
  `dialog`, `application`), región `aria-live` que anuncia cambios (año, capa,
  punto seleccionado, reporte guardado), enlace "Saltar al mapa".
- **Responsive real**: en pantallas ≤ 860 px el panel se convierte en una **hoja
  inferior** con tirador; el mapa ocupa la parte superior.
- **Contraste y área de toque**: paleta ajustada para contraste AA; todos los
  botones y campos ≥ 44 px.
- **`prefers-reduced-motion`**: respeta la preferencia del sistema y desactiva
  animaciones.
- **Micro-interacciones con propósito**: trazo animado del límite, "caída" y
  onda de confirmación de la chincheta, vuelo suave del mapa, feedback de envío.

---

## Fotografías

Las imágenes son **fotografías reales de la Cuenca Hidrográfica del Canal de Panamá**
(sistema Chagres–Pequení, del que la subcuenca del Ciri Grande forma parte),
obtenidas de **Wikimedia Commons**. **No corresponden al punto exacto** que rotula
cada ficha y así se indica en la interfaz (etiqueta *"Cuenca del Canal · no es el
punto exacto"*).

| Imagen | Autoría | Licencia |
|---|---|---|
| Chagres River near the Panama Canal | Katja Schulz | CC BY 2.0 |
| Río Pequení, Cuenca del Canal | Nadxiielii | CC0 |
| Ribera boscosa, área del Canal | «XEON» | CC BY 3.0 |
| Río Chagres en Gamboa | Julian Watkins | Dominio público |
| Región boscosa junto al Canal | «XEON» | CC BY 3.0 |
| Curso de agua, área del Canal | «XEON» | CC BY 3.0 |
| Lago Gatún, Cuenca del Canal | «XEON» | CC BY 3.0 |

Los enlaces a cada archivo en Wikimedia Commons están en la sección **Créditos
fotográficos** al pie de la ficha y en el visor de cada imagen.

---

## Ejecutar en local

No necesita servidor. Abre `ecocuenca_demo.html` en un navegador moderno con
conexión a internet (para el mapa, las tipografías y las fotos).

Si prefieres servirlo:

```bash
# Python
python -m http.server 8000
# luego visita http://localhost:8000/
```

> **Nota sobre `localStorage`**: los reportes se guardan en el navegador. Al abrir
> el archivo con `file://` algunos navegadores restringen `localStorage`; en ese
> caso los reportes funcionan solo en memoria (se pierden al recargar). Servido por
> HTTP o en GitHub Pages persisten con normalidad.

---

## Despliegue en GitHub Pages

El repositorio ya incluye:

- `index.html` — redirección al visor (permite abrir el sitio en la raíz).
- `ecocuenca_demo.html` — la aplicación.
- `favicon.svg` — icono.
- `.nojekyll` — evita el procesado Jekyll de GitHub.

Pasos (una sola vez):

1. Sube el contenido a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: _Deploy from a
   branch_ → Branch: `main` / `/ (root)` → Save**.
3. En 1–2 minutos el sitio queda en `https://diandlvr.github.io/Ecocuenca/`.

---

## Estructura de archivos

```
.
├── index.html            # redirección a ecocuenca_demo.html
├── ecocuenca_demo.html   # aplicación completa (HTML + CSS + JS en un archivo)
├── favicon.svg           # logo / icono
├── .nojekyll             # desactiva Jekyll en GitHub Pages
└── README.md
```

## Tecnologías

- [Leaflet](https://leafletjs.com/) 1.9.4 — mapa interactivo
- Teselas: Esri (World Imagery, Dark Gray Canvas), OpenTopoMap — todas sin clave de API
- Tipografías: Instrument Serif, Spline Sans, IBM Plex Mono (Google Fonts)
- Sin framework, sin build, sin dependencias de npm

## Licencia

Código: uso educativo para el proyecto universitario.
Imágenes: según la tabla de créditos (Wikimedia Commons).
Datos: ilustrativos, no oficiales.
