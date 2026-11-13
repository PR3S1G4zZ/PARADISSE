# Informe Security — PARADISSE

**Tipo:** auditoría AppSec de solo lectura (código del repo).  
**Alcance:** frontend React/Vite y backend Express. GIS/routing/cámara solo cuando implica riesgo de seguridad (claves, tokens, abuso de APIs).  
**Commit base:** `6f4c76e` (`main`).  
**Fecha del análisis:** 2026-09-20.  
**Método:** revisión estática del código, `.env.example`, lockfiles y `pnpm audit --prod`. No se modificó código de producto. No se inspeccionó el estado live de Railway ni se leyeron variables desplegadas.

---

## Resumen ejecutivo

PARADISSE es una SPA turística con auth y checkout **simulados en el navegador**, y un API mínimo que entrega un token de basemap y resuelve rutas. El diseño de secretos ArcGIS en backend está bien pensado: OAuth/`ARCGIS_API_KEY` no salen al cliente, y hay pruebas que lo bloquean. El backend ya trae `helmet`, CORS de un origen, `trust proxy = 1`, tope de JSON 32 kb, validación de coordenadas y rate limit en `/api/rutas`.

Los problemas graves no son “auth rota en servidor” (no hay auth de servidor), sino: (1) **CVE crítico en `maplibre-gl@5.24.0`** (XSS en el sanitizador de atribución); (2) **contraseñas y PII en claro en `localStorage`** en una UI que parece cuenta real; (3) **APIs públicas sin autenticación** que pueden gastar créditos ArcGIS o filtrar la clave de basemap a cualquier cliente HTTP. El frontend no declara CSP ni headers de seguridad propios. No hay CI, Dependabot ni manifiestos de deploy en el repo.

No se encontraron secretos ArcGIS, `.env` reales ni claves hardcodeadas en git. El privilegio real de `ARCGIS_BASEMAP_API_KEY` en producción es **desconocido** (no se auditó Railway live).

---

## Hallazgos críticos / altos / medios / bajos

### Críticos

| ID | Hallazgo | Evidencia | Notas de explotabilidad |
| --- | --- | --- | --- |
| C1 | **CVE-2026-85061 / GHSA-jrc7-96c5-q579** en `maplibre-gl@5.24.0` (`<=6.4.0`). Bypass del sanitizador `DOM.sanitize()`: al iterar un `NamedNodeMap` vivo se salta un atributo peligroso consecutivo (`onload`/`ontoggle`) y el control de atribución lo inserta con `innerHTML`. | `package.json` (`maplibre-gl: ^5.24.0`); `pnpm-lock.yaml` pin `5.24.0`; `pnpm audit --prod` (1 critical). Parche: `>=6.4.1`. | El código propio no pasa atribución de usuario. El fallback OSM usa texto estático (`InteractiveMap.tsx`, `OSM_RASTER_STYLE`). El vector residual es **estilo/atribución de terceros** (ArcGIS via `@esri/maplibre-arcgis` + token). No se demostró un PoC contra este repo. Encadena con A1 si hay XSS: lectura de `localStorage` (contraseñas). |

### Altos

