import { describe, expect, test, vi } from 'vitest';
import {
  NAVIGATION_ROUTE_LAYER_ID,
  NAVIGATION_ROUTE_SOURCE_ID,
  syncNavigationRoute,
  type NavigationRouteFeature,
} from './navigation-route-layer';

const route: NavigationRouteFeature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [[-75.61, 6.17], [-75.6, 6.18]],
  },
};

function createMap(loaded = true) {
  const sources = new Map<string, { type: string; setData: ReturnType<typeof vi.fn>; data: unknown }>();
  const layers = new Set<string>();
  const map = {
    style: { _loaded: loaded },
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.has(id),
    addSource: (id: string, source: { type: string; data: NavigationRouteFeature }) => {
      sources.set(id, { type: source.type, data: source.data, setData: vi.fn() });
    },
    addLayer: (layer: { id?: string }) => {
      layers.add(String(layer.id));
    },
    removeSource: (id: string) => { sources.delete(id); },
    removeLayer: (id: string) => { layers.delete(id); },
    triggerRepaint: vi.fn(),
  };
  return { map, sources, layers };
}

describe('syncNavigationRoute', () => {
  test('does not add the line before the style document is loaded', () => {
    const { map, sources } = createMap(false);
    expect(syncNavigationRoute(map, route)).toBe(false);
    expect(sources.size).toBe(0);
  });

  test('adds the geojson source and line layer once the style is loaded', () => {
    const { map, sources, layers } = createMap(true);
    expect(syncNavigationRoute(map, route)).toBe(true);
    expect(sources.get(NAVIGATION_ROUTE_SOURCE_ID)?.data).toBe(route);
    expect(layers.has(NAVIGATION_ROUTE_LAYER_ID)).toBe(true);
  });

  test('updates an existing source after a style reload drops and recreates it', () => {
    const { map, sources, layers } = createMap(true);
    syncNavigationRoute(map, route);
    const setData = sources.get(NAVIGATION_ROUTE_SOURCE_ID)?.setData;
    const next = {
      ...route,
      geometry: { ...route.geometry, coordinates: [[-75.62, 6.16], [-75.6, 6.18]] as Array<[number, number]> },
    };

    expect(syncNavigationRoute(map, next)).toBe(true);
    expect(setData).toHaveBeenCalledWith(next);
    expect(layers.size).toBe(1);

    sources.clear();
    layers.clear();
    expect(syncNavigationRoute(map, next)).toBe(true);
    expect(sources.get(NAVIGATION_ROUTE_SOURCE_ID)?.data).toBe(next);
    expect(layers.has(NAVIGATION_ROUTE_LAYER_ID)).toBe(true);
  });
});
