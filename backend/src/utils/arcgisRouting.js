import { config } from '../config.js';

const ROUTE_SERVICE = 'https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World';
const TRAVEL_MODES_SERVICE = 'https://route-api.arcgis.com/arcgis/rest/services/World/Utilities/GPServer/GetTravelModes/execute';
const OAUTH_URL = 'https://www.arcgis.com/sharing/rest/oauth2/token';
const TRAFFIC_IMPEDANCES = new Set(['traveltime']);
const STOP_ADJUSTMENT_EPSILON_M = 2;
const EARTH_RADIUS_M = 6371008.8;
export const TRAVEL_MODES_TTL_MS = 6 * 60 * 60 * 1000;
export const EMPTY_TRAVEL_MODES_TTL_MS = 60 * 1000;

let tokenCache = { value: null, expiresAt: 0 };
let modesCache = { value: null, failure: null, expiresAt: 0 };

export function resetArcgisRoutingCaches() {
  tokenCache = { value: null, expiresAt: 0 };
  modesCache = { value: null, failure: null, expiresAt: 0 };
}

const ARCGIS_MESSAGE_LIMIT = 120;
const ARCGIS_STAGES = new Set(['oauth', 'travel-modes', 'route']);
// OAuth token errors often arrive as `error: "invalid_client"` with no
// `error.message`. Only these codes are copied; free-form values are not.
const OAUTH_ERROR_CODES = new Set([
  'invalid_client',
  'invalid_request',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'invalid_scope',
  'access_denied',
  'server_error',
  'temporarily_unavailable',
]);

const safeErrorCategory = (error) => {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (name === 'aborterror' || message.includes('timeout')) return 'timeout';
  if (message.includes('network') || message.includes('fetch') || message.includes('econn')) return 'network';
  if (/\bhttp\s*\d{3}\b/.test(message)) return 'http';
  return 'provider';
};

function allowlistedOAuthError(value) {
  if (typeof value !== 'string') return undefined;
  const code = value.trim();
  return OAUTH_ERROR_CODES.has(code) ? code : undefined;
}

function collectSecretValues(params) {
  const values = [
    config.arcgis.apiKey,
    config.arcgis.basemapApiKey,
    config.arcgis.clientId,
    config.arcgis.clientSecret,
  ];
  if (params && typeof params === 'object') {
    for (const key of ['token', 'client_secret', 'client_id', 'api_key', 'apikey', 'access_token', 'key']) {
      values.push(params[key]);
    }
  }
  const secrets = [];
  for (const value of values) {
    if (typeof value !== 'string' || value.length < 8) continue;
    secrets.push(value);
    try {
      const encoded = encodeURIComponent(value);
      if (encoded !== value) secrets.push(encoded);
    } catch {
      // Ignore values that cannot be encoded.
    }
  }
  return [...new Set(secrets)].sort((left, right) => right.length - left.length);
}

