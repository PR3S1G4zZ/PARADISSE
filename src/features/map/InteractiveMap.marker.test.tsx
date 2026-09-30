import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NavegacionContext, type NavigationContextValue } from '../navigation/NavigationContext';
import { InteractiveMap } from './InteractiveMap';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const markerProps: Array<Record<string, unknown>> = [];

// MapLibre necesita WebGL, que jsdom no ofrece. Se sustituyen solo los
// componentes de react-map-gl para inspeccionar las props que reciben.
vi.mock('react-map-gl/maplibre', async () => {
  const { createElement, forwardRef } = await import('react');
  const passthrough = (name: string) => ({ children }: { children?: unknown }) => createElement('div', { 'data-mock': name }, children as never);
  return {
    default: forwardRef<unknown, { children?: unknown }>(({ children }, _ref) => createElement('div', { 'data-mock': 'map' }, children as never)),
    Marker: (props: Record<string, unknown>) => {
      markerProps.push(props);
      return createElement('div', { 'data-mock': 'marker' }, props.children as never);
    },
    Source: passthrough('source'),
    Layer: () => null,
    NavigationControl: () => null,
    AttributionControl: () => null,
  };
});

const point = { lat: 6.17, lng: -75.61 };
const frame = {
  rawPosition: point,
  displayPosition: point,
  cameraPosition: point,
  positionSource: 'matched',
  accuracyM: 8,
  displayOffsetM: 0,
  arrowBearing: 90,
  cameraBearing: 90,
  speedEstimateMps: 1.4,
  cameraMode: 'FOLLOWING',
  progressM: 0,
  remainingM: 100,
  deviationM: 0,
  timestamp: Date.now(),
};

beforeEach(() => {
  markerProps.length = 0;
  vi.stubGlobal('WebGLRenderingContext', function WebGLRenderingContext() {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fetch-unavailable'))));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

test('draws the user arrow with the geographic bearing aligned to the rotating map', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const navigation = {
    pose: null,
    frame,
    position: null,
    route: null,
    mode: 'walk',
    status: 'navigating',
    gpsConfiable: true,
  } as unknown as NavigationContextValue;

  await act(async () => {
    root.render(
      <MemoryRouter>
        <NavegacionContext.Provider value={navigation}>
          <InteractiveMap destinations={[]} mode="navigation" />
        </NavegacionContext.Provider>
      </MemoryRouter>,
    );
  });

  // Con rotationAlignment "map" MapLibre dibuja la flecha en (rumbo - giro del
  // mapa): si la cámara gira al rumbo de marcha, la flecha queda hacia arriba.
  const arrow = markerProps.find((props) => props.rotationAlignment === 'map');
  expect(arrow).toMatchObject({ rotation: 90, rotationAlignment: 'map', pitchAlignment: 'viewport' });
  expect(container.querySelector('[aria-label="Tu ubicación actual"]')).toBeTruthy();
  act(() => root.unmount());
});