| ID | Hallazgo | Archivo |
| --- | --- | --- |
| A1 | **Contraseñas en claro en `localStorage`**. El registro guarda `{ id, name, email, password }` sin hash. El login compara en texto plano. La UI pide 8+ caracteres, mayúscula y número, así que un usuario realista reutilizará una contraseña de verdad. Cualquier XSS, extensión maliciosa o acceso físico al dispositivo las lee. | `src/features/auth/auth-service.ts` (`USERS_KEY = 'paradisse.local-users'`, líneas 33–38 y 47–48); `src/shared/lib/storage.ts` |
| A2 | **`POST /api/rutas/resolver` es público y dispara proveedores de pago/cuota**. No hay sesión, API key de cliente ni allowlist de usuarios. El rate limit (60/5 min/IP) reduce pero no elimina el gasto de créditos ArcGIS ni el abuso del demo OSRM. Un atacante con muchas IPs evite el tope. | `backend/src/app.js` (líneas 43–49); `backend/src/routes/routing-route.js`; `backend/src/utils/arcgisRouting.js`; `backend/src/utils/osrmRouting.js` |
| A3 | **`GET /api/mapa/token` entrega la credencial de basemap a cualquiera que llegue al API**. CORS limita *navegadores* al origen configurado; `curl`/ssrf/server-side no. Si la key no está restringida a basemaps + referer en el dashboard de ArcGIS, es una clave robable. Ese privilegio live es **desconocido**. | `backend/src/routes/mapa.js` (líneas 18–31); `README.md`; no hay rate limit en `/api/mapa` |
| A4 | **“Autorización” de checkout es solo UI**. Quien escriba `{id,name,email}` en `paradisse.session` “inicia sesión”. No hay firma, expiración ni servidor. Hoy el impacto es bajo (confirmación local, sin cobro); el riesgo sube el día que se conecte un backend de reservas. | `src/features/checkout/checkout-service.ts`; `src/features/checkout/CheckoutPage.tsx` (línea 53) |
| A5 | **PII de checkout en `localStorage`**: nombre, email, teléfono, plan y método. Misma superficie que A1. | `src/features/checkout/checkout-service.ts` (`CONFIRMATION_KEY`); `src/features/checkout/CheckoutPage.tsx` |

### Medios

| ID | Hallazgo | Archivo |
| --- | --- | --- |
| M1 | Rate limit **solo** en `/api/rutas`. `/api/mapa/token`, `/api/mapa/estado` y `/health` no tienen tope. | `backend/src/app.js` |
| M2 | CORS es un **string único** (`CORS_ORIGIN` o `http://localhost:5173`). No hay allowlist, no hay rechazo explícito de `*`, no hay tests de header. Si en Railway se pone `*` para “que funcione”, cualquier sitio puede leer el token en el navegador. Estado live: **desconocido**. | `backend/src/config.js`; `backend/src/app.js` línea 27 |
| M3 | Frontend **sin CSP, sin `Referrer-Policy`, sin `X-Frame-Options`** en `index.html` / `vite.config.ts`. `helmet` solo cubre el API. El hosting estático (Railway u otro) no está declarado en el repo. | `index.html`; `vite.config.ts` |
| M4 | Google Fonts por `@import` y fotos Unsplash por HTTPS. Sin SRI. Amplían la CSP futura y la cadena de suministro. | `src/styles/global.css` línea 1; `src/data/guides.ts` |
| M5 | `package.json` del front usa `"latest"` en Vite, React, TypeScript, plugin y testers. El lockfile pinnea hoy, pero el siguiente `pnpm update` puede subir mayor. | `package.json` |
| M6 | Sin `.github/`, Dependabot, secret scanning ni job de `pnpm audit`. | (ausente) |
| M7 | Fallback OSRM a `https://router.project-osrm.org` (demo pública). Envía GPS del usuario a un tercero; no es adecuado como dependencia de producción. | `backend/src/utils/osrmRouting.js` |
| M8 | Ubicación del usuario viaja al backend y de ahí a ArcGIS/OSRM. El app log no guarda coords (bien), pero el cuerpo HTTP sí las lleva; logs de proxy Railway: **desconocido**. | `src/features/navigation/NavigationContext.tsx`; `src/shared/lib/api.ts` |
| M9 | `helmet({ crossOriginResourcePolicy: false })` relaja CORP. Coherente con un front en otro origen, pero no hay test que fije los demás headers. | `backend/src/app.js` línea 26 |
| M10 | Validación de email débil (`^\S+@\S+\.\S+$`). Acepta valores que no son correos. Impacto bajo mientras auth sea local. | `src/features/auth/validators.ts` |
| M11 | `nombreDestino` se recorta a 80 y se mete en JSON de paradas ArcGIS (bien frente a overflow). No hay schema (zod/etc.) en el borde HTTP; la validación es artesanal. | `backend/src/routes/routing.js` `validateRouteRequest` |

### Bajos