function sanitizeArcgisMessage(raw, params) {
  try {
    let message = String(raw).replace(/\s+/g, ' ').trim();
    if (!message) return undefined;
    message = message.replace(/https?:\/\/[^\s]+/gi, (url) => {
      const query = url.search(/[?#]/);
      return query === -1 ? url : url.slice(0, query);
    });
    for (const secret of collectSecretValues(params)) {
      message = message.split(secret).join('[redacted]');
    }
    message = message
      .replace(/\b(access_token|refresh_token|id_token|client_secret|client_id|api_key|apikey|token|key)=([^&\s]+)/gi, '$1=[redacted]')
      .replace(/\b(bearer)\s+\S+/gi, '$1 [redacted]');
    message = message.replace(/\s+/g, ' ').trim();
    if (!message) return undefined;
    return message.slice(0, ARCGIS_MESSAGE_LIMIT);
  } catch {
    return undefined;
  }
}

function arcgisErrorCode(body) {
  const error = body?.error;
  if (!error || typeof error !== 'object' || Array.isArray(error)) return undefined;
  const code = error.code;
  if (typeof code === 'number' && Number.isInteger(code)) return code;
  if (typeof code === 'string' && /^-?\d+$/.test(code.trim())) {
    const parsed = Number(code.trim());
    return Number.isInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

function arcgisErrorMessage(body, params) {
  const error = body?.error;
  if (error && typeof error === 'object' && !Array.isArray(error) && typeof error.message === 'string') {
    const message = sanitizeArcgisMessage(error.message, params);
    if (message) return message;
  }
  if (typeof error === 'string') return allowlistedOAuthError(error);
  return allowlistedOAuthError(error?.error);
}

function arcgisFailureFrom({ stage, status, body, params }) {
  const failure = {};
  if (ARCGIS_STAGES.has(stage)) failure.stage = stage;
  if (Number.isInteger(status)) failure.status = status;
  const code = arcgisErrorCode(body);
  if (code != null) failure.code = code;
  const message = arcgisErrorMessage(body, params);
  if (message) failure.message = message;
  const oauthError = typeof body?.error === 'string'
    ? allowlistedOAuthError(body.error)
    : allowlistedOAuthError(body?.error?.error);
  if (oauthError && oauthError !== message) failure.oauthError = oauthError;
  return failure;
}

export function arcgisFailureLog(error) {
  const failure = error?.arcgisFailure;
  if (!failure || typeof failure !== 'object') return {};
  const log = {};
  if (ARCGIS_STAGES.has(failure.stage)) log.stage = failure.stage;
  if (Number.isInteger(failure.status)) log.status = failure.status;
  if (Number.isInteger(failure.code)) log.code = failure.code;
  if (typeof failure.message === 'string' && failure.message) {
    log.message = failure.message.slice(0, ARCGIS_MESSAGE_LIMIT);
  }
  if (OAUTH_ERROR_CODES.has(failure.oauthError)) log.oauthError = failure.oauthError;
  return log;
}

function headers() {
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...(config.arcgis.referer ? { Referer: config.arcgis.referer } : {}),
  };
}

async function requestJson(url, params, stage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.routingTimeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: new URLSearchParams(params).toString(),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const status = response.status || 502;
      const error = new Error(`ArcGIS HTTP ${status}`);
      error.arcgisFailure = arcgisFailureFrom({ stage, status, body, params });
      throw error;
    }
    return body;
  } catch (error) {
    if (!error?.arcgisFailure && ARCGIS_STAGES.has(stage) && error && typeof error === 'object') {
      try {
        error.arcgisFailure = { stage };
      } catch {
        // Sealed exceptions still propagate; the stage stays off the log.
      }
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function oauthAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 300000) return tokenCache.value;
  if (!config.arcgis.clientId || !config.arcgis.clientSecret) {
    throw new Error('ArcGIS OAuth credentials unavailable');
  }
  const body = await requestJson(OAUTH_URL, {
    client_id: config.arcgis.clientId,
    client_secret: config.arcgis.clientSecret,
    grant_type: 'client_credentials',
    expiration: '20160',
    f: 'json',
    ...(config.arcgis.referer ? { referer: config.arcgis.referer } : {}),
  }, 'oauth');
  if (!body.access_token) throw new Error('ArcGIS token missing');
  tokenCache = { value: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return tokenCache.value;
}

export async function getArcgisAccessToken() {
  if (config.arcgis.apiKey) return config.arcgis.apiKey;
  return oauthAccessToken();
}

export async function getArcgisBasemapToken() {
  // Never expose the OAuth access token used by routing to the browser. A
  // basemap credential must be public/limited to basemap privileges; when it
  // is not configured the frontend deliberately uses OSM instead.
  if (config.arcgis.basemapApiKey) return config.arcgis.basemapApiKey;
  throw new Error('ArcGIS basemap credential unavailable');
}

async function readTravelModes(token) {
  if (Array.isArray(modesCache.value) && Date.now() < modesCache.expiresAt) {
    return { modes: modesCache.value, failure: modesCache.failure || null };
  }
  let modes = [];
  let failure = null;

  // Route_World exposes the complete objects directly in its service
  // metadata. This is the least surprising source and avoids guessing a
  // travel mode by name.
  try {
    const body = await requestJson(ROUTE_SERVICE, { f: 'json', token }, 'travel-modes');
    if (Array.isArray(body.supportedTravelModes)) modes = body.supportedTravelModes;
  } catch (error) {
    // The utility endpoint below is an explicit provider fallback.
    failure = error;
  }

  if (modes.length === 0) {
    try {
      const body = await requestJson(TRAVEL_MODES_SERVICE, { f: 'json', token }, 'travel-modes');
      const table = body.results?.find((result) => result.paramName === 'supportedTravelModes');
      modes = (table?.value?.features || []).map((feature) => {
        try { return JSON.parse(feature.attributes.TravelMode); } catch { return null; }
      }).filter(Boolean);
      failure = null;
    } catch (error) {
      failure = error;
      console.warn('[arcgis] travel modes unavailable', {
        category: safeErrorCategory(error),
        ...arcgisFailureLog(error),
      });
    }
  } else {
    failure = null;
  }

  // An empty list is a transient provider failure, not a stable catalog.
  // Caching it for hours made walk solves omit travelMode and default to driving.
  modesCache = {
    value: modes,
    failure: modes.length > 0 ? null : failure,
    expiresAt: Date.now() + (modes.length > 0 ? TRAVEL_MODES_TTL_MS : EMPTY_TRAVEL_MODES_TTL_MS),
  };
  return { modes, failure: modesCache.failure };
}

async function travelModes(token) {
  const { modes } = await readTravelModes(token);
  return modes;
}

function selectTravelMode(modes, mode) {
  const preferences = mode === 'walk'
    ? ['walking time', 'walking distance', 'walking']
    : ['driving time', 'driving distance', 'driving'];
  return preferences.map((preference) => modes.find((candidate) => String(candidate.name || '').toLowerCase().includes(preference)))
    .find(Boolean) || null;
}

function stopsFor(origen, destino, nombreDestino) {
  const stop = (point, name) => ({
    geometry: { x: point.lng, y: point.lat, spatialReference: { wkid: 4326 } },
    attributes: { Name: name },
  });
  return JSON.stringify({ type: 'features', features: [stop(origen, 'Tu ubicación'), stop(destino, nombreDestino || 'Destino')] });
}

const validPoint = (point) => point
  && Number.isFinite(Number(point.lat))
  && Number.isFinite(Number(point.lng))
  && Number(point.lat) >= -90
  && Number(point.lat) <= 90
  && Number(point.lng) >= -180
  && Number(point.lng) <= 180;

const pointFromGeometry = (geometry) => {
  if (!geometry) return null;
  if (Number.isFinite(Number(geometry.x)) && Number.isFinite(Number(geometry.y))) {
    const point = { lat: Number(geometry.y), lng: Number(geometry.x) };
    return validPoint(point) ? point : null;
  }
  if (Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
    const point = { lat: Number(geometry.coordinates[1]), lng: Number(geometry.coordinates[0]) };
    return validPoint(point) ? point : null;
  }
  return null;
};

export function extractArcgisStopPoints(body = {}) {
  const features = body.stops?.features
    || body.routes?.features?.[0]?.stops?.features
    || [];
  return features.map((feature) => pointFromGeometry(feature?.geometry));
}

function pointFromRouteCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
  const point = { lat: Number(coordinate[0]), lng: Number(coordinate[1]) };
  return validPoint(point) ? point : null;
}

function haversineDistanceM(first, second) {
  if (!validPoint(first) || !validPoint(second)) return null;
  const toRadians = (value) => value * Math.PI / 180;
  const latDelta = toRadians(Number(second.lat) - Number(first.lat));
  const lngDelta = toRadians(Number(second.lng) - Number(first.lng));
  const firstLat = toRadians(Number(first.lat));
  const secondLat = toRadians(Number(second.lat));
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

const roundDistance = (distance) => distance == null ? null : Math.round(distance * 10) / 10;

export function buildRouteStopAdjustments({ origen, destino }, puntos = [], stops = []) {
  const routeStart = pointFromRouteCoordinate(puntos[0]);
  const routeEnd = pointFromRouteCoordinate(puntos.at(-1));
  const adjustedOrigin = stops[0] || routeStart;
  const adjustedDestination = stops.at(-1) || routeEnd;
  const origenSnapM = roundDistance(haversineDistanceM(origen, adjustedOrigin));
  const destinoSnapM = roundDistance(haversineDistanceM(destino, adjustedDestination));
  const origenAjustado = origenSnapM != null && origenSnapM >= STOP_ADJUSTMENT_EPSILON_M;
  const destinoAjustado = destinoSnapM != null && destinoSnapM >= STOP_ADJUSTMENT_EPSILON_M;
  const notices = [];

  if (origenAjustado) notices.push(`El punto de partida fue ajustado ${Math.round(origenSnapM)} m hasta la vía más cercana.`);
  if (destinoAjustado) {
    notices.push(`El punto de llegada fue ajustado ${Math.round(destinoSnapM)} m hasta la vía más cercana.`);
    if (destinoSnapM > 25) {
      notices.push(`Los últimos ${Math.round(destinoSnapM)} m hasta el destino quedan fuera de la red vial disponible; continúa desde la vía más cercana.`);
    }
  }

  return {
    origenSnapM,
    destinoSnapM,
    origenAjustado,
    destinoAjustado,
    aviso: notices.length > 0 ? notices.join(' ') : null,
  };
}

export async function resolveArcgisRoute({ origen, destino, modo, nombreDestino }) {
  const token = await getArcgisAccessToken();
  const { modes, failure: travelModeFailure } = await readTravelModes(token);
  const travelMode = selectTravelMode(modes, modo);
  if (modo === 'walk' && !travelMode) {
    const error = new Error('ArcGIS walking travel mode unavailable');
    const diagnostics = arcgisFailureLog(travelModeFailure);
    if (Object.keys(diagnostics).length > 0) error.arcgisFailure = diagnostics;
    throw error;
  }
  const trafficRequested = modo === 'car';
  const trafficApplied = trafficRequested && TRAFFIC_IMPEDANCES.has(String(travelMode?.impedanceAttributeName || '').toLowerCase());
  const warnings = [];
  if (!travelMode) warnings.push('travel-mode-no-resuelto');
  if (trafficRequested && !trafficApplied) warnings.push('trafico-no-aplicado');

  const params = {
    f: 'json',
    token,
    stops: stopsFor(origen, destino, nombreDestino),
    returnRoutes: 'true',
    returnDirections: 'true',
    returnStops: 'true',
    findBestSequence: 'false',
    preserveFirstStop: 'true',
    preserveLastStop: 'true',
    directionsLanguage: 'es',
    directionsLengthUnits: 'esriNAUMeters',
    outputLines: 'esriNAOutputLineTrueShape',
    outSR: '4326',
    ...(travelMode ? { travelMode: JSON.stringify(travelMode) } : {}),
    ...(trafficApplied ? { startTime: 'now', startTimeIsUTC: 'false' } : {}),
  };
  const body = await requestJson(`${ROUTE_SERVICE}/solve`, params, 'route');
  const feature = body.routes?.features?.[0];
  if (!feature?.geometry?.paths?.length) throw new Error('ArcGIS route geometry missing');
  const direction = body.directions?.[0];
  const puntos = feature.geometry.paths.flat().map(([lng, lat]) => [lat, lng]);
  const ajustesParadas = buildRouteStopAdjustments(
    { origen, destino },
    puntos,
    extractArcgisStopPoints(body),
  );
  if (ajustesParadas.aviso) warnings.push('puntos-ajustados-a-red-vial');
  return {
    puntos,
    pasos: (direction?.features || []).map((item) => ({
      texto: item.attributes?.text || '',
      distanciaM: Number(item.attributes?.length) || 0,
      duracionMin: Number(item.attributes?.time) || 0,
      maniobra: item.attributes?.maneuverType || '',
    })).filter((step) => step.texto),
    distanciaM: Number(direction?.summary?.totalLength) || 0,
    duracionMin: Number(direction?.summary?.totalTime) || 0,
    travelModeUtilizado: travelMode?.name || modo,
    traficoSolicitado: trafficRequested,
    traficoAplicado: trafficApplied,
    degradacionTrafico: trafficRequested && !trafficApplied ? 'travel-mode-sin-impedancia-de-trafico' : null,
    advertencias: warnings,
    ajustesParadas,
  };
}

export { ROUTE_SERVICE, TRAVEL_MODES_SERVICE, safeErrorCategory, selectTravelMode, travelModes };
