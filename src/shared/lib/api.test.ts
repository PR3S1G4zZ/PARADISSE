import { afterEach, describe, expect, test, vi } from 'vitest';
import { mapaApi, rutasApi } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('map and routing API adapters', () => {
  test('falls back to OSM when the token endpoint is rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Límite temporal de solicitudes alcanzado.',
    }), { status: 429, headers: { 'Content-Type': 'application/json' } })));

    await expect(mapaApi.token()).resolves.toMatchObject({
      token: null,
      proveedor: 'osm-fallback',
      motivo: 'backend-unavailable',
      status: 429,
    });
  });

  test('reads the safe basemap token contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      token: 'public-key', proveedor: 'arcgis', motivo: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    await expect(mapaApi.token()).resolves.toMatchObject({ token: 'public-key', proveedor: 'arcgis' });
  });

  test('posts normalized route input without exposing client-side routing credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      fuente: 'osrm', fallbackAplicado: true, motivo: 'arcgis-no-configurado',
      travelModeSolicitado: 'walk', travelModeUtilizado: 'foot', puntos: [], pasos: [],
      distanciaM: 0, duracionMin: 0, advertencias: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await rutasApi.resolver(
      { lat: 6.17, lng: -75.61 },
      { lat: 6.18, lng: -75.60 },
      'walk',
      'Parque Principal de Itagüí',
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ modo: 'walk', nombreDestino: 'Parque Principal de Itagüí' });
    expect(JSON.stringify(init.body)).not.toMatch(/ARCGIS_API_KEY|client_secret/i);
  });
});
