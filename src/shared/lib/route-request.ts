import type { CatalogDestination, GeoPoint } from '../types/domain';

export const INVALID_MANUAL_ORIGIN = 'Escribe una latitud y longitud válidas para la vista previa.';
export const INVALID_DESTINATION_POINT = 'Este destino no tiene un punto de llegada válido.';

export type ParseManualOriginResult =
  | { ok: true; origin: GeoPoint }
  | { ok: false; error: string };

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function isValidRoutePoint(point: unknown): point is GeoPoint {
  if (!point || typeof point !== 'object') return false;
  const lat = asFiniteNumber((point as { lat?: unknown }).lat);
  const lng = asFiniteNumber((point as { lng?: unknown }).lng);
  return lat != null && lng != null
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

export function toRoutePoint(point: GeoPoint): GeoPoint {
  return { lat: Number(point.lat), lng: Number(point.lng) };
}

export function routingPointFor(destination: Pick<CatalogDestination, 'location'>): GeoPoint {
  const source = destination.location?.routingPoint ?? destination.location;
  if (!isValidRoutePoint(source)) {
    throw new Error(INVALID_DESTINATION_POINT);
  }
  return toRoutePoint(source);
}

const parseCoordinate = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes('.') ? trimmed : trimmed.replace(',', '.');
  return asFiniteNumber(normalized);
};

export function parseManualOrigin(latInput: string, lngInput: string): ParseManualOriginResult {
  const latRaw = latInput.trim();
  const lngRaw = lngInput.trim();

  if (latRaw.includes(',') && lngRaw === '') {
    const parts = latRaw.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 2) return parseManualOrigin(parts[0], parts[1]);
  }

  const lat = parseCoordinate(latRaw);
  const lng = parseCoordinate(lngRaw);
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: INVALID_MANUAL_ORIGIN };
  }
  return { ok: true, origin: { lat, lng } };
}

export function routeRequestBody(
  origen: GeoPoint,
  destino: GeoPoint,
  modo: 'walk' | 'car',
  nombreDestino: string,
) {
  if (!isValidRoutePoint(origen) || !isValidRoutePoint(destino)) {
    throw new Error('Origen y destino deben ser coordenadas válidas.');
  }
  return {
    origen: toRoutePoint(origen),
    destino: toRoutePoint(destino),
    modo,
    nombreDestino: String(nombreDestino || 'Destino').trim().slice(0, 80),
  };
}
