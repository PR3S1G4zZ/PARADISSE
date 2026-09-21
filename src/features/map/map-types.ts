import type { CatalogDestination, GeoPoint } from '../../shared/types/domain';

export type InteractiveMapMode = 'overview' | 'detail' | 'navigation';

export interface InteractiveMapProps {
  destinations: CatalogDestination[];
  focusedDestination?: CatalogDestination;
  routeGeometry?: Array<[number, number]>;
  mode: InteractiveMapMode;
  showRoute?: boolean;
  onSelectDestination?: (destination: CatalogDestination) => void;
  onStartRoute?: (destination: CatalogDestination) => void;
  userPosition?: GeoPoint | null;
  className?: string;
}
