import { afterEach, describe, expect, test, vi } from 'vitest';
import { authApi, mapaApi, rutasApi } from './api';

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
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({
      origen: { lat: 6.17, lng: -75.61 },
      destino: { lat: 6.18, lng: -75.60 },
      modo: 'walk',
      nombreDestino: 'Parque Principal de Itagüí',
    });
    expect(JSON.stringify(init.body)).not.toMatch(/ARCGIS_API_KEY|client_secret/i);
  });

  test('posts only lat/lng for a catalogue destination in car mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      fuente: 'arcgis', fallbackAplicado: false, motivo: null,
      travelModeSolicitado: 'car', travelModeUtilizado: 'Driving Time', puntos: [[6.17, -75.61], [6.18, -75.60]],
      pasos: [], distanciaM: 1800, duracionMin: 4, advertencias: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await rutasApi.resolver(
      { lat: 6.17, lng: -75.61 },
      {
        lat: 6.1723858,
        lng: -75.609416,
        arrivalLabel: 'Parque Principal de Itagüí',
        address: 'Parque Principal de Itagüí, Antioquia',
      } as { lat: number; lng: number },
      'car',
      'Parque Principal de Itagüí',
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      origen: { lat: 6.17, lng: -75.61 },
      destino: { lat: 6.1723858, lng: -75.609416 },
      modo: 'car',
      nombreDestino: 'Parque Principal de Itagüí',
    });
  });

  test('sends auth cookies and maps a 401 /me to a missing session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'No autenticado.',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authApi.me()).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  test('keeps the API error body and HTTP status for a failed resolve', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'No fue posible resolver la ruta.',
    }), { status: 502, headers: { 'Content-Type': 'application/json' } })));

    await expect(rutasApi.resolver(
      { lat: 0, lng: 0 },
      { lat: 6.1723858, lng: -75.609416 },
      'car',
      'Parque Principal de Itagüí',
    )).rejects.toMatchObject({
      message: 'No fue posible resolver la ruta.',
      status: 502,
    });
  });
});
