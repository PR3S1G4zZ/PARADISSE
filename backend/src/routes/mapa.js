import { Router } from 'express';
import { hasArcgisOAuthCredentials } from '../config.js';
import { getArcgisBasemapToken } from '../utils/arcgisRouting.js';

export function createMapRouter({
  basemapApiKey = '',
  basemapTokenResolver,
  oauthConfigured = hasArcgisOAuthCredentials(),
  routingConfigured = false,
} = {}) {
  const router = Router();
  // OAuth credentials are reserved for backend routing. They must not make
  // this endpoint look configured, nor be exchanged for a browser token.
  const basemapConfigured = Boolean(basemapApiKey || basemapTokenResolver);
  const resolveBasemapToken = basemapTokenResolver
    ?? (basemapApiKey ? async () => basemapApiKey : getArcgisBasemapToken);

  router.get('/token', async (_request, response) => {
    response.set('Cache-Control', 'private, max-age=300');
    if (!basemapConfigured) {
      return response.json({ token: null, proveedor: 'osm-fallback', motivo: 'not-configured' });
    }
    try {
      const token = await resolveBasemapToken();
      if (!token) {
        return response.json({ token: null, proveedor: 'osm-fallback', motivo: 'provider-unavailable' });
      }
      return response.json({ token, proveedor: 'arcgis', motivo: null });
    } catch {
      return response.json({ token: null, proveedor: 'osm-fallback', motivo: 'provider-unavailable' });
    }
  });

  router.get('/estado', (_request, response) => response.json({
    basemap: basemapConfigured ? 'arcgis' : 'osm-fallback',
    motivoBasemap: basemapConfigured ? null : 'not-configured',
    proveedorRutas: routingConfigured ? 'arcgis' : 'osrm',
  }));

  return router;
}