| ID | Hallazgo | Archivo |
| --- | --- | --- |
| B1 | Comparación de password no es constant-time. Irrelevante frente a A1 (están en claro). | `auth-service.ts` |
| B2 | Token OAuth ArcGIS cacheado en memoria con `expiration: '20160'` (~14 días). No se expone al browser. Riesgo solo si hay dump de proceso. | `backend/src/utils/arcgisRouting.js` líneas 49–64 |
| B3 | `Cache-Control: private, max-age=300` en `/api/mapa/token` cachea la key 5 min en el cliente. | `backend/src/routes/mapa.js` |
| B4 | `/health` público y sin secretos. Adecuado para probes; fingerprint del servicio (`paradisse-api`). | `backend/src/app.js`; `backend/src/app.test.js` |
| B5 | `trust proxy = 1` es correcto para un hop Railway. Si hay más proxies, el rate limit puede usar IP equivocada o ser spoofeable. Hops live: **desconocido**. | `backend/src/app.js` líneas 22–25 |
| B6 | No hay `start` en el `package.json` del front; no hay Dockerfile/Procfile. Cómo se sirve el estático en prod es **desconocido**. | `package.json` |
| B7 | `safeNavigationError` puede devolver `error.message` si no es 502 ni “fetch”/“API HTTP”. Hoy los errores locales son strings fijos; no se observó leak de stack. | `src/features/navigation/NavigationContext.tsx` líneas 68–77 |
| B8 | Checkout acepta método `tarjeta` sin PAN/CVV (solo preferencia). Correcto. El copy a veces usa “reserva” y puede confundir. | `CheckoutPage.tsx` |

### No es vulnerabilidad (revisado y descartado o controlado)

- **SSRF clásico:** las URLs de ArcGIS y OSRM están fijas. El input de usuario son lat/lng validados (`-90..90`, `-180..180`) y `modo ∈ {walk,car}`. No hay URL controlada por el cliente.
- **IDOR de recursos de usuario en API:** no hay recursos por `userId` en el backend.
- **CSRF de cookie:** el API no usa cookies ni `credentials`. El riesgo equivalente es A2/A3 (endpoints públicos) + M2 (CORS mal puesto).
- **XSS en React de destinos/pasos:** no hay `dangerouslySetInnerHTML`. Nombres e instrucciones se renderizan como texto. `speechSynthesis` habla texto, no ejecuta HTML.
- **Inyección SQL/command:** no hay base de datos ni shell.
- **OAuth privado al browser:** `createMapRouter` no marca el endpoint como configurado por OAuth; tests en `backend/src/app.test.js` lo cubren.
- **Secretos en git:** no hay `.env` commiteado ni patrones tipo `AAPK…`, `AKIA…`, `sk_live_`.

---

## Secretos y claves (ArcGIS y demás)

| Variable | Dónde vive | ¿Llega al browser? | Evaluación |
| --- | --- | --- | --- |
| `ARCGIS_CLIENT_ID` / `ARCGIS_CLIENT_SECRET` | `backend/src/config.js` ← env | No. Reservadas a `oauthAccessToken()` | Correcto. Nunca usarlas como token de mapa. |
| `ARCGIS_API_KEY` | idem | No. Solo routing | Correcto. Tests evitan que escape por `/api/mapa/token`. |
| `ARCGIS_BASEMAP_API_KEY` | idem | **Sí**, vía `GET /api/mapa/token` | Documentado como “pública limitada a basemaps”. El repo **no puede** verificar privilegios ni referer en ArcGIS. |
| `ARCGIS_REFERER` | idem | No; se manda como header `Referer` a ArcGIS | Útil para acotar la key. Si está vacío, esa restricción no se aplica. Valor live: **desconocido**. |
| `CORS_ORIGIN` | `backend/src/config.js` | N/A | Default `http://localhost:5173`. Debe ser el origen HTTPS real del front. |
| `VITE_API_URL` | `.env.example` | Se embebe en el bundle | No es secreto. En `PROD` si falta, el front usa `''` (mismo origen). |
| `PORT`, `ROUTING_HTTP_TIMEOUT_MS` | backend env | No | Sin impacto de secreto. |

Controles de repo:

