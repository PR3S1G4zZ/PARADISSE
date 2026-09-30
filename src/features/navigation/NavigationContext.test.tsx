import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getDestination } from '../destinations/destination-service';
import { NavegacionProvider, useNavegacion } from './NavigationContext';
import { GEOLOCATION_CONFIG } from './useGeolocation';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const destination = getDestination('sena-calatrava')!;
const routeResponse = {
  fuente: 'osrm' as const,
  fallbackAplicado: true,
  motivo: 'arcgis-no-configurado',
  travelModeSolicitado: 'walk' as const,
  travelModeUtilizado: 'foot',
  puntos: [[6.17, -75.61] as [number, number], [6.18, -75.60] as [number, number]],
  pasos: [{ texto: 'Continúa por la vía principal', distanciaM: 500, duracionMin: 6 }],
  distanciaM: 500,
  duracionMin: 6,
  advertencias: [],
};

function Harness() {
  const navigation = useNavegacion();
  return (
    <div>
      <button type="button" data-start onClick={() => void navigation.startRoute(destination, 'walk').catch(() => undefined)}>Iniciar</button>
      <button type="button" data-preview onClick={() => void navigation.startRoute(destination, 'walk', { lat: 6.17, lng: -75.61 })}>Vista previa</button>
      <button type="button" data-recalculate onClick={() => void navigation.recalculateNow()}>Recalcular</button>
      <output data-status>{navigation.status}</output>
      <output data-error>{navigation.error ?? ''}</output>
      <output data-source>{navigation.route?.fuente ?? ''}</output>
      <output data-progress>{navigation.progress?.percentage ?? ''}</output>
    </div>
  );
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<MemoryRouter><NavegacionProvider><Harness /></NavegacionProvider></MemoryRouter>);
  });
  return { container, root };
}

// Punto de La Estrella, fuera de Itagüí, para probar que el origen es el GPS y
// no un punto del municipio.
const LA_ESTRELLA = { latitude: 6.1575, longitude: -75.6436 };

let gpsFix = { latitude: 6.17, longitude: -75.61, accuracy: 5 };
let watchCallbacks: PositionCallback[] = [];

const browserFix = (fix = gpsFix) => ({
  coords: {
    ...fix,
    speed: 1,
    heading: 90,
    altitude: null,
    altitudeAccuracy: null,
  },
  timestamp: Date.now(),
} as GeolocationPosition);

beforeEach(() => {
  gpsFix = { latitude: 6.17, longitude: -75.61, accuracy: 5 };
  watchCallbacks = [];
  // Como el backend, la ruta parte del origen solicitado y termina en el destino.
  vi.stubGlobal('fetch', vi.fn((_url: unknown, init?: RequestInit) => {
    const { origen, destino } = JSON.parse(String(init?.body));
    return Promise.resolve(new Response(JSON.stringify({
      ...routeResponse,
      puntos: [[origen.lat, origen.lng], [destino.lat, destino.lng]],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  }));
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn((success: PositionCallback) => {
        watchCallbacks.push(success);
        success(browserFix());
        return watchCallbacks.length;
      }),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn((success: PositionCallback) => success(browserFix())),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

const requestedOrigin = () => JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).origen;

test('starts live navigation from a trusted browser position', async () => {
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
  });

  expect(container.querySelector('[data-status]')?.textContent).toBe('navigating');
  expect(container.querySelector('[data-source]')?.textContent).toBe('osrm');
  expect(container.querySelector('[data-progress]')?.textContent).not.toBe('');
  act(() => root.unmount());
});

test('supports a manual origin as an explicitly non-live preview', async () => {
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-preview]')!.click();
  });

  expect(container.querySelector('[data-status]')?.textContent).toBe('preview');
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  act(() => root.unmount());
});

test('applies the same cooldown to repeated manual recalculation requests', async () => {
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
  });
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-recalculate]')!.click();
    await Promise.resolve();
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-recalculate]')!.click();
    await Promise.resolve();
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

test('routes from the phone GPS even when the user is outside Itagui', async () => {
  gpsFix = { ...LA_ESTRELLA, accuracy: 8 };
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
  });

  expect(requestedOrigin()).toEqual({ lat: LA_ESTRELLA.latitude, lng: LA_ESTRELLA.longitude });
  expect(container.querySelector('[data-status]')?.textContent).toBe('navigating');
  act(() => root.unmount());
});

test('starts from an approximate fix and recovers to navigating when a precise fix arrives', async () => {
  vi.useFakeTimers();
  gpsFix = { ...LA_ESTRELLA, accuracy: 120 };
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await vi.advanceTimersByTimeAsync(GEOLOCATION_CONFIG.startRefineMs);
  });

  expect(requestedOrigin()).toEqual({ lat: LA_ESTRELLA.latitude, lng: LA_ESTRELLA.longitude });
  expect(container.querySelector('[data-status]')?.textContent).toBe('gps-degraded');

  await act(async () => {
    watchCallbacks.forEach((callback) => callback(browserFix({ ...LA_ESTRELLA, accuracy: 9 })));
  });

  expect(container.querySelector('[data-status]')?.textContent).toBe('navigating');
  act(() => root.unmount());
});

test('reports an unusably imprecise location instead of tracing a route from it', async () => {
  vi.useFakeTimers();
  gpsFix = { ...LA_ESTRELLA, accuracy: 900 };
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await vi.advanceTimersByTimeAsync(GEOLOCATION_CONFIG.startRefineMs);
  });

  expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  expect(container.querySelector('[data-status]')?.textContent).toBe('error');
  expect(container.querySelector('[data-error]')?.textContent).toMatch(/muy imprecisa \(±900 m\)/);
  act(() => root.unmount());
});
