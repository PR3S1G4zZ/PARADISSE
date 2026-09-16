import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { FiCrosshair, FiMapPin, FiNavigation, FiRefreshCw } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import type { CatalogDestination, GeoPoint } from '../../shared/types/domain';
import { mapaApi } from '../../shared/lib/api';
import { NavegacionContext } from '../navigation/NavigationContext';
import { CAMERA_MODES, createProvisionalNavigationFrame } from '../navigation/navigation-frame';
import { useNavigationFrame } from '../navigation/useNavigationFrame';
import { useNavigationCamera } from '../navigation/useNavigationCamera';
import { useAnimatedPosition } from '../navigation/useAnimatedPosition';
import { applyArcgisBasemapStyle } from './arcgis-basemap';
import './interactive-map.css';
import 'maplibre-gl/dist/maplibre-gl.css';

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

const EMPTY_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{
    id: 'map-loading-background',
    type: 'background',
    paint: { 'background-color': '#e8e8e1' },
  }],
};

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-raster', type: 'raster', source: 'osm' }],
};

const routeLineLayer = {
  id: 'paradisse-route-line',
  type: 'line' as const,
  paint: {
    'line-color': '#2f6fed',
    'line-width': 5,
    'line-opacity': 0.9,
  },
  layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
};

const BASEMAP_REASON_LABELS: Record<string, string> = {
  'not-configured': 'ArcGIS no está configurado; se usa OSM.',
  'backend-unavailable': 'El servicio de mapas no responde; se usa OSM.',
  network: 'No se pudo contactar ArcGIS; se usa OSM.',
  'style-error': 'ArcGIS no pudo cargar el estilo; se usa OSM.',
};

const basemapReasonLabel = (reason: string | null) => reason
  ? BASEMAP_REASON_LABELS[reason] ?? 'ArcGIS no disponible; se usa OSM.'
  : null;

const hasWebGl = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (typeof window.WebGLRenderingContext === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
};

const toMapLibrePoint = ({ lat, lng }: GeoPoint): [number, number] => [lng, lat];

const routeGeoJson = (points: Array<[number, number]> = []) => points.length < 2
  ? null
  : {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map(([lat, lng]) => [lng, lat]),
    },
  };

const boundsFor = (destinations: CatalogDestination[]) => {
  const points = destinations.map(({ location }) => toMapLibrePoint(location));
  if (points.length === 0) return null;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]];
};

const centerFor = (destinations: CatalogDestination[], focused?: CatalogDestination): [number, number] => {
  if (focused) return toMapLibrePoint(focused.location);
  const bounds = boundsFor(destinations);
  if (!bounds) return [-75.75, 5.9];
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
};

function MarkerContent({ destination, onSelect }: { destination: CatalogDestination; onSelect?: () => void }) {
  return (
    <Link
      className={`interactive-map__marker interactive-map__marker--${destination.kind}`}
      data-destination-kind={destination.kind}
      to={`/destinos/${destination.slug}`}
      onClick={onSelect}
      aria-label={`Ver ${destination.name} en el mapa`}
    >
      <FiMapPin aria-hidden="true" />
      <span>{destination.name}</span>
      <span className="sr-only">Ver {destination.name} en el mapa</span>
    </Link>
  );
}

