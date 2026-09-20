import { describe, expect, test } from 'vitest';
import { createRouteResolver } from './routing.js';

const request = {
  origen: { lat: 6.17, lng: -75.61 },
  destino: { lat: 6.18, lng: -75.60 },
  modo: 'walk',
  nombreDestino: 'Parque Principal de Itagüí',
};

const arcgisRoute = {
  puntos: [[6.17, -75.61], [6.18, -75.60]],
  pasos: [{ texto: 'Continúa por la vía principal', distanciaM: 500, duracionMin: 6 }],
  distanciaM: 500,
  duracionMin: 6,
  travelModeUtilizado: 'Walking Time',
};

describe('createRouteResolver', () => {
  test('returns ArcGIS as the primary provider when it resolves', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => arcgisRoute,
      osrmResolver: async () => { throw new Error('OSRM should not run'); },
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'arcgis',
      fallbackAplicado: false,
      motivo: null,
      puntos: arcgisRoute.puntos,
    });
  });

  test('falls back to OSRM foot when ArcGIS cannot resolve a walking mode', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => { throw new Error('ArcGIS walking travel mode unavailable'); },
      osrmResolver: async () => ({ ...arcgisRoute, travelModeUtilizado: 'foot' }),
      onProviderFailure: () => {},
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'osrm',
      fallbackAplicado: true,
      motivo: 'arcgis-fallo',
      travelModeSolicitado: 'walk',
      travelModeUtilizado: 'foot',
    });
  });

  test('falls back to OSRM with safe observability after an ArcGIS failure', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => { throw new Error('ArcGIS credential leaked in provider detail'); },
      osrmResolver: async () => ({ ...arcgisRoute, travelModeUtilizado: 'foot' }),
      onProviderFailure: () => {},
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'osrm',
      fallbackAplicado: true,
      motivo: 'arcgis-fallo',
      advertencias: ['La ruta se resolvió con el proveedor de respaldo.'],
    });
  });

  test('uses OSRM explicitly when ArcGIS is not configured', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => false,
      arcgisResolver: async () => { throw new Error('ArcGIS should not run'); },
      osrmResolver: async () => arcgisRoute,
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'osrm',
      fallbackAplicado: true,
      motivo: 'arcgis-no-configurado',
    });
  });

  test('rejects invalid coordinates and travel modes before contacting providers', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => arcgisRoute,
      osrmResolver: async () => arcgisRoute,
    });

    await expect(resolver({ ...request, modo: 'bike' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(resolver({ ...request, origen: { lat: 90.1, lng: -75.61 } }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('normalizes endpoint adjustments for the OSRM fallback too', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => false,
      osrmResolver: async () => ({
        ...arcgisRoute,
        puntos: [[6.1702, -75.6098], [6.18, -75.6]],
      }),
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'osrm',
      ajustesParadas: {
        origenAjustado: true,
        destinoAjustado: false,
      },
    });
  });

  test('returns a generic unavailable error when ArcGIS and OSRM both fail', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => { throw new Error('private ArcGIS credential detail'); },
      osrmResolver: async () => { throw new Error('private OSRM provider detail'); },
      onProviderFailure: () => {},
    });

    await expect(resolver(request)).rejects.toMatchObject({
      statusCode: 502,
      code: 'route-unavailable',
      message: 'No fue posible resolver la ruta.',
    });
  });

  test('reports both provider failures using safe categories only', async () => {
    const reports = [];
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => { throw new Error('client_secret=never-log-this ArcGIS HTTP 498'); },
      osrmResolver: async () => { throw new DOMException('timed out with private coordinates', 'AbortError'); },
      onProviderFailure: (report) => reports.push(report),
    });

    await expect(resolver(request)).rejects.toMatchObject({ code: 'route-unavailable' });
    expect(reports).toEqual([
      { provider: 'arcgis', category: 'http' },
      { provider: 'osrm', category: 'timeout' },
    ]);
    expect(JSON.stringify(reports)).not.toMatch(/never-log-this|coordinates|client_secret/i);
  });

  test('continues to OSRM when provider-failure reporting throws', async () => {
    const resolver = createRouteResolver({
      hasArcgis: () => true,
      arcgisResolver: async () => { throw new Error('ArcGIS unavailable'); },
      osrmResolver: async () => ({ ...arcgisRoute, travelModeUtilizado: 'foot' }),
      onProviderFailure: () => { throw new Error('logger unavailable'); },
    });

    await expect(resolver(request)).resolves.toMatchObject({
      fuente: 'osrm',
      fallbackAplicado: true,
    });
  });
});
