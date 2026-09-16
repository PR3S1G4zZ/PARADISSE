import { describe, expect, test } from 'vitest';
import { boundsFor, centerFor, routeGeoJson, toMapLibrePoint } from './InteractiveMap';
import type { CatalogDestination } from '../../shared/types/domain';

const destinations: CatalogDestination[] = [
  {
    slug: 'a', name: 'A', kind: 'municipality', description: '', experiences: [],
    location: { lat: 6, lng: -75, arrivalLabel: 'A' },
  },
  {
    slug: 'b', name: 'B', kind: 'site', description: '', experiences: [],
    location: { lat: 7, lng: -74, arrivalLabel: 'B' },
  },
];

describe('InteractiveMap geometry adapters', () => {
  test('converts domain coordinates to MapLibre order', () => {
    expect(toMapLibrePoint({ lat: 6.17, lng: -75.61 })).toEqual([-75.61, 6.17]);
  });

  test('creates bounds and center from destination arrival points', () => {
    expect(boundsFor(destinations)).toEqual([[-75, 6], [-74, 7]]);
    expect(centerFor(destinations)).toEqual([-74.5, 6.5]);
    expect(centerFor(destinations, destinations[1])).toEqual([-74, 7]);
  });

  test('normalizes a route into GeoJSON MapLibre coordinates', () => {
    expect(routeGeoJson([[6, -75], [7, -74]])).toMatchObject({
      geometry: { type: 'LineString', coordinates: [[-75, 6], [-74, 7]] },
    });
    expect(routeGeoJson([[6, -75]])).toBeNull();
  });
});