function MapFallback({ destinations, mode, focusedDestination, onSelectDestination, onStartRoute, providerReason }: {
  destinations: CatalogDestination[];
  mode: InteractiveMapMode;
  focusedDestination?: CatalogDestination;
  onSelectDestination?: (destination: CatalogDestination) => void;
  onStartRoute?: (destination: CatalogDestination) => void;
  providerReason: string | null;
}) {
  return (
    <div className="interactive-map__fallback" role="region" aria-label="Mapa de destinos">
      <div className="interactive-map__fallback-surface" aria-hidden="true">
        <FiNavigation />
      </div>
      <div className="interactive-map__fallback-copy">
        <strong>Mapa {mode === 'navigation' ? 'de navegación' : 'interactivo'}</strong>
        <span>{providerReason ?? 'Explora los puntos de llegada disponibles.'}</span>
      </div>
      <div className="interactive-map__fallback-markers" role="list" aria-label="Destinos en el mapa">
        {destinations.map((destination) => (
          <div className="interactive-map__fallback-item" key={destination.slug} role="listitem">
            <Link
              className={`interactive-map__marker interactive-map__marker--${destination.kind}`}
              data-destination-kind={destination.kind}
              to={`/destinos/${destination.slug}`}
              onClick={() => onSelectDestination?.(destination)}
              aria-label={`Ver ${destination.name} en el mapa`}
            >
              <FiMapPin aria-hidden="true" />
              <span>{destination.name}</span>
              <span className="sr-only">Ver {destination.name} en el mapa</span>
            </Link>
            {focusedDestination?.slug === destination.slug && onStartRoute && (
              <button type="button" onClick={() => onStartRoute(destination)}>Cómo llegar</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractiveMap({
  destinations,
  focusedDestination,
  routeGeometry = [],
  mode,
  showRoute = false,
  onSelectDestination,
  onStartRoute,
  userPosition,
  className = '',
}: InteractiveMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapStyle, setMapStyle] = useState<StyleSpecification>(EMPTY_MAP_STYLE);
  const [token, setToken] = useState<string | null>(null);
  const [providerReason, setProviderReason] = useState<string | null>(null);
  const [provider, setProvider] = useState<'loading' | 'arcgis' | 'osm-fallback'>('loading');
  const [mapReady, setMapReady] = useState(false);
  const basemapAttemptRef = useRef<{ map: MapLibreMap; token: string } | null>(null);
  const navigation = useContext(NavegacionContext);
  const localFrame = useNavigationFrame(
    mode === 'navigation' ? navigation?.pose ?? null : null,
    mode === 'navigation' ? CAMERA_MODES.FOLLOWING : CAMERA_MODES.OVERVIEW,
  );
  const frame = mode === 'navigation' ? navigation?.frame ?? localFrame : localFrame;
  const provisionalFrame = useMemo(
    () => mode === 'navigation' && !frame
      ? createProvisionalNavigationFrame(navigation?.position ?? null, CAMERA_MODES.FOLLOWING)
      : null,
    [frame, mode, navigation?.position],
  );
  const navigationFrame = frame ?? provisionalFrame;
  const animatedUserPosition = useAnimatedPosition(navigationFrame?.displayPosition ?? userPosition, mode === 'navigation' ? 350 : 0);
  const navigationCamera = useNavigationCamera({
    frame: mode === 'navigation' ? navigationFrame : null,
    profile: navigation?.mode ?? 'walk',
    active: mode === 'navigation' && mapReady && Boolean(navigation?.route),
    gpsConfiable: navigation?.status === 'preview' || navigation?.gpsConfiable !== false,
    mapRef,
  });
  const route = useMemo(() => routeGeoJson(routeGeometry), [routeGeometry]);
  const center = useMemo(() => centerFor(destinations, focusedDestination), [destinations, focusedDestination]);

  useEffect(() => {
    let alive = true;
    void mapaApi.token().then((result) => {
      if (!alive) return;
      setToken(result.token);
      setProviderReason(result.motivo);
      setProvider(result.token ? 'loading' : 'osm-fallback');
      if (!result.token) setMapStyle(OSM_RASTER_STYLE);
    });
    return () => { alive = false; };
  }, []);

  const useOsmFallback = useCallback((reason: string) => {
    setProvider('osm-fallback');
    setProviderReason(reason);
    setMapStyle(OSM_RASTER_STYLE);
  }, []);

  const applyArcgisStyle = useCallback(async (map: MapLibreMap) => {
    if (!token) return;
    if (basemapAttemptRef.current?.map === map && basemapAttemptRef.current.token === token) return;
    basemapAttemptRef.current = { map, token };
    try {
      // Cargar el SDK de Esri solo en navegador evita que el runner de pruebas
      // intente resolver su bundle ESM contra el entrypoint CommonJS de MapLibre.
      const { BasemapStyle } = await import('@esri/maplibre-arcgis');
      const applied = await applyArcgisBasemapStyle({
        map,
        token,
        BasemapStyle,
        onFallback: useOsmFallback,
      });
      if (!applied) {
        basemapAttemptRef.current = null;
        return;
      }
      setProvider('arcgis');
      setProviderReason(null);
    } catch {
      basemapAttemptRef.current = null;
      useOsmFallback('style-error');
    }
  }, [token, useOsmFallback]);

  useEffect(() => {
    if (!mapReady || !token || !mapRef.current) return;
    void applyArcgisStyle(mapRef.current.getMap());
  }, [applyArcgisStyle, mapReady, token]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (mode === 'detail' && focusedDestination) {
      map.flyTo({ center: toMapLibrePoint(focusedDestination.location), zoom: 15.5, duration: 0 });
      return;
    }
    if (mode === 'overview') {
      const bounds = boundsFor(destinations);
      if (bounds && destinations.length > 1) map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 13 });
    }
  }, [destinations, focusedDestination, mapReady, mode]);

  const mapMarkers = destinations.map((destination) => (
    <Marker
      key={destination.slug}
      longitude={destination.location.lng}
      latitude={destination.location.lat}
      anchor="bottom"
    >
      <MarkerContent destination={destination} onSelect={() => onSelectDestination?.(destination)} />
    </Marker>
  ));

  const canRenderMap = hasWebGl();
  if (!canRenderMap) {
    return (
      <div className={`interactive-map interactive-map--${mode} ${className}`} data-map-mode={mode} data-provider="osm-fallback">
        <MapFallback
          destinations={destinations}
          mode={mode}
          focusedDestination={focusedDestination}
          onSelectDestination={onSelectDestination}
          onStartRoute={onStartRoute}
          providerReason={basemapReasonLabel(providerReason) ?? 'Vista de mapa disponible en el navegador.'}
        />
      </div>
    );
  }

  return (
    <div className={`interactive-map interactive-map--${mode} ${className}`} data-map-mode={mode} data-provider={provider}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center[0], latitude: center[1], zoom: mode === 'navigation' ? 17 : 8.5 }}
        mapStyle={mapStyle}
        attributionControl={false}
        onLoad={(event) => {
          setMapReady(true);
          void applyArcgisStyle(event.target);
        }}
        onError={() => {
          useOsmFallback('network');
        }}
        onMoveStart={(event) => {
          if (mode === 'navigation') navigationCamera.handleGesture(event);
        }}
        onMoveEnd={() => {
          if (mode === 'navigation') navigationCamera.finishRecentering();
        }}
      >
        {provider === 'osm-fallback' && (
          <AttributionControl compact customAttribution="© OpenStreetMap contributors" />
        )}
        <NavigationControl position="bottom-right" showCompass={mode !== 'navigation'} />
        {mapMarkers}
        {mode === 'navigation' && navigationFrame && (
          <Marker longitude={navigationFrame.rawPosition.lng} latitude={navigationFrame.rawPosition.lat} anchor="center">
            <span
              className="interactive-map__accuracy-halo"
              aria-hidden="true"
              style={{
                height: `${Math.max(32, Math.min(160, navigationFrame.accuracyM * 2))}px`,
                width: `${Math.max(32, Math.min(160, navigationFrame.accuracyM * 2))}px`,
              }}
            />
          </Marker>
        )}
        {animatedUserPosition && (
          <Marker longitude={animatedUserPosition.lng} latitude={animatedUserPosition.lat} anchor="center">
            <span
              className="interactive-map__user-marker"
              aria-label="Tu ubicación actual"
              style={{ transform: `rotate(${navigationFrame?.arrowBearing ?? 0}deg)` }}
            >
              <FiNavigation aria-hidden="true" />
            </span>
          </Marker>
        )}
        {showRoute && route && (
          <Source id="paradisse-route" type="geojson" data={route}>
            <Layer {...routeLineLayer} />
          </Source>
        )}
      </Map>
      {mode === 'navigation' && (
        <button
          className="interactive-map__recenter"
          data-map-action="recenter"
          type="button"
          onClick={() => {
            navigationCamera.recenter();
          }}
          aria-label="Recentrar mapa en tu ubicación"
          disabled={!navigationFrame?.displayPosition}
        >
          <FiCrosshair aria-hidden="true" /> Recentrar
        </button>
      )}
      {provider === 'osm-fallback' && (
        <p className="interactive-map__status" role="status">
          <FiRefreshCw aria-hidden="true" /> {basemapReasonLabel(providerReason) ?? 'ArcGIS no disponible; se usa OSM.'}
        </p>
      )}
    </div>
  );
}

export { boundsFor, centerFor, routeGeoJson, toMapLibrePoint };
