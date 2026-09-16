import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
