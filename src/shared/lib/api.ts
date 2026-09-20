import type { GeoPoint, TravelMode } from '../types/domain';
import { routeRequestBody } from './route-request';

const API_BASE = import.meta.env.VITE_API_URL
  ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface BasemapTokenResult {
  token: string | null;
  proveedor: 'arcgis' | 'osm-fallback';
  motivo: string | null;
  status?: number;
}

export interface RouteStep {
  texto: string;
  distanciaM: number;
  duracionMin: number;
  maniobra?: string;
}

export interface RouteStopAdjustment {
  origenSnapM: number | null;
  destinoSnapM: number | null;
  origenAjustado: boolean;
  destinoAjustado: boolean;
  aviso: string | null;
}

export interface ResolvedRoute {
  fuente: 'arcgis' | 'osrm';
  fallbackAplicado: boolean;
  motivo: string | null;
  travelModeSolicitado: TravelMode;
  travelModeUtilizado: TravelMode | string;
  puntos: Array<[number, number]>;
  pasos: RouteStep[];
  distanciaM: number;
  duracionMin: number;
  advertencias: string[];
  ajustesParadas?: RouteStopAdjustment;
  traficoSolicitado?: boolean;
  traficoAplicado?: boolean;
  degradacionTrafico?: string | null;
}

interface ResolveRouteOptions {
  signal?: AbortSignal;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof fetch !== 'function') throw new Error('fetch-unavailable');
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) {
    const apiMessage = typeof payload.error === 'string' ? payload.error.trim() : '';
    const error = new Error(apiMessage || `API HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

export const mapaApi = {
  token: async (): Promise<BasemapTokenResult> => {
    try {
      return await getJson<BasemapTokenResult>('/api/mapa/token');
    } catch (error) {
      return {
        token: null,
        proveedor: 'osm-fallback',
        motivo: error instanceof Error && error.message === 'fetch-unavailable'
          ? 'network'
          : 'backend-unavailable',
        status: typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : undefined,
      };
    }
  },
  estado: async () => getJson<{ basemap: 'arcgis' | 'osm-fallback'; motivoBasemap: string | null; proveedorRutas: 'arcgis' | 'osrm' }>('/api/mapa/estado'),
};

export const rutasApi = {
  resolver: (
    origen: GeoPoint,
    destino: GeoPoint,
    modo: TravelMode,
    nombreDestino: string,
    options: ResolveRouteOptions = {},
  ) => getJson<ResolvedRoute>('/api/rutas/resolver', {
    method: 'POST',
    signal: options.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(routeRequestBody(origen, destino, modo, nombreDestino)),
  }),
};

export { API_BASE };
