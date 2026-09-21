import type { GeoPoint, TravelMode, UserSession } from '../types/domain';
import { routeRequestBody } from './route-request';

/**
 * Same-origin by default so SameSite=Lax session cookies work.
 * Leave VITE_API_URL unset/empty in production and local (Vite/Caddy proxy /api).
 */
export function resolveApiBase(raw: unknown = import.meta.env.VITE_API_URL): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

const API_BASE = resolveApiBase();

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
    credentials: 'include',
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

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    getJson<UserSession>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string }) =>
    getJson<UserSession>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  logout: () => getJson<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: async (): Promise<UserSession | null> => {
    try {
      return await getJson<UserSession>('/api/auth/me');
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error && Number(error.status) === 401) {
        return null;
      }
      return null;
    }
  },
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
