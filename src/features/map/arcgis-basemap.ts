import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';

export interface BasemapStyleInstance {
  style?: StyleSpecification;
  loadStyle: () => Promise<StyleSpecification | undefined>;
  applyTo: (map: MapLibreMap) => void;
  on: (eventName: 'BasemapStyleError', handler: (event: unknown) => void) => void;
}

export type BasemapStyleConstructor = new (options: {
  style: string;
  token: string;
  preferences?: { language?: string };
  attributionControl?: { compact?: boolean };
}) => BasemapStyleInstance;

interface ApplyArcgisBasemapStyleOptions {
  map: MapLibreMap;
  token: string;
  BasemapStyle: BasemapStyleConstructor;
  onFallback: (reason: 'style-error') => void;
}

const isArcgisHost = (hostname: string) => hostname === 'arcgis.com' || hostname.endsWith('.arcgis.com');

const withToken = (sourceUrl: string, token: string) => {
  try {
    const url = new URL(sourceUrl);
    if (!isArcgisHost(url.hostname) || url.searchParams.has('token')) return sourceUrl;
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    return sourceUrl;
  }
};

const isArcgisUrl = (sourceUrl: string) => {
  try {
    return isArcgisHost(new URL(sourceUrl).hostname);
  } catch {
    return false;
  }
};

const safeErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'ArcGIS basemap unavailable';
  return message
    .replace(/([?&]token=)[^&\s]+/gi, '$1[redacted]')
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/((?:access_token|client_secret)[=:])[^&\s]+/gi, '$1[redacted]');
};

const reportBasemapFailure = (error: unknown) => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[PARADISSE] ArcGIS basemap fallback:', safeErrorMessage(error));
  }
};

/**
 * The ArcGIS style response includes a TileJSON `url` as well as `tiles`.
 * The SDK decorates the latter but, in this response, MapLibre can request the
 * former first. Add the scoped basemap token to ArcGIS URLs only.
 */
export function addArcgisBasemapSourceTokens(style: StyleSpecification, token: string): void {
  const sources = style.sources as Record<string, { url?: string; tiles?: string[] }>;
  Object.values(sources).forEach((source) => {
    if (!source) return;
    if (source.tiles?.length) {
      source.tiles = source.tiles.map((tileUrl) => (
        isArcgisUrl(tileUrl) ? withToken(tileUrl, token) : tileUrl
      ));
    }
    if (source.url) {
      const sourceUrl = withToken(source.url, token);
      if (isArcgisUrl(source.url) && source.tiles?.length) {
        // MapLibre can prefer the TileJSON URL and replace the already
        // authenticated tile templates returned by the style service.
        // Keeping the authenticated templates avoids a second unauthenticated
        // request to the vector tile service.
        delete source.url;
      } else {
        source.url = sourceUrl;
      }
    }
  });
}

/**
 * Loads the ArcGIS style before applying it to MapLibre.
 *
 * BasemapStyle.applyStyle() applies the style from a promise callback. When
 * ArcGIS returns an HTTP error, that callback can still call applyTo() without
 * a loaded style. Keeping the sequence here makes the fallback deterministic
 * and prevents an unhandled "style is not loaded" exception.
 */
export async function applyArcgisBasemapStyle({
  map,
  token,
  BasemapStyle,
  onFallback,
}: ApplyArcgisBasemapStyleOptions): Promise<StyleSpecification | null> {
  try {
    const basemap = new BasemapStyle({
      style: 'arcgis/navigation',
      token,
      preferences: { language: 'es' },
      attributionControl: { compact: true },
    });

    let providerError: unknown = null;
    basemap.on('BasemapStyleError', (event) => {
      providerError = event;
    });

    const style = await basemap.loadStyle();
    if (providerError || !style) {
      reportBasemapFailure(providerError ?? new Error('ArcGIS style did not load'));
      onFallback('style-error');
      return null;
    }

    // Algunos adaptadores devuelven el estilo sin asignarlo en la instancia;
    // applyTo() valida esa propiedad antes de llamar a map.setStyle().
    if (!basemap.style) basemap.style = style;
    addArcgisBasemapSourceTokens(style, token);
    basemap.applyTo(map);
    return style;
  } catch (error) {
    reportBasemapFailure(error);
    onFallback('style-error');
    return null;
  }
}
