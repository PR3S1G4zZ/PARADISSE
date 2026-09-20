import 'dotenv/config';

const DEFAULT_DEV_CORS_ORIGIN = 'http://localhost:5173';

/**
 * Wildcard CORS is fine for local Vite, but it would let any site call
 * /api/mapa/token in production. Reject `*` there; leave unset origins on
 * the existing localhost default so local `pnpm dev` keeps working.
 */
export function resolveCorsOrigin(
  raw = process.env.CORS_ORIGIN,
  nodeEnv = process.env.NODE_ENV,
) {
  const origin = (raw && String(raw).trim()) || DEFAULT_DEV_CORS_ORIGIN;
  if (nodeEnv === 'production' && origin === '*') {
    throw new Error('CORS_ORIGIN=* is not allowed in production. Set an explicit origin.');
  }
  return origin;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: resolveCorsOrigin(),
  routingTimeoutMs: Number(process.env.ROUTING_HTTP_TIMEOUT_MS || 8000),
  arcgis: {
    basemapApiKey: process.env.ARCGIS_BASEMAP_API_KEY || '',
    apiKey: process.env.ARCGIS_API_KEY || '',
    clientId: process.env.ARCGIS_CLIENT_ID || '',
    clientSecret: process.env.ARCGIS_CLIENT_SECRET || '',
    referer: process.env.ARCGIS_REFERER || '',
  },
};

export const hasArcgisRoutingCredentials = () => Boolean(
  config.arcgis.apiKey
  || (config.arcgis.clientId && config.arcgis.clientSecret),
);

export const hasArcgisOAuthCredentials = () => Boolean(
  config.arcgis.clientId && config.arcgis.clientSecret,
);
