declare module '@esri/maplibre-arcgis' {
  import type { Map, StyleSpecification } from 'maplibre-gl';

  interface BasemapStyleHandle {
    style?: StyleSpecification;
    loadStyle: () => Promise<StyleSpecification | undefined>;
    applyTo: (map: Map) => Map;
    on: (eventName: 'BasemapStyleError' | 'BasemapStyleLoad', handler: (event: unknown) => void) => void;
    off: (eventName: 'BasemapStyleError' | 'BasemapStyleLoad', handler: (event: unknown) => void) => void;
  }

  export const BasemapStyle: {
    new (options: {
      style: string;
      token: string;
      preferences?: { language?: string };
      attributionControl?: { compact?: boolean };
    }): BasemapStyleHandle;
    applyStyle: (
      map: Map,
      options: {
        style: string;
        token: string;
        preferences?: { language?: string };
        attributionControl?: { compact?: boolean };
      },
    ) => BasemapStyleHandle;
  };
}
