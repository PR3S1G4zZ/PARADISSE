# PARADISSE

Aplicación turística de destinos del Suroeste Antioqueño con mapa MapLibre, basemap ArcGIS opcional, OSM como fallback y rutas ArcGIS/OSRM.

## Desarrollo local

Requisitos: Node.js compatible con las dependencias y `pnpm`.

```powershell
pnpm install
pnpm --dir backend install
pnpm dev:backend
pnpm dev
```

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:3001`.

## Variables de entorno

Copiar `.env.example` en `.env` y `backend/.env.example` en `backend/.env` cuando corresponda.

- `ARCGIS_CLIENT_ID` y `ARCGIS_CLIENT_SECRET` permanecen únicamente en el backend y se usan para routing.
- `ARCGIS_API_KEY` también es privada y se usa únicamente en el backend para routing.
- `ARCGIS_BASEMAP_API_KEY` es una credencial pública limitada al privilegio de basemaps y puede llegar al navegador mediante `/api/mapa/token`.
- Si no existe una credencial pública de basemap, el mapa usa OSM. El token OAuth privado nunca se reutiliza como token del navegador.
- `ARCGIS_REFERER` debe contener el origen HTTPS permitido por ArcGIS cuando la credencial lo requiera.
- `CORS_ORIGIN` debe ser un origen explícito (por defecto `http://localhost:5173`). `CORS_ORIGIN=*` se rechaza cuando `NODE_ENV=production`.

## Comprobaciones

```powershell
pnpm test
pnpm test:backend
pnpm build
```

El backend expone `GET /health`, `GET /api/mapa/token`, `GET /api/mapa/estado` y `POST /api/rutas/resolver`.

`/api/mapa` se limita a 30 solicitudes / 5 minutos por IP (el token de basemap se cachea 5 minutos). `/api/rutas` se limita a 60 / 5 minutos. El endpoint de token solo devuelve `ARCGIS_BASEMAP_API_KEY`; no expone `ARCGIS_CLIENT_SECRET`, `ARCGIS_API_KEY` ni tokens OAuth.

La navegación GPS, brújula, voz y Wake Lock necesitan una prueba final en un dispositivo móvil con HTTPS. El mapa visual funciona sin credenciales ArcGIS mediante OSM y las rutas informan cuando usan OSRM como fallback.
