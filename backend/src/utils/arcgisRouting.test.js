import { afterEach, describe, expect, test, vi } from 'vitest';
import { config } from '../config.js';
import { createRouteResolver } from '../routes/routing.js';
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

const originalClientId = config.arcgis.clientId;
const originalClientSecret = config.arcgis.clientSecret;
const originalBasemapApiKey = config.arcgis.basemapApiKey;

const fallbackRoute = {
  puntos: [[6.17, -75.61], [6.18, -75.6]],
  travelModeUtilizado: 'foot',
};

const httpResult = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const loggedText = (warn) => JSON.stringify(warn.mock.calls);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  config.arcgis.apiKey = '';
  config.arcgis.clientId = originalClientId;
  config.arcgis.clientSecret = originalClientSecret;
  config.arcgis.basemapApiKey = originalBasemapApiKey;
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

describe('ArcGIS failure logs', () => {
  const routeRequest = { ...request, modo: 'walk', nombreDestino: 'Destino' };

  const expectOsrmFallback = async (resolver) => {
    const result = await resolver(routeRequest);
    expect(result).toMatchObject({
      fuente: 'osrm',
      fallbackAplicado: true,
      motivo: 'arcgis-fallo',
      advertencias: ['La ruta se resolvió con el proveedor de respaldo.'],
    });
    expect(result.stage).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.code).toBeUndefined();
    return result;
  };

  test('logs oauth invalid_client from the token step', async () => {
    const clientId = 'arcgis-client-id-DO-NOT-LOG';
    const clientSecret = 'arcgis-client-secret-DO-NOT-LOG';
    const accessToken = 'arcgis-access-token-DO-NOT-LOG';
    config.arcgis.apiKey = '';
    config.arcgis.clientId = clientId;
    config.arcgis.clientSecret = clientSecret;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(httpResult(400, {
      error: {
        code: 400,
        error: 'invalid_client',
        error_description: `Invalid client_secret ${clientSecret}`,
        message: 'Unable to generate token.',
        details: [clientId, accessToken],
      },
      access_token: accessToken,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await expectOsrmFallback(createRouteResolver({
      hasArcgis: () => true,
      osrmResolver: async () => fallbackRoute,
    }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/oauth2/token');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[routing] provider failed', {
      provider: 'arcgis',
      category: 'http',
      stage: 'oauth',
      status: 400,
      code: 400,
      message: 'Unable to generate token.',
      oauthError: 'invalid_client',
    });
    expect(loggedText(warn)).not.toContain(clientId);
    expect(loggedText(warn)).not.toContain(clientSecret);
    expect(loggedText(warn)).not.toContain(accessToken);
    expect(loggedText(warn)).not.toContain('oauth2/token');
    expect(JSON.stringify(result)).not.toContain('invalid_client');
    expect(JSON.stringify(result)).not.toContain(clientSecret);

    warn.mockClear();
    resetArcgisRoutingCaches();
    fetchMock.mockResolvedValue(httpResult(200, {
      error: 'invalid_client',
      error_description: `Invalid client_secret ${clientSecret}`,
      access_token: accessToken,
    }));

    await expectOsrmFallback(createRouteResolver({
      hasArcgis: () => true,
      osrmResolver: async () => fallbackRoute,
    }));

    expect(warn).toHaveBeenCalledWith('[routing] provider failed', {
      provider: 'arcgis',
      category: 'http',
      stage: 'oauth',
      status: 200,
      message: 'invalid_client',
    });
    expect(loggedText(warn)).not.toContain(clientSecret);
    expect(loggedText(warn)).not.toContain(accessToken);
  });

  test('logs routing HTTP 403 with a truncated credits message', async () => {
    const apiKey = 'routing-key-DO-NOT-LOG-abcdef';
    config.arcgis.apiKey = apiKey;
    const creditsMessage = `No credits or subscription available. token=${apiKey} ${'x'.repeat(180)}`;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [{ name: 'Walking Time' }] }))
      .mockResolvedValueOnce(httpResult(403, {
        error: {
          code: 403,
          message: creditsMessage,
          details: [apiKey, 'RAW-BODY-DO-NOT-LOG'],
        },
        token: apiKey,
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expectOsrmFallback(createRouteResolver({
      hasArcgis: () => true,
      osrmResolver: async () => fallbackRoute,
    }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/solve');
    expect(warn).toHaveBeenCalledTimes(1);
    const [, entry] = warn.mock.calls[0];
    expect(entry).toMatchObject({
      provider: 'arcgis',
      category: 'http',
      stage: 'route',
      status: 403,
      code: 403,
    });
    expect(entry.message).toHaveLength(120);
    expect(entry.message.startsWith('No credits or subscription available.')).toBe(true);
    expect(entry.message).not.toContain(apiKey);
    expect(loggedText(warn)).not.toContain(apiKey);
    expect(loggedText(warn)).not.toContain('RAW-BODY-DO-NOT-LOG');
    expect(loggedText(warn)).not.toContain('route-api.arcgis.com');
  });

  test('logs HTTP 200 responses that carry ArcGIS error code 498', async () => {
    const apiKey = 'routing-token-DO-NOT-LOG-498';
    config.arcgis.apiKey = apiKey;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ supportedTravelModes: [] }))
      .mockResolvedValueOnce(httpResult(200, {
        error: {
          code: 498,
          message: `Invalid token. token=${apiKey}`,
          details: ['RAW-BODY-DO-NOT-LOG'],
        },
        access_token: apiKey,
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expectOsrmFallback(createRouteResolver({
      hasArcgis: () => true,
      osrmResolver: async () => fallbackRoute,
    }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('GetTravelModes');
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/solve'))).toBe(false);
    const diagnostics = {
      stage: 'travel-modes',
      status: 200,
      code: 498,
      message: 'Invalid token. token=[redacted]',
    };
    expect(warn).toHaveBeenNthCalledWith(1, '[arcgis] travel modes unavailable', {
      category: 'http',
      ...diagnostics,
    });
    expect(warn).toHaveBeenNthCalledWith(2, '[routing] provider failed', {
      provider: 'arcgis',
      category: 'provider',
      ...diagnostics,
    });
    expect(loggedText(warn)).not.toContain(apiKey);
    expect(loggedText(warn)).not.toContain('RAW-BODY-DO-NOT-LOG');
  });

  test('does not log access tokens, client secrets, or raw response bodies', async () => {
    const clientId = 'arcgis-client-id-DO-NOT-LOG';
    const clientSecret = 'arcgis-client-secret-DO-NOT-LOG';
    const accessToken = 'arcgis-access-token-DO-NOT-LOG';
    const basemapKey = 'basemap-key-DO-NOT-LOG-zzzz';
    config.arcgis.apiKey = '';
    config.arcgis.clientId = clientId;
    config.arcgis.clientSecret = clientSecret;
    config.arcgis.basemapApiKey = basemapKey;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(httpResult(400, {
      error: {
        code: 400,
        error: clientSecret,
        error_description: `Invalid client_secret ${clientSecret}`,
        message: `invalid_client ${clientSecret} https://www.arcgis.com/sharing/rest/oauth2/token?client_secret=${clientSecret}&token=${accessToken}`,
        details: ['RAW-BODY-DO-NOT-LOG', clientId, accessToken],
      },
      access_token: accessToken,
      client_id: clientId,
      client_secret: clientSecret,
      token: basemapKey,
    })));

    const result = await expectOsrmFallback(createRouteResolver({
      hasArcgis: () => true,
      osrmResolver: async () => fallbackRoute,
    }));

    expect(warn).toHaveBeenCalledWith('[routing] provider failed', {
      provider: 'arcgis',
      category: 'http',
      stage: 'oauth',
      status: 400,
      code: 400,
      message: 'invalid_client [redacted] https://www.arcgis.com/sharing/rest/oauth2/token',
    });
    const logged = loggedText(warn);
    for (const secret of [clientId, clientSecret, accessToken, basemapKey, 'RAW-BODY-DO-NOT-LOG']) {
      expect(logged).not.toContain(secret);
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    expect(logged).not.toContain('client_secret=');
    expect(logged).not.toContain('?token=');
    expect(logged).not.toContain('error_description');
    expect(logged).not.toContain('RAW-BODY');
  });
});