- `.gitignore` y `.railwayignore` excluyen `.env` / `backend/.env` y permiten solo `*.example`.
- `.env.example` y `backend/.env.example` no contienen valores.
- El front **no** importa `ARCGIS_*`. `src/shared/lib/api.test.ts` comprueba que el POST de rutas no lleve `ARCGIS_API_KEY` ni `client_secret`.
- `src/features/map/arcgis-basemap.ts` redacta `token`, `Bearer` y `client_secret` en `console.warn`.

**Acción operativa (fuera de este repo):** en el dashboard de ArcGIS, confirmar que la key de basemap no tenga routing/geocoding/análisis, y que tenga referer HTTPS del front. No commitear keys. No reutilizar la key de routing como basemap.

---

## Front: riesgos y faltantes

**Auth / sesión**

- No hay JWT, OAuth de usuario, cookies `HttpOnly` ni logout de servidor. `createAuthService` es un repositorio local (`docs/superpowers/specs/2026-08-26-paradisse-app-design.md` lo declara simulado).
- La UI (`AuthPage.tsx`) se presenta como “CUENTA PARADISSE” y redirige a `/pago`. El disclaimer “Sesión local en este dispositivo” existe, pero el flujo invita a una contraseña real.
- `SiteHeader.tsx` no refleja sesión ni ofrece cierre de sesión visible en la nav (el servicio tiene `signOut`, no se usa en el header).

**XSS / DOM**

- Superficie React: baja (escaping por defecto).
- Superficie MapLibre: C1. `InteractiveMap.tsx` desactiva el attribution default y pone uno estático en OSM; el estilo ArcGIS se aplica con `BasemapStyle.applyTo(map)` y puede inyectar atribución del proveedor.
- No hay CSP que limite `script-src` / `style-src` / `connect-src`.

**Datos en cliente**

- Claves: `paradisse.session`, `paradisse.local-users`, `paradisse.plan`, `paradisse.checkout.confirmation`.
- `JSON.parse` de `localStorage` sin schema: JSON roto vuelve al fallback (bien). Un valor malicioso escrito en el mismo origen ya implica compromiso de ese origen.

**Red**

- `fetch` a `${API_BASE}/api/...` sin cookies. CSRF clásico no aplica.
- Geolocalización, brújula, Wake Lock y voz (`NavigationContext.tsx` ~279–281) son permisos de dispositivo; el riesgo es privacidad, no RCE.

**Faltantes de front**

1. CSP (meta o headers del host) con allowlist de `fonts.googleapis.com`, tiles OSM/ArcGIS, `VITE_API_URL`.  
2. Headers en el estático: `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`.  
3. No persistir passwords; o hash + no reutilizar el patrón cuando exista API.  
4. Pin de versiones (quitar `latest`).  
5. Upgrade de `maplibre-gl` a `>=6.4.1` (y alinear `@esri/maplibre-arcgis` / `react-map-gl`).

---

## Back: riesgos y faltantes

**Superficie HTTP** (según `README.md` y `createApp`):

| Ruta | Auth | Rate limit | Validación |
| --- | --- | --- | --- |
| `GET /health` | No | No | N/A |
| `GET /api/mapa/token` | No | No | N/A |
| `GET /api/mapa/estado` | No | No | N/A |
| `POST /api/rutas/resolver` | No | 60 / 5 min / IP | coords + `walk`/`car` + nombre ≤80 |

**Controles presentes (positivos)**

- `app.disable('x-powered-by')` + `helmet` 8.3.0.
- `express.json({ limit: '32kb' })`.
- Errores 5xx genéricos; 4xx con mensaje controlado (`RouteRequestError`).
- Logs de fallo: `{ method, path, statusCode }` sin query, body, token ni coords (`backend/src/app.test.js`).
- Fallos de proveedor: solo `{ provider, category }` (`routing.test.js`).
- Timeouts `ROUTING_HTTP_TIMEOUT_MS` (default 8000) en ArcGIS y OSRM.

**Faltantes**

