import { hasArcgisRoutingCredentials } from '../config.js';
import { buildRouteStopAdjustments, resolveArcgisRoute } from '../utils/arcgisRouting.js';
import { resolveOsrmRoute } from '../utils/osrmRouting.js';

export class RouteRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RouteRequestError';
    this.statusCode = 400;
  }
}

export class RouteUnavailableError extends Error {
  constructor() {
    super('No fue posible resolver la ruta.');
    this.name = 'RouteUnavailableError';
    this.statusCode = 502;
    this.code = 'route-unavailable';
  }
}

const validPoint = (point) => point
  && Number.isFinite(Number(point.lat))
  && Number.isFinite(Number(point.lng))
  && Number(point.lat) >= -90
  && Number(point.lat) <= 90
  && Number(point.lng) >= -180
  && Number(point.lng) <= 180;

export function validateRouteRequest(input = {}) {
  if (!validPoint(input.origen) || !validPoint(input.destino)) {
    throw new RouteRequestError('Origen y destino deben ser coordenadas válidas.');
  }
  if (!['walk', 'car'].includes(input.modo)) {
    throw new RouteRequestError('El modo de viaje no es válido.');
  }
  return {
    origen: { lat: Number(input.origen.lat), lng: Number(input.origen.lng) },
    destino: { lat: Number(input.destino.lat), lng: Number(input.destino.lng) },
    modo: input.modo,
    nombreDestino: String(input.nombreDestino || 'Destino').trim().slice(0, 80),
  };
}

const normalizeRoute = (route, metadata) => ({
  fuente: metadata.fuente,
  fallbackAplicado: metadata.fallbackAplicado,
  motivo: metadata.motivo,
  travelModeSolicitado: metadata.travelModeSolicitado,
  travelModeUtilizado: route.travelModeUtilizado || metadata.travelModeSolicitado,
  puntos: route.puntos || [],
  pasos: route.pasos || [],
  distanciaM: Number(route.distanciaM) || 0,
  duracionMin: Number(route.duracionMin) || 0,
  advertencias: [...(route.advertencias || []), ...(metadata.advertencias || [])],
  ajustesParadas: route.ajustesParadas || buildRouteStopAdjustments(
    metadata.request,
    route.puntos || [],
    [],
  ),
  traficoSolicitado: Boolean(route.traficoSolicitado),
  traficoAplicado: Boolean(route.traficoAplicado),
  degradacionTrafico: route.degradacionTrafico || null,
});

export function createRouteResolver({
  hasArcgis = hasArcgisRoutingCredentials,
  arcgisResolver = resolveArcgisRoute,
  osrmResolver = resolveOsrmRoute,
} = {}) {
  return async (input) => {
    const request = validateRouteRequest(input);
    if (hasArcgis()) {
      try {
        const route = await arcgisResolver(request);
        return normalizeRoute(route, {
          fuente: 'arcgis',
          fallbackAplicado: false,
          motivo: null,
          travelModeSolicitado: request.modo,
          request,
        });
      } catch {
        try {
          const route = await osrmResolver(request);
          return normalizeRoute(route, {
            fuente: 'osrm',
            fallbackAplicado: true,
            motivo: 'arcgis-fallo',
            travelModeSolicitado: request.modo,
            advertencias: ['La ruta se resolvió con el proveedor de respaldo.'],
            request,
          });
        } catch {
          throw new RouteUnavailableError();
        }
      }
    }

    try {
      const route = await osrmResolver(request);
      return normalizeRoute(route, {
        fuente: 'osrm',
        fallbackAplicado: true,
        motivo: 'arcgis-no-configurado',
        travelModeSolicitado: request.modo,
        request,
      });
    } catch {
      throw new RouteUnavailableError();
    }
  };
}

export const routeResolver = createRouteResolver();
