# EcoCuenca Panamá — Ciri Grande–Trinidad

**Borrador de demostración** de una plataforma de diagnóstico ambiental de microcuencas,
para un proyecto universitario de Ingeniería Ambiental.

> ⚠️ Es una **maqueta de demostración**, no la versión final. Los valores, fechas,
> contornos y ubicaciones son **ilustrativos** y no sustituyen datos GeoJSON reales
> ni los diagnósticos oficiales de MiAmbiente / ACP / CICH.

🔗 **Demo en vivo:** https://diandlvr.github.io/Ecocuenca/

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

## Cómo funciona

Es **un solo archivo HTML** (`ecocuenca_demo.html`) sin proceso de build. Todo el
CSS y el JavaScript van embebidos. Solo se cargan por CDN: **Leaflet 1.9.4** (mapa),
las tipografías de Google Fonts y las **teselas de mapa** (Esri / OpenTopoMap).

### Estructura de la interfaz

```
┌─ Cabecera ──────────────────────────────────────────────┐
│ Logo · lectura de coordenadas en vivo · "Demostración"  │
├─────────────┬───────────────────────────────────────────┤
│  PANEL      │  MAPA (Leaflet)                           │
│  (ficha)    │   · base satélite por defecto            │
│             │   · límite de la microcuenca (polígono)   │
│  3 pestañas │   · 6 puntos de interés (marcadores)      │
│             │   · reportes ciudadanos (chinchetas)      │
└─────────────┴───────────────────────────────────────────┘
```

### Panel lateral — 3 pestañas

1. **Ficha** — indicadores clave, ficha ambiental, medidor de **cobertura boscosa**
   con **control temporal 2005 → 2024** (al mover el deslizador cambian el número,
   la cronología y el color/relleno del polígono en el mapa), riesgos identificados,
   comparación *antes / ahora*, cronología de gestión y créditos.
2. **Puntos** — lista de los 6 puntos de interés. Al abrir uno se ve su ficha
   (foto, descripción, mini-datos, coordenadas, crédito de la imagen) y el mapa
   vuela hasta él. Botón para ampliar la foto en un visor.
3. **Reportes** — reportes ciudadanos creados en la demo. Estado vacío con llamada
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
