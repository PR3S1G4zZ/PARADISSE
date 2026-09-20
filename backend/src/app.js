import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config, hasArcgisOAuthCredentials, hasArcgisRoutingCredentials } from './config.js';
import { createMapRouter } from './routes/mapa.js';
import { createRoutingRouter } from './routes/routing-route.js';
import { routeResolver, validateRouteRequest } from './routes/routing.js';

const RATE_LIMIT_MESSAGE = { error: 'Límite temporal de solicitudes alcanzado.' };

export function createApp({
  basemapApiKey = config.arcgis.basemapApiKey,
  basemapTokenResolver,
  oauthConfigured = hasArcgisOAuthCredentials(),
  routingApiKey = config.arcgis.apiKey,
  routingConfigured = routingApiKey || hasArcgisRoutingCredentials(),
  routeResolver: resolver = routeResolver,
  corsOrigin = config.corsOrigin,
  logger = console,
  mapaRateLimit = {},
  } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Railway terminates the public connection at one reverse proxy and adds
  // X-Forwarded-For. Trusting exactly one hop lets express-rate-limit use the
  // real client IP without trusting arbitrary proxy chains.
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => response.json({
    status: 'ok',
    service: 'paradisse-api',
  }));

  // Token fetches are cheap but still dispense a basemap credential. 30/5min
  // is enough for remounts while remaining tighter than /api/rutas (60/5min).
  app.use('/api/mapa', rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: RATE_LIMIT_MESSAGE,
    ...mapaRateLimit,
  }), createMapRouter({
    basemapApiKey,
    basemapTokenResolver,
    oauthConfigured,
    routingConfigured: Boolean(routingConfigured),
  }));
  const validatedResolver = async (input) => resolver(validateRouteRequest(input));

  app.use('/api/rutas', rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: RATE_LIMIT_MESSAGE,
  }), createRoutingRouter({ resolver: validatedResolver }));

  app.use((error, request, response, _next) => {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode >= 500) {
      try {
        logger.error('[routing] request failed', {
          method: request.method,
          path: request.path,
          statusCode,
        });
      } catch {
        // Logging must not replace the safe API response.
      }
      return response.status(statusCode).json({
        error: statusCode === 502 ? 'No fue posible resolver la ruta.' : 'Error interno del servidor.',
      });
    }
    return response.status(statusCode).json({ error: error?.message || 'Solicitud inválida.' });
  });

  return app;
}
