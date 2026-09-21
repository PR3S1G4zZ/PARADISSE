import { lazy, Suspense, useCallback, useMemo, useState, type ComponentType } from 'react';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapLoadingPlaceholder } from './MapLoadingPlaceholder';
import type { InteractiveMapProps } from './map-types';
import './interactive-map.css';

export type { InteractiveMapMode, InteractiveMapProps } from './map-types';
export { boundsFor, centerFor, routeGeoJson, toMapLibrePoint } from './map-geometry';

const loadInteractiveMapView = () => import('./InteractiveMapView').then((module) => ({
  default: module.InteractiveMapView,
}));

const createLazyMap = (): ComponentType<InteractiveMapProps> => lazy(loadInteractiveMapView);

export function InteractiveMap(props: InteractiveMapProps) {
  const [attempt, setAttempt] = useState(0);
  const MapView = useMemo(() => createLazyMap(), [attempt]);
  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return (
    <MapErrorBoundary
      key={attempt}
      mode={props.mode}
      className={props.className}
      onRetry={retry}
    >
      <Suspense fallback={<MapLoadingPlaceholder mode={props.mode} className={props.className} />}>
        <MapView {...props} />
      </Suspense>
    </MapErrorBoundary>
  );
}
