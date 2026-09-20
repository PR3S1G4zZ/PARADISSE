import { afterEach, describe, expect, test, vi } from 'vitest';
import { config } from '../config.js';
import {
  buildRouteStopAdjustments,
  EMPTY_TRAVEL_MODES_TTL_MS,
  extractArcgisStopPoints,
  resetArcgisRoutingCaches,
  resolveArcgisRoute,
  selectTravelMode,
  TRAVEL_MODES_TTL_MS,
} from './arcgisRouting.js';

const request = {
  origen: { lat: 6.17, lng: -75.61 },
  destino: { lat: 6.18, lng: -75.6 },
};

const solvedRouteBody = {
  routes: { features: [{ geometry: { paths: [[[-75.6098, 6.1701], [-75.6004, 6.1799]]] } }] },
  directions: [{ summary: { totalLength: 1200, totalTime: 16 }, features: [] }],
  stops: { features: [
    { geometry: { x: -75.6098, y: 6.1701 } },
    { geometry: { x: -75.6004, y: 6.1799 } },
  ] },
};

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  config.arcgis.apiKey = '';
  resetArcgisRoutingCaches();
});

describe('ArcGIS route stop adjustments', () => {
  test('reads ordered adjusted stops from the ArcGIS response', () => {
    const stops = extractArcgisStopPoints({
      stops: {
        features: [
          { geometry: { x: -75.6098, y: 6.1701 } },
          { geometry: { x: -75.6004, y: 6.1799 } },
        ],
      },
    });

    expect(stops).toEqual([
      { lat: 6.1701, lng: -75.6098 },
      { lat: 6.1799, lng: -75.6004 },
    ]);
  });

  test('reports origin and destination snapping without exposing coordinates', () => {
    const adjustment = buildRouteStopAdjustments(
      request,
      [
        [6.1701, -75.6098],
        [6.1799, -75.6004],
      ],
      [
        { lat: 6.1701, lng: -75.6098 },
        { lat: 6.1799, lng: -75.6004 },
      ],
    );

    expect(adjustment.origenAjustado).toBe(true);
    expect(adjustment.destinoAjustado).toBe(true);
    expect(adjustment.origenSnapM).toBeGreaterThan(20);
    expect(adjustment.destinoSnapM).toBeGreaterThan(20);
    expect(adjustment.aviso).toContain('vía más cercana');
    expect(JSON.stringify(adjustment)).not.toContain('6.17');
    expect(JSON.stringify(adjustment)).not.toContain('-75.61');
  });

  test('uses the route endpoints when ArcGIS does not return stops', () => {
    const adjustment = buildRouteStopAdjustments(
      request,
      [[6.17005, -75.60995], [6.18, -75.6]],
      [],
    );

    expect(adjustment.origenSnapM).toBeGreaterThan(0);
    expect(adjustment.destinoSnapM).toBe(0);
    expect(adjustment.destinoAjustado).toBe(false);
  });

  test('requests stops and propagates the provider adjustment in the normalized route', async () => {
    config.arcgis.apiKey = 'test-routing-key';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          supportedTravelModes: [{ name: 'Walking Time' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routes: { features: [{ geometry: { paths: [[[-75.6098, 6.1701], [-75.6004, 6.1799]]] } }] },
          directions: [{ summary: { totalLength: 1200, totalTime: 16 }, features: [] }],
          stops: { features: [
            { geometry: { x: -75.6098, y: 6.1701 } },
            { geometry: { x: -75.6004, y: 6.1799 } },
          ] },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const resolved = await resolveArcgisRoute({ ...request, modo: 'walk', nombreDestino: 'Destino' });

    expect(resolved.ajustesParadas.origenAjustado).toBe(true);
    expect(resolved.ajustesParadas.destinoAjustado).toBe(true);
    expect(fetchMock.mock.calls[1][1].body).toContain('returnStops=true');
    expect(fetchMock.mock.calls[1][1].body).toContain('outSR=4326');
  });
});

describe('ArcGIS travel modes', () => {
  test('selects walking and driving modes by preferred name', () => {
    const modes = [{ name: 'Driving Time' }, { name: 'Walking Distance' }];
    expect(selectTravelMode(modes, 'walk')?.name).toBe('Walking Distance');
    expect(selectTravelMode(modes, 'car')?.name).toBe('Driving Time');
    expect(selectTravelMode([], 'walk')).toBeNull();
  });

  test('does not cache an empty travel-mode list for the long TTL', async () => {
    config.arcgis.apiKey = 'test-routing-key';
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [{ name: 'Walking Time' }] }))
      .mockResolvedValueOnce(jsonResponse(solvedRouteBody));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveArcgisRoute({ ...request, modo: 'walk' }))
      .rejects.toThrow('ArcGIS walking travel mode unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    Date.now.mockReturnValue(now + EMPTY_TRAVEL_MODES_TTL_MS - 1);
    await expect(resolveArcgisRoute({ ...request, modo: 'walk' }))
      .rejects.toThrow('ArcGIS walking travel mode unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    Date.now.mockReturnValue(now + EMPTY_TRAVEL_MODES_TTL_MS + 1);
    await expect(resolveArcgisRoute({ ...request, modo: 'walk' }))
      .resolves.toMatchObject({ travelModeUtilizado: 'Walking Time' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).toContain('/solve');
    expect(EMPTY_TRAVEL_MODES_TTL_MS).toBeLessThan(TRAVEL_MODES_TTL_MS);
  });

  test('walk without a resolved mode never solves on ArcGIS driving defaults', async () => {
    config.arcgis.apiKey = 'test-routing-key';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [{ name: 'Driving Time' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveArcgisRoute({ ...request, modo: 'walk' }))
      .rejects.toThrow('ArcGIS walking travel mode unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([, init]) => String(init.body).includes('returnRoutes=true'))).toBe(false);
  });

  test('car can still solve without a named travel mode', async () => {
    config.arcgis.apiKey = 'test-routing-key';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse(solvedRouteBody));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveArcgisRoute({ ...request, modo: 'car' })).resolves.toMatchObject({
      travelModeUtilizado: 'car',
      advertencias: expect.arrayContaining(['travel-mode-no-resuelto']),
    });
    expect(fetchMock.mock.calls[2][0]).toContain('/solve');
    expect(fetchMock.mock.calls[2][1].body).not.toContain('travelMode=');
  });

  test('caches a non-empty travel-mode catalog across solves', async () => {
    config.arcgis.apiKey = 'test-routing-key';
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [{ name: 'Walking Time' }] }))
      .mockResolvedValueOnce(jsonResponse(solvedRouteBody))
      .mockResolvedValueOnce(jsonResponse(solvedRouteBody));
    vi.stubGlobal('fetch', fetchMock);

    await resolveArcgisRoute({ ...request, modo: 'walk' });
    Date.now.mockReturnValue(now + TRAVEL_MODES_TTL_MS - 1);
    await resolveArcgisRoute({ ...request, modo: 'walk' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/solve');
    expect(fetchMock.mock.calls[2][0]).toContain('/solve');
  });
});