1. Autenticación o al menos un secreto de aplicación / firma corta para routing si hay keys de pago.  
2. Rate limit también en `/api/mapa/*`.  
3. Rechazar `CORS_ORIGIN` igual a `*` o vacío en producción.  
4. Tests de headers (`Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Access-Control-Allow-Origin`).  
5. No usar el demo de OSRM en un deploy público; instancia propia o desactivar fallback.  
6. Tope diario de créditos / circuit breaker si ArcGIS responde 429/402.  
7. Auth de usuario, CSRF y cookies: no existen; no añadir cookie session sin `SameSite` + CSRF token.

**SSRF / injection / IDOR**

- SSRF: no encontrado (URLs fijas).  
- Injection: paradas van por `JSON.stringify` + `URLSearchParams`; OSRM interpola números ya validados.  
- IDOR: no hay objetos multi-tenant en el API.  
- Broken access control: el API es deliberadamente abierto (A2/A3), no un IDOR clásico.

---

## Dependencias

Auditoría ejecutada con `pnpm audit --prod` sobre los lockfiles (sin `node_modules` instalados; el audit de pnpm usa el lockfile).

### Frontend (`pnpm-lock.yaml`)

| Paquete (lock) | Spec | Hallazgo |
| --- | --- | --- |
| `maplibre-gl@5.24.0` | `^5.24.0` | **Critical** CVE-2026-85061. Fix `>=6.4.1`. También arrastrado por `@esri/maplibre-arcgis` y `react-map-gl`. |
| `react@19.3.0` / `react-dom@19.3.0` | `latest` | Sin advisory en este audit. Spec `latest` = riesgo de deriva. |
| `vite@8.3.0` / `@vitejs/plugin-react@6.1.1` | `latest` | Sin advisory en este audit. |
| `react-router-dom@7.18.3` | `^7.18.2` | Sin advisory en este audit. |
| `jsdom@30.0.1` / `vitest@5.0.0` | `latest` (dev) | No incluidos en `--prod`. |

### Backend (`backend/pnpm-lock.yaml`)

| Paquete (lock) | Spec | Hallazgo |
| --- | --- | --- |
| `express@5.2.1` | `^5.1.0` | 0 vulns en audit prod |
| `cors@2.8.6` | `^2.8.5` | 0 |
| `helmet@8.3.0` | `^8.1.0` | 0 |
| `express-rate-limit@7.5.1` | `^7.5.0` | 0 |
| `dotenv@16.6.1` | `^16.4.7` | 0 |

**Limitaciones:** no hay OSV/Snyk de transitivas más allá de lo que reportó pnpm; no hay CI que vuelva a correr el audit. `packageManager: pnpm@11.24.0` está declarado; no se verificó integridad de la toolchain en este entorno.

---

## Config Railway-related en el repo (no estado live)

En el repositorio hay:

- `.railwayignore` (raíz): excluye `node_modules`, `dist`, `.env*`, `.git`, `.superpowers`, `docs/`, `design-qa.md`, imágenes de `public/assets`.
- `backend/.railwayignore`: excluye `node_modules`, `.env*`, `.git`.
- Comentario y test de `trust proxy` / `X-Forwarded-For` pensados para Railway (`backend/src/app.js`, `backend/src/app.test.js`).
- `GET /health` documentado como probe.

**No hay** `railway.toml`, `railway.json`, `Dockerfile`, `nixpacks.toml` ni `Procfile`. Cómo están cableados front/back, dominios, `CORS_ORIGIN` real, variables ArcGIS y headers del CDN/estático es **desconocido**. Este informe no consulta ni afirma el estado del proyecto en Railway.

Variables que un deploy debería definir (según `backend/.env.example` y README), sin asumir que existan:

`PORT`, `CORS_ORIGIN`, `ARCGIS_BASEMAP_API_KEY`, `ARCGIS_API_KEY`, `ARCGIS_CLIENT_ID`, `ARCGIS_CLIENT_SECRET`, `ARCGIS_REFERER`, `ROUTING_HTTP_TIMEOUT_MS`, y en el front `VITE_API_URL` si API y SPA no son same-origin.

---

## Recomendaciones priorizadas (P0/P1/P2)

