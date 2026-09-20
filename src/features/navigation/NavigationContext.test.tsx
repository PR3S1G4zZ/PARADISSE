import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getDestination } from '../destinations/destination-service';
import { NavegacionProvider, useNavegacion } from './NavigationContext';

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
      <button type="button" data-start onClick={() => void navigation.startRoute(destination, 'walk')}>Iniciar</button>
      <button type="button" data-preview onClick={() => void navigation.startRoute(destination, 'walk', { lat: 6.17, lng: -75.61 })}>Vista previa</button>
      <button type="button" data-recalculate onClick={() => void navigation.recalculateNow()}>Recalcular</button>
      <output data-status>{navigation.status}</output>
      <output data-source>{navigation.route?.fuente ?? ''}</output>
      <output data-progress>{navigation.progress?.percentage ?? ''}</output>
      <output data-instruction>{navigation.instruction ?? ''}</output>
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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(routeResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))));
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn((success: PositionCallback) => success({
        coords: {
          latitude: 6.17,
          longitude: -75.61,
          accuracy: 5,
          speed: 1,
          heading: 90,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

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

test('posts a car route from a manual origin using only lat/lng destination points', async () => {
  const parque = getDestination('parque-principal-itagui')!;
  function CarHarness() {
    const navigation = useNavegacion();
    return (
      <button
        type="button"
        data-car-preview
        onClick={() => void navigation.startRoute(parque, 'car', { lat: 6.17, lng: -75.61 })}
      >
        Auto
      </button>
    );
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<MemoryRouter><NavegacionProvider><CarHarness /></NavegacionProvider></MemoryRouter>);
  });

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-car-preview]')!.click();
  });

  const [, init] = vi.mocked(fetch).mock.calls[0];
  expect(JSON.parse(String(init?.body))).toEqual({
    origen: { lat: 6.17, lng: -75.61 },
    destino: { lat: 6.1723858, lng: -75.609416 },
    modo: 'car',
    nombreDestino: 'Parque Principal de Itagüí',
  });
  act(() => root.unmount());
});

test('starts a route from a fresh moderate-accuracy fix in degraded GPS mode', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn(() => 2),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn((success: PositionCallback) => success({
        coords: {
          latitude: 6.17,
          longitude: -75.61,
          accuracy: 80,
          speed: 0,
          heading: null,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)),
    },
  });
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
  });

  expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  expect(container.querySelector('[data-status]')?.textContent).toBe('gps-degraded');
  expect(container.querySelector('[data-source]')?.textContent).toBe('osrm');
  act(() => root.unmount());
});

test('does not advance route matching from an untrusted fix near the destination', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn(() => 3),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn((success: PositionCallback) => success({
        coords: {
          latitude: 6.18,
          longitude: -75.60,
          accuracy: 80,
          speed: 0,
          heading: null,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)),
    },
  });
  const { container, root } = renderHarness();

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-start]')!.click();
  });

  expect(container.querySelector('[data-status]')?.textContent).toBe('gps-degraded');
  expect(container.querySelector('[data-progress]')?.textContent).toBe('');
  expect(container.querySelector('[data-instruction]')?.textContent).toBe('');
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
