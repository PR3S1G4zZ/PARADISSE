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

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:3001`. Vite proxifica `/api` → `http://localhost:3001` (o `API_UPSTREAM` si está definido), así que el navegador llama rutas relativas y la cookie de sesión es same-origin.

La autenticación (Phase 1) requiere Postgres. El plan de visita y el checkout local siguen en `localStorage` (Phase 2/3).

```powershell
# En backend/.env: DATABASE_URL=postgres://usuario:clave@localhost:5432/paradisse
pnpm --dir backend migrate
```

Las migraciones usan `node-pg-migrate` (`backend/migrations`). `pnpm --dir backend start` también las aplica si `DATABASE_URL` está definido.

## Variables de entorno

Copiar `.env.example` en `.env` y `backend/.env.example` en `backend/.env` cuando corresponda.

- `DATABASE_URL` es obligatorio para `/api/auth/*`. Health, mapa y rutas siguen funcionando sin ella.
- Cookie de sesión `paradisse_session`: HttpOnly, SameSite=Lax, Secure cuando `NODE_ENV=production`. El frontend llama a `/api/auth/*` **relativo** (`credentials: include`). Solo se guarda el hash SHA-256 del token opaco. No usar `SameSite=None`.
- **No definir `VITE_API_URL` en producción** (ni dejarla con la URL absoluta del backend). El build usa `''` y el navegador pega al mismo host. En local, dejarla vacía también: Vite hace de proxy.
- En el servicio frontend de Railway, definir `API_UPSTREAM` hacia el backend (red privada preferida), por ejemplo `API_UPSTREAM=http://${{<servicio-backend>.RAILWAY_PRIVATE_DOMAIN}}:${{<servicio-backend>.PORT}}`. El `Caddyfile` de la raíz proxifica `/api/*` a ese upstream.
- Las cuentas locales (`paradisse.session` / `paradisse.local-users`) se eliminan al cargar la app. El plan y el checkout local no se tocan.
- `ARCGIS_CLIENT_ID` y `ARCGIS_CLIENT_SECRET` permanecen únicamente en el backend y se usan para routing.
- `ARCGIS_API_KEY` también es privada y se usa únicamente en el backend para routing.
- `ARCGIS_BASEMAP_API_KEY` es una credencial pública limitada al privilegio de basemaps y puede llegar al navegador mediante `/api/mapa/token`.
- Si no existe una credencial pública de basemap, el mapa usa OSM. El token OAuth privado nunca se reutiliza como token del navegador.
- `ARCGIS_REFERER` debe contener el origen HTTPS permitido por ArcGIS cuando la credencial lo requiera.
- `CORS_ORIGIN` debe ser un origen explícito (por defecto `http://localhost:5173`). `CORS_ORIGIN=*` se rechaza cuando `NODE_ENV=production`. El flujo de cookies del navegador es same-origin (proxy `/api`); CORS se conserva para accesos directos a la API.

`maplibre-gl` está en `^6.4.1` (CVE-2026-85061). `@esri/maplibre-arcgis@1.3.1` declara peer `~5.24.0 || ~6.3.0`; pnpm puede advertir, pero 6.4+ es el parche de la línea 6.3 y no hay release Esri que acepte 6.4.1 todavía.

## Same-origin en Railway

El servicio frontend (raíz del repo) se sirve con Caddy (`Caddyfile`). El backend es un servicio aparte.

1. En el frontend: `API_UPSTREAM` al backend (red privada). No definir `VITE_API_URL`.
2. En el backend: `DATABASE_URL`, `CORS_ORIGIN` (origen público del frontend, por si hay llamadas directas) y `NODE_ENV=production` (activa `Secure` en la cookie).
3. El navegador solo habla con el host del frontend (`/api/...`). Caddy reenvía `/api/*` al backend. Así `SameSite=Lax` funciona sin `SameSite=None`.

## Comprobaciones

```powershell
pnpm test
pnpm test:backend
pnpm build
```

El backend expone `GET /health`, `GET /api/mapa/token`, `GET /api/mapa/estado`, `POST /api/rutas/resolver` y `/api/auth/{register,login,logout,me}`.

`/api/auth/login` y `/api/auth/register` se limitan a 10 solicitudes / 15 minutos por IP. `/api/auth/me` y `/logout` a 30 / 5 minutos. `/api/mapa` se limita a 30 / 5 minutos (el token de basemap se cachea 5 minutos). `/api/rutas` se limita a 60 / 5 minutos. El endpoint de token solo devuelve `ARCGIS_BASEMAP_API_KEY`; no expone `ARCGIS_CLIENT_SECRET`, `ARCGIS_API_KEY` ni tokens OAuth. Las contraseñas se hashean con argon2id (`hash-wasm`, sin bindings nativos).

La navegación GPS, brújula, voz y Wake Lock necesitan una prueba final en un dispositivo móvil con HTTPS. El mapa visual funciona sin credenciales ArcGIS mediante OSM y las rutas informan cuando usan OSRM como fallback.
