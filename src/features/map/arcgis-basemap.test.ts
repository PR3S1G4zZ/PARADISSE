import { describe, expect, test, vi } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import { addArcgisBasemapSourceTokens, applyArcgisBasemapStyle } from './arcgis-basemap';

describe('applyArcgisBasemapStyle', () => {
  test('falls back without applying an unloaded style after a provider error', async () => {
    const applyTo = vi.fn();
    const onFallback = vi.fn();

    class FailingBasemapStyle {
      on(_eventName: 'BasemapStyleError', handler: (event: unknown) => void) {
        handler(new Error('ArcGIS HTTP 401'));
      }

      async loadStyle() {
        return undefined;
      }

      applyTo() {
        applyTo();
      }
    }

    const applied = await applyArcgisBasemapStyle({
      map: {} as never,
      token: 'temporary-token',
      BasemapStyle: FailingBasemapStyle,
      onFallback,
    });

    expect(applied).toBe(false);
    expect(applyTo).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledWith('style-error');
  });

  test('adds the token to ArcGIS source URLs without touching external sources', () => {
    const style = {
      version: 8,
      sources: {
        arcgis: {
          type: 'vector',
          url: 'https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer',
          tiles: ['https://basemaps-api.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf'],
        },
        external: {
          type: 'vector',
          url: 'https://tiles.example.com/style.json',
        },
      },
      layers: [],
    } as StyleSpecification;

    addArcgisBasemapSourceTokens(style, 'temporary-token');

    expect((style.sources.arcgis as { url?: string }).url).toBeUndefined();
    expect((style.sources.arcgis as { tiles?: string[] }).tiles?.[0]).toContain('token=temporary-token');
    expect((style.sources.external as { url?: string }).url).toBe('https://tiles.example.com/style.json');
  });

  test('does not call applyTo until the loaded style is present on the SDK instance', async () => {
    const applyTo = vi.fn();
    const style = { version: 8, sources: {}, layers: [] } as StyleSpecification;

    class StyleWithoutInternalAssignment {
      style?: StyleSpecification;

      on() {}

      async loadStyle() {
        return style;
      }

      applyTo() {
        if (!this.style) throw new Error('style-not-loaded');
        applyTo();
      }
    }

    const applied = await applyArcgisBasemapStyle({
      map: {} as never,
      token: 'temporary-token',
      BasemapStyle: StyleWithoutInternalAssignment,
      onFallback: vi.fn(),
    });

    expect(applied).toBe(true);
    expect(applyTo).toHaveBeenCalledOnce();
  });
});