### P0

1. **Subir `maplibre-gl` a `>=6.4.1`** (y compatibilidad de `@esri/maplibre-arcgis` / `react-map-gl`). Re-testear mapa OSM y ArcGIS.  
2. **Confirmar en ArcGIS (operación, no código)** que la key de basemap es solo basemap + referer HTTPS; rotar si alguna vez se usó una key amplia o se filtró.  
3. **No tratar `/registro` como cuenta real** hasta que exista backend: copy más explícito, o dejar de pedir contraseña (PIN local / sin password).  
4. Si el API está público **con** credenciales ArcGIS de routing: exigir un secreto de aplicación o auth, o bajar el rate limit y añadir tope diario.

### P1

5. Rate limit en `/api/mapa/token` (p. ej. 30/min/IP) y no cachear más de lo necesario.  
6. Validar `CORS_ORIGIN` (HTTPS, nunca `*`) y cubrirlo con test de header.  
7. CSP + headers en el host del SPA (`frame-ancestors 'none'`, `object-src 'none'`, `connect-src` al API y tiles).  
8. Quitar specifiers `latest`; pin major.  
9. Sustituir OSRM demo por instancia propia o desactivar fallback en prod.  
10. Añadir CI: `pnpm audit`, tests, build; Dependabot/Renovate.  
11. Borrar o no persistir `password` en `localStorage`; si se mantiene mock, usar hash (`PBKDF2`/`scrypt`) solo para coherencia, sabiendo que no sustituye auth real.

### P2

12. Tests de no-regresión de headers helmet y de “OAuth no sale por `/token`” (ya hay varios; falta CORS/helmet).  
13. Política de privacidad / aviso de que GPS se envía a ArcGIS u OSRM.  
14. Manifiesto de deploy (`railway.toml` o Nixpacks) con `healthcheckPath=/health` y root `backend` vs estático, para no depender de clicks en el dashboard.  
15. Cuando exista auth real: cookies `Secure`+`HttpOnly`+`SameSite=Lax/Strict`, CSRF, rate limit de login, hash de passwords, sesiones server-side, y **no** reutilizar el mock de `localStorage`.  
16. Autofill/autocomplete ya está bien en login; mantenerlo. No loguear cuerpos de `/resolver`.

---

## Flancos sugeridos para siguientes tickets

1. **SEC-01** — Upgrade MapLibre (CVE-2026-85061) + prueba de atribución OSM/ArcGIS.  
2. **SEC-02** — Endurecer `/api/rutas` (auth de servicio o cuota) y rate limit de `/api/mapa`.  
3. **SEC-03** — Dejar de persistir passwords en claro; revisar copy de “cuenta”.  
4. **SEC-04** — CSP y headers del frontend (host Railway o `vite preview`/adapter).  
5. **SEC-05** — CI audit + pin de versiones + Dependabot.  
6. **SEC-06** — Checklist operativa ArcGIS (scopes, referer, rotación) — ticket de ops, no de código.  
7. **SEC-07** — Proveedor de routing de respaldo propio; no `router.project-osrm.org` en prod.  
8. **SEC-08** — (Cuando haya reservas reales) auth server-side, CSRF, y **no** confiar en `paradisse.session`.  
9. **MAPA** — Fuera de este informe; otro agente cubre GIS. Solo reabrir seguridad si el token o las URLs de tiles cambian.

---

## Apéndice: método y límites

- Leídos: `backend/src/{app,config,index}.js`, routers, `arcgisRouting.js`, `osrmRouting.js`, tests de app/routing, front `auth-*`, `checkout-*`, `api.ts`, `storage.ts`, `InteractiveMap.tsx`, `arcgis-basemap.ts`, `router.tsx`, `index.html`, `vite.config.ts`, ignore files, README, spec de diseño.  
- `pnpm audit --prod` en raíz y `backend/`.  
- **No** se ejecutó el servidor ni se llamó a ArcGIS/OSRM reales.  
- **No** se listaron variables ni dominios de Railway.  
- **No** se inventaron fallos: lo marcado “desconocido” no se pudo verificar desde el repo.
