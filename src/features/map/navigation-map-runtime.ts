type HandlerName =
  | 'scrollZoom'
  | 'boxZoom'
  | 'dragPan'
  | 'dragRotate'
  | 'keyboard'
  | 'doubleClickZoom'
  | 'touchZoomRotate'
  | 'touchPitch';

type MapHandler = { enable?: () => void; isEnabled?: () => boolean };

export type NavigationMapLike = {
  resize?: () => void;
  isStyleLoaded?: () => boolean | void;
  getContainer?: () => { clientHeight?: number; clientWidth?: number };
} & Partial<Record<HandlerName, MapHandler>>;

const INTERACTION_HANDLERS: HandlerName[] = [
  'scrollZoom',
  'boxZoom',
  'dragPan',
  'dragRotate',
  'keyboard',
  'doubleClickZoom',
  'touchZoomRotate',
  'touchPitch',
];

export function enableMapInteractions(map: NavigationMapLike | null | undefined): void {
  if (!map) return;
  INTERACTION_HANDLERS.forEach((name) => {
    map[name]?.enable?.();
  });
}

export function mapHasUsableViewport(map: NavigationMapLike | null | undefined): boolean {
  if (!map?.getContainer) return true;
  const container = map.getContainer();
  if (!container) return true;
  if ((container.clientHeight ?? 0) <= 0) return false;
  if (typeof container.clientWidth === 'number' && container.clientWidth <= 0) return false;
  return true;
}

export function canApplyNavigationCamera(map: NavigationMapLike | null | undefined): boolean {
  if (!map || !mapHasUsableViewport(map)) return false;
  if (typeof map.isStyleLoaded === 'function' && map.isStyleLoaded() === false) return false;
  return true;
}

export function resizeNavigationMap(map: NavigationMapLike | null | undefined): boolean {
  if (!map || typeof map.resize !== 'function') return false;
  map.resize();
  enableMapInteractions(map);
  return mapHasUsableViewport(map);
}

export function observeNavigationMapSize(
  map: NavigationMapLike | null | undefined,
  observe: (element: Element, onResize: () => void) => () => void = observeElementSize,
): () => void {
  const container = map?.getContainer?.();
  if (!map || !container || typeof (container as Element).nodeType !== 'number') {
    resizeNavigationMap(map);
    return () => undefined;
  }

  const sync = () => {
    resizeNavigationMap(map);
  };
  sync();
  return observe(container as Element, sync);
}

function observeElementSize(element: Element, onResize: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') {
    const frame = requestAnimationFrame(onResize);
    const timeout = window.setTimeout(onResize, 200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }

  const observer = new ResizeObserver(() => onResize());
  observer.observe(element);
  const frame = requestAnimationFrame(onResize);
  const timeout = window.setTimeout(onResize, 200);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.clearTimeout(timeout);
  };
}

export function shouldIgnoreMapError(options: {
  contextLost?: boolean;
  applyingStyle?: boolean;
  provider?: 'loading' | 'arcgis' | 'osm-fallback';
}): boolean {
  return Boolean(
    options.contextLost
    || options.applyingStyle
    || options.provider === 'osm-fallback'
    || options.provider === 'arcgis',
  );
}
