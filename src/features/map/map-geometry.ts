import type { CatalogDestination, GeoPoint } from '../../shared/types/domain';

export const toMapLibrePoint = ({ lat, lng }: GeoPoint): [number, number] => [lng, lat];

export const routeGeoJson = (points: Array<[number, number]> = []) => points.length < 2
  ? null
  : {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map(([lat, lng]) => [lng, lat] as [number, number]),
    },
  };

export const boundsFor = (destinations: CatalogDestination[]) => {
  const points = destinations.map(({ location }) => toMapLibrePoint(location));
  if (points.length === 0) return null;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]];
};

export const centerFor = (destinations: CatalogDestination[], focused?: CatalogDestination): [number, number] => {
  if (focused) return toMapLibrePoint(focused.location);
  const bounds = boundsFor(destinations);
  if (!bounds) return [-75.75, 5.9];
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
};
