export const NAVIGATION_ROUTE_SOURCE_ID = 'paradisse-route';
export const NAVIGATION_ROUTE_LAYER_ID = 'paradisse-route-line';

export interface NavigationRouteFeature {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number] | number[]>;
  };
}

interface GeoJsonSourceLike {
  type?: string;
  setData?: (data: NavigationRouteFeature) => void;
}

interface NavigationRouteMap {
  style?: { _loaded?: boolean };
  isStyleLoaded?: () => boolean | void;
  getSource?: (id: string) => GeoJsonSourceLike | undefined;
  getLayer?: (id: string) => unknown;
  addSource?: (id: string, source: { type: 'geojson'; data: NavigationRouteFeature }) => void;
  addLayer?: (layer: object) => void;
  removeSource?: (id: string) => void;
  removeLayer?: (id: string) => void;
  triggerRepaint?: () => void;
}

const routeLineLayer = {
  id: NAVIGATION_ROUTE_LAYER_ID,
  type: 'line' as const,
  source: NAVIGATION_ROUTE_SOURCE_ID,
  paint: {
    'line-color': '#2f6fed',
    'line-width': 5,
    'line-opacity': 0.9,
  },
  layout: {
    'line-cap': 'round' as const,
    'line-join': 'round' as const,
  },
};

function asRouteMap(map: object): NavigationRouteMap {
  return map as NavigationRouteMap;
}

export function isNavigationStyleDocumentLoaded(map: object | null | undefined): boolean {
  if (!map) return false;
  const target = asRouteMap(map);
  if (target.style && typeof target.style._loaded === 'boolean') return target.style._loaded;
  return !(typeof target.isStyleLoaded === 'function' && target.isStyleLoaded() === false);
}

/**
 * Adds or updates the navigation polyline.
 * setStyle (ArcGIS basemap or the OSM fallback) drops sources that were added
 * before the new style finished loading, so callers must invoke this again
 * on every style.load.
 */
export function syncNavigationRoute(
  map: object | null | undefined,
  route: NavigationRouteFeature | null,
): boolean {
  if (!map || !isNavigationStyleDocumentLoaded(map)) return false;
  const target = asRouteMap(map);

  const existing = target.getSource?.(NAVIGATION_ROUTE_SOURCE_ID);
  if (!route) {
    if (target.getLayer?.(NAVIGATION_ROUTE_LAYER_ID)) target.removeLayer?.(NAVIGATION_ROUTE_LAYER_ID);
    if (existing) target.removeSource?.(NAVIGATION_ROUTE_SOURCE_ID);
    return true;
  }

  if (existing?.setData && existing.type === 'geojson') {
    existing.setData(route);
  } else {
    if (target.getLayer?.(NAVIGATION_ROUTE_LAYER_ID)) target.removeLayer?.(NAVIGATION_ROUTE_LAYER_ID);
    if (existing) target.removeSource?.(NAVIGATION_ROUTE_SOURCE_ID);
    target.addSource?.(NAVIGATION_ROUTE_SOURCE_ID, { type: 'geojson', data: route });
  }

  if (!target.getLayer?.(NAVIGATION_ROUTE_LAYER_ID)) {
    target.addLayer?.(routeLineLayer);
  }
  target.triggerRepaint?.();
  return true;
}
