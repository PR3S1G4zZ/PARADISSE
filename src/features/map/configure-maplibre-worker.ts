import { setWorkerUrl } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let configured = false;

/**
 * MapLibre GL 6 resolves its GeoJSON/vector worker from `import.meta.url`.
 * Vite's dep optimizer and production bundle move the library, so that sibling
 * `maplibre-gl-worker.mjs` 404s. The worker then never answers, GeoJSON stays
 * unloaded (`isSourceLoaded` false), the route line never paints, and
 * `isStyleLoaded()` stays false.
 *
 * `?worker&url` emits a self-contained worker (including maplibre-gl-shared).
 * A plain `?url` copy omits that sibling and fails the same way in production.
 */
export function configureMapLibreWorker(): void {
  if (configured) return;
  configured = true;
  if (typeof mapLibreWorkerUrl === 'string' && mapLibreWorkerUrl.length > 0) {
    setWorkerUrl(mapLibreWorkerUrl);
  }
}

configureMapLibreWorker();
