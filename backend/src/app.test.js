import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from './app.js';

const resolvedRoute = {
  fuente: 'arcgis',
  fallbackAplicado: false,
  motivo: null,
  travelModeSolicitado: 'walk',
  travelModeUtilizado: 'Walking Time',
  puntos: [[6.17, -75.61], [6.18, -75.60]],
  pasos: [],
  distanciaM: 500,
  duracionMin: 6,
  advertencias: [],
};

test('exposes a safe health endpoint for Railway checks', async () => {
  const app = createApp();

  const response = await request(app).get('/health');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    status: 'ok',
    service: 'paradisse-api',
  });
});

test('returns only the public basemap credential from the map token endpoint', async () => {
  const app = createApp({
    basemapApiKey: 'public-basemap-key',
    routingApiKey: 'private-routing-key',
  });

  const response = await request(app).get('/api/mapa/token');

  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    token: 'public-basemap-key',
    proveedor: 'arcgis',
  });
  expect(JSON.stringify(response.body)).not.toContain('private-routing-key');
});

test('does not expose the private OAuth access token as a basemap credential', async () => {
  const app = createApp({
    basemapApiKey: '',
    oauthConfigured: true,
  });

  const response = await request(app).get('/api/mapa/token');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    token: null,
    proveedor: 'osm-fallback',
    motivo: 'not-configured',
  });
  expect(JSON.stringify(response.body)).not.toContain('oauth');
});

test('reports OSM fallback when the public basemap credential is absent', async () => {
  const app = createApp({ basemapApiKey: '' });

  const response = await request(app).get('/api/mapa/token');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    token: null,
    proveedor: 'osm-fallback',
    motivo: 'not-configured',
  });
});

test('resolves a route through the normalized backend contract', async () => {
  const app = createApp({
    routeResolver: async () => resolvedRoute,
  });

  const response = await request(app)
    .post('/api/rutas/resolver')
    .send({
      origen: { lat: 6.17, lng: -75.61 },
      destino: { lat: 6.18, lng: -75.60 },
      modo: 'walk',
      nombreDestino: 'Parque Principal de Itagüí',
    });

  expect(response.status).toBe(200);
  expect(response.body).toEqual(resolvedRoute);
});

test('accepts Railway forwarded requests without rate-limit proxy validation errors', async () => {
  const app = createApp({
    routeResolver: async () => resolvedRoute,
  });

  const response = await request(app)
    .post('/api/rutas/resolver')
    .set('X-Forwarded-For', '203.0.113.10')
    .send({
      origen: { lat: 6.17, lng: -75.61 },
      destino: { lat: 6.18, lng: -75.60 },
      modo: 'walk',
    });

  expect(response.status).toBe(200);
});

test('returns safe client errors for invalid route requests', async () => {
  const app = createApp({ routeResolver: async () => resolvedRoute });

  const response = await request(app)
    .post('/api/rutas/resolver')
    .send({ origen: { lat: 91, lng: 0 }, destino: { lat: 0, lng: 0 }, modo: 'walk' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Origen y destino deben ser coordenadas válidas.' });
});

test('logs a safe request summary for backend route failures', async () => {
  const entries = [];
  const logger = { error: (...args) => entries.push(args) };
  const privateFailure = Object.assign(new Error('client_secret=never-log-this'), {
    statusCode: 502,
    code: 'token=never-log-this',
    name: 'coordinates=6.17,-75.61',
  });
  const app = createApp({
    routeResolver: async () => { throw privateFailure; },
    logger,
  });

  const response = await request(app)
    .post('/api/rutas/resolver?token=never-log-this&lat=6.17')
    .send({ origen: { lat: 6.17, lng: -75.61 }, destino: { lat: 6.18, lng: -75.60 }, modo: 'walk' });

  expect(response.status).toBe(502);
  expect(entries).toEqual([[
    '[routing] request failed',
    {
      method: 'POST',
      path: '/api/rutas/resolver',
      statusCode: 502,
    },
  ]]);
  expect(JSON.stringify(entries)).not.toContain('never-log-this');
  expect(JSON.stringify(entries)).not.toContain('6.17');
});

test('returns the safe 5xx response even when request logging fails', async () => {
  const app = createApp({
    routeResolver: async () => { throw Object.assign(new Error('provider detail'), { statusCode: 502 }); },
    logger: { error: () => { throw new Error('logging unavailable'); } },
  });

  const response = await request(app)
    .post('/api/rutas/resolver')
    .send({ origen: { lat: 6.17, lng: -75.61 }, destino: { lat: 6.18, lng: -75.60 }, modo: 'walk' });

  expect(response.status).toBe(502);
  expect(response.body).toEqual({ error: 'No fue posible resolver la ruta.' });
});
